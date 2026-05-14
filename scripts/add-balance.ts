/**
 * 给指定用户添加余额
 * 运行: npx tsx scripts/add-balance.ts [userId] [balanceCents]
 */
import { db } from '../src/db';
import { wallets } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const userId = parseInt(process.argv[2] || '15');
  const balanceCents = parseInt(process.argv[3] || '100000');
  
  console.log(`正在给用户 ID=${userId} 添加余额 ${balanceCents} 分...`);

  const existing = await db.select({ id: wallets.id })
    .from(wallets)
    .where(eq(wallets.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    await db.update(wallets)
      .set({ 
        balanceCents: balanceCents.toString(), 
        updatedAt: new Date() 
      })
      .where(eq(wallets.userId, userId));
    console.log(`✅ 已更新用户 ${userId} 的余额为 ${balanceCents} 分 (¥${balanceCents/100})`);
  } else {
    await db.insert(wallets).values({
      userId: userId,
      balanceCents: balanceCents.toString(),
      frozenCents: '0',
      currency: 'CNY',
    });
    console.log(`✅ 已创建用户 ${userId} 的钱包，余额 ${balanceCents} 分 (¥${balanceCents/100})`);
  }

  const wallet = await db.select()
    .from(wallets)
    .where(eq(wallets.userId, userId))
    .limit(1);
  
  console.log('钱包信息:', wallet[0]);
}

main().catch(console.error);
