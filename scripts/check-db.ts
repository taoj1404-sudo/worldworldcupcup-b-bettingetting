/**
 * 检查数据库中的数据：users, matches, odds, wallets
 */
import { db } from '../src/db';
import { users, matches, odds, wallets, betTypes } from '../src/db/schema';
import { count } from 'drizzle-orm';

async function main() {
  console.log('=== 数据库状态检查 ===\n');

  const userCount = await db.select({ c: count() }).from(users);
  console.log('users:', userCount[0].c);

  const matchCount = await db.select({ c: count() }).from(matches);
  console.log('matches:', matchCount[0].c);

  const oddsCount = await db.select({ c: count() }).from(odds);
  console.log('odds:', oddsCount[0].c);

  const betTypeCount = await db.select({ c: count() }).from(betTypes);
  console.log('betTypes:', betTypeCount[0].c);

  // 打印所有比赛
  const allMatches = await db.select().from(matches);
  console.log('\n=== 比赛列表 ===');
  console.log(JSON.stringify(allMatches, null, 2));

  // 打印所有赔率
  if (oddsCount[0].c > 0) {
    const allOdds = await db.select().from(odds);
    console.log('\n=== 赔率列表 ===');
    console.log(JSON.stringify(allOdds, null, 2));
  } else {
    console.log('\n⚠️  没有赔率数据！需要运行 seed 脚本添加赔率');
  }

  // 检查测试用户钱包
  const testUser = await db.select().from(users).where(eq(users.email, 'e2e_test@worldcup.bet')).limit(1);
  if (testUser.length > 0) {
    const w = await db.select().from(wallets).where(eq(wallets.userId, testUser[0].id)).limit(1);
    console.log('\ne2e_test 钱包:', w[0]?.balanceCents);
  }
}

import { eq } from 'drizzle-orm';
main().catch(console.error);
