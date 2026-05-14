'use client'

import { useEffect, useState, useCallback } from 'react'
import { useToast } from '@/components/providers/ToastProvider'

function fmt(cents: number | string) {
  return (Number(cents) / 100).toFixed(2)
}

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState<{ id: number; type: 'approve' | 'reject' } | null>(null)
  const { success, error } = useToast()

  const auth = () => ({ headers: { Authorization: `Bearer ${sessionStorage.getItem('accessToken') ?? ''}`, 'Content-Type': 'application/json' } })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/withdrawals', auth())
      const json = await res.json()
      if (json.withdrawals) setWithdrawals(json.withdrawals)
    } catch { error('加载失败') }
    finally { setLoading(false) }
  }, [error])

  const handleAction = async (id: number, type: 'approve' | 'reject') => {
    if (!confirm(`确认${type === 'approve' ? '批准' : '拒绝'}此提现申请？`)) return
    setAction({ id, type })
    try {
      const res = await fetch(`/api/admin/withdrawals/${id}?action=${type}`, { method: 'PATCH', ...auth() })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      success(type === 'approve' ? '已批准' : '已拒绝')
      load()
    } catch (e: any) { error(e?.message || '操作失败') }
    finally { setAction(null) }
  }

  useEffect(() => { load() }, [load])

  const pending = withdrawals.filter((w) => w.status === 'pending')
  const processed = withdrawals.filter((w) => w.status !== 'pending')

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>提现审核</h1>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
          <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>待处理</div>
          <div className="text-2xl font-bold" style={{ color: '#f59e0b' }}>{pending.length}</div>
        </div>
        <div className="p-4 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
          <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>已处理</div>
          <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{processed.length}</div>
        </div>
      </div>

      {/* Pending table */}
      <div>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>待处理申请</h2>
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--bg-base)' }}>
                {['ID', '用户', '金额', '时间', '备注', '操作'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pending.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>暂无待处理申请</td></tr>
              ) : pending.map((w) => (
                <tr key={w.id} className="border-t" style={{ borderColor: 'var(--border-light)' }}>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>#{w.id}</td>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{w.userId ?? '-'}</td>
                  <td className="px-4 py-3 font-mono font-bold" style={{ color: '#ef4444' }}>¥{fmt(w.amountCents)}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{new Date(w.createdAt).toLocaleString('zh-CN')}</td>
                  <td className="px-4 py-3 text-xs truncate" style={{ color: 'var(--text-secondary)', maxWidth: 200 }}>{w.remark ?? '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        disabled={action?.id === w.id}
                        onClick={() => handleAction(w.id, 'approve')}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium"
                        style={{ background: '#065f46', color: '#6ee7b7' }}>
                        {action?.id === w.id && action?.type === 'approve' ? '...' : '批准'}
                      </button>
                      <button
                        disabled={action?.id === w.id}
                        onClick={() => handleAction(w.id, 'reject')}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium"
                        style={{ background: '#450a0a', color: '#fca5a5' }}>
                        {action?.id === w.id && action?.type === 'reject' ? '...' : '拒绝'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Processed table */}
      {processed.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>已处理记录</h2>
          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--bg-base)' }}>
                  {['ID', '金额', '状态', '时间'].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {processed.map((w) => (
                  <tr key={w.id} className="border-t" style={{ borderColor: 'var(--border-light)' }}>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>#{w.id}</td>
                    <td className="px-4 py-3 font-mono" style={{ color: '#ef4444' }}>¥{fmt(w.amountCents)}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded-full"
                        style={{ background: w.status === 'completed' ? '#065f46' : '#450a0a', color: w.status === 'completed' ? '#6ee7b7' : '#fca5a5' }}>
                        {w.status === 'completed' ? '已批准' : '已拒绝'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{new Date(w.createdAt).toLocaleString('zh-CN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
