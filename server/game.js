/* eslint-disable no-mixed-operators */
import connectionsFactory from '/api/connections';
import { Observable, Subject } from 'rxjs';

const allPayoutsSubject = new Subject();

const statsStream = allPayoutsSubject
  .scan(
    (acc, cur) => {
      acc.count += 1;
      acc.average = (acc.count - 1) / acc.count * acc.average + cur / acc.count;
      return acc;
    },
    { count: 0, average: 0 },
  )
  .throttleTime(10000)
  .publishReplay(1);

statsStream.connect();

const GAME_ROWS = 11;
const GAME_CASINO_EDGE = 0.02;
const GAME_SPEED = 750;

const getPayoutRows = (rows, modifier) => {
  const payoutRows = [[1 - GAME_CASINO_EDGE]];
  for (let row = 1; row < rows; row += 1) {
    const previousPayout = payoutRows[row - 1];
    const potentialWin = previousPayout[0] * modifier - previousPayout[0];
    const payouts = [previousPayout[0] - potentialWin];
    payoutRows.push(payouts);
    for (let column = 0; column < row; column += 1) {
      // const left = previousPayout[j - 1] || 0;
      const prev = previousPayout[column];
      payouts.push(prev * modifier);
    }
  }
  return payoutRows;
};

connectionsFactory().then((connections) => {
  connections('game', (read, write) => {
    const clientStartGameStream = read('start-game');
    const clientStopGameStream = read('stop-game');
    const clientRiskLevelStream = read('risk-level');

    const isRunningSubject = new Subject();

    const isRunningStream = Observable.of(false)
      .merge(isRunningSubject)
      .distinctUntilChanged()
      .publishReplay(1)
      .refCount();

    const riskLevelStream = Observable.of('medium')
      .merge(
        isRunningStream.switchMap(
          isRunning => (!isRunning && clientRiskLevelStream) || Observable.empty(),
        ),
      )
      .distinctUntilChanged()
      .publishReplay()
      .refCount();

    const modifierStream = riskLevelStream
      .map((riskLevel) => {
        switch (riskLevel) {
          case 'low':
            return 1.15;
          case 'high':
            return 1.6;
          default:
            return 1.3;
        }
      })
      .publishReplay(1)
      .refCount();

    const canStartStream = Observable.of(false)
      .merge(
        isRunningStream.filter(isRunning => !isRunning).debounceTime(800).mapTo(true),
        isRunningStream.filter(isRunning => isRunning).mapTo(false),
      )
      .distinctUntilChanged();

    const stopStream = clientStopGameStream
      .withLatestFrom(isRunningStream, (_, isRunning) => isRunning)
      .filter(Boolean)
      .share();

    const startStream = clientStartGameStream
      .withLatestFrom(canStartStream, (_, canStart) => canStart)
      .filter(Boolean)
      .do(() => isRunningSubject.next(true))
      .share();

    const payoutRowsStream = modifierStream.map(modifier => getPayoutRows(GAME_ROWS, modifier));

    const gameStream = startStream
      .map(() => {
        const pathStream = Observable.interval(GAME_SPEED)
          // eslint-disable-next-line no-confusing-arrow
          .map(() => Math.random() > 0.5 ? 1 : 0)
          .scan((path, nextResult) => [...path, nextResult], [])
          .startWith([])
          .take(GAME_ROWS)
          .takeUntil(stopStream)
          .finally(() => isRunningSubject.next(false))
          .share();
        const payoutStream = pathStream
          .withLatestFrom(payoutRowsStream)
          .map(([path, payoutRows]) => {
            const sum = path.reduce((acc, cur) => acc + cur, 0);
            return payoutRows[path.length][sum];
          })
          .startWith(1 - GAME_CASINO_EDGE)
          .distinctUntilChanged()
          .share();
        return { payoutStream, pathStream };
      })
      .share();

    const pathStream = gameStream.switchMap(game => game.pathStream).startWith([]).share();

    const payoutStream = gameStream
      .switchMap(game => game.payoutStream)
      .startWith(1 - GAME_CASINO_EDGE)
      .share();

    const finalPayoutStream = gameStream
      .switchMap(game => game.payoutStream.last())
      .do(payout => allPayoutsSubject.next(payout))
      .share();

    write(false, finalPayoutStream);

    const balanceStream = finalPayoutStream
      .merge(startStream.mapTo(-1))
      .scan((acc, cur) => acc + cur, 0)
      .share();

    write('modifier', modifierStream);
    write('path', pathStream);
    write('can-start', canStartStream);
    write('payout-rows', payoutRowsStream);
    write('payout', payoutStream);
    write('is-running', isRunningStream);
    write('stats', statsStream);
    write('balance', balanceStream);
    write('final-payout', finalPayoutStream);
    write('risk-level', riskLevelStream);
    write();
  });
});
