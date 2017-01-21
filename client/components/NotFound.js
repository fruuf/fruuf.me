import React, { PropTypes } from 'react';

// just some error component for now
const NotFound = props => (
  <div>
    {/* GIT_COMMIT_HASH provided during the build process */}
    <pre>{`location "${props.location}" not found in "${(process.env.GIT_COMMIT_HASH).substr(0, 8)}"`}</pre>
  </div>
);

NotFound.propTypes = {
  location: PropTypes.string.isRequired,
};

export default NotFound;
