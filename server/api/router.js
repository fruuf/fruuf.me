import { cacheFactory } from '/util';
import { Router } from 'express';
import appFactory from './app';

export default cacheFactory(async () => {
  const app = await appFactory();
  const router = Router({});
  app.use('/api', router);
  return router;
});
