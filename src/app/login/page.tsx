import AuthPage from '../../components/ui/AuthPage'

export default function Login() {
  return (
    <AuthPage
      title="欢迎回来"
      subtitle="登录您的竞猜账户"
      action="login"
      fields={
        <>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>邮箱</label>
            <input name="email" type="email" required placeholder="your@email.com" className="input" autoComplete="email" />
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>密码</label>
            <input name="password" type="password" required placeholder="" className="input" autoComplete="current-password" />
          </div>
        </>
      }
      linkText="还没有账户？"
      linkLabel="立即注册"
    />
  )
}
