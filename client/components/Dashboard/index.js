import React from 'react';
import { connect } from 'react-redux';
import classnames from 'classnames/bind';
import { compose, lifecycle } from 'recompose';
import styles from './dashboard-style.scss';
import { currentTable } from '/ducks';

const classes = classnames.bind(styles);

const Dashboard = ({ state }) => (
  <div className={classes('dashboard')}>
    <div className={classes('message')}>
      <h1>Welcome to fruuf.me!!!</h1>
      <pre>
        {JSON.stringify(state, null, 4)}
      </pre>
    </div>
  </div>
);

export default compose(
  lifecycle({
    componentDidMount() {
      currentTable.follow('bla');
      // console.log('did mount!');
    },
  }),
  connect(state => ({ state })),
)(Dashboard);
