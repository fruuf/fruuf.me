import { Observable, Subject } from 'rxjs';
import { lifecycle, createEventHandler } from 'recompose';

const CHANNEL_DATA = 'd';
const CHANNEL_COMPLETE = 'c';
const CHANNEL_ERROR = 'e';
const CONNECTION_IN = '__in';
const CONNECTION_OUT = '__out';
const CONNECTION_OPEN = 'o';
const CONNECTION_CLOSE = 'c';
const CONNECTION_DATA = 'd';
const BUFFER_TIME = 30;

export const channelToStream = (channel, context) =>
  Observable.create((observer) => {
    const subscription = channel.filter(([eventContext]) => eventContext === context).subscribe({
      next(event) {
        const [, type, data] = event;

        if (type === CHANNEL_DATA) observer.next(data);

        if (type === CHANNEL_COMPLETE) observer.complete();

        if (type === CHANNEL_ERROR) observer.error(data);
      },
      complete() {
        observer.complete();
      },
      error(e) {
        observer.error(e);
      },
    });

    return () => subscription.unsubscribe();
  });

export const streamToChannel = (stream, context) =>
  Observable.create((observer) => {
    const subscription = stream.subscribe({
      next(data) {
        observer.next([context, CHANNEL_DATA, data]);
      },

      complete() {
        observer.next([context, CHANNEL_COMPLETE]);
        observer.complete();
      },

      error(data) {
        observer.next([context, CHANNEL_ERROR, data]);
        observer.complete();
      },
    });
    return () => subscription.unsubscribe();
  });

const connectionMap = new Map();

const readSocket = (socket, type) =>
  Observable.create((observer) => {
    const handler = event => observer.next(event);
    socket.on(type, handler);
    let disconnectSubscription = false;
    if (type !== 'disconnect') {
      disconnectSubscription = readSocket(socket, 'disconnect')
        .take(1)
        .subscribe(() => observer.complete());
    }
    return () => {
      socket.removeListener(type, handler);
      if (disconnectSubscription) {
        disconnectSubscription.unsubscribe();
      }
    };
  });

const writeSocket = (socket, type, stream) =>
  stream.takeUntil(readSocket(socket, 'disconnect')).subscribe(data => socket.emit(type, data));

const createReadWrite = (inStream = Observable.empty()) => {
  const closeSubject = new Subject();
  const closeStream = closeSubject.take(1).publishReplay(1);
  closeStream.connect();
  const writeSubject = new Subject();
  const sharedInStream = inStream.takeUntil(closeStream).share();
  const channels = writeSubject
    .scan((prevChannels, nextChannel) => [...prevChannels, nextChannel], [])
    .startWith([])
    .publishReplay(1);

  const channelsSubscription = channels.connect();

  closeStream.subscribe(() => {
    channelsSubscription.unsubscribe();
  });

  const readCacheSubject = new Subject();
  readCacheSubject
    .mergeMap(stream => stream.ignoreElements())
    .takeUntil(closeStream)
    .publish()
    .connect();

  const writeMap = new Map();

  const write = (type, stream) => {
    if (!type && stream) {
      return writeSubject.next(stream.ignoreElements());
    } else if (type && stream) {
      if (process.env.NODE_ENV === 'development' && writeMap.has(type)) {
        throw new Error(`can only write once to ${type}`);
      }
      writeMap.set(type, true);
      return writeSubject.next(streamToChannel(stream, type).share());
    }
    return writeSubject.complete();
  };

  const read = (context, cache = 0) => {
    const stream = channelToStream(sharedInStream, context);
    if (cache > 0) {
      // create cache and keep publish alive by outStream
      const cachedStream = stream.publishReplay(cache).refCount();
      readCacheSubject.next(cachedStream);
      return cachedStream;
    }
    return stream.share();
  };

  const channel = channels
    .switchMap(currentChannels => Observable.merge(...currentChannels))
    .finally(() => closeSubject.next())
    .share();

  return {
    read,
    write,
    channel,
  };
};

export const registerConnectionHandler = (connection, handler) => {
  if (connectionMap.has(connection)) throw new Error(`${connection} is already defined`);
  connectionMap.set(connection, handler);
  return () => connectionMap.delete(connection);
};

export const connectServer = (dataStream) => {
  const connectionsOpenStream = dataStream
    .filter(([type]) => type === CONNECTION_OPEN)
    .map(([, data]) => data)
    .share();
  const connectionsDataStream = dataStream
    .filter(([type]) => type === CONNECTION_DATA)
    .map(([, data]) => data)
    .share();
  const connectionsCloseStream = dataStream
    .filter(([type]) => type === CONNECTION_CLOSE)
    .map(([, data]) => data)
    .share();

  return connectionsOpenStream
    .mergeMap(([connectionContext, connection]) => {
      if (!connectionMap.has(connection)) {
        // eslint-disable-next-line no-console
        console.log(`connection ${connection} not found`);
        return Observable.empty();
      }
      const connectionDataStream = connectionsDataStream
        .filter(([context]) => context === connectionContext)
        .map(([, data]) => data)
        .share();

      const { read, write, channel } = createReadWrite(
        connectionDataStream
          .takeUntil(connectionsCloseStream.filter(([context]) => connectionContext === context))
          .share(),
      );

      const handler = connectionMap.get(connection);
      const noop = () => {};
      const cleanup = handler(read, write) || noop;
      return streamToChannel(channel, connectionContext).finally(() => cleanup()).share();
    })
    .takeUntil(dataStream.ignoreElements().defaultIfEmpty(true))
    .share();
};

let contextCounter = 0;
export const openConnection = (dataStream, connection) => {
  const localConnectionCloseSubject = new Subject();
  const localConnectionCloseStream = localConnectionCloseSubject.take(1).share();
  contextCounter += 1;
  const connectionContext = String(contextCounter);
  const remoteOutStream = channelToStream(dataStream, connectionContext)
    .finally(() => localConnectionCloseSubject.next())
    .share();

  const { read, write, channel } = createReadWrite(remoteOutStream);

  const outChannel = Observable.of([CONNECTION_OPEN, [connectionContext, connection]])
    .merge(channel.map(data => [CONNECTION_DATA, [connectionContext, data]]))
    .takeUntil(localConnectionCloseStream)
    .merge(
      Observable.merge(
        dataStream.ignoreElements().defaultIfEmpty(false),
        localConnectionCloseStream.mapTo(true),
      )
        .take(1)
        .filter(Boolean)
        .mapTo([CONNECTION_CLOSE, [connectionContext]]),
    );

  return { read, write, channel: outChannel };
};

export const connectSocket = (socket) => {
  const localInStream = readSocket(socket, CONNECTION_IN)
    .mergeMap(buffer => Observable.of(...buffer))
    .share();

  const channel = connectServer(localInStream);

  writeSocket(socket, CONNECTION_OUT, channel.buffer(channel.debounceTime(BUFFER_TIME)).share());
};

export const openSocketConnection = (socket, connection) => {
  const localInStream = readSocket(socket, CONNECTION_OUT)
    .mergeMap(buffer => Observable.of(...buffer))
    .share();
  const { read, write, channel } = openConnection(localInStream, connection);
  writeSocket(socket, CONNECTION_IN, channel.buffer(channel.debounceTime(BUFFER_TIME)).share());
  return { read, write };
};

export const createConnectionEnhancer = (connection, readProps, writeProps) =>
  lifecycle({
    componentWillMount() {
      const { read, write } = connection();
      this.read = read;
      const handlers = Object.keys(writeProps).reduce(
        (prevHandlers, writeProp) => {
          const { stream, handler } = createEventHandler();
          write(writeProps[writeProp], stream);
          return { ...prevHandlers, [writeProp]: handler };
        },
        {},
      );
      write();
      this.state = handlers;
    },
    componentDidMount() {
      const readStreams = Object.keys(readProps).map(readProp =>
        this.read(readProps[readProp]).map(data => ({
          [readProp]: data,
        })));

      const stateStream = Observable.merge(...readStreams);
      this.subscription = stateStream.subscribe(state => this.setState(state));
    },
    componentWillUnmount() {
      this.subscription.unsubscribe();
    },
  });
