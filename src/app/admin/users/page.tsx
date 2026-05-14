'use client'

import { useEffect, useState, useCallback } from 'react'
import { useToast } from '@/components/providers/ToastProvider'
import { adminApi } from '@/lib/api-client'

function fmt(cents: number | string | undefined) {
  if (cents == null) return '0.00'
  return (Number(cents) / 100).toFixed(2)
}

const statusColors: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: '正常', color: '#10b981', bg: '#064e3b' },
  frozen: { label: '冻结', color: '#ef4444', bg: '#450a0a' },
  pending: { label: '待激活', color: '#f59e0b', bg: '#78350f' },
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const [adjustForm, setAdjustForm] = useState({ amount: '', reason: '' })
  const [actioning, setActioning] = useState(false)
  const { success, error } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminApi.users.list({ page, page_size: 20, status: statusFilter || undefined, search: search || undefined }) as any
      setUsers(data.users ?? [])
      setTotalPages(data.pagination?.totalPages ?? 1)
    } catch (e: any) { error('加载失败') }
    finally { setLoading(false) }
  }, [page, statusFilter, search, error])

  const handleAction = async (id: number, action: string, value: string) => {
    if (!confirm(`确认将此用户设为【${value}】？`)) return
    setActioning(true)
    try {
      await adminApi.users.update(id, { [action]: value })
      success('操作成功')
      load()
      if (selectedUser?.id === id) {
        const d = await adminApi.users.get(id) as any
        setSelectedUser(d.user)
      }
    } catch (e: any) { error(e?.message || '操作失败') }
    finally { setActioning(false) }
  }

  const handleAdjust = async () => {
    if (!selectedUser || !adjustForm.amount || !adjustForm.reason) return
    setActioning(true)
    try {
      const amount = parseInt(adjustForm.amount)
      if (isNaN(amount)) throw new Error('金额无效')
      await adminApi.adjustBalance(selectedUser.id, amount, adjustForm.reason)
      success('余额调整成功')
      setAdjustForm({ amount: '', reason: '' })
      const d = await adminApi.users.get(selectedUser.id) as any
      setSelectedUser(d.user)
    } catch (e: any) { error(e?.message || '调整失败') }
    finally { setActioning(false) }
  }

  useEffect(() => { load() }, [load])

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>用户管理</h1>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input className="input text-sm" placeholder="搜索用户名/邮箱..." style={{ width: 240 }}
          value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        {['', 'active', 'frozen', 'pending'].map((s) => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
            className="px-3 py-1.5 rounded-full text-xs font-medium"
            style={statusFilter === s
              ? { background: 'var(--color-primary)', color: '#000' }
              : { background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)' }
            }>
            {s === '' ? '全部' : (statusColors[s]?.label ?? s)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User list */}
        <div className="lg:col-span-2 rounded-xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--bg-base)' }}>
                {['用户', '角色', '余额', '状态', '注册时间', '操作'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const st = statusColors[u.status] ?? { label: u.status, color: '#9ca3af', bg: '#1f2937' }
                return (
                  <tr
                    key={u.id}
                    className="border-t cursor-pointer" style={{ borderColor: 'var(--border-light)' }}
                    onClick={() => setSelectedUser(u)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{u.username}</div>
                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{u.email}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: u.role === 'admin' ? '#1e3a5f' : '#1f2937', color: u.role === 'admin' ? '#93c5fd' : '#9ca3af' }}>
                        {u.role === 'admin' ? '管理员' : '用户'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-right" style={{ color: 'var(--text-primary)' }}>
                      ¥{fmt(u.balanceCents)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs px-2 py-1 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(u.createdAt).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedUser(u) }}
                        className="text-xs btn-secondary px-2 py-1">详情</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="py-12 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>暂无用户</div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-3 py-3 border-t" style={{ borderColor: 'var(--border-light)' }}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs">上一页</button>
              <span className="text-sm px-3 py-1.5" style={{ color: 'var(--text-secondary)' }}>{page}/{totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs">下一页</button>
            </div>
          )}
        </div>

        {/* User detail panel */}
        <div className="space-y-4">
          {selectedUser ? (
            <div className="rounded-xl border p-5 space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
              <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>用户详情</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}>ID</span>
                  <span style={{ color: 'var(--text-primary)' }}>#{selectedUser.id}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}>用户名</span>
                  <span style={{ color: 'var(--text-primary)' }}>{selectedUser.username}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}>邮箱</span>
                  <span style={{ color: 'var(--text-primary)' }}>{selectedUser.email}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}>余额</span>
                  <span className="font-mono font-bold" style={{ color: '#10b981' }}>¥{fmt(selectedUser.balanceCents)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}>总投注</span>
                  <span style={{ color: 'var(--text-primary)' }}>{selectedUser.totalBets} 笔</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}>累计赢取</span>
                  <span style={{ color: '#10b981' }}>¥{fmt(selectedUser.totalWonCents)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}>累计亏损</span>
                  <span style={{ color: '#ef4444' }}>¥{fmt(selectedUser.totalLostCents)}</span>
                </div>
              </div>

              {/* Quick actions */}
              <div className="border-t pt-4 space-y-2" style={{ borderColor: 'var(--border-light)' }}>
                <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>快速操作</div>
                {selectedUser.status !== 'active' && (
                  <button disabled={actioning}
                    onClick={() => handleAction(selectedUser.id, 'status', 'active')}
                    className="w-full text-xs btn-primary py-2">解除冻结</button>
                )}
                {selectedUser.status === 'active' && (
                  <button disabled={actioning}
                    onClick={() => handleAction(selectedUser.id, 'status', 'frozen')}
                    className="w-full text-xs py-2 rounded-lg" style={{ background: '#450a0a', color: '#fca5a5' }}>冻结账户</button>
                )}
                {selectedUser.role !== 'admin' && (
                  <button disabled={actioning}
                    onClick={() => handleAction(selectedUser.id, 'role', 'admin')}
                    className="w-full text-xs btn-secondary py-2">设为管理员</button>
                )}
                {selectedUser.role === 'admin' && (
                  <button disabled={actioning}
                    onClick={() => handleAction(selectedUser.id, 'role', 'user')}
                    className="w-full text-xs py-2 rounded-lg" style={{ background: '#1f2937', color: '#9ca3af' }}>撤销管理员</button>
                )}
              </div>

              {/* Balance adjust */}
              <div className="border-t pt-4 space-y-3" style={{ borderColor: 'var(--border-light)' }}>
                <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>手动调整余额</div>
                <div>
                  <input className="input w-full text-sm" placeholder="金额（分，正数充值/负数扣款）"
                    value={adjustForm.amount} onChange={e => setAdjustForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div>
                  <input className="input w-full text-sm" placeholder="原因（必填）"
                    value={adjustForm.reason} onChange={e => setAdjustForm(f => ({ ...f, reason: e.target.value }))} />
                </div>
                <button disabled={actioning || !adjustForm.amount || !adjustForm.reason}
                  onClick={handleAdjust}
                  className="w-full btn-primary text-xs py-2">
                  {actioning ? '处理中...' : '确认调整'}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border p-8 text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)', color: 'var(--text-secondary)' }}>
              <div className="text-sm">点击用户行查看详情</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
