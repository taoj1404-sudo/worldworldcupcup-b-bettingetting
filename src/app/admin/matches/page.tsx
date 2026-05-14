'use client'

import { useEffect, useState, useCallback } from 'react'
import { useToast } from '@/components/providers/ToastProvider'

type MatchStatus = 'scheduled' | 'live' | 'finished' | 'cancelled' | 'postponed'

interface Match {
  id: number
  homeTeamName: string
  awayTeamName: string
  homeTeamCode: string
  awayTeamCode: string
  homeScore: number | null
  awayScore: number | null
  startAt: string
  status: MatchStatus
  stage: string
}

const stageLabels: Record<string, string> = {
  group_a: 'A组', group_b: 'B组', group_c: 'C组', group_d: 'D组',
  group_e: 'E组', group_f: 'F组', group_g: 'G组', group_h: 'H组',
  round_of_32: '32强', round_of_16: '16强', quarter_final: '8强',
  semi_final: '半决赛', third_place: '三四名', final: '决赛',
}

const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
  scheduled: { label: '未开始', color: '#3b82f6', bg: '#1e3a5f' },
  live: { label: '进行中', color: '#10b981', bg: '#064e3b' },
  finished: { label: '已结束', color: '#9ca3af', bg: '#1f2937' },
  cancelled: { label: '已取消', color: '#ef4444', bg: '#450a0a' },
  postponed: { label: '延期', color: '#f59e0b', bg: '#78350f' },
}

export default function AdminMatchesPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<MatchStatus>('scheduled')
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({
    teamHome: '', teamAway: '', teamHomeCode: '', teamAwayCode: '',
    stage: 'group_a', scheduledAt: '',
  })
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [oddsForm, setOddsForm] = useState<Record<string, string>>({})
  const { toast, success, error } = useToast()

  const auth = () => ({ headers: { Authorization: `Bearer ${sessionStorage.getItem('accessToken') ?? ''}`, 'Content-Type': 'application/json' } })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/matches')
      const json = await res.json()
      if (json.data) setMatches(json.data.matches ?? json.data)
    } catch { error('加载失败') }
    finally { setLoading(false) }
  }, [error])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: auth().headers,
        body: JSON.stringify({
          ...createForm,
          teamHomeCode: createForm.teamHomeCode.toUpperCase(),
          teamAwayCode: createForm.teamAwayCode.toUpperCase(),
          scheduledAt: new Date(createForm.scheduledAt).toISOString(),
        }),
      })
      const json = await res.json()
      if (json.code !== 0) throw new Error(json.message)
      success('比赛创建成功')
      setShowCreate(false)
      load()
    } catch (err: any) { error(err.message || '创建失败') }
  }

  const handleSetOdds = async (matchId: number) => {
    try {
      const items = Object.entries(oddsForm).map(([option, value]) => ({
        option, optionLabel: option === 'home' ? '主胜' : option === 'draw' ? '平局' : '客胜',
        value: parseFloat(value),
      }))
      const res = await fetch('/api/odds', {
        method: 'POST', headers: auth().headers,
        body: JSON.stringify({ matchId, items }),
      })
      const json = await res.json()
      if (json.code !== 0) throw new Error(json.message)
      success('赔率设置成功')
      setSelectedMatch(null)
      setOddsForm({})
    } catch (err: any) { error(err.message || '设置失败') }
  }

  const handleStatus = async (matchId: number, status: MatchStatus) => {
    try {
      const res = await fetch(`/api/matches/${matchId}/status`, {
        method: 'PATCH', headers: auth().headers,
        body: JSON.stringify({ status }),
      })
      const json = await res.json()
      if (json.code !== 0) throw new Error(json.message)
      success('状态已更新')
      load()
    } catch (err: any) { error(err.message || '更新失败') }
  }

  const handleScore = async (matchId: number) => {
    const home = prompt('主队得分:')
    const away = prompt('客队得分:')
    if (home === null || away === null) return
    try {
      const res = await fetch(`/api/matches/${matchId}/score`, {
        method: 'PATCH', headers: auth().headers,
        body: JSON.stringify({ scoreHome: parseInt(home), scoreAway: parseInt(away) }),
      })
      const json = await res.json()
      if (json.code !== 0) throw new Error(json.message)
      success('比分已更新')
      load()
    } catch (err: any) { error(err.message || '更新失败') }
  }

  useEffect(() => { load() }, [load])

  const filtered = matches.filter((m) => m.status === tab)
  const tabs: MatchStatus[] = ['scheduled', 'live', 'finished', 'cancelled']

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>比赛管理</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary">+ 新建比赛</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--border-light)' }}>
        {tabs.map((s) => {
          const st = statusLabels[s]
          return (
            <button key={s} onClick={() => setTab(s)}
              className="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
              style={{ borderColor: tab === s ? st.color : 'transparent', color: tab === s ? st.color : 'var(--text-secondary)' }}>
              {st.label}
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--bg-base)', borderColor: 'var(--border-light)' }} className="border-b">
              {['比赛', '阶段', '比分', '状态', '开赛时间', '操作'].map(h => (
                <th key={h} className={`text-${h === '比赛' ? 'left' : h === '操作' ? 'right' : 'center'} px-4 py-3 text-xs font-medium`} style={{ color: 'var(--text-secondary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => {
              const st = statusLabels[m.status]
              return (
                <tr key={m.id} className="border-b" style={{ borderColor: 'var(--border-light)' }}>
                  <td className="px-4 py-3">
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{m.homeTeamName} vs {m.awayTeamName}</div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{m.homeTeamCode} - {m.awayTeamCode}</div>
                  </td>
                  <td className="px-4 py-3 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>{stageLabels[m.stage] ?? m.stage}</td>
                  <td className="px-4 py-3 text-center font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                    {m.homeScore ?? '-'} : {m.awayScore ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs px-2 py-1 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {new Date(m.startAt).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2 flex-wrap">
                      {m.status === 'scheduled' && (
                        <>
                          <button onClick={() => handleStatus(m.id, 'live')} className="text-xs btn-primary px-2 py-1">开始</button>
                          <button onClick={() => { setSelectedMatch(m); setOddsForm({}) }} className="text-xs btn-secondary px-2 py-1">设置赔率</button>
                        </>
                      )}
                      {m.status === 'live' && (
                        <>
                          <button onClick={() => handleScore(m.id)} className="text-xs btn-secondary px-2 py-1">更新比分</button>
                          <button onClick={() => handleStatus(m.id, 'finished')} className="text-xs btn-secondary px-2 py-1">结束比赛</button>
                        </>
                      )}
                      {m.status === 'finished' && (
                        <a href="/admin/bets" className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>去结算 →</a>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>暂无比赛</div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <Modal title="新建比赛" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>主队</label>
                <input className="input w-full" placeholder="巴西" required
                  value={createForm.teamHome} onChange={e => setCreateForm(f => ({ ...f, teamHome: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>客队</label>
                <input className="input w-full" placeholder="阿根廷" required
                  value={createForm.teamAway} onChange={e => setCreateForm(f => ({ ...f, teamAway: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>主队代码 (3位大写)</label>
                <input className="input w-full" placeholder="BRA" required maxLength={3}
                  value={createForm.teamHomeCode} onChange={e => setCreateForm(f => ({ ...f, teamHomeCode: e.target.value.toUpperCase() }))} />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>客队代码 (3位大写)</label>
                <input className="input w-full" placeholder="ARG" required maxLength={3}
                  value={createForm.teamAwayCode} onChange={e => setCreateForm(f => ({ ...f, teamAwayCode: e.target.value.toUpperCase() }))} />
              </div>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>阶段</label>
              <select className="input w-full" value={createForm.stage} onChange={e => setCreateForm(f => ({ ...f, stage: e.target.value }))}>
                {Object.entries(stageLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>开赛时间</label>
              <input type="datetime-local" className="input w-full" required
                value={createForm.scheduledAt} onChange={e => setCreateForm(f => ({ ...f, scheduledAt: e.target.value }))} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="flex-1 btn-secondary">取消</button>
              <button type="submit" className="flex-1 btn-primary">创建</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Odds Modal */}
      {selectedMatch && (
        <Modal title={`设置赔率 — ${selectedMatch.homeTeamName} vs ${selectedMatch.awayTeamName}`} onClose={() => setSelectedMatch(null)}>
          <div className="space-y-3">
            {[['home', '主胜'], ['draw', '平局'], ['away', '客胜']].map(([opt, label]) => (
              <div key={opt}>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</label>
                <input key={opt} className="input w-full" placeholder="1.85" type="number" step="0.01" min="1.01" required
                  value={oddsForm[opt] ?? ''} onChange={e => setOddsForm(f => ({ ...f, [opt]: e.target.value }))} />
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={() => setSelectedMatch(null)} className="flex-1 btn-secondary">取消</button>
            <button onClick={() => handleSetOdds(selectedMatch.id)} className="flex-1 btn-primary">保存</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// Simple modal helper
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
          <button onClick={onClose} className="text-lg" style={{ color: 'var(--text-secondary)' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
