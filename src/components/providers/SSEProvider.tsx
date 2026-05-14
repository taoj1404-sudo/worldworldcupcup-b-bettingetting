'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useToast } from './ToastProvider'
import type {
  NotificationPayload,
  LeaderboardPayload,
  MatchStatusPayload,
  BetSettlementPayload,
} from '@/hooks/useSSE'

// ─── Context ──────────────────────────────────────────────────────────────────

interface SSEContextValue {
  isConnected: boolean
  notifications: NotificationPayload[]
  clearNotifications: () => void
  /** 触发排行榜重新拉取（传入回调） */
  onLeaderboardRefresh?: (cb: () => void) => void
}

const SSEContext = createContext<SSEContextValue>({
  isConnected: false,
  notifications: [],
  clearNotifications: () => {},
})

export function useSSEContext() {
  return useContext(SSEContext)
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SSEProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast()
  const [isConnected, setIsConnected] = useState(false)
  const [notifications, setNotifications] = useState<NotificationPayload[]>([])
  const esRef = useRef<EventSource | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const leaderboardRefreshCbRef = useRef<(() => void) | null>(null)
  const mountedRef = useRef(true)

  // 注册排行榜刷新回调
  const onLeaderboardRefresh = useCallback((cb: () => void) => {
    leaderboardRefreshCbRef.current = cb
  }, [])

  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  useEffect(() => {
    mountedRef.current = true

    function connect() {
      if (!mountedRef.current) return
      if (esRef.current) {
        esRef.current.close()
      }

      const es = new EventSource('/api/events')
      esRef.current = es

      es.addEventListener('connected', () => {
        if (!mountedRef.current) return
        setIsConnected(true)
        console.log('[SSE] Connected')
      })

      // 通用事件处理
      const handleEvent = (type: string, data: any) => {
        if (!mountedRef.current) return

        switch (type) {
          case 'notification': {
            const n = data as NotificationPayload
            setNotifications((prev) => [n, ...prev.slice(0, 49)])
            // 同时显示为 Toast
            const toastType = n.level === 'error' ? 'error'
              : n.level === 'warning' ? 'warning'
              : n.level === 'success' ? 'success'
              : 'info'
            toast.toast(`${n.title}：${n.message}`, toastType)
            break
          }

          case 'leaderboard': {
            const lb = data as LeaderboardPayload
            // 触发排行榜组件重新拉取
            if (leaderboardRefreshCbRef.current) {
              leaderboardRefreshCbRef.current()
            }
            console.log('[SSE] Leaderboard update received')
            break
          }

          case 'match:status_change': {
            const m = data as MatchStatusPayload
            toast.toast(
              `比赛更新：${m.homeTeam} vs ${m.awayTeam} → ${
                m.status === 'live' ? '进行中' :
                m.status === 'finished' ? '已结束' :
                m.status === 'upcoming' ? '未开始' :
                m.status
              }`,
              'info'
            )
            break
          }

          case 'bet:settlement': {
            const b = data as BetSettlementPayload
            toast.toast(`结算完成：${b.matchName}，共 ${b.settledCount} 笔投注`, 'success')
            break
          }
        }
      }

      // 监听所有事件
      es.addEventListener('leaderboard', (e) => {
        try { handleEvent('leaderboard', JSON.parse(e.data)) } catch {}
      })
      es.addEventListener('match:status_change', (e) => {
        try { handleEvent('match:status_change', JSON.parse(e.data)) } catch {}
      })
      es.addEventListener('bet:settlement', (e) => {
        try { handleEvent('bet:settlement', JSON.parse(e.data)) } catch {}
      })
      es.addEventListener('notification', (e) => {
        try { handleEvent('notification', JSON.parse(e.data)) } catch {}
      })

      es.onerror = () => {
        if (!mountedRef.current) return
        setIsConnected(false)
        es.close()
        esRef.current = null

        // 5 秒后重连
        retryRef.current = setTimeout(() => {
          if (mountedRef.current) connect()
        }, 5000)
      }
    }

    connect()

    return () => {
      mountedRef.current = false
      if (retryRef.current) clearTimeout(retryRef.current)
      if (esRef.current) {
        esRef.current.close()
        esRef.current = null
      }
    }
  }, [toast])

  return (
    <SSEContext.Provider value={{ isConnected, notifications, clearNotifications, onLeaderboardRefresh }}>
      {children}
    </SSEContext.Provider>
  )
}
