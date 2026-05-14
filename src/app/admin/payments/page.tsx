'use client'

import { useEffect, useState, useCallback } from 'react'
import { useToast } from '@/components/providers/ToastProvider'
import { adminApi } from '@/lib/api-client'

function fmt(cents: number | string | undefined) {
  if (cents == null) return '0.00'
  return (Number(cents) / 100).toFixed(2)
}

const txnTypeLabels: Record<string, { label: string; color: string; bg: string }> = {
  deposit: { label: '充值', color: '#10b981', bg: '#064e3b' },
  withdraw: { label: '提现', color: '#ef4444', bg: '#450a0a' },
  bet_place: { label: '下注', color: '#9ca3af', bg: '#1f2937' },
  bet_win: { label: '中奖', color: '#10b981', bg: '#064e3b' },
  bet_refund: { label: '退款', color: '#3b82f6', bg: '#1e3a5f' },
  admin_credit: { label: '加款', color: '#10b981', bg: '#064e3b' },
  admin_debit: { label: '扣款', color: '#ef4444', bg: '#450a0a' },
  bonus: { label: '奖励', color: '#f59e0b', bg: '#78350f' },
}

const statusColors: Record<string, { color: string; bg: string }> = {
  completed: { color: '#6ee7b7', bg: '#065f46' },
  pending: { color: '#fde68a', bg: '#92400e' },
  failed: { color: '#fca5a5', bg: '#450a0a' },
  cancelled: { color: '#9ca3af', bg: '#1f2937' },
}

export default function AdminPaymentsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [direction, setDirection] = useState('')
  const [status, setStatus] = useState('')
  const { success, error } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await adminApi.payments.list({
        page, page_size: 20,
        direction: direction || undefined,
        status: status || undefined,
      }) as any
      setData(d)
    } catch { error('加载失败') }
    finally { setLoading(false) }
  }, [page, direction, status, error])

  useEffect(() => { load() }, [load])

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>资金流水</h1>

      {/* Summary */}
      {data?.summary && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: '累计充值', value: `¥${fmt(data.summary.totalDepositCents)}`, color: '#10b981' },
            { label: '累计提现', value: `¥${fmt(data.summary.totalWithdrawCents)}`, color: '#ef4444' },
            { label: '待处理提现', value: `¥${fmt(data.summary.pendingWithdrawCents)}`, color: '#f59e0b' },
          ].map((s) => (
            <div key={s.label} className="p-4 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
              <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{s.label}</div>
              <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <div className="flex gap-1">
          {['', 'deposit', 'withdraw'].map((d) => (
            <button key={d} onClick={() => { setDirection(d); setPage(1) }}
              className="px-3 py-1.5 rounded-full text-xs font-medium"
              style={direction === d
                ? { background: 'var(--color-primary)', color: '#000' }
                : { background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)' }
              }>
              {d === '' ? '全部' : d === 'deposit' ? '充值' : '提现'}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {['', 'pending', 'completed', 'failed'].map((s) => (
            <button key={s} onClick={() => { setStatus(s); setPage(1) }}
              className="px-3 py-1.5 rounded-full text-xs font-medium"
              style={status === s
                ? { background: 'var(--color-primary)', color: '#000' }
                : { background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)' }
              }>
              {s === '' ? '全部状态' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--bg-base)' }}>
              {['ID', '用户', '类型', '金额', '前后余额', '状态', '时间', '备注'].map(h => (
                <th key={h} className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.payments ?? []).map((p: any) => {
              const t = txnTypeLabels[p.type] ?? { label: p.type, color: '#9ca3af', bg: '#1f2937' }
              const s = statusColors[p.status] ?? { color: '#9ca3af', bg: '#1f2937' }
              return (
                <tr key={p.id} className="border-t" style={{ borderColor: 'var(--border-light)' }}>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>#{p.id}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{p.username ?? '-'}</div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{p.email ?? '-'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 rounded-full" style={{ background: t.bg, color: t.color }}>{t.label}</span>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold" style={{ color: ['deposit', 'bet_win', 'admin_credit', 'bonus'].includes(p.type) ? '#10b981' : '#ef4444' }}>
                    {['deposit', 'bet_win', 'admin_credit', 'bonus'].includes(p.type) ? '+' : '-'}¥{fmt(p.amountCents)}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {fmt(p.balanceBeforeCents)} → {fmt(p.balanceAfterCents)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 rounded-full" style={{ background: s.bg, color: s.color }}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {new Date(p.createdAt).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-4 py-3 text-xs truncate max-w-32" style={{ color: 'var(--text-secondary)' }}>
                    {p.remark ?? '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {(data?.payments ?? []).length === 0 && (
          <div className="py-12 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>暂无记录</div>
        )}
      </div>

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex justify-center gap-3">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs">上一页</button>
          <span className="text-sm px-3 py-1.5" style={{ color: 'var(--text-secondary)' }}>
            {page} / {data.pagination.totalPages}
          </span>
          <button disabled={page >= data.pagination.totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs">下一页</button>
        </div>
      )}
    </div>
  )
}
