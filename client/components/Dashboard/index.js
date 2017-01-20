import React from 'react';
import classnames from 'classnames/bind';
import styles from './style.scss';

const classes = classnames.bind(styles);

export default () => (
  <div className={classes('dashboard')}>
    <h1>Hello</h1>
    <a href="/click">click here</a>
  </div>
);
