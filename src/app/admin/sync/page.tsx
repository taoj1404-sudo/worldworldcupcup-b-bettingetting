'use client'

import { useEffect, useState, useCallback } from 'react'
import { useToast } from '@/components/providers/ToastProvider'

interface LeagueInfo {
  id: number
  name: string
  nameEn: string
  country: string
  season: number
}

interface SyncResult {
  leagueId: number
  leagueName: string
  created: number
  updated: number
  oddsCreated: number
  oddsUpdated: number
  errors: string[]
}

interface SettingItem {
  key: string
  value: string
  configured: boolean
  isKey: boolean
  description: string
}

const LEAGUE_FLAGS: Record<number, string> = {
  39:  '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  140: '🇪🇸',
  78:  '🇩🇪',
  61:  '🇫🇷',
  135: '🇮🇹',
}

export default function AdminSyncPage() {
  const [leagues, setLeagues] = useState<LeagueInfo[]>([])
  const [apiConfigured, setApiConfigured] = useState(false)
  const [oddsConfigured, setOddsConfigured] = useState(false)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<number | null>(null)
  const [lastResults, setLastResults] = useState<SyncResult[] | null>(null)
  const [lastSummary, setLastSummary] = useState<{ totalCreated: number; totalUpdated: number; totalOdds: number; errorCount: number } | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)

  // API Key 配置面板
  const [showKeyPanel, setShowKeyPanel] = useState(false)
  const [settings, setSettings] = useState<SettingItem[]>([])
  const [keyForm, setKeyForm] = useState<Record<string, string>>({})
  const [savingKeys, setSavingKeys] = useState(false)
  const [showValues, setShowValues] = useState<Record<string, boolean>>({})

  const { success, error } = useToast()

  const auth = () => ({
    headers: {
      Authorization: `Bearer ${sessionStorage.getItem('accessToken') ?? ''}`,
      'Content-Type': 'application/json',
    },
  })

  const loadLeagues = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/sync/leagues', auth())
      const json = await res.json()
      if (json.code !== 0) throw new Error(json.message)
      setLeagues(json.data?.supportedLeagues ?? [])
      setApiConfigured(json.data?.apiConfigured ?? false)
    } catch (e: any) {
      error('加载联赛列表失败：' + (e?.message ?? ''))
    } finally {
      setLoading(false)
    }
  }, [error])

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings', auth())
      const json = await res.json()
      if (json.code === 0) {
        setSettings(json.data?.settings ?? [])
        setApiConfigured(json.data?.apiFootballConfigured ?? false)
        setOddsConfigured(json.data?.oddsApiConfigured ?? false)
        // 初始化表单（Key 字段为空）
        const form: Record<string, string> = {}
        for (const s of (json.data?.settings ?? [])) {
          form[s.key] = s.isKey ? '' : s.value  // Key 字段留空让用户主动填写
        }
        setKeyForm(form)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { loadLeagues() }, [loadLeagues])
  useEffect(() => { if (showKeyPanel) loadSettings() }, [showKeyPanel, loadSettings])

  const handleSync = async (leagueId?: number) => {
    setSyncing(leagueId ?? -1)
    setLastResults(null)
    try {
      const body = leagueId ? { leagueId } : {}
      const res = await fetch('/api/sync/leagues', {
        method: 'POST',
        headers: auth().headers,
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.code !== 0) throw new Error(json.message)
      setLastResults(json.data?.results ?? [])
      setLastSummary(json.data?.summary ?? null)
      setLastSyncedAt(json.data?.syncedAt ?? new Date().toISOString())
      success('同步完成！')
    } catch (e: any) {
      error('同步失败：' + (e?.message ?? ''))
    } finally {
      setSyncing(null)
    }
  }

  const handleSyncLive = async () => {
    setSyncing(-2)
    try {
      const res = await fetch('/api/sync/live-scores', {
        method: 'POST',
        headers: auth().headers,
      })
      const json = await res.json()
      if (json.code !== 0) throw new Error(json.message)
      setLastSyncedAt(json.data?.syncedAt ?? new Date().toISOString())
      success(`实时比分同步完成，更新 ${json.data?.updated ?? 0} 场比赛`)
    } catch (e: any) {
      error('同步失败：' + (e?.message ?? ''))
    } finally {
      setSyncing(null)
    }
  }

  const handleSaveKeys = async () => {
    // 只提交有实际填写内容的字段（避免覆盖已有 Key）
    const updates: Record<string, string> = {}
    for (const s of settings) {
      const val = keyForm[s.key]
      if (!s.isKey) {
        // 非 Key 字段（如间隔时间），直接提交
        updates[s.key] = val ?? ''
      } else if (val && val.trim()) {
        // Key 字段：只有用户填写了内容才提交
        updates[s.key] = val.trim()
      }
    }
    if (Object.keys(updates).length === 0) {
      error('没有需要保存的内容')
      return
    }
    setSavingKeys(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: auth().headers,
        body: JSON.stringify(updates),
      })
      const json = await res.json()
      if (json.code !== 0) throw new Error(json.message)
      success('配置已保存！API Key 即刻生效。')
      // 刷新状态
      loadLeagues()
      loadSettings()
      setKeyForm(prev => {
        const next = { ...prev }
        for (const s of settings) {
          if (s.isKey) next[s.key] = ''  // 清空 Key 输入框
        }
        return next
      })
    } catch (e: any) {
      error('保存失败：' + (e?.message ?? ''))
    } finally {
      setSavingKeys(false)
    }
  }

  const isBusy = syncing !== null
  const getResultFor = (id: number) => lastResults?.find(r => r.leagueId === id)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>数据同步</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            从 API-Football 同步5大联赛赛程与赔率
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastSyncedAt && (
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              上次同步：{new Date(lastSyncedAt).toLocaleString('zh-CN')}
            </span>
          )}
          <button onClick={() => setShowKeyPanel(v => !v)} className="btn-secondary text-xs">
            🔑 配置 API Key
          </button>
          <button onClick={loadLeagues} className="btn-secondary text-xs" disabled={loading}>
            ↻ 刷新状态
          </button>
        </div>
      </div>

      {/* API Key 配置面板 */}
      {showKeyPanel && (
        <div className="rounded-xl border p-5 space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--color-primary)' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>🔑 API Key 配置</h2>
            <button onClick={() => setShowKeyPanel(false)} className="text-lg" style={{ color: 'var(--text-secondary)' }}>×</button>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            填写后自动写入 <code style={{ color: 'var(--color-primary)' }}>.env.local</code>，当前会话立即生效，无需重启服务器。
          </p>

          <div className="space-y-3">
            {settings.map(s => (
              <div key={s.key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {s.description}
                  </label>
                  {s.configured && (
                    <span className="text-xs px-1.5 py-0.5 rounded"
                      style={{ background: '#064e3b', color: '#6ee7b7' }}>
                      已配置
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={s.isKey && !showValues[s.key] ? 'password' : 'text'}
                    className="input w-full pr-16 text-xs font-mono"
                    placeholder={s.isKey
                      ? (s.configured ? '留空表示不修改已有 Key' : '粘贴你的 API Key...')
                      : s.value}
                    value={keyForm[s.key] ?? ''}
                    onChange={e => setKeyForm(f => ({ ...f, [s.key]: e.target.value }))}
                  />
                  {s.isKey && (
                    <button
                      type="button"
                      onClick={() => setShowValues(v => ({ ...v, [s.key]: !v[s.key] }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {showValues[s.key] ? '隐藏' : '显示'}
                    </button>
                  )}
                </div>
                {s.key === 'API_FOOTBALL_KEY' && (
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    申请地址：
                    <a href="https://rapidapi.com/api-sports/api/api-football" target="_blank"
                      style={{ color: 'var(--color-primary)' }}>
                      rapidapi.com → api-football
                    </a>
                    {' '}（免费版：100次/天）
                  </p>
                )}
                {s.key === 'THE_ODDS_API_KEY' && (
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    申请地址：
                    <a href="https://the-odds-api.com/" target="_blank"
                      style={{ color: 'var(--color-primary)' }}>
                      the-odds-api.com
                    </a>
                    {' '}（可选，留空则使用 ELO 自动计算赔率）
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowKeyPanel(false)} className="btn-secondary text-xs">取消</button>
            <button onClick={handleSaveKeys} disabled={savingKeys} className="btn-primary text-xs">
              {savingKeys ? '保存中...' : '💾 保存配置'}
            </button>
          </div>
        </div>
      )}

      {/* API Status Banner */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`rounded-xl border p-4 flex items-center gap-3 ${
          apiConfigured ? 'border-green-800 bg-green-950' : 'border-yellow-800 bg-yellow-950'
        }`}>
          <span className="text-2xl">{apiConfigured ? '✅' : '⚠️'}</span>
          <div>
            <div className="text-sm font-semibold" style={{ color: apiConfigured ? '#86efac' : '#fde68a' }}>
              {apiConfigured ? 'API-Football 已配置' : 'API-Football 未配置'}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {apiConfigured ? '实时赛程将从 API-Football 获取' : '未配置，使用 ELO 自动计算赔率'}
            </div>
          </div>
        </div>
        <div className={`rounded-xl border p-4 flex items-center gap-3 ${
          oddsConfigured ? 'border-blue-800 bg-blue-950' : 'border-gray-800 bg-gray-950'
        }`}>
          <span className="text-2xl">{oddsConfigured ? '📊' : '🤖'}</span>
          <div>
            <div className="text-sm font-semibold" style={{ color: oddsConfigured ? '#93c5fd' : '#9ca3af' }}>
              {oddsConfigured ? 'The Odds API 已配置' : '使用 ELO 自动赔率'}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {oddsConfigured ? '国际赔率数据实时获取' : '基于球队 ELO 评分自动计算'}
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 flex-wrap">
        <button onClick={() => handleSync()} disabled={isBusy} className="btn-primary">
          {syncing === -1 ? '⏳ 同步联赛中...' : '🔄 同步全部联赛'}
        </button>
        <button onClick={handleSyncLive} disabled={isBusy} className="btn-secondary">
          {syncing === -2 ? '⏳ 同步中...' : '⚡ 同步实时比分'}
        </button>
      </div>

      {/* League list */}
      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            支持联赛 <span className="font-normal" style={{ color: 'var(--text-secondary)' }}>（五大联赛）</span>
          </h2>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>加载中...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--bg-base)', borderColor: 'var(--border-light)' }} className="border-b">
                {['联赛', '赛季', '状态', '最近同步结果', '操作'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-medium text-left" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leagues.map(league => {
                const result = getResultFor(league.id)
                const hasResult = result !== undefined
                const isThisSyncing = syncing === league.id
                const flag = LEAGUE_FLAGS[league.id] ?? '🏆'

                return (
                  <tr key={league.id} className="border-b" style={{ borderColor: 'var(--border-light)' }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span>{flag}</span>
                        <div>
                          <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{league.name}</div>
                          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{league.nameEn} · {league.country}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {league.season}/{String(league.season + 1).slice(-2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: apiConfigured ? '#064e3b' : '#1e3a5f', color: apiConfigured ? '#6ee7b7' : '#93c5fd' }}>
                        {apiConfigured ? '实时数据' : 'ELO赔率'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {hasResult ? (
                        <div className="flex gap-2 text-xs flex-wrap">
                          {result.created > 0 && (
                            <span className="px-2 py-0.5 rounded" style={{ background: '#064e3b', color: '#6ee7b7' }}>
                              +{result.created} 新比赛
                            </span>
                          )}
                          {result.updated > 0 && (
                            <span className="px-2 py-0.5 rounded" style={{ background: '#1e3a5f', color: '#93c5fd' }}>
                              ~{result.updated} 更新
                            </span>
                          )}
                          {result.oddsCreated > 0 && (
                            <span className="px-2 py-0.5 rounded" style={{ background: '#78350f', color: '#fde68a' }}>
                              {result.oddsCreated} 赔率
                            </span>
                          )}
                          {result.created === 0 && result.updated === 0 && result.oddsCreated === 0 && (
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>无变动</span>
                          )}
                          {result.errors.length > 0 && (
                            <span className="px-2 py-0.5 rounded" style={{ background: '#450a0a', color: '#fca5a5' }}>
                              {result.errors.length} 错误
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleSync(league.id)}
                        disabled={isBusy}
                        className="text-xs btn-secondary px-3 py-1"
                      >
                        {isThisSyncing ? '同步中...' : '同步'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary */}
      {lastSummary && (
        <div className="rounded-xl border p-4 grid grid-cols-4 gap-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
          {[
            { label: '新增比赛', value: lastSummary.totalCreated, color: '#10b981' },
            { label: '更新比赛', value: lastSummary.totalUpdated, color: '#3b82f6' },
            { label: '新增赔率', value: lastSummary.totalOdds, color: '#f59e0b' },
            { label: '错误数量', value: lastSummary.errorCount, color: lastSummary.errorCount > 0 ? '#ef4444' : '#6b7280' },
          ].map(item => (
            <div key={item.label} className="text-center">
              <div className="text-2xl font-bold" style={{ color: item.color }}>{item.value}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Help */}
      <div className="rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
        <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>💡 使用说明</h3>
        <ul className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
          <li>• <strong>同步全部联赛</strong>：从 API-Football 拉取5大联赛未来赛程，自动创建比赛和赔率</li>
          <li>• <strong>同步实时比分</strong>：更新所有进行中比赛的比分（建议每30秒调用一次）</li>
          <li>• <strong>ELO 赔率计算</strong>：未配置 API Key 时，基于球队 ELO 评分自动生成公平赔率</li>
          <li>• <strong>配置 API Key</strong>：点击右上角"配置 API Key"按钮，填写后立即生效</li>
          <li>• <strong>生产部署</strong>：可配置 cron 定时任务自动调用同步接口，保持数据实时更新</li>
        </ul>
      </div>
    </div>
  )
}
