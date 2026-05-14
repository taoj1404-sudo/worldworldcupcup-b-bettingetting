// 测试 verifyToken 函数
const { verifyToken } = require('./src/lib/auth.ts');

// 用 admin token 测试
const adminToken = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYWRtaW4iLCJzdWIiOiIxIiwiaWF0IjoxNzc4MzAxODc1LCJleHAiOjE3NzgzMDI3NzV9.1QLqM0-x_uRn-_eKLGa9CfJ41BPTi9E7KWfIyawYo';

(async () => {
  try {
    const decoded = await verifyToken(adminToken);
    console.log('✅ verifyToken 成功:', decoded);
  } catch (e) {
    console.log('❌ verifyToken 失败:', e.message);
  }
})();
