/**
 * 创建测试用户 e2e_test，密码 Test@123!
 * 并直接插入数据库（绕过注册 API）
 */
import { db } from '../src/db';
import { users, wallets } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function main() {
  const email = 'e2e_test@worldcup.bet';
  const username = 'e2e_test';
  const password = 'Test@123!';

  console.log('正在创建测试用户...');

  // 检查用户是否已存在
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (existing.length > 0) {
    console.log('⚠️ 用户已存在，更新密码...');
    const passwordHash = await bcrypt.hash(password, 10);
    await db.update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.email, email));
    console.log('✅ 密码已更新');
  } else {
    console.log('创建新用户...');
    const passwordHash = await bcrypt.hash(password, 10);
    await db.insert(users).values({
      username,
      email,
      passwordHash,
      role: 'user',
      status: 'active',
      balanceCents: '0',
      totalBets: 0,
      totalWonCents: '0',
      totalLostCents: '0',
    });
    console.log('✅ 用户已创建');
  }

  // 确保有钱包
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  
  const existingWallet = await db.select({ id: wallets.id })
    .from(wallets)
    .where(eq(wallets.userId, user.id))
    .limit(1);

  if (existingWallet.length === 0) {
    await db.insert(wallets).values({
      userId: user.id,
      balanceCents: '100000', // ¥1000
      frozenCents: '0',
      currency: 'CNY',
    });
    console.log('✅ 钱包已创建，余额 ¥1000');
  } else {
    await db.update(wallets)
      .set({ balanceCents: '100000', updatedAt: new Date() })
      .where(eq(wallets.userId, user.id));
    console.log('✅ 钱包已更新，余额 ¥1000');
  }

  console.log('\n✅ 测试用户 ready：');
  console.log(`   邮箱: ${email}`);
  console.log(`   密码: ${password}`);
  console.log(`   User ID: ${user.id}`);
}

main().catch(console.error);
