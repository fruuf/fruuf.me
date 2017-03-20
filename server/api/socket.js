import { Subject } from 'rxjs';
import calcChanges from 'immutablediff';

export default async ({ io }) => {
  const socketSubject = new Subject();
  io.on('connection', socketSubject.next.bind(socketSubject));

  const interfaces = new Map();

  const addInterface = (name, callback) => interfaces.set(name, callback);

  const requestData = (name, args, uid, socket) => {
    let previousData;
    let isInitialData = true;
    const callback = interfaces.get(name);
    const subsciption = callback(...args).subscribe((data) => {
      if (isInitialData) {
        socket.emit({
          uid,
          type: DATA_INITIAL,
          data: data.toJS(),
        });
        isInitialData = false;
      } else {
        const changes = calcChanges(data, previousData);
        socket.emit({
          uid,
          type: DATA_UPDATE,
          changes: changes.toJS(),
        });
      }
      previousData = data;
    });
    socket.on('UNFOLLOW_DATA');
    // socket.emit()
  };

  return {};
};
