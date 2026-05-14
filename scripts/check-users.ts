/**
 * 检查所有用户，特别是管理员账号
 */
import { db } from '../src/db';
import { users } from '../src/db/schema';

async function main() {
  console.log('正在检查数据库中的用户...\n');
  
  const allUsers = await db.select().from(users);
  
  if (allUsers.length === 0) {
    console.log('❌ 数据库中没有用户！');
    return;
  }
  
  console.log(`✅ 找到 ${allUsers.length} 个用户：\n`);
  
  allUsers.forEach(user => {
    console.log(`ID: ${user.id}`);
    console.log(`  邮箱: ${user.email}`);
    console.log(`  用户名: ${user.username}`);
    console.log(`  角色: ${user.role}`);
    console.log(`  状态: ${user.status}`);
    console.log(`  余额: ${user.balanceCents} 分`);
    console.log('');
  });
  
  const admin = allUsers.find(u => u.role === 'admin');
  if (admin) {
    console.log('✅ 找到管理员账号：');
    console.log(`  邮箱: ${admin.email}`);
    console.log(`  密码: Admin@2026!`);
  } else {
    console.log('❌ 没有找到管理员账号！');
  }
}

main().catch(console.error);
