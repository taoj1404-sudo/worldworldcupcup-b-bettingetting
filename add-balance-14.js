// 给测试用户(ID=14)加1000元余额
const { Client } = require('pg');
const client = new Client({ host: 'localhost', port: 5432, database: 'worldcup_betting', user: 'postgres', password: 'postgres' });
(async () => {
  await client.connect();
  const r = await client.query('UPDATE wallets SET balance_cents = 100000 WHERE user_id = 14');
  console.log('Updated:', r.rowCount);
  await client.end();
})();
