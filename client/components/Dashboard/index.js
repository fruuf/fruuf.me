import React from 'react';
import classnames from 'classnames/bind';
import styles from './dashboard-style.scss';

const classes = classnames.bind(styles);

export default () => (
  <div className={classes('dashboard')}>
    <div className={classes('message')}>
      <h1>Welcome to fruuf.me</h1>
      <p>
        Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor
        invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam
        et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est
        Lorem ipsum dolor sit amet.
      </p>
    </div>
  </div>
);
