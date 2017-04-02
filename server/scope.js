import isFunction from 'lodash/isFunction';
import isString from 'lodash/isString';
import isNumber from 'lodash/isNumber';
import isBoolean from 'lodash/isBoolean';

// bound to a scope, applies the args to a scoped version of fn
export const applyArguments = scope =>
  (fn, ...args) => {
    if (args.length === 0) return scope(fn)();
    return args.reduce((acc, cur) => acc(cur), scope(fn));
  };

export const createScope = () => {
  const fnMap = new Map();
  const wrapFn = (fn) => {
    if (!isFunction(fn)) {
      throw new Error('argument of scope must be a function');
    }
    if (fnMap.has(fn)) {
      return fnMap.get(fn);
    }
    const resultMap = new Map();
    const runFn = (arg) => {
      if (resultMap.has(arg)) {
        return resultMap.get(arg);
      }
      let result = fn(arg, wrapFn);
      if (isFunction(result)) {
        result = wrapFn(result);
      }
      resultMap.set(arg, result);
      return result;
    };
    fnMap.set(fn, runFn);
    return runFn;
  };
  return applyArguments(wrapFn);
};

export const collectArguments = (count, fn) => {
  if (count === 0) throw new Error('cant collect 0 arguments');
  const runCollectArguments = (innerCount, innerArgs) =>
    (arg, scope) => {
      if (innerCount === 1) {
        return fn(scope, ...innerArgs, arg);
      }
      return runCollectArguments(innerCount - 1, [...innerArgs, arg]);
    };
  return runCollectArguments(count, []);
};

export const zipArguments = (keys, fn) =>
  collectArguments(keys.length, (scope, ...args) =>
    fn(
      keys.reduce(
        (acc, cur, index) => {
          if (!isString(args[index]) && !isBoolean(args[index]) && !isNumber(args[index])) {
            throw new Error(
              `collection query arguments must be a primary, got ${typeof args[index]}`,
            );
          }
          return Object.assign(acc, { [cur]: args[index] });
        },
        {},
      ),
      scope,
    ));
