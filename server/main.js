import express from 'express';
import path from 'path';
import { Server } from 'http';
import socketIo from 'socket.io';
import index from './index.pug';
import getApi, { init } from './api';

const app = express();
const http = Server(app);
const io = socketIo(http);

// use git commit hash for cache busting
const hash = process.env.GIT_COMMIT_HASH.substr(0, 8);
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
  res.send(index({ ...bundleSrc }));
});

// nginx proxies non-static requests to port 3000
http.listen(3000, () => {
  init({ io, app });
});

getApi().then((api) => {
  api.queryState('tables').subscribe((tables) => {
    console.log(tables.toJS());
  });
});
