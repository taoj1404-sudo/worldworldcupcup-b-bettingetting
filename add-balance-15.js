/**
 * 给测试用户 ID=15 添加余额
 */
const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const { wallets } = require('./src/db/schema/index.ts');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/worldcup_betting',
});

const db = drizzle(pool);

async function main() {
  const userId = 15;
  const balanceCents = 100000; // ¥1000

  console.log(`正在给用户 ID=${userId} 添加余额 ${balanceCents} 分...`);

  // 检查钱包是否存在
  const existing = await db.select({ id: wallets.id })
    .from(wallets)
    .where(eq(wallets.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    // 更新余额
    await db.update(wallets)
      .set({ balanceCents: balanceCents.toString(), updatedAt: new Date() })
      .where(eq(wallets.userId, userId));
    console.log(`✅ 已更新用户 ${userId} 的余额为 ${balanceCents} 分`);
  } else {
    // 创建钱包
    await db.insert(wallets).values({
      userId: userId,
      balanceCents: balanceCents.toString(),
      frozenCents: '0',
      currency: 'CNY',
    });
    console.log(`✅ 已创建用户 ${userId} 的钱包，余额 ${balanceCents} 分`);
  }

  // 验证
  const wallet = await db.select()
    .from(wallets)
    .where(eq(wallets.userId, userId))
    .limit(1);
  
  console.log('钱包信息:', wallet[0]);

  await pool.end();
}

main().catch(console.error);
