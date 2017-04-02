/* eslint-disable no-mixed-operators */
import connectionsFactory from '/api/connections';

connectionsFactory().then((connections) => {
  connections.testConnection((read, write) => {
    const result = read('test').map(i => String(i * 2)).startWith('4');
    write('test', result);
  });
});
