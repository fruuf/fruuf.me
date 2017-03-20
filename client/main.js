import React from 'react';
import store from '/api/store';
import { Provider } from 'react-redux';
import { Router, browserHistory, createRoutes } from 'react-router';
import 'inobounce';
import '/api';
import './main.global.css'; // bypass css modules
import routes from './routes'; // assigns components to routes

// hide the navigation bar on mobile
window.scrollTo(0, 1);

export default () => (
  <Provider store={store}>
    <Router history={browserHistory} routes={routes} />
  </Provider>
);
