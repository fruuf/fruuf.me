import { Router } from 'express';

export default async ({ app }) => {
  const router = Router({});
  app.use('/api', router);
  return { router };
};
