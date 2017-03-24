import { Observable } from 'rxjs';
import { cacheFactory } from '/util';
import connectionFactory from './connection';

export default cacheFactory(async () => {
  const createConnection = await connectionFactory();

  const createFollow = (followStream) => {

  };
  return createFollow;
});
