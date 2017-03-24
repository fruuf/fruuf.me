import { flattenDeep, difference, isFunction, debounce } from 'lodash';
import { Observable } from 'rxjs';

export const SOCKET_CONNECTION = 'SOCKET_CONNECTION';
export const SOCKET_CONNECTION_OPEN = 'SOCKET_CONNECTION_OPEN';
export const SOCKET_CONNECTION_CLOSE = 'SOCKET_CONNECTION_CLOSE';
export const SOCKET_CONNECTION_DATA = 'SOCKET_CONNECTION_DATA';
export const SOCKET_CONNECTION_COMPLETE = 'SOCKET_CONNECTION_COMPLETE';
export const SOCKET_CONNECTION_ERROR = 'SOCKET_CONNECTION_ERROR';

const CACHE_DEBUG_FLAG = process.env.NODE_ENV && true;

const factorySymbol = Symbol('factory');

const argSymbol = Symbol('arg');

export const debugTagStream = (stream, factory, arg = null) => {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-param-reassign
    stream[factorySymbol] = isFunction(factory) ? factory.name : factory;
    // eslint-disable-next-line no-param-reassign
    stream[argSymbol] = arg;
  }
};

const debugStream = stream => `${stream[factorySymbol]}(${stream[argSymbol]})`;

const cacheMap = new Map();

const getCacheMap = (fn) => {
  if (!cacheMap.has(fn)) {
    cacheMap.set(fn, new Map());
  }
  return cacheMap.get(fn);
};

let lastCache = [];

const getCurrentCache = () => {
  if (process.env.NODE_ENV !== 'development') return [];
  const cachedItems = flattenDeep(
    Array.from(cacheMap.keys()).map((fn) => {
      const fnCacheMap = cacheMap.get(fn);
      if (fnCacheMap.size === 0) return [];
      return Array.from(fnCacheMap.keys()).map((sourceStream) => {
        const argCacheMap = fnCacheMap.get(sourceStream);
        return Array.from(argCacheMap.keys()).map((arg) => {
          const resultStream = argCacheMap.get(arg);
          return { sourceStream, arg, resultStream, fn };
        });
      });
    }),
  );
  const resultStreamMap = cachedItems.reduce(
    (acc, cur) => acc.set(cur.resultStream, cur),
    new Map(),
  );
  const sourceStreamMap = cachedItems.reduce(
    (acc, cur) => acc.set(cur.sourceStream, true),
    new Map(),
  );

  const trackSourceStream = (item, stack = []) => {
    if (resultStreamMap.has(item.sourceStream)) {
      return trackSourceStream(resultStreamMap.get(item.sourceStream), [item].concat(stack));
    }
    return [item.sourceStream]
      .concat([item].concat(stack).map(stackItem => stackItem.resultStream))
      .map(debugStream)
      .join(' | ');
  };

  const endpoints = cachedItems
    .filter(item => !sourceStreamMap.has(item.resultStream))
    .map(item => trackSourceStream(item));
  return { endpoints, size: cachedItems.length };
};

const logChanges = debounce(
  () => {
    const currentCache = getCurrentCache();

    const removed = difference(lastCache.endpoints, currentCache.endpoints);

    const added = difference(currentCache.endpoints, lastCache.endpoints);

    added.forEach((item) => {
      const match = removed.find(findItem => findItem.indexOf(item));
      const counterMatch = removed.find(findItem => item.indexOf(findItem));
      if (match) {
        // eslint-disable-next-line no-console
        if (CACHE_DEBUG_FLAG) { console.log(`(cache) add ${item.substr(match.length + 3)} to ${match}`); }
      } else if (!counterMatch) {
        // eslint-disable-next-line no-console
        if (CACHE_DEBUG_FLAG) console.log(`(cache) add ${item}`);
      }
    });

    removed.forEach((item) => {
      const match = added.find(findItem => findItem.indexOf(item));
      const counterMatch = added.find(findItem => item.indexOf(findItem));
      if (match) {
        if (CACHE_DEBUG_FLAG) {
          // eslint-disable-next-line no-console
          console.log(`(cache) remove ${item.substr(match.length + 3)} from ${match}`);
        }
      } else if (!counterMatch) {
        // eslint-disable-next-line no-console
        if (CACHE_DEBUG_FLAG) console.log(`(cache) remove ${item}`);
      }
    });

    lastCache = currentCache;
  },
  100,
);

export const cacheObservable = (fn, replay = 0) => {
  const cache = getCacheMap(fn);

  const cacheAdd = (sourceStream, arg, resultStream) => {
    if (!cache.has(sourceStream)) {
      cache.set(sourceStream, new Map());
    }
    const argMap = cache.get(sourceStream);
    argMap.set(arg, resultStream);
    debugTagStream(resultStream, fn, arg);
    logChanges();
    return true;
  };

  const cacheRemove = (sourceStream, arg) => {
    const argMap = cache.get(sourceStream);
    argMap.delete(arg);
    if (argMap.size === 0) {
      cache.delete(sourceStream);
    }
    logChanges();
    return true;
  };

  const cacheHas = (sourceStream, arg) =>
    cache.has(sourceStream) && cache.get(sourceStream).has(arg);

  const cacheGet = (sourceStream, arg) => cache.get(sourceStream).get(arg);

  return (sourceStream, arg) => {
    if (cacheHas(sourceStream, arg)) {
      return cacheGet(sourceStream, arg);
    }
    const publishStream = fn(sourceStream, arg).finally(() => {
      cacheRemove(sourceStream, arg);
    });
    if (replay > 0) {
      const resultStream = publishStream.publishReplay(replay).refCount();
      cacheAdd(sourceStream, arg, resultStream);
      return resultStream;
    }
    const resultStream = publishStream.publish().refCount();
    cacheAdd(sourceStream, arg, resultStream);
    return resultStream;
  };
};

export const channelToStream = (channel, context) =>
  Observable.create((observer) => {
    const subscription = channel
      .filter(event => event.context === context)
      .subscribe((event) => {
        const { type, data } = event;

        if (type === SOCKET_CONNECTION_DATA) observer.next(data);

        if (type === SOCKET_CONNECTION_COMPLETE) observer.complete();

        if (type === SOCKET_CONNECTION_ERROR) observer.error();
      });

    return () => subscription.unsubscribe();
  });

export const streamToChannel = (stream, context) => Observable.create((observer) => {
  const subscription = stream.subscribe({
    next(data) {
      observer.next({ type: SOCKET_CONNECTION_DATA, data, context });
    },

    complete() {
      observer.next({ type: SOCKET_CONNECTION_COMPLETE, context });
    },

    error() {
      observer.next({ type: SOCKET_CONNECTION_ERROR, context });
    },
  });
  return () => subscription.unsubscribe();
});

export const cacheFactory = (factory) => {
  let result = null;
  return () => {
    if (!result) result = Promise.resolve(factory());
    return result;
  };
};
