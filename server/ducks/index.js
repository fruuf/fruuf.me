import { combineReducers } from 'redux-immutable';
import types from './types';
import tables from './tables';

export default combineReducers({ types, tables });
