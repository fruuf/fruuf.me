// caches the result stream of a higher order observable per argument
export const cacheObservable = (fn, replay = 0, cache = new Map()) => {
  const cacheAdd = (sourceStream, arg, resultStream) => {
    if (!cache.has(sourceStream)) {
      cache.set(sourceStream, new Map());
    }
    const argMap = cache.get(sourceStream);
    argMap.set(arg, resultStream);
    return true;
  };

  const cacheRemove = (sourceStream, arg) => {
    const argMap = cache.get(sourceStream);
    argMap.delete(arg);
    if (argMap.size === 0) {
      cache.delete(sourceStream);
    }
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

// cache a factory to only instanciate it once
export const cacheFactory = (factory) => {
  let result = null;
  return () => {
    if (!result) result = Promise.resolve(factory());
    return result;
  };
};
