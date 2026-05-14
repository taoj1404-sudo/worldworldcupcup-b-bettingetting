/**
 * 项目状态检查脚本
 * 运行方式: node check-status.js
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 WorldCup 竞猜平台 - 项目状态检查\n');
console.log('═'.repeat(60));

const projectRoot = __dirname;

// 1. 检查关键文件
console.log('\n📁 关键文件检查:');
const criticalFiles = [
  'package.json',
  '.env',
  'docker-compose.yml',
  'Dockerfile',
  'src/app/api/health/route.ts',
  'src/db/schema.ts',
  'test-health.js',
  'test-auth.js',
  'test-all.js',
];

let allFilesExist = true;
criticalFiles.forEach(file => {
  const filePath = path.join(projectRoot, file);
  const exists = fs.existsSync(filePath);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

// 2. 检查 package.json
console.log('\n📦 package.json 检查:');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
  console.log(`  ✅ 名称: ${packageJson.name}`);
  console.log(`  ✅ 版本: ${packageJson.version}`);
  console.log(`  ✅ 依赖数量: ${Object.keys(packageJson.dependencies).length}`);
  console.log(`  ✅ 开发依赖数量: ${Object.keys(packageJson.devDependencies).length}`);
  
  // 检查关键依赖
  const keyDeps = ['next', 'react', 'pg', 'drizzle-orm', 'bcryptjs', 'jose', 'zod'];
  keyDeps.forEach(dep => {
    const found = packageJson.dependencies[dep] || packageJson.devDependencies[dep];
    console.log(`  ${found ? '✅' : '❌'} ${dep}: ${found || '未找到'}`);
  });
} catch (e) {
  console.log(`  ❌ 无法读取 package.json: ${e.message}`);
}

// 3. 检查 .env 配置
console.log('\n⚙️  环境变量检查:');
try {
  const envPath = path.join(projectRoot, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n').filter(l => l.trim() && !l.startsWith('#'));
    
    const requiredVars = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
    requiredVars.forEach(varName => {
      const found = lines.find(l => l.startsWith(varName));
      console.log(`  ${found ? '✅' : '❌'} ${varName}`);
    });
    
    // 检查 DATABASE_URL
    const dbLine = lines.find(l => l.startsWith('DATABASE_URL'));
    if (dbLine) {
      console.log(`\n  数据库连接: ${dbLine.split('=')[1]}`);
    }
  } else {
    console.log('  ⚠️ .env 文件不存在');
  }
} catch (e) {
  console.log(`  ❌ 无法读取 .env: ${e.message}`);
}

// 4. 检查目录结构
console.log('\n📂 目录结构检查:');
const directories = [
  'src/app',
  'src/app/api',
  'src/components',
  'src/db',
  'src/lib',
  'public',
  'docs',
];

directories.forEach(dir => {
  const dirPath = path.join(projectRoot, dir);
  const exists = fs.existsSync(dirPath);
  console.log(`  ${exists ? '✅' : '❌'} ${dir}/`);
});

// 5. 检查 API 路由
console.log('\n🌐 API 路由检查:');
const apiRoutes = [
  'api/health',
  'api/auth/login',
  'api/auth/register',
  'api/matches',
  'api/odds',
  'api/bets',
  'api/wallet',
  'api/leaderboard',
];

apiRoutes.forEach(route => {
  const routePath = path.join(projectRoot, 'src/app', route, 'route.ts');
  const exists = fs.existsSync(routePath);
  console.log(`  ${exists ? '✅' : '❌'} /${route}`);
});

// 6. 检查测试文件
console.log('\n🧪 测试脚本检查:');
const testScripts = [
  'test-health.js',
  'test-auth.js',
  'test-all.js',
  'check-status.js',
];

testScripts.forEach(script => {
  const scriptPath = path.join(projectRoot, script);
  const exists = fs.existsSync(scriptPath);
  console.log(`  ${exists ? '✅' : '❌'} ${script}`);
});

// 7. 总结
console.log('\n' + '═'.repeat(60));
console.log('\n📋 总结:');

if (allFilesExist) {
  console.log('  ✅ 所有关键文件都存在');
  console.log('  ✅ 项目结构完整');
  console.log('');
  console.log('🚀 启动步骤:');
  console.log('  1. 确保 PostgreSQL 正在运行');
  console.log('  2. 运行 npm install（如果还没安装依赖）');
  console.log('  3. 运行 npm run db:push（如果还没迁移数据库）');
  console.log('  4. 运行 npm run dev 启动开发服务器');
  console.log('  5. 运行 node test-all.js 进行综合测试');
} else {
  console.log('  ⚠️ 部分关键文件缺失');
  console.log('  ❌ 请检查文件是否正确创建');
}

console.log('\n' + '═'.repeat(60));
console.log('');
