/**
 * 认证流程测试脚本
 * 测试注册、登录、Token 刷新等功能
 * 运行方式: node test-auth.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

// 测试用户数据
const testUser = {
  username: `testuser_${Date.now()}`,
  email: `test_${Date.now()}@example.com`,
  password: 'TestPassword123!',
  confirmPassword: 'TestPassword123!',
};

let authToken = null;
let refreshToken = null;

function makeRequest(path, method = 'GET', body = null, token = null) {
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
            headers: res.headers,
            data: JSON.parse(data),
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
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

async function testAuth() {
  console.log('\n🧪 开始认证流程测试\n');
  console.log('═'.repeat(50));
  console.log('\n📝 测试用户信息:');
  console.log(`  用户名: ${testUser.username}`);
  console.log(`  邮箱: ${testUser.email}`);
  console.log('═'.repeat(50));

  try {
    // 1. 测试注册
    console.log('\n[1/4] 🔐 测试用户注册...');
    const registerResponse = await makeRequest('/api/auth/register', 'POST', {
      username: testUser.username,
      email: testUser.email,
      password: testUser.password,
      confirmPassword: testUser.confirmPassword,
    });
    console.log(`状态码: ${registerResponse.status}`);
    console.log('响应:', JSON.stringify(registerResponse.data, null, 2));
    
    if (registerResponse.status === 201 || registerResponse.status === 200) {
      console.log('✅ 注册成功！');
      if (registerResponse.data.token) {
        authToken = registerResponse.data.token;
        console.log('🎫 获得 Token:', authToken.substring(0, 20) + '...');
      }
      if (registerResponse.data.refreshToken) {
        refreshToken = registerResponse.data.refreshToken;
        console.log('🔄 获得 Refresh Token:', refreshToken.substring(0, 20) + '...');
      }
    } else {
      console.log('⚠️ 注册响应异常');
    }

    // 2. 测试登录
    console.log('\n[2/4] 🔓 测试用户登录...');
    const loginResponse = await makeRequest('/api/auth/login', 'POST', {
      email: testUser.email,
      password: testUser.password,
    });
    console.log(`状态码: ${loginResponse.status}`);
    console.log('响应:', JSON.stringify(loginResponse.data, null, 2));
    
    if (loginResponse.status === 200) {
      console.log('✅ 登录成功！');
      if (loginResponse.data.token) {
        authToken = loginResponse.data.token;
      }
    } else {
      console.log('⚠️ 登录响应异常');
    }

    // 3. 测试获取当前用户信息
    if (authToken) {
      console.log('\n[3/4] 👤 测试获取当前用户信息...');
      const meResponse = await makeRequest('/api/auth/me', 'GET', null, authToken);
      console.log(`状态码: ${meResponse.status}`);
      console.log('响应:', JSON.stringify(meResponse.data, null, 2));
      console.log(`结果: ${meResponse.status === 200 ? '✅ 成功' : '❌ 失败'}`);
    } else {
      console.log('\n[3/4] ⏭️ 跳过（无 Token）');
    }

    // 4. 测试 Token 刷新
    if (refreshToken) {
      console.log('\n[4/4] 🔄 测试 Token 刷新...');
      const refreshResponse = await makeRequest('/api/auth/refresh', 'POST', {
        refreshToken: refreshToken,
      });
      console.log(`状态码: ${refreshResponse.status}`);
      console.log('响应:', JSON.stringify(refreshResponse.data, null, 2));
      console.log(`结果: ${refreshResponse.status === 200 ? '✅ 成功' : '❌ 失败'}`);
    } else {
      console.log('\n[4/4] ⏭️ 跳过（无 Refresh Token）');
    }

    console.log('\n' + '═'.repeat(50));
    console.log('\n✅ 认证流程测试完成！\n');
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.log('\n请确保:');
    console.log('  1. 开发服务器正在运行: npm run dev');
    console.log('  2. PostgreSQL 数据库已连接并迁移');
    console.log('  3. 环境变量正确配置');
    process.exit(1);
  }
}

testAuth();
