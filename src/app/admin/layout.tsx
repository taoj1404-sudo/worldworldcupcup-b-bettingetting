'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/providers/AuthProvider'
import { useSSEContext } from '@/components/providers/SSEProvider'

const navItems = [
  { href: '/admin', label: '仪表盘', icon: '📊' },
  { href: '/admin/matches', label: '比赛管理', icon: '⚽' },
  { href: '/admin/bets', label: '投注管理', icon: '🎲' },
  { href: '/admin/users', label: '用户管理', icon: '👥' },
  { href: '/admin/sync', label: '数据同步', icon: '🔄' },
  { href: '/admin/withdrawals', label: '提现审核', icon: '💸' },
  { href: '/admin/payments', label: '资金流水', icon: '💳' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const { isConnected, notifications } = useSSEContext()
  const [showNotifications, setShowNotifications] = useState(false)

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="loading-dots"><span/><span/><span/></div>
      </div>
    )
  }

  if (!user || user.role !== 'admin') return null

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-base)' }}>
      {/* Sidebar */}
      <aside
        className="w-56 flex-shrink-0 flex flex-col border-r"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)' }}
      >
        {/* Logo */}
        <div className="px-4 py-5 border-b" style={{ borderColor: 'var(--border-light)' }}>
          <Link href="/admin" className="flex items-center gap-2 text-sm font-bold">
            <span style={{ color: 'var(--color-primary)', fontSize: '1.2rem' }}>🏆</span>
            <span style={{ color: 'var(--text-primary)' }}>WorldCup</span>
            <span className="ml-auto text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--color-primary)', color: '#000' }}>
              ADMIN
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors"
                style={
                  isActive
                    ? { background: 'var(--color-primary)', color: '#000', fontWeight: 600 }
                    : { color: 'var(--text-secondary)', background: 'transparent' }
                }
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Bottom: back to site + user info */}
        <div className="p-3 border-t space-y-1" style={{ borderColor: 'var(--border-light)' }}>
          {/* SSE 实时连接状态 */}
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs">
            <div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: isConnected ? '#22c55e' : '#ef4444' }}
              title={isConnected ? '实时连接正常' : '实时连接断开'}
            />
            <span style={{ color: 'var(--text-secondary)' }}>
              {isConnected ? '实时推送' : '实时断开'}
            </span>
            {notifications.length > 0 && (
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="ml-auto px-1.5 py-0.5 rounded text-xs"
                style={{ background: 'var(--color-primary)', color: '#000' }}
              >
                {notifications.length}
              </button>
            )}
          </div>

          {/* 通知列表 */}
          {showNotifications && notifications.length > 0 && (
            <div
              className="mx-3 p-2 rounded-lg text-xs space-y-1 max-h-32 overflow-y-auto"
              style={{ background: 'var(--bg-base)', border: '1px solid var(--border-light)' }}
            >
              {notifications.slice(0, 5).map((n, i) => (
                <div key={i} style={{ color: 'var(--text-secondary)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{n.title}</span>
                  <br />
                  <span>{n.message}</span>
                </div>
              ))}
            </div>
          )}

          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            <span>←</span>
            <span>返回前台</span>
          </Link>
          <div className="flex items-center gap-2 px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span>👤</span>
            <span className="truncate">{user.username}</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-screen overflow-auto">
        {children}
      </main>
    </div>
  )
}
