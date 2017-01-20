import express from 'express';
import path from 'path';
import index from './index.pug';
import api from './api';

const hash = (process.env.GIT_COMMIT_HASH).substr(0, 8);

const app = express();

let bundleSrc = {
  bundleJs: `/assets/js/bundle.${hash}.js`,
  bundleCss: `/assets/css/bundle.${hash}.css`,
};

if (process.env.NODE_ENV === 'development') {
  bundleSrc = {
    bundleJs: '/assets/js/bundle.js',
    bundleCss: '/assets/css/bundle.css',
  };
  app.use('/static', express.static(path.join(__dirname, '../static')));
  app.get('/assets/css/bundle.css', (req, res) => {
    res.set('Content-Type', 'text/css');
    res.status(200);
    res.end();
  });
}

app.get('*', (req, res) => {
  res.send(index(bundleSrc));
});

app.listen(3000);

let cleanup = api(app);
if (module.hot) {
  module.hot.accept('./api', () => {
    cleanup();
    const newApi = require('./api').default;
    cleanup = newApi(app);
  });
}
