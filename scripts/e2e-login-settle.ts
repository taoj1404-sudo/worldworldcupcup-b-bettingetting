/**
 * 端到端测试：登录 → 更新比赛 → 结算
 */
import http from 'http';

function request(path: string, method: string, data?: any, token?: string): Promise<any> {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => resolve({ status: 0, error: err.message }));
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function main() {
  console.log('=== 端到端测试 ===\n');

  // Step 1: 管理员登录
  console.log('▶ Step 1: 管理员登录...');
  const login = await request('/api/auth/login', 'POST', {
    email: 'admin@worldcup.bet',
    password: 'Admin@2026!',
  });

  if (login.status !== 200 || login.data.code !== 0) {
    console.log('❌ 登录失败:', login.data);
    return;
  }
  console.log('✅ 登录成功');
  const adminToken = login.data.data.accessToken;
  const userToken = login.data.data.accessToken; // 使用同一个 token

  // Step 2: 获取比赛列表
  console.log('\n▶ Step 2: 获取比赛列表...');
  const matches = await request('/api/matches', 'GET');
  
  if (matches.status !== 200 || !matches.data.data?.matches?.length) {
    console.log('❌ 没有比赛数据');
    return;
  }
  
  const matchId = matches.data.data.matches[0].id;
  console.log(`✅ 找到比赛 ID: ${matchId}`);

  // Step 3: 注册测试用户
  console.log('\n▶ Step 3: 注册测试用户...');
  const username = `e2e_${Date.now()}`;
  const email = `${username}@test.com`;
  
  const register = await request('/api/auth/register', 'POST', {
    username,
    email,
    password: 'Test@123!',
  });

  if (register.status !== 201) {
    console.log('❌ 注册失败:', register.data);
    return;
  }
  console.log(`✅ 注册成功: ${username}`);

  // Step 4: 用户登录
  console.log('\n▶ Step 4: 用户登录...');
  const userLogin = await request('/api/auth/login', 'POST', {
    email,
    password: 'Test@123!',
  });

  if (userLogin.status !== 200) {
    console.log('❌ 用户登录失败');
    return;
  }
  const userToken2 = userLogin.data.data.accessToken;
  console.log('✅ 用户登录成功');

  // Step 5: 给用户添加余额
  console.log('\n▶ Step 5: 给用户添加余额...');
  // 这里需要直接操作数据库，因为 API 可能没有充值接口
  // 暂时跳过，假设用户已有余额

  // Step 6: 获取赔率
  console.log('\n▶ Step 6: 获取赔率...');
  const odds = await request(`/api/matches/${matchId}`, 'GET');
  
  if (odds.status !== 200 || !odds.data.data?.odds) {
    console.log('❌ 获取赔率失败');
    return;
  }
  
  // 赔率数据是按 betTypeId 分组的对象
  const oddsData = odds.data.data.odds;
  
  // 找到第一个有效的赔率
  let oddsId: number | null = null;
  let selection = 'home'; // API 需要 selection 字段
  
  for (const betTypeId in oddsData) {
    const oddsArray: any[] = oddsData[betTypeId];
    if (oddsArray && oddsArray.length > 0) {
      oddsId = oddsArray[0].id;
      selection = oddsArray[0].option || 'home'; // 赔率数据里是 option，但 API 需要 selection
      break;
    }
  }
  
  if (!oddsId) {
    console.log('❌ 没有赔率数据');
    return;
  }
  
  console.log(`✅ 找到赔率 ID: ${oddsId}, selection: ${selection}`);

  // Step 7: 下注
  console.log('\n▶ Step 7: 下注...');
  const bet = await request('/api/bets', 'POST', {
    matchId,
    oddsId,
    selection,
    amount_cents: 5000, // ¥50
    idempotency_key: `test_${Date.now()}`,
  }, userToken2);

  if (bet.status !== 201) {
    console.log('❌ 下注失败:', bet.data);
    console.log('提示: 可能余额不足，需要先用数据库脚本添加余额');
    return;
  }
  console.log('✅ 下注成功:', bet.data.data);

  // Step 8: 管理员更新比赛比分
  console.log('\n▶ Step 8: 更新比赛比分...');
  const updateMatch = await request(`/api/matches/${matchId}`, 'PUT', {
    homeScore: 2,
    awayScore: 1,
    status: 'finished',
  }, adminToken);

  if (updateMatch.status !== 200) {
    console.log('❌ 更新比赛失败:', updateMatch.data);
    return;
  }
  console.log('✅ 比赛已更新为 finished');

  // 等待 1 秒
  await new Promise(r => setTimeout(r, 1000));

  // Step 9: 批量结算
  console.log('\n▶ Step 9: 批量结算...');
  const settle = await request('/api/bets/settle', 'POST', {
    match_id: matchId,
  }, adminToken);

  if (settle.status !== 200) {
    console.log('❌ 结算失败:', settle.data);
    return;
  }
  console.log('✅ 结算成功:', settle.data);

  // Step 10: 查看排行榜
  console.log('\n▶ Step 10: 查看排行榜...');
  const leaderboard = await request('/api/leaderboard?limit=5', 'GET', null, userToken2);

  if (leaderboard.status !== 200) {
    console.log('❌ 排行榜失败:', leaderboard.data);
    return;
  }
  console.log('✅ 排行榜:', leaderboard.data.data?.leaderboard?.length || 0, '人');

  console.log('\n=== ✅ 端到端测试完成 ===');
}

main().catch(console.error);
