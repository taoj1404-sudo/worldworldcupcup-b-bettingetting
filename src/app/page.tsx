'use client'

import { useEffect, useState } from 'react'
import { matchesApi, type Match } from '@/lib/api-client'
import { useAuth } from '@/components/providers/AuthProvider'
import { Header } from '@/components/ui/Header'
import { MatchCard } from '@/components/ui/MatchCard'

type Filter = 'all' | 'upcoming' | 'live' | 'finished'

export default function HomePage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const { user } = useAuth()

  async function loadMatches() {
    setLoading(true)
    try {
      const params = filter === 'all' ? {} : { status: filter }
      const data = await matchesApi.list(params)
      // API 返回 { matches, pagination }，只取 matches 数组
      setMatches(data.matches || [])
    } catch (err) {
      console.error(err)
      setMatches([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadMatches() }, [filter])

  const filterBtns: { key: Filter; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'upcoming', label: '未开始' },
    { key: 'live', label: '进行中' },
    { key: 'finished', label: '已结束' },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">

        {/* Hero */}
        {!user && (
          <div
            className="mb-8 p-8 rounded-2xl text-center"
            style={{ background: 'linear-gradient(135deg, #1c1c1e, #27272a)' }}
          >
            <h1 className="text-3xl font-bold mb-2">
              <span style={{ color: 'var(--color-primary)' }}>2026</span> 世界杯竞猜
            </h1>
            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
              实时赔率 · 即时结算 · 安全可靠
            </p>
            <div className="flex gap-3 justify-center">
              <a href="/register" className="btn-primary">立即加入</a>
              <a href="/login" className="btn-secondary">登录</a>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="flex items-center gap-2 mb-6">
          {filterBtns.map(btn => (
            <button
              key={btn.key}
              onClick={() => setFilter(btn.key)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
              style={
                filter === btn.key
                  ? { background: 'var(--color-primary)', color: '#000' }
                  : { background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)' }
              }
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="loading-dots"><span/><span/><span/></div>
          </div>
        )}

        {/* Empty */}
        {!loading && matches.length === 0 && (
          <div className="text-center py-16" style={{ color: 'var(--text-secondary)' }}>
            <p style={{ fontSize: '3rem' }}>&#127934;</p>
            <p>暂无比赛</p>
          </div>
        )}

        {/* Match list */}
        <div className="space-y-4">
          {matches.map(m => (
            <MatchCard key={m.id} match={m} onUpdate={loadMatches} />
          ))}
        </div>
      </main>
    </div>
  )
}
