/* eslint-disable no-mixed-operators */
import React from 'react';
import connections, { createConnectionEnhancer } from '/connection';
import { compose, branch, withState, componentFromStream } from 'recompose';
import Game, { format } from './Game';

const stateEnhancer = compose(
  withState('autostart', 'setAutostart', false),
  withState('minPayout', 'setMinPayout', 0),
  withState('maxPayout', 'setMaxPayout', 0),
);

const connectionEnhancer = createConnectionEnhancer(
  connections('game'),
  {
    modifier: 'modifier',
    path: 'path',
    canStart: 'can-start',
    payoutRows: 'payout-rows',
    payout: 'payout',
    isRunning: 'is-running',
    stats: 'stats',
    balance: 'balance',
    finalPayout: 'final-payout',
    riskLevel: 'risk-level',
  },
  {
    startGame: 'start-game',
    stopGame: 'stop-game',
    setRiskLevel: 'risk-level',
  },
);

const maxPayoutEnhancer = branch(
  props => props.maxPayout,
  Component =>
    componentFromStream((propsStream) => {
      const propsCacheStream = propsStream.publishReplay(1);
      const subscription = propsCacheStream.connect();
      const getProp = propName => propsCacheStream.pluck(propName).distinctUntilChanged().share();
      const payoutStream = getProp('payout');
      const maxPayoutStream = getProp('maxPayout');
      const isRunningStream = getProp('isRunning');
      const stopGameStream = getProp('stopGame');

      const stopStream = isRunningStream
        .filter(Boolean)
        .switchMap(() => payoutStream.skip(1))
        .withLatestFrom(maxPayoutStream)
        .filter(([payout, maxPayout]) => payout >= maxPayout)
        .withLatestFrom(stopGameStream)
        .do(([, stopGame]) => stopGame());

      return propsStream
        .merge(stopStream.ignoreElements())
        .map(props => <Component {...props} />)
        .finally(() => subscription.unsubscribe())
        .share();
    }),
);

const minPayoutEnhancer = branch(
  props => props.minPayout,
  Component =>
    componentFromStream((propsStream) => {
      const propsCacheStream = propsStream.publishReplay(1);
      const subscription = propsCacheStream.connect();
      const getProp = propName => propsCacheStream.pluck(propName).distinctUntilChanged().share();
      const payoutStream = getProp('payout');
      const minPayoutStream = getProp('minPayout');
      const isRunningStream = getProp('isRunning');
      const stopGameStream = getProp('stopGame');

      const stopStream = isRunningStream
        .filter(Boolean)
        .switchMap(() => payoutStream.skip(1))
        .withLatestFrom(minPayoutStream)
        .filter(([payout, minPayout]) => payout <= minPayout)
        .withLatestFrom(stopGameStream)
        .do(([, stopGame]) => stopGame());

      return propsStream
        .merge(stopStream.ignoreElements())
        .map(props => <Component {...props} />)
        .finally(() => subscription.unsubscribe())
        .share();
    }),
);

const autostartEnhancer = branch(
  props => props.autostart,
  Component =>
    componentFromStream((propsStream) => {
      const propsCacheStream = propsStream.publishReplay(1);
      const subscription = propsCacheStream.connect();
      const getProp = propName => propsCacheStream.pluck(propName).distinctUntilChanged().share();
      const isRunningStream = getProp('isRunning');
      const canStartStream = getProp('canStart');
      const startGameStream = getProp('startGame');
      const balanceStream = getProp('balance');

      const startStream = canStartStream
        .filter(Boolean)
        .debounceTime(500)
        .withLatestFrom(isRunningStream)
        .filter(([, isRunning]) => !isRunning)
        .withLatestFrom(startGameStream)
        .do(([, startGame]) => startGame());

      const balanceTitleStream = balanceStream.filter(Boolean).do((balance) => {
        document.title = format(balance);
      });

      return propsStream
        .merge(startStream.ignoreElements(), balanceTitleStream.ignoreElements())
        .map(props => <Component {...props} />)
        .finally(() => subscription.unsubscribe())
        .share();
    }),
);

export default compose(
  connectionEnhancer,
  stateEnhancer,
  autostartEnhancer,
  minPayoutEnhancer,
  maxPayoutEnhancer,
)(Game);
