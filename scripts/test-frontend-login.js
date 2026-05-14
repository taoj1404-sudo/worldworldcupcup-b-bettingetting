/**
 * 测试前端登录功能
 * 在浏览器控制台运行此代码
 */
async function testFrontendLogin() {
  console.log('开始测试前端登录...');
  
  const email = 'admin@worldcup.bet';
  const password = 'Admin@2026!';
  
  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    console.log('登录响应:', data);
    
    if (data.code === 0) {
      console.log('✅ 登录成功！');
      console.log('用户角色:', data.data.user.role);
      console.log('Token:', data.data.accessToken.substring(0, 50) + '...');
      
      // 保存到 sessionStorage
      sessionStorage.setItem('accessToken', data.data.accessToken);
      sessionStorage.setItem('refreshToken', data.data.refreshToken);
      
      console.log('Token 已保存到 sessionStorage');
      console.log('现在应该跳转到: /admin');
      
      // 手动跳转
      if (data.data.user.role === 'admin') {
        console.log('正在跳转到管理员后台...');
        window.location.href = '/admin';
      }
    } else {
      console.log('❌ 登录失败:', data.message);
    }
  } catch (error) {
    console.log('❌ 网络错误:', error);
  }
}

// 执行测试
testFrontendLogin();
