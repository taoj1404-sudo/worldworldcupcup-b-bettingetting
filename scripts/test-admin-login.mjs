// 测试管理员登录并检查返回数据结构
const BASE = 'http://localhost:3000'

const res = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@worldcup.bet',
    password: 'Admin@2026!'
  })
})

const data = await res.json()
console.log('=== 登录响应 ===')
console.log(JSON.stringify(data, null, 2))
console.log()
console.log('=== 关键字段检查 ===')
console.log('data.success:', data.success)
console.log('data.user:', data.user ? '存在' : '不存在')
if (data.user) {
  console.log('data.user.role:', data.user.role)
  console.log('data.user.email:', data.user.email)
}
console.log('data.token:', data.token ? '存在' : '不存在')
