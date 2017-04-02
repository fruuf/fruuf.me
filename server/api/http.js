import { cacheFactory } from '/cache';
import { Server } from 'http';
import appFactory from './app';

export default cacheFactory(async () => {
  const app = await appFactory();
  const http = Server(app);
  http.listen(3000);
  return http;
});
