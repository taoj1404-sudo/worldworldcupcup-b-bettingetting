'use client'

import { useEffect, useState, useCallback } from 'react'
import { useToast } from '@/components/providers/ToastProvider'
import { adminApi } from '@/lib/api-client'

const betStatusLabels: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: '待结算', color: '#fde68a', bg: '#92400e' },
  won: { label: '已赢', color: '#6ee7b7', bg: '#065f46' },
  lost: { label: '已输', color: '#9ca3af', bg: '#1f2937' },
  cancelled: { label: '已退注', color: '#fca5a5', bg: '#450a0a' },
}

const selectionLabels: Record<string, string> = {
  home: '主胜', draw: '平局', away: '客胜',
  over: '大球', under: '小球',
  yes: '双方进球', no: '一方未进',
}

function fmt(cents: number | string) {
  return (Number(cents) / 100).toFixed(2)
}

// 批量结算弹窗
function BatchSettleModal({
  matchId,
  matchName,
  onClose,
  onSuccess,
}: {
  matchId: number
  matchName: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const { success, error } = useToast()
  const auth = () => ({ Authorization: `Bearer ${sessionStorage.getItem('accessToken') ?? ''}`, 'Content-Type': 'application/json' })

  const handleSettle = async () => {
    if (!confirm(`确认按终比分自动结算【${matchName}】所有待结算投注？此操作不可撤销！`)) return
    setLoading(true)
    try {
      const res = await fetch('/api/bets/settle', {
        method: 'POST',
        headers: auth(),
        body: JSON.stringify({ match_id: matchId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '结算失败')
      const details = data.details ?? []
      const wonCount = details.filter((d: any) => d.result === 'won').length
      const cancelCount = details.filter((d: any) => d.result === 'cancelled').length
      success(`结算完成：${data.settled_count} 笔${wonCount > 0 ? `，${wonCount} 笔中奖` : ''}${cancelCount > 0 ? `，${cancelCount} 笔退注` : ''}`)
      onSuccess()
      onClose()
    } catch (e: any) {
      error(e?.message || '结算失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-sm rounded-2xl p-6 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
        <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>批量结算</h2>
        <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>比赛：<span style={{ color: 'var(--text-primary)' }}>{matchName}</span></p>
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
          系统将根据终比分自动判定全部玩法（胜平负、让球、大小球、波胆、半全场、双方进球）并结算。
        </p>
        <div className="rounded-lg p-3 mb-4" style={{ background: 'var(--bg-base)', border: '1px solid var(--border-light)' }}>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>结算规则说明</p>
          <ul className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
            <li>• 胜平负 (1X2)：按全场比分判定</li>
            <li>• 让球 (Handicap)：让球后平局自动退注</li>
            <li>• 大小球：恰好等于基准线自动退注</li>
            <li>• 波胆：精确比分完全匹配</li>
            <li>• 半全场：半场+全场结果组合</li>
            <li>• 双方进球：双方是否都进球</li>
          </ul>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading} className="flex-1 btn-secondary">取消</button>
          <button onClick={handleSettle} disabled={loading} className="flex-1 btn-primary">
            {loading ? '结算中...' : '确认结算'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminBetsPage() {
  const [bets, setBets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [settling, setSettling] = useState<number | null>(null)
  const [batchModal, setBatchModal] = useState<{ matchId: number; matchName: string } | null>(null)
  // 已结束比赛列表（用于批量结算选择）
  const [finishedMatches, setFinishedMatches] = useState<any[]>([])
  const [loadingMatches, setLoadingMatches] = useState(false)
  const [showBatchPanel, setShowBatchPanel] = useState(false)
  const { toast, success, error } = useToast()

  const auth = () => ({ headers: { Authorization: `Bearer ${sessionStorage.getItem('accessToken') ?? ''}`, 'Content-Type': 'application/json' } })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { page, page_size: 20 }
      if (statusFilter) params.status = statusFilter
      const data = await adminApi.bets.list(params) as any
      setBets(data.bets ?? [])
      setTotalPages(data.pagination?.totalPages ?? 1)
    } catch (e: any) { error('加载失败：' + (e?.message ?? '')) }
    finally { setLoading(false) }
  }, [page, statusFilter, error])

  const loadFinishedMatches = useCallback(async () => {
    setLoadingMatches(true)
    try {
      const res = await fetch('/api/matches?status=finished&page_size=50', auth())
      const json = await res.json()
      const data = json.data ?? json
      setFinishedMatches(data.matches ?? [])
    } catch {
      // ignore
    } finally {
      setLoadingMatches(false)
    }
  }, [])

  const handleSettle = async (betId: number, result: 'won' | 'lost') => {
    if (!confirm(`确认标记为【${result === 'won' ? '赢' : '输'}】？`)) return
    setSettling(betId)
    try {
      await adminApi.bets.settleSingle(betId, result)
      success('结算成功')
      load()
    } catch (e: any) { error(e?.message || '结算失败') }
    finally { setSettling(null) }
  }

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (showBatchPanel) loadFinishedMatches()
  }, [showBatchPanel, loadFinishedMatches])

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>投注管理</h1>
        <div className="flex gap-2 flex-wrap">
          {/* 批量结算按钮 */}
          <button
            onClick={() => setShowBatchPanel(v => !v)}
            className="btn-primary text-xs px-3 py-1.5"
          >
            🎯 批量结算
          </button>
          {/* 状态过滤 */}
          {['', 'pending', 'won', 'lost', 'cancelled'].map((s) => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={statusFilter === s
                ? { background: 'var(--color-primary)', color: '#000' }
                : { background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)' }
              }>
              {s === '' ? '全部' : (betStatusLabels[s]?.label ?? s)}
            </button>
          ))}
        </div>
      </div>

      {/* 批量结算面板 */}
      {showBatchPanel && (
        <div className="rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>按比赛批量结算</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                选择已结束的比赛，系统将自动根据终比分判定全部玩法并结算
              </p>
            </div>
            <button onClick={() => loadFinishedMatches()} className="text-xs btn-secondary px-2 py-1" disabled={loadingMatches}>
              {loadingMatches ? '...' : '↻ 刷新'}
            </button>
          </div>

          {loadingMatches ? (
            <div className="text-xs text-center py-4" style={{ color: 'var(--text-secondary)' }}>加载中...</div>
          ) : finishedMatches.length === 0 ? (
            <div className="text-xs text-center py-4" style={{ color: 'var(--text-secondary)' }}>暂无已结束的比赛</div>
          ) : (
            <div className="space-y-2">
              {finishedMatches.map((m: any) => {
                const home = m.homeTeamName ?? m.teamHome ?? '主队'
                const away = m.awayTeamName ?? m.teamAway ?? '客队'
                const sh = m.homeScore ?? m.scoreHome
                const sa = m.awayScore ?? m.scoreAway
                const matchName = `${home} vs ${away}`
                return (
                  <div key={m.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg"
                    style={{ background: 'var(--bg-base)', border: '1px solid var(--border-light)' }}>
                    <div>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{matchName}</span>
                      <span className="ml-2 font-mono text-sm font-bold" style={{ color: 'var(--color-primary)' }}>
                        {sh ?? '-'}:{sa ?? '-'}
                      </span>
                      <span className="ml-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {m.startAt ? new Date(m.startAt).toLocaleDateString('zh-CN') : ''}
                      </span>
                    </div>
                    <button
                      onClick={() => setBatchModal({ matchId: m.id, matchName })}
                      className="text-xs btn-primary px-3 py-1"
                    >
                      结算
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--bg-base)', borderColor: 'var(--border-light)' }} className="border-b">
              {['ID', '用户', '比赛', '玩法', '选择', '赔率', '投注额', '理论赔付', '实际赔付', '状态', '操作'].map(h => (
                <th key={h} className="px-3 py-3 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className="text-center py-10 text-sm" style={{ color: 'var(--text-secondary)' }}>加载中...</td>
              </tr>
            ) : bets.map((b) => {
              const st = betStatusLabels[b.status] ?? { label: b.status, color: '#9ca3af', bg: '#1f2937' }
              const selLabel = selectionLabels[b.selection] ?? b.selection
              return (
                <tr key={b.id} className="border-b" style={{ borderColor: 'var(--border-light)' }}>
                  <td className="px-3 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>#{b.id}</td>
                  <td className="px-3 py-3">
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{b.username}</div>
                  </td>
                  <td className="px-3 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <div>{b.teamHome} vs {b.teamAway}</div>
                    <div className="font-mono font-bold"
                      style={{ color: b.matchStatus === 'finished' ? 'var(--color-primary)' : 'var(--text-secondary)' }}>
                      {b.scoreHome ?? '-'}:{b.scoreAway ?? '-'}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
                    {b.betTypeName ?? '胜平负'}
                  </td>
                  <td className="px-3 py-3 text-center text-xs">
                    <span className="px-1.5 py-0.5 rounded"
                      style={{
                        background: b.selection === 'home' ? '#1e3a5f' : b.selection === 'away' ? '#450a0a' : '#1f2937',
                        color: b.selection === 'home' ? '#93c5fd' : b.selection === 'away' ? '#fca5a5' : '#9ca3af',
                      }}>
                      {selLabel}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center font-mono text-xs" style={{ color: 'var(--text-primary)' }}>
                    {Number(b.oddsSnapshot).toFixed(2)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono" style={{ color: 'var(--text-primary)' }}>
                    ¥{fmt(b.amountCents)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono" style={{ color: 'var(--text-primary)' }}>
                    ¥{fmt(b.potentialPayoutCents)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono" style={{ color: b.actualPayoutCents ? '#10b981' : 'var(--text-secondary)' }}>
                    {b.actualPayoutCents != null ? `¥${fmt(b.actualPayoutCents)}` : '-'}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-xs px-2 py-1 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                  </td>
                  <td className="px-3 py-3">
                    {b.status === 'pending' && (
                      <div className="flex gap-1">
                        <button
                          disabled={settling === b.id}
                          onClick={() => handleSettle(b.id, 'won')}
                          className="text-xs px-2 py-1 rounded" style={{ background: '#065f46', color: '#6ee7b7' }}>
                          {settling === b.id ? '...' : '赢'}
                        </button>
                        <button
                          disabled={settling === b.id}
                          onClick={() => handleSettle(b.id, 'lost')}
                          className="text-xs px-2 py-1 rounded" style={{ background: '#1f2937', color: '#9ca3af' }}>
                          输
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!loading && bets.length === 0 && (
          <div className="py-12 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>暂无投注记录</div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-3">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="btn-secondary text-xs px-3" style={{ opacity: page <= 1 ? 0.4 : 1 }}>上一页</button>
          <span className="text-sm px-3 py-1.5" style={{ color: 'var(--text-secondary)' }}>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="btn-secondary text-xs px-3" style={{ opacity: page >= totalPages ? 0.4 : 1 }}>下一页</button>
        </div>
      )}

      {/* 批量结算弹窗 */}
      {batchModal && (
        <BatchSettleModal
          matchId={batchModal.matchId}
          matchName={batchModal.matchName}
          onClose={() => setBatchModal(null)}
          onSuccess={load}
        />
      )}
    </div>
  )
}
