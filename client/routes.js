import React from 'react';
import { Route, IndexRoute } from 'react-router';
import Dashboard from '/components/Dashboard';

export default (
  <Route path="/">
    <IndexRoute component={Dashboard} />
    <Route path="dashboard" component={Dashboard} />
  </Route>
);
