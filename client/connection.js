import createSocket from 'socket.io-client';
import { openSocketConnection, connectSocket } from '../server/connection';

export { registerConnectionHandler, createConnectionEnhancer } from '../server/connection';

const socket = createSocket();
// connectSocket(socket);

export default connection => () => openSocketConnection(socket, connection);
