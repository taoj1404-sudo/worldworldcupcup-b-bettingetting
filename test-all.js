/**
 * 综合功能测试脚本
 * 运行所有核心功能的测试
 * 运行方式: node test-all.js
 */

const http = require('http');
const { URL } = require('url');

const BASE_URL = 'http://localhost:3000';

// 测试用户数据
const testUser = {
  username: `testuser_${Date.now()}`,
  email: `test_${Date.now()}@example.com`,
  password: 'TestPassword123!',
};

let authToken = null;

function makeRequest(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data),
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('\n🚀 WorldCup 竞猜平台 - 综合测试\n');
  console.log('═'.repeat(60));
  console.log(`测试目标: ${BASE_URL}`);
  console.log('═'.repeat(60));

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      console.log(`\n📋 ${name}`);
      await fn();
      console.log(`✅ PASS`);
      passed++;
    } catch (error) {
      console.log(`❌ FAIL: ${error.message}`);
      failed++;
    }
  }

  try {
    // 1. 健康检查
    await test('🏥 健康检查', async () => {
      const res = await makeRequest('/api/health');
      if (res.status !== 200) throw new Error(`状态码: ${res.status}`);
    });

    // 2. 获取比赛列表
    await test('⚽ 获取比赛列表', async () => {
      const res = await makeRequest('/api/matches');
      if (res.status !== 200) throw new Error(`状态码: ${res.status}`);
      console.log(`   找到 ${res.data.matches?.length || 0} 场比赛`);
    });

    // 3. 获取赔率
    await test('💰 获取赔率', async () => {
      const res = await makeRequest('/api/odds');
      if (res.status !== 200) throw new Error(`状态码: ${res.status}`);
      console.log(`   找到 ${res.data.odds?.length || 0} 个赔率`);
    });

    // 4. 用户注册
    await test('🔐 用户注册', async () => {
      const res = await makeRequest('/api/auth/register', 'POST', {
        username: testUser.username,
        email: testUser.email,
        password: testUser.password,
        confirmPassword: testUser.password,
      });
      if (res.status !== 201 && res.status !== 200) {
        throw new Error(`状态码: ${res.status}`);
      }
      if (res.data.token) {
        authToken = res.data.token;
      }
    });

    // 5. 用户登录
    await test('🔓 用户登录', async () => {
      const res = await makeRequest('/api/auth/login', 'POST', {
        email: testUser.email,
        password: testUser.password,
      });
      if (res.status !== 200) throw new Error(`状态码: ${res.status}`);
      if (res.data.token) {
        authToken = res.data.token;
      }
    });

    // 6. 获取用户信息（需要认证）
    if (authToken) {
      await test('👤 获取用户信息', async () => {
        const res = await makeRequest('/api/auth/me', 'GET', null, authToken);
        if (res.status !== 200) throw new Error(`状态码: ${res.status}`);
        console.log(`   用户: ${res.data.user?.username || 'N/A'}`);
      });

      // 7. 获取用户余额
      await test('💳 获取用户余额', async () => {
        const res = await makeRequest('/api/wallet/balance', 'GET', null, authToken);
        if (res.status !== 200) throw new Error(`状态码: ${res.status}`);
        console.log(`   余额: ${res.data.balance || 0}`);
      });

      // 8. 获取钱包历史
      await test('📜 获取钱包历史', async () => {
        const res = await makeRequest('/api/wallet/history', 'GET', null, authToken);
        if (res.status !== 200) throw new Error(`状态码: ${res.status}`);
        console.log(`   记录数: ${res.data.history?.length || 0}`);
      });

      // 9. 下注
      await test('🎯 下注功能', async () => {
        // 先获取比赛和赔率
        const matchesRes = await makeRequest('/api/matches');
        const oddsRes = await makeRequest('/api/odds');
        
        if (matchesRes.data.matches?.length > 0 && oddsRes.data.odds?.length > 0) {
          const matchId = matchesRes.data.matches[0].id;
          const oddId = oddsRes.data.odds[0].id;
          const amount = 100;
          
          const betRes = await makeRequest('/api/bets', 'POST', {
            matchId,
            oddId,
            amount,
          }, authToken);
          
          if (betRes.status !== 201 && betRes.status !== 200) {
            throw new Error(`状态码: ${betRes.status}`);
          }
        } else {
          throw new Error('无可用比赛或赔率');
        }
      });
    }

    // 10. 获取排行榜
    await test('🏆 获取排行榜', async () => {
      const res = await makeRequest('/api/leaderboard');
      if (res.status !== 200) throw new Error(`状态码: ${res.status}`);
      console.log(`   前10名用户数: ${res.data.leaderboard?.length || 0}`);
    });

  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error.message);
  }

  // 打印测试报告
  console.log('\n' + '═'.repeat(60));
  console.log('\n📊 测试报告:');
  console.log(`   ✅ 通过: ${passed}`);
  console.log(`   ❌ 失败: ${failed}`);
  console.log(`   📈 总计: ${passed + failed}`);
  console.log('═'.repeat(60));

  if (failed === 0) {
    console.log('\n🎉 所有测试通过！\n');
  } else {
    console.log(`\n⚠️  有 ${failed} 项测试失败，请检查上述错误信息。\n`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
