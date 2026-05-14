// 为所有用户创建钱包记录
const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'worldcup_betting',
  user: 'postgres',
  password: 'postgres',
});

(async () => {
  await client.connect();
  console.log('Connected to DB');

  // 为所有没有钱包的用户创建钱包
  const r = await client.query(`
    INSERT INTO wallets (user_id, balance_cents, currency)
    SELECT u.id, COALESCE(u.balance_cents, 0), 'CNY'
    FROM users u
    LEFT JOIN wallets w ON u.id = w.user_id
    WHERE w.id IS NULL
    RETURNING *
  `);

  console.log(`Created ${r.rowCount} wallet(s):`);
  r.rows.forEach((w) => {
    console.log(`  user_id=${w.user_id}, balance=${w.balance_cents}`);
  });

  await client.end();
  console.log('Done');
})();
