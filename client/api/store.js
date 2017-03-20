/* global window */
import { createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';
import ducks from '/ducks';
import { fromJS, Map } from 'immutable';

// eslint-disable-next-line no-underscore-dangle
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
const initialState = new Map({
  serverState: fromJS(window.initialState),
});

const store = createStore(ducks, initialState, composeEnhancers(applyMiddleware(thunk)));

export default store;
