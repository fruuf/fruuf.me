import connectionFactory from '/api/connection';
import { TEST_CONNECTION } from '/util/const';

const run = async () => {
  const createConnection = await connectionFactory();
  createConnection(TEST_CONNECTION, inStream => inStream.map(i => i * 4).finally(() => console.log('finally')).delay(500).take(2));
};

run();
