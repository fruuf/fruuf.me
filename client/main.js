import React from 'react';
import store from '/api/store';
import { Provider } from 'react-redux';
import { Router, browserHistory } from 'react-router';
import 'inobounce';
import createConnection from '/api/connection';
import { TEST_CONNECTION } from '/util/const';
import { Observable } from 'rxjs';
import './main.global.css'; // bypass css modules
import routes from './routes'; // assigns components to routes

// hide the navigation bar on mobile
window.scrollTo(0, 1);

export default () => (
  <Provider store={store}>
    <Router history={browserHistory} routes={routes} />
  </Provider>
);

window.setTimeout(() => {
  const resultStream = createConnection(TEST_CONNECTION)(Observable.interval(500).finally(() => console.log('finally')));
  const sub = resultStream.subscribe({
    next(data) {
      console.log('data', data);
    },
    error() {
      console.log('error');
    },
    complete() {
      console.log('complete');
    },
  });
  window.setTimeout(() => sub.unsubscribe(), 3000);
}, 1000);
