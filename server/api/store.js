import { Observable, ReplaySubject } from 'rxjs';
import { createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';
import ducks from '/ducks';

export default async ({ db }) => {
  const persistentEventMiddleware = () =>
    next =>
      async (action) => {
        const { source, type, ...data } = action;
        if (source === 'server') {
          await db('eventStream').insert({
            data: JSON.stringify(data),
            source,
            type,
          });
        }
        next(action);
      };

  const store = createStore(ducks, compose(applyMiddleware(thunk, persistentEventMiddleware)));

  // initialise the store from DB
  await store.dispatch({ type: '@@INIT', source: 'history' });
  const events = await db('eventStream').orderBy('id');
  let i = 0;
  while (i < events.length) {
    const type = events[i].type;
    const data = JSON.parse(events[i].data);
    // eslint-disable-next-line no-await-in-loop
    await store.dispatch({ ...data, type, source: 'history' });
    i += 1;
  }

  // query redux store
  const stateSubject = new ReplaySubject(1);
  const cacheMap = new Map();

  const cacheAdd = (sourceStream, part, stream) => {
    if (!cacheMap.has(sourceStream)) {
      cacheMap.set(sourceStream, new Map());
    }
    const partMap = cacheMap.get(sourceStream);
    partMap.set(part, stream);
    return true;
  };

  const cacheRemove = (sourceStream, part) => {
    const partMap = cacheMap.get(sourceStream);
    partMap.delete(part);
    if (partMap.size === 0) {
      cacheMap.delete(sourceStream);
    }
    return true;
  };

  const cacheHas = (sourceStream, part) =>
    cacheMap.has(sourceStream) && cacheMap.get(sourceStream).has(part);

  const cacheGet = (sourceStream, part) => cacheMap.get(sourceStream).get(part);

  const queryPart = (sourceStream, part) => {
    if (cacheHas(sourceStream, part)) {
      return cacheGet(sourceStream, part);
    }
    let references = 0;
    const stream = sourceStream.map(data => data.get(part)).distinctUntilChanged().publishReplay(1);
    const connection = stream.connect();
    const resultStream = Observable.create((observer) => {
      references += 1;
      const subscription = stream.subscribe(observer);
      return () => {
        references -= 1;
        subscription.unsubscribe();
        if (references === 0) {
          connection.unsubscribe();
          cacheRemove(sourceStream, part);
        }
      };
    });
    cacheAdd(sourceStream, part, resultStream);
    return resultStream;
  };

  const queryState = (...parts) => parts.reduce((acc, cur) => queryPart(acc, cur), stateSubject);

  // connect the store to the state subject
  stateSubject.next(store.getState());
  store.subscribe(() => stateSubject.next(store.getState()));

  const dispatch = store.dispatch.bind(store);

  return { queryState, dispatch };
};
