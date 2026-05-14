// E2E 端到端测试：注册 → 登录 → 下注 → 结算
const http = require('http');

const BASE = 'http://localhost:3000';
let userToken = '';
let adminToken = '';
let userId = '';
let oddsId = 0;
let betId = 0;

function req(path, method, body, token) {
  return new Promise((resolve) => {
    const bodyStr = body ? JSON.stringify(body) : '';
    const options = {
      method,
      hostname: 'localhost',
      port: 3000,
      path,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
    const req = http.request(options, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) });
        } catch { resolve({ status: res.statusCode, raw: d }); }
      });
    });
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function step(label, fn) {
  process.stdout.write(`\n▶ ${label}... `);
  return fn().then((r) => {
    const ok = r.status >= 200 && r.status < 300;
    const info = r.data ? JSON.stringify(r.data).substring(0, 150) : (r.raw || r.error || '?');
    console.log(ok ? `✅ ${r.status}` : `❌ ${r.status}`, info);
    return r;
  });
}

(async () => {
  console.log('=== E2E 端到端测试 ===\n');

  // ── Step 1: 注册 ──
  const ts = Date.now();
  const reg = await step('注册新用户', () =>
    req('/api/auth/register', 'POST', {
      username: `e2e_${ts}`,
      email: `e2e_${ts}@test.com`,
      password: 'Test1234!',
    })
  );
  if (reg.status !== 201) { console.log('\n❌ 注册失败，终止'); return; }
  userId = reg.data.data.user.id;
  const userEmail = reg.data.data.user.email;
  console.log(`   ID: ${userId}, Email: ${userEmail}`);

  // ── Step 2: 登录 ──
  const login = await step('用户登录', () =>
    req('/api/auth/login', 'POST', {
      email: userEmail,
      password: 'Test1234!',
    })
  );
  if (login.status !== 200) { console.log('\n❌ 登录失败'); return; }
  userToken = login.data.data.accessToken;
  console.log(`   Token: ${userToken.substring(0, 20)}...`);

  // ── Step 3: 获取比赛列表 ──
  const matches = await step('获取比赛列表', () =>
    req('/api/matches', 'GET', null, userToken)
  );
  if (matches.status !== 200) { console.log('\n❌ 获取比赛失败'); return; }
  const allMatches = matches.data.data.matches || [];
  console.log(`   共 ${allMatches.length} 场`);
  const matchId = allMatches[0]?.id;
  if (!matchId) { console.log('   ⚠️  没有比赛数据'); return; }
  console.log(`   使用比赛 ID: ${matchId}`);

  // ── Step 4: 获取赔率，提取 odds_id ──
  const odds = await step('获取赔率', () =>
    req(`/api/odds?matchId=${matchId}`, 'GET', null, userToken)
  );
  if (odds.status !== 200) { console.log('\n⚠️  获取赔率失败'); }
  const oddsByType = odds.status === 200 ? (odds.data.data.oddsByType || {}) : {};
  // oddsByType 结构: { [betTypeId]: [ { id, betType: { code }, ... } ] }
  let homeOddsId = 0;
  let homeSelection = 'home';
  for (const [betTypeId, oddsList] of Object.entries(oddsByType)) {
    for (const o of oddsList) {
      if (o.betType?.code === 'home_win') {
        homeOddsId = o.id;
        break;
      }
    }
    if (homeOddsId) break;
  }
  // 如果没找到 home_win，取第一个可用的
  if (!homeOddsId) {
    for (const [betTypeId, oddsList] of Object.entries(oddsByType)) {
      if (oddsList.length) {
        homeOddsId = oddsList[0].id;
        homeSelection = oddsList[0].betType?.code === 'away_win' ? 'away' : 'home';
        break;
      }
    }
  }
  console.log(`   选择赔率 ID: ${homeOddsId}, selection: ${homeSelection}`);

  // ── Step 5: 查看余额 ──
  const wallet1 = await step('下注前余额', () =>
    req('/api/wallet/balance', 'GET', null, userToken)
  );
  const bal1 = wallet1.status === 200 ? wallet1.data.data.balance : '?';
  console.log(`   余额: ¥${bal1}`);

  // ── Step 6: 下注 ──
  if (homeOddsId) {
    const bet = await step('下注 ¥50', () =>
      req('/api/bets', 'POST', {
        odds_id: homeOddsId,
        selection: homeSelection,
        amount_cents: 5000,
        idempotency_key: `e2e_${ts}_${userId}`,
      }, userToken)
    );
    if (bet.status === 200 || bet.status === 201) {
      betId = (bet.data.data || bet.data).bet_id || 0;
      console.log(`   下注ID: ${betId}`);
    }
  } else {
    console.log('\n⚠️  无可用赔率，跳过下注');
  }

  // ── Step 7: 下注后余额 ──
  const wallet2 = await step('下注后余额', () =>
    req('/api/wallet/balance', 'GET', null, userToken)
  );
  if (wallet2.status === 200) {
    console.log(`   余额: ¥${wallet2.data.data.balance}`);
  }

  // ── Step 8: 管理员登录 ──
  const adminLogin = await step('管理员登录', () =>
    req('/api/auth/login', 'POST', {
      email: 'admin@worldcup.bet',
      password: 'Admin@2026!',
    })
  );
  if (adminLogin.status !== 200) { console.log('\n❌ 管理员登录失败'); return; }
  adminToken = adminLogin.data.data.accessToken;

  // ── Step 9: 更新比赛比分和状态 ──
  const updateMatch = await step('更新比赛比分 2:1 并设置 finished', () =>
    req(`/api/matches/${matchId}`, 'PUT', {
      homeScore: 2,
      awayScore: 1,
      status: 'finished'
    }, adminToken)
  );

  // ── Step 10: 批量结算比赛投注 ──
  await new Promise((r) => setTimeout(r, 500));
  const settle = await step('批量结算比赛投注', () =>
    req('/api/bets/settle', 'POST', {
      match_id: matchId
    }, adminToken)
  );

  // ── Step 10: 结算后余额 ──
  await new Promise((r) => setTimeout(r, 1500));
  const wallet3 = await step('结算后余额', () =>
    req('/api/wallet/balance', 'GET', null, userToken)
  );
  if (wallet3.status === 200) {
    console.log(`   余额: ¥${wallet3.data.data.balance}（下注¥50，赔率2.0应赢¥50）`);
  }

  // ── Step 11: 排行榜 ──
  const lb = await step('查看排行榜', () =>
    req('/api/leaderboard?limit=5', 'GET', null, userToken)
  );
  if (lb.status === 200) {
    const entries = lb.data.leaderboard || lb.data.data?.leaderboard || [];
    console.log(`   排行榜: ${entries.length} 人`);
  }

  console.log('\n=== ✅ E2E 测试完成 ===');
})();
