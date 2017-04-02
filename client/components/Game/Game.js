/* eslint-disable react/prop-types */
import React from 'react';
import classnames from 'classnames/bind';
import styles from './game.scss';

const classes = classnames.bind(styles);

export const format = (n) => {
  const match = String(Math.floor(n * 100) / 100).match(/^(-?\d+)\.?(\d*)$/);
  const [, pre] = match;
  let [, , post = ''] = match;
  while (post.length < 2) {
    post += '0';
  }
  return `${pre}.${post}`;
};

const Game = props => (
  <div className={classes('game')}>
    {(props.balance || null) &&
      <div className={classes('balance')}>
        {format(props.balance)}
      </div>}
    {(props.stats || null) &&
      <div className={classes('average-payout')}>
        {format(props.stats.average)}, {props.stats.count}
      </div>}
    {(props.payout || null) &&
      <div className={classes('current-payout')}>
        {format(props.payout)}
      </div>}
    <div className={classes('field')}>
      {props.payoutRows &&
        props.payoutRows.map((payouts, row) => {
          const isActive = props.path &&
            (props.isRunning || props.path.length) &&
            props.path.length >= row;
          // console.log('row', row, path.slice(0, row));
          const activeColumn = isActive &&
            props.path.slice(0, row).reduce((acc, cur) => acc + cur, 0);
          return (
            <div className={classes('row', isActive && 'row-active')}>
              {payouts.map((mapPayout, column) => (
                <div
                  onClick={() =>
                    mapPayout > 1
                      ? props.maxPayout && props.setMaxPayout(mapPayout)
                      : props.minPayout && props.setMinPayout(mapPayout)}
                  className={classes(
                    'payout',
                    isActive && activeColumn === column && 'payout-active',
                    mapPayout < 0.5 && 'payout-low',
                    mapPayout >= 0.5 && mapPayout < 1.5 && 'payout-medium',
                    mapPayout >= 1.5 && 'payout-high',
                  )}
                />
              ))}
            </div>
          );
        })}
    </div>
    <div className={classes('control')}>
      <div className={classes('control-game')}>
        {!props.isRunning &&
          <div
            className={classes(
              'button',
              'button-game',
              'button-game-start',
              !props.canStart && 'button-game-start-disabled',
            )}
            onClick={() => props.startGame()}
          >
            Start
          </div>}
        {props.isRunning &&
          <div
            className={classes('button', 'button-game', 'button-game-stop')}
            onClick={() => props.stopGame()}
          >
            Stop
          </div>}
      </div>
      <div className={classes('control-risk')}>
        <div
          className={classes('button', props.riskLevel === 'low' && 'button-active')}
          onClick={() => props.setRiskLevel('low')}
        >
          low
        </div>
        <div
          className={classes('button', props.riskLevel === 'medium' && 'button-active')}
          onClick={() => props.setRiskLevel('medium')}
        >
          medium
        </div>
        <div
          className={classes('button', props.riskLevel === 'high' && 'button-active')}
          onClick={() => props.setRiskLevel('high')}
        >
          high
        </div>
      </div>

      <div className={classes('options')}>
        <div
          className={classes('option', props.autostart && 'option-active')}
          onClick={() => props.setAutostart(!props.autostart)}
        >
          <span className={classes('option-label')}>
            autostart
          </span>
          <span className={classes('option-value')}>
            {props.autostart ? 'yes' : 'no'}
          </span>
        </div>
        <div
          className={classes('option', props.minPayout && 'option-active')}
          onClick={() => props.minPayout ? props.setMinPayout(0) : props.setMinPayout(0.5)}
        >
          <span className={classes('option-label')}>
            min-payout
          </span>
          <span className={classes('option-value')}>
            {props.minPayout ? format(props.minPayout) : 'no'}
          </span>
        </div>
        <div
          className={classes('option', props.maxPayout && 'option-active')}
          onClick={() => props.maxPayout ? props.setMaxPayout(0) : props.setMaxPayout(2)}
        >
          <span className={classes('option-label')}>
            max-payout
          </span>
          <span className={classes('option-value')}>
            {props.maxPayout ? format(props.maxPayout) : 'no'}
          </span>
        </div>
      </div>
    </div>
  </div>
);

export default Game;
