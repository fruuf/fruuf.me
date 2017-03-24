import { cacheFactory } from '/util';
import socketIo from 'socket.io';
import httpFactory from './http';

export default cacheFactory(async () => {
  const http = await httpFactory();
  const io = socketIo(http);
  return io;
});
