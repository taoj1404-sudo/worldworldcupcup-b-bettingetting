'use client'

import { useEffect, useState, useCallback } from 'react'
import { adminApi, type DashboardData } from '@/lib/api-client'
import { useToast } from '@/components/providers/ToastProvider'

function fmt(cents: number) {
  return (cents / 100).toFixed(2)
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="p-5 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
      <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>{label}</div>
      <div className="text-2xl font-bold" style={{ color: color ?? 'var(--text-primary)' }}>{value}</div>
    </div>
  )
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const { error } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await adminApi.dashboard()
      setData(d)
    } catch (e: any) {
      error('加载失败：' + (e?.message ?? ''))
    } finally {
      setLoading(false)
    }
  }, [error])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="loading-dots"><span/><span/><span/></div>
    </div>
  )

  if (!data) return null

  const { stats, recentBets, pendingSettleMatches, matchStats } = data

  const betStatusLabel: Record<string, string> = {
    pending: '待结算', won: '已赢', lost: '已输', cancelled: '已取消',
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>仪表盘</h1>
        <button onClick={load} className="btn-secondary text-xs">↻ 刷新</button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="总用户数" value={stats.totalUsers} />
        <StatCard label="活跃用户" value={stats.activeUsers} color="var(--color-primary)" />
        <StatCard label="总投注数" value={stats.totalBets} />
        <StatCard label="待结算投注" value={stats.pendingBets} color="#f59e0b" />
        <StatCard label="今日充值" value={`¥${fmt(stats.todayDepositsCents)}`} />
        <StatCard label="今日提现" value={`¥${fmt(stats.todayWithdrawalsCents)}`} color="#ef4444" />
        <StatCard label="待处理提现" value={stats.pendingWithdrawals} color="#f59e0b" />
        <StatCard label="平台盈利" value={`¥${fmt(stats.platformProfitCents)}`} color="#10b981" />
      </div>

      {/* Match stats */}
      <div className="p-5 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>比赛状态分布</h2>
        <div className="flex gap-4">
          {Object.entries(matchStats).map(([status, count]) => {
            const labels: Record<string, string> = { scheduled: '未开始', live: '进行中', finished: '已结束', cancelled: '已取消', postponed: '延期' }
            return (
              <div key={status} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: status === 'live' ? '#10b981' : status === 'finished' ? '#6b7280' : '#3b82f6' }}/>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{labels[status] ?? status}</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Two column: recent bets + pending settle */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent bets */}
        <div className="rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-light)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>最近投注</h2>
            <a href="/admin/bets" className="text-xs" style={{ color: 'var(--color-primary)' }}>查看全部 →</a>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
            {recentBets.length === 0 ? (
              <div className="py-8 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>暂无投注记录</div>
            ) : recentBets.slice(0, 8).map((b) => (
              <div key={b.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{b.username}</div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    ¥{fmt(Number(b.amountCents))} × {Number(b.oddsSnapshot).toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    ¥{fmt(Number(b.potentialPayoutCents))}
                  </div>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{
                      background: b.status === 'pending' ? '#92400e' : b.status === 'won' ? '#065f46' : '#374151',
                      color: b.status === 'pending' ? '#fde68a' : b.status === 'won' ? '#6ee7b7' : '#9ca3af',
                    }}
                  >
                    {betStatusLabel[b.status] ?? b.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending settle */}
        <div className="rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-light)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>待结算比赛</h2>
            <a href="/admin/bets" className="text-xs" style={{ color: 'var(--color-primary)' }}>去结算 →</a>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
            {pendingSettleMatches.length === 0 ? (
              <div className="py-8 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>暂无待结算比赛</div>
            ) : pendingSettleMatches.slice(0, 8).map((m) => (
              <div key={m.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {m.teamHome} vs {m.teamAway}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {m.scoreHome}:{m.scoreAway}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {m.pendingBetCount} 笔待结算
                  </div>
                  <span className="text-xs" style={{ color: '#f59e0b' }}>需手动结算</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
