import { connectSocket, registerConnectionHandler } from '/connection';
import { cacheFactory } from '/cache';
import ioFactory from './io';

export default cacheFactory(async () => {
  const io = await ioFactory();

  io.on('connection', connectSocket);

  return registerConnectionHandler;
});
