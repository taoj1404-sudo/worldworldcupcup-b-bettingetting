/**
 * 给所有用户添加初始余额（1000元 = 100000分）
 */
import { db } from '../src/db';
import { users, wallets } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('正在给所有用户添加初始余额...\n');
  
  const allUsers = await db.select().from(users);
  console.log(`找到 ${allUsers.length} 个用户\n`);
  
  for (const user of allUsers) {
    const existing = await db.select({ id: wallets.id })
      .from(wallets)
      .where(eq(wallets.userId, user.id))
      .limit(1);
    
    if (existing.length > 0) {
      // 更新余额
      await db.update(wallets)
        .set({ 
          balanceCents: '100000', 
          updatedAt: new Date() 
        })
        .where(eq(wallets.userId, user.id));
      console.log(`✅ 已更新用户 ${user.username} (ID: ${user.id}) 的余额为 ¥1000`);
    } else {
      // 创建钱包
      await db.insert(wallets).values({
        userId: user.id,
        balanceCents: '100000',
        frozenCents: '0',
        currency: 'CNY',
      });
      console.log(`✅ 已创建用户 ${user.username} (ID: ${user.id}) 的钱包，余额 ¥1000`);
    }
  }
  
  console.log('\n✅ 所有用户余额初始化完成！');
}

main().catch(console.error);
