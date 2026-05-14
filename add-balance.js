// 给测试用户加余额
const { Client } = require('pg');
const client = new Client({
  host: 'localhost', port: 5432,
  database: 'worldcup_betting',
  user: 'postgres', password: 'postgres',
});
(async () => {
  await client.connect();
  // 给所有余额<=0的用户加 100000 分（1000元）
  const r = await client.query(
    `UPDATE wallets SET balance_cents = 100000 WHERE user_id = 13`
  );
  console.log('更新行数:', r.rowCount);
  const v = await client.query('SELECT user_id, balance_cents FROM wallets WHERE user_id = 13');
  console.log('结果:', v.rows);
  await client.end();
})();
