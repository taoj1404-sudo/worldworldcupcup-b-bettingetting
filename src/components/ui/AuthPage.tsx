"use client"

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/providers/AuthProvider'

interface AuthPageProps {
  title: string
  subtitle: string
  action: 'login' | 'register'
  fields: React.ReactNode
  linkText: string
  linkLabel: string
}

export default function AuthPage({ title, subtitle, action, fields, linkText, linkLabel }: AuthPageProps) {
  const router = useRouter()
  const { login, register: authRegister, user } = useAuth()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const fd = new FormData(e.currentTarget)
    const body: Record<string, string> = {}
    fd.forEach((v, k) => { body[k] = v as string })

    try {
      if (action === 'login') {
        // 使用 AuthProvider 的 login 方法（会自动更新状态）
        await login(body.email, body.password)
        // 登录成功后，AuthProvider 状态已更新，等待一下让状态传播
        setTimeout(() => {
          if (user?.role === 'admin') {
            router.push('/admin')
          } else {
            router.push('/')
          }
        }, 100)
      } else {
        await authRegister(body.username, body.email, body.password)
        router.push('/')
      }
    } catch (err: any) {
      setError(err.message || '网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm card p-8 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields}
          {error && <p className="text-xs text-center" style={{ color: 'var(--danger)' }}>{error}</p>}
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? '处理中…' : action === 'login' ? '登录' : '注册'}
          </button>
        </form>

        <p className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          {linkText} <Link href={linkLabel === '立即注册' ? '/register' : '/login'} className="a">{linkLabel}</Link>
        </p>
      </div>
    </div>
  )
}
