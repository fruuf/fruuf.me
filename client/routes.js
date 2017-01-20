import React, { PropTypes } from 'react';
import { Router, Route } from 'react-enroute';
import Dashboard from '/components/Dashboard';

const NotFound = props => (
  <div>
    <h1>{`location "${props.location}" not found in "${process.env.GIT_COMMIT_HASH}"`}</h1>
  </div>
);

NotFound.propTypes = {
  location: PropTypes.string.isRequired,
};

export default () => (
  <Router location={window.location.pathname}>
    <Route path="/" component={Dashboard} />
    <Route path="*" component={NotFound} />
  </Router>
);
