import { combineReducers } from 'redux-immutable';
import { createRemoteState } from '/api';

export const currentTable = createRemoteState('getTableByName');

export default combineReducers({ currentTable: currentTable.reducer });
