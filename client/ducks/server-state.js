const SERVER_STATE_CHANGE = 'SERVER_STATE_CHANGE';

export const changeServerStateAction = changes => ({
  type: SERVER_STATE_CHANGE,
  changes,
});

export default (state = {}, action) => {
  switch (action.type) {
    case SERVER_STATE_CHANGE: {
      return state;
    }
    default:
      return state;
  }
};
