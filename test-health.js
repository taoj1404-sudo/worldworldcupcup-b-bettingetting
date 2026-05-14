/**
 * 健康检查测试脚本
 * 运行方式: node test-health.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

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

async function testHealth() {
  console.log('\n🧪 开始健康检查测试\n');
  console.log('═'.repeat(50));

  try {
    // 测试主页面
    console.log('\n📄 测试主页面...');
    const homeResponse = await makeRequest('/');
    console.log(`状态码: ${homeResponse.status}`);
    console.log(`结果: ${homeResponse.status === 200 ? '✅ 成功' : '❌ 失败'}`);

    // 测试健康检查端点
    console.log('\n🏥 测试健康检查端点...');
    const healthResponse = await makeRequest('/api/health');
    console.log(`状态码: ${healthResponse.status}`);
    console.log('响应数据:', JSON.stringify(healthResponse.data, null, 2));
    console.log(`结果: ${healthResponse.status === 200 ? '✅ 成功' : '❌ 失败'}`);

    // 测试 API 端点
    console.log('\n📡 测试 API 端点...');
    const apiResponse = await makeRequest('/api/matches');
    console.log(`状态码: ${apiResponse.status}`);
    console.log('响应数据:', JSON.stringify(apiResponse.data, null, 2));
    console.log(`结果: ${apiResponse.status === 200 ? '✅ 成功' : '❌ 失败'}`);

    console.log('\n' + '═'.repeat(50));
    console.log('\n✅ 所有健康检查测试完成！\n');
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.log('\n请确保开发服务器正在运行:');
    console.log('  npm run dev');
    process.exit(1);
  }
}

testHealth();
