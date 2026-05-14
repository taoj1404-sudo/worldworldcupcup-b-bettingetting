const http = require('http');

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'http://localhost:3000');
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('\n=== 快速 API 测试 ===\n');

  // 1. health
  const h = await makeRequest('/api/health');
  console.log(`[health] ${h.status} ✅`);

  // 2. matches
  const m = await makeRequest('/api/matches');
  console.log(`[matches] ${m.status}  比赛数: ${m.data?.data?.matches?.length || 0}`);

  // 3. register（捕获 JSON 错误信息）
  const r = await makeRequest('/api/auth/register', 'POST', {
    username: 'test_quick_' + Date.now(),
    email: 'quick_' + Date.now() + '@test.com',
    password: 'Test1234!',
    confirmPassword: 'Test1234!',
  });
  console.log(`[register] ${r.status}`, JSON.stringify(r.data));

  // 4. 如果注册成功则测试登录
  if (r.status === 200 || r.status === 201) {
    const email = r.data?.data?.user?.email;
    const l = await makeRequest('/api/auth/login', 'POST', {
      email,
      password: 'Test1234!',
    });
    console.log(`[login] ${l.status}`, JSON.stringify(l.data).substring(0, 200));
  }
}

main().catch(console.error);
