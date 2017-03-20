import createSocket from 'socket.io-client';
import mergeChanges from 'immutablepatch';
import { fromJS, Map } from 'immutable';
import { SOCKET_DATA_FOLLOW } from '/util/const';


const socket = createSocket('http://localhost:8080');
let uid = 1;

export const createRemoteState = (name) => {
  const follow = (...args) => {
    socket.emit({ type: SOCKET_DATA_FOLLOW, args, uid, name });
    uid += 1;
  };
  const unfollow = () => {};
  const reducer = (state = new Map(), action) => state;
  return { follow, unfollow, reducer };
};

// export const socketReducer = (state = new Map({}), action) => {
//   switch (action.type) {
//     case STATE_SET: {
//       return fromJS(action.data);
//     }
//     case STATE_CHANGE: {
//       console.log(action.changes);
//       return mergeChanges(state, fromJS(action.changes));
//     }
//     default:
//       return state;
//   }
// };
