import React from 'react';
import { setObservableConfig } from 'recompose';
import rxjsconfig from 'recompose/rxjsObservableConfig';
import Game from '/components/Game';
import 'inobounce';
import './main.global.css';

// hide the navigation bar on mobile
window.scrollTo(0, 1);
setObservableConfig(rxjsconfig);

export default () => <Game />;
