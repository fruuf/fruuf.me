import { combineReducers } from 'redux-immutable';
import { Map } from 'immutable';

const TABLES_TABLE_ADD = 'TABLES_TABLE_ADD';
const TABLES_TABLE_UPDATE = 'TABLES_TABLE_UPDATE';
const TABLES_TABLE_REMOVE = 'TABLES_TABLE_REMOVE';

export const addTableAction = name => ({
  type: TABLES_TABLE_ADD,
  name,
});

export const updateTableAction = (name, data) => ({
  type: TABLES_TABLE_UPDATE,
  name,
  data,
});

const removeTableAction = name => ({
  type: TABLES_TABLE_REMOVE,
  name,
});

const tableMapReducer = (state = new Map(), action) => {
  switch (action.type) {
    case TABLES_TABLE_ADD: {
      return state.set(action.name, new Map({ name: action.name }));
    }
    case TABLES_TABLE_UPDATE: {
      return state.mergeIn([action.name], action.data);
    }
    case TABLES_TABLE_REMOVE: {
      return state.delete(action.name);
    }
    default:
      return state;
  }
};

export default (prevState = new Map(), action) => {
  const state = prevState.set('tableMap', tableMapReducer(prevState.get('tableMap'), action));
  return state;
};
