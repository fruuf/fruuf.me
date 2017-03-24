import { ReplaySubject } from 'rxjs';
import { createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';
import ducks from '/ducks';
import { cacheObservable, debugTagStream, cacheFactory } from '/util';
import dbFactory from './db';

export default cacheFactory(async () => {
  const db = await dbFactory();
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

  debugTagStream(stateSubject, 'reduxState');

  const quertPartFn = (sourceStream, arg) =>
    sourceStream.map(item => item.get(arg)).distinctUntilChanged();

  const queryPart = cacheObservable(quertPartFn, 1);

  const queryState = (...parts) => parts.reduce((acc, cur) => queryPart(acc, cur), stateSubject);

  // connect the store to the state subject
  stateSubject.next(store.getState());
  store.subscribe(() => stateSubject.next(store.getState()));

  const dispatch = store.dispatch.bind(store);

  return { queryState, dispatch };
});
