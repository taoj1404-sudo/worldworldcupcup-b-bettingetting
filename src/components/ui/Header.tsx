'use client'

import Link from 'next/link'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function Header() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    await logout()
    router.push('/login')
    setLoggingOut(false)
  }

  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{ borderColor: 'var(--border-light)', background: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(12px)' }}
    >
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg no-underline" style={{ color: 'var(--color-primary)' }}>
          <span style={{ fontSize: '1.25rem' }}>&#9918;</span>
          <span>WorldCup 竞猜</span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-4">
          <Link href="/" className="text-sm no-underline transition-colors hover:text-white" style={{ color: 'var(--text-secondary)' }}>
            比赛
          </Link>

          {user ? (
            <>
              <Link href="/bets" className="text-sm no-underline transition-colors hover:text-white" style={{ color: 'var(--text-secondary)' }}>
                我的投注
              </Link>

              {/* Balance */}
              <div
                className="flex items-center gap-2 rounded-full px-3 py-1.5"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
              >
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>余额</span>
                <span className="font-mono font-semibold text-sm">
                  &#165;{(user.balanceCents / 100).toFixed(2)}
                </span>
              </div>

              {/* User */}
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{user.username}</span>
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="text-xs transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {loggingOut ? '退出中...' : '退出'}
                </button>
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm no-underline transition-colors hover:text-white" style={{ color: 'var(--text-secondary)' }}>
                登录
              </Link>
              <Link href="/register" className="btn-primary text-sm" style={{ paddingTop: '0.375rem', paddingBottom: '0.375rem', paddingLeft: '1rem', paddingRight: '1rem' }}>
                注册
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
