/**
 * 端到端测试：登录 → 下注 → 更新比赛 → 结算
 * 运行前：确保服务器在 http://127.0.0.1:3000
 * 用法：npx tsx scripts/e2e-full-test.ts
 */
import http from 'http';

const HOST = '127.0.0.1';
const PORT = 3000;

async function api(
  path: string,
  method = 'GET' as string,
  data?: any,
  token?: string,
  retries = 3
): Promise<{ status: number; data: any }> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await new Promise<{ status: number; data: any }>((resolve) => {
        const json = data ? JSON.stringify(data) : '';
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (json) headers['Content-Length'] = String(Buffer.byteLength(json));
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const req = http.request(
          { hostname: HOST, port: PORT, path, method, headers },
          (res) => {
            let body = '';
            res.on('data', (c: string) => (body += c));
            res.on('end', () => {
              try { resolve({ status: res.statusCode!, data: JSON.parse(body) }); }
              catch { resolve({ status: res.statusCode!, data: { raw: body } }); }
            });
          }
        );
        req.on('error', (e) => resolve({ status: 0, data: { error: e.message } }));
        if (json) req.write(json);
        req.end();
      });
      return result;
    } catch (e: any) {
      if (attempt === retries) return { status: 0, data: { error: e.message } };
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  return { status: 0, data: { error: 'max retries exceeded' } };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log('=== 端到端测试 ===\n');

  // ── Step 1: 管理员登录 ──────────────────────
  console.log('[1/6] 管理员登录...');
  await sleep(500);
  const al = await api('/api/auth/login', 'POST', {
    email: 'admin@worldcup.bet',
    password: 'Admin@2026!',
  });
  if (al.status !== 200 || al.data.code !== 0) {
    console.error('❌ 管理员登录失败:', JSON.stringify(al.data).substring(0, 200));
    return;
  }
  const adminToken = al.data.data.accessToken;
  console.log('✅ 管理员登录成功');

  // ── Step 2: 测试用户登录 ──────────────────────
  console.log('\n[2/6] 测试用户登录...');
  await sleep(500);
  const ul = await api('/api/auth/login', 'POST', {
    email: 'e2e_test@worldcup.bet',
    password: 'Test@123!',
  });
  if (ul.status !== 200 || ul.data.code !== 0) {
    console.error('❌ 测试用户登录失败:', JSON.stringify(ul.data).substring(0, 200));
    return;
  }
  const userToken = ul.data.data.accessToken;
  const userId = ul.data.data.user.id;
  console.log(`✅ 用户登录成功 ID=${userId}`);

  // ── Step 3: 获取比赛和赔率 ──────────────────────
  console.log('\n[3/6] 获取比赛和赔率...');
  await sleep(500);
  const ml = await api('/api/matches', 'GET');
  if (ml.status !== 200 || !ml.data.data?.matches?.length) {
    console.error('❌ 没有比赛数据:', JSON.stringify(ml.data).substring(0, 200));
    return;
  }
  // 优先找 scheduled 状态的比赛（可投注）
  const availableMatch = ml.data.data.matches.find((m: any) => m.status === 'scheduled') ?? ml.data.data.matches[0]
  const matchId = availableMatch.id
  console.log(`✅ 比赛 ID=${matchId}, status=${availableMatch.status}`);

  // 如果比赛不是 scheduled，先设为 live
  if (availableMatch.status !== 'scheduled') {
    await sleep(500);
    const liveRes = await api(`/api/matches/${matchId}`, 'PUT', { status: 'live' }, adminToken)
    console.log('设置 live 响应:', liveRes.status, JSON.stringify(liveRes.data).substring(0, 100))
  }

  await sleep(500);
  const md = await api(`/api/matches/${matchId}`, 'GET');
  if (md.status !== 200 || !md.data.data) {
    console.error('❌ 获取比赛详情失败:', JSON.stringify(md.data).substring(0, 300));
    return;
  }

  const { match: _match, odds: oddsData } = md.data.data;
  console.log('odds keys:', oddsData ? Object.keys(oddsData) : 'undefined');

  if (!oddsData) {
    console.error('❌ 比赛没有赔率数据');
    return;
  }

  // 取第一个可用赔率
  let oddsId: number | null = null;
  let selection = 'home';
  for (const key in oddsData) {
    const arr = oddsData[key];
    if (Array.isArray(arr) && arr.length > 0) {
      oddsId = arr[0].id;
      selection = arr[0].option || 'home';
      break;
    }
  }
  if (!oddsId) {
    console.error('❌ 没有可用赔率');
    return;
  }
  console.log(`✅ 赔率 ID=${oddsId}, selection=${selection}`);

  // ── Step 4: 下注 ──────────────────────
  console.log('\n[4/6] 下注...');
  console.log('DEBUG oddsId:', oddsId, 'type:', typeof oddsId, 'selection:', selection);
  const betPayload = {
    odds_id: oddsId,
    selection,
    amount_cents: 5000,
    idempotency_key: `e2e_${String(Date.now())}`,
  };
  console.log('DEBUG payload:', JSON.stringify(betPayload));
  await sleep(500);
  const betRes = await api('/api/bets', 'POST', betPayload, userToken);

  console.log('下注响应 status:', betRes.status);
  console.log('下注响应:', JSON.stringify(betRes.data).substring(0, 300));

  if (betRes.status !== 201 && betRes.status !== 200) {
    console.error('❌ 下注失败:', JSON.stringify(betRes.data).substring(0, 300));
    return;
  }
  const betId = betRes.data.data?.bet?.id ?? betRes.data.data?.id ?? 'unknown';
  console.log(`✅ 下注成功 Bet ID=${betId}`);

  // ── Step 5: 更新比赛结果并结算 ───────
  console.log('\n[5/6] 更新比赛结果并结算...');

  // 5.1 先更新比赛比分为 finished 状态
  await sleep(500);
  const updateRes = await api(
    `/api/matches/${matchId}`,
    'PUT',
    {
      homeScore: 2,
      awayScore: 1,
      status: 'finished',
    },
    adminToken
  );
  console.log('更新比分响应 status:', updateRes.status);
  console.log('更新比分响应:', JSON.stringify(updateRes.data).substring(0, 300));
  if (updateRes.status !== 200) {
    console.error('❌ 更新比赛失败:', JSON.stringify(updateRes.data).substring(0, 300));
    return;
  }
  console.log('✅ 比分更新成功 (2:1)');

  // 5.2 然后进行结算
  await sleep(500);
  const settleRes = await api(
    '/api/bets/settle',
    'POST',
    { match_id: matchId },
    adminToken
  );

  console.log('结算响应 status:', settleRes.status);
  console.log('结算响应:', JSON.stringify(settleRes.data).substring(0, 400));

  if (settleRes.status !== 200) {
    console.error('❌ 结算失败:', JSON.stringify(settleRes.data).substring(0, 300));
    return;
  }
  console.log(`✅ 结算完成`);

  // ── Step 6: 查看用户余额变化 ──────────────────────
  console.log('\n[6/6] 查看用户最新余额...');
  await sleep(500);
  const prof = await api(`/api/users/${userId}`, 'GET', null, adminToken);
  if (prof.status === 200) {
    console.log('✅ 用户资产:', JSON.stringify(prof.data.data ?? prof.data).substring(0, 300));
  }

  console.log('\n=== ✅ 端到端测试全部通过 ===');
}

main().catch(console.error);
