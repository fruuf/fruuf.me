import express from 'express';
import path from 'path';
import index from './index.pug';
import api from './api';


const app = express();

// use git commit hash for cache busting
const hash = (process.env.GIT_COMMIT_HASH).substr(0, 8);
let bundleSrc = {
  bundleJs: `/assets/js/bundle.${hash}.js`,
  bundleCss: `/assets/css/bundle.${hash}.css`,
};

if (process.env.NODE_ENV === 'development') {
  // dont use hashes in development mode, files are not cached
  bundleSrc = {
    bundleJs: '/assets/js/bundle.js',
    bundleCss: '/assets/css/bundle.css',
  };

  // host static folders in development, in production done by nginx
  app.use('/static', express.static(path.join(__dirname, '../static')));

  // prevents 404 error since pack doesnt create stylesheets in development mode
  app.get('/assets/css/bundle.css', (req, res) => {
    res.set('Content-Type', 'text/css');
    res.status(200);
    res.end();
  });
}

// its a single page app, serve all requests with the entry html
app.get('*', (req, res) => {
  // pack includes pug/jade templates as a function of templateVars -> html
  res.send(index(bundleSrc));
});

// nginx proxies non-static requests to port 3000
app.listen(3000);

// allow hot-reloading of the API in development mode
let cleanup = api(app);
if (module.hot) {
  module.hot.accept('./api', () => {
    cleanup();
    const newApi = require('./api').default;
    cleanup = newApi(app);
  });
}
