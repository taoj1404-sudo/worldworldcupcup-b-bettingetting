'use client'

import { useState } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { betsApi, type Match } from '@/lib/api-client'

interface Props {
  match: Match
  onUpdate?: () => void
}

export function MatchCard({ match, onUpdate }: Props) {
  const { user } = useAuth()
  const { success, error: toastError } = useToast()
  const [selOdds, setSelOdds] = useState<string | null>(null)
  const [betAmt, setBetAmt] = useState('')
  const [placing, setPlacing] = useState(false)
  const [showPanel, setShowPanel] = useState(false)

  const locked = match.status !== 'upcoming'

  // 从 homeOdds 提取 result_1x2 赔率
  const odds1x2 = match.homeOdds?.result_1x2 as Record<string, number> | undefined

  const opts = [
    { k: 'home', label: match.homeTeamName, o: odds1x2?.home ?? 0, col: 'var(--color-win)' },
    { k: 'draw', label: '平局', o: odds1x2?.draw ?? 0, col: 'var(--color-draw)' },
    { k: 'away', label: match.awayTeamName, o: odds1x2?.away ?? 0, col: 'var(--color-loss)' },
  ]

  async function placeBet() {
    if (!selOdds || !betAmt || !user) return
    const amt = parseFloat(betAmt) * 100
    if (isNaN(amt) || amt < 100) { toastError('最低投注 1 元'); return }
    setPlacing(true)
    try {
      const r = await betsApi.place({
        matchId: match.id,
        oddsId: match.id,  // TODO: 替换为实际的 oddsId
        amountCents: amt,
        selection: selOdds,
      })
      success(`下注成功！预计赔付 ¥${(r.potentialPayoutCents / 100).toFixed(2)}`)
      setShowPanel(false)
      setSelOdds(null)
      setBetAmt('')
      onUpdate?.()
    } catch (err: any) {
      toastError(err.message)
    } finally {
      setPlacing(false)
    }
  }

  function fmt(iso: string) {
    return new Date(iso).toLocaleString('zh-CN', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const statusLabel: Record<string, string> = {
    live: '进行中',
    finished: '已结束',
    upcoming: fmt(match.startAt),
    cancelled: '已取消',
    postponed: '已延期',
  }

  return (
    <div className="card">
      {/* Card header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--border-light)' }}
      >
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {match.stage || '小组赛'}
        </span>
        <div className="flex items-center gap-2">
          {match.status === 'live' && (
            <span className="flex items-center gap-1">
              <span
                className="rounded-full animate-pulse"
                style={{ width: '8px', height: '8px', background: 'var(--color-live)' }}
              />
              <span className="text-xs font-medium" style={{ color: 'var(--color-live)' }}>
                进行中
              </span>
            </span>
          )}
          {match.status === 'finished' && (
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>已结束</span>
          )}
          {match.status === 'upcoming' && (
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {statusLabel.upcoming}
            </span>
          )}
        </div>
      </div>

      {/* Teams + Score */}
      <div className="px-4 py-5">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="font-semibold text-base">{match.homeTeamName}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{match.homeTeamCode}</p>
          </div>

          {match.homeScore !== null ? (
            <div className="score-badge mx-6">
              <span className="text-lg font-bold">{match.homeScore}</span>
              <span style={{ color: 'var(--text-muted)' }}>-</span>
              <span className="text-lg font-bold">{match.awayScore}</span>
            </div>
          ) : (
            <div className="mx-6 text-xl font-bold" style={{ color: 'var(--text-muted)' }}>VS</div>
          )}

          <div className="flex-1 text-right">
            <p className="font-semibold text-base">{match.awayTeamName}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{match.awayTeamCode}</p>
          </div>
        </div>
      </div>

      {/* Odds */}
      {!locked ? (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-3 gap-2">
            {opts.map(opt => (
              <button
                key={opt.k}
                onClick={() => {
                  if (!user) { toastError('请先登录'); return }
                  setSelOdds(opt.k)
                  setShowPanel(true)
                }}
                className={`odds-btn ${selOdds === opt.k ? 'selected' : ''}`}
              >
                <span className="text-xs truncate w-full" style={{ color: 'var(--text-secondary)' }}>
                  {opt.label}
                </span>
                <span className="font-bold text-sm">
                  {opt.o > 0 ? opt.o.toFixed(2) : '-'}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-3 gap-2">
            {opts.map(opt => (
              <div key={opt.k} className="odds-btn opacity-40 cursor-not-allowed">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{opt.label}</span>
                <span className="font-bold text-sm">-</span>
              </div>
            ))}
          </div>
          <p className="text-center text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            {match.status === 'live' ? '比赛进行中，暂停投注' : '比赛已结束'}
          </p>
        </div>
      )}

      {/* Betting panel */}
      {showPanel && selOdds && (
        <div
          className="px-4 pb-4 space-y-3"
          style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}
        >
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: 'var(--text-secondary)' }}>
              投注 <strong>{opts.find(o => o.k === selOdds)?.label}</strong>
            </span>
            <span style={{ color: 'var(--text-muted)' }}>
              赔率 {opts.find(o => o.k === selOdds)?.o.toFixed(2)}
            </span>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              value={betAmt}
              onChange={e => setBetAmt(e.target.value)}
              placeholder="投注金额（元）"
              min="1"
              step="0.01"
              className="input text-sm"
            />
            <button
              onClick={placeBet}
              disabled={placing || !betAmt}
              className="btn-primary whitespace-nowrap"
            >
              {placing ? '...' : '确认投注'}
            </button>
          </div>
          {betAmt && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              若中奖，预计赔付 ¥
              {((parseFloat(betAmt) || 0) * (opts.find(o => o.k === selOdds)?.o || 0)).toFixed(2)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
