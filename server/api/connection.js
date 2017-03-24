import { Observable } from 'rxjs';
import {
  channelToStream,
  streamToChannel,
  cacheFactory,
  SOCKET_CONNECTION,
  SOCKET_CONNECTION_OPEN,
  SOCKET_CONNECTION_CLOSE,
} from '/util';
import ioFactory from './io';

export default cacheFactory(async () => {
  const io = await ioFactory();
  const connectionMap = new Map();

  const connection = (type, handler) => {
    if (connectionMap.has(type)) throw new Error(`${type} is already defined`);
    connectionMap.set(type, handler);
  };

  io.on('connection', (socket) => {
    const inStream = Observable.create((observer) => {
      const handler = event => observer.next(event);
      socket.on(SOCKET_CONNECTION, handler);
      return () => {
        socket.removeListener(SOCKET_CONNECTION, handler);
      };
    }).share();

    const disconnectStream = Observable.create((observer) => {
      socket.on('disconnect', () => observer.next());
    })
      .take(1)
      .share();

    const closeConnectionStream = inStream
      .filter(event => event.type === SOCKET_CONNECTION_CLOSE)
      .share();

    inStream
      .filter(clientEvent => clientEvent.type === SOCKET_CONNECTION_OPEN)
      .mergeMap(({ connectionType, context }) => {
        if (!connectionMap.has(connectionType)) {
          // eslint-disable-next-line no-console
          console.log(`(connection) ${connectionType} not found`);
          return Observable.empty();
        }
        const handler = connectionMap.get(connectionType);
        const clientStream = channelToStream(inStream, context);
        return streamToChannel(handler(clientStream), context).takeUntil(
          closeConnectionStream.filter(event => event.context === context),
        );
      })
      .takeUntil(disconnectStream)
      .subscribe(event => socket.emit(SOCKET_CONNECTION, event));
  });

  return connection;
});
