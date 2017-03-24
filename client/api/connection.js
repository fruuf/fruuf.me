import createSocket from 'socket.io-client';
import { Subject, Observable, Scheduler } from 'rxjs';
import {
  channelToStream,
  streamToChannel,
  SOCKET_CONNECTION,
  SOCKET_CONNECTION_OPEN,
  SOCKET_CONNECTION_CLOSE,
} from '/util';

let contextCounter = 1;

const socket = createSocket('http://localhost:8080');

const inStream = Observable.create((observer) => {
  const handler = event => observer.next(event);
  socket.on(SOCKET_CONNECTION, handler);
  return () => socket.removeListener(SOCKET_CONNECTION, handler);
}).share();

const outSubject = new Subject();

outSubject
  .mergeMap(stream => stream)
  .do(event => console.log('toServer', event))
  .subscribe(event => socket.emit(SOCKET_CONNECTION, event));

export default connectionType =>
  (clientStream = Observable.empty()) =>
    Observable.create((observer) => {
      const connectionOutSubject = new Subject();
      const context = String(contextCounter);
      contextCounter += 1;

      const closeConnectionStream = connectionOutSubject
        .filter(event => event.type === SOCKET_CONNECTION_CLOSE)
        .take(1)
        // handle the cleanup async to ensure sending CLOSE_CONNECTION
        .observeOn(Scheduler.async)
        .share();

      const connectionInStream = channelToStream(inStream, context).takeUntil(
        closeConnectionStream,
      );

      // send the outStream to the socket
      outSubject.next(
        connectionOutSubject.takeUntil(
          // stop emitting events when server has completed or client stopped listening
          closeConnectionStream.merge(connectionInStream.ignoreElements().defaultIfEmpty(true)),
        ),
      );

      // open the connection
      connectionOutSubject.next({
        type: SOCKET_CONNECTION_OPEN,
        connectionType,
        context,
      });

      streamToChannel(clientStream, context)
        .takeUntil(closeConnectionStream)
        .subscribe(connectionOutSubject);

      connectionInStream.subscribe(observer);

      return () => {
        // close the connection
        connectionOutSubject.next({ type: SOCKET_CONNECTION_CLOSE, context });
        connectionOutSubject.complete();
      };
    }).share();
