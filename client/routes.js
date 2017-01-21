import React from 'react';
import { Router, Route } from 'react-enroute'; // way smaller than react router
import Dashboard from '/components/Dashboard'; // absolute import gets resolved in client
import NotFound from '/components/NotFound';


export default () => (
  <Router location={window.location.pathname}>
    <Route path="/" component={Dashboard} />
    <Route path="*" component={NotFound} />
  </Router>
);
