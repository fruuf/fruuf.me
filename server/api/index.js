import { Router } from 'express';
import schema from './schema';

const api = Router({});

let schemaRoute = schema;
api.get('/graphql', (...args) => schemaRoute(...args));
if (module.hot) {
  module.hot.accept('./schema', () => {
    schemaRoute = require('./schema').default;
  });
}


export default api;
