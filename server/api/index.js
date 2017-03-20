import initDB from './db';
import initStore from './store';
import initSocket from './socket';
import initRouter from './router';

const initialiseFns = [initDB, initStore, initSocket, initRouter];

let api = false;

const deferredApiCallbacks = [];

export const init = async ({ app, io }) => {
  let apiProps = { app, io };
  let i = 0;
  while (i < initialiseFns.length) {
    // eslint-disable-next-line no-await-in-loop
    const newApiProps = await initialiseFns[i](apiProps);
    apiProps = {
      ...apiProps,
      ...newApiProps,
    };
    i += 1;
  }
  api = apiProps;
  deferredApiCallbacks.forEach(fn => fn(apiProps));
};

export default () => {
  if (api) return Promise.resolve(api);
  return new Promise(resolve => deferredApiCallbacks.push(resolve));
};
