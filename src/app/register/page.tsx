import AuthPage from '../../components/ui/AuthPage'

export default function Register() {
  return (
    <AuthPage
      title="创建账户"
      subtitle="加入世界杯竞猜，开始赢取奖励"
      action="register"
      fields={
        <>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>用户名</label>
            <input name="username" type="text" required placeholder="tony123" className="input" />
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>邮箱</label>
            <input name="email" type="email" required placeholder="your@email.com" className="input" />
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>密码</label>
            <input name="password" type="password" required placeholder="至少 8 个字符" className="input" />
          </div>
        </>
      }
      linkText="已有账户？"
      linkLabel="立即登录"
    />
  )
}
