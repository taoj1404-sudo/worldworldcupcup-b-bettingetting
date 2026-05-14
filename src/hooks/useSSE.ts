'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

// ─── 事件类型 ─────────────────────────────────────────────────────────────────

export interface SSEEvent {
  type: string
  data: any
  timestamp?: string
}

export interface LeaderboardPayload {
  leaderboard: Array<{ rank: number; userId: number; username: string; balance: number }>
  totalParticipants: number
}

export interface MatchStatusPayload {
  matchId: number
  status: 'upcoming' | 'live' | 'finished' | 'cancelled' | 'postponed'
  homeTeam: string
  awayTeam: string
  homeScore?: number
  awayScore?: number
}

export interface BetSettlementPayload {
  matchId: number
  matchName: string
  status: 'won' | 'lost' | 'void'
  settledCount: number
}

export interface NotificationPayload {
  title: string
  message: string
  level: 'info' | 'success' | 'warning' | 'error'
}

// ─── Hook 配置 ────────────────────────────────────────────────────────────────

interface UseSSEOptions {
  /** SSE 连接 URL，默认 /api/events */
  url?: string
  /** 是否自动连接，默认 true */
  autoConnect?: boolean
  /** 心跳重连间隔（毫秒），默认 5000 */
  reconnectInterval?: number
  /** 最大重连次数，默认不限制 */
  maxRetries?: number
  /** 事件回调 */
  onLeaderboardUpdate?: (data: LeaderboardPayload) => void
  onMatchStatusChange?: (data: MatchStatusPayload) => void
  onBetSettlement?: (data: BetSettlementPayload) => void
  onNotification?: (data: NotificationPayload) => void
  onConnected?: () => void
  onDisconnected?: () => void
  onError?: (error: Event) => void
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSSE(options: UseSSEOptions = {}) {
  const {
    url = '/api/events',
    autoConnect = true,
    reconnectInterval = 5000,
    maxRetries,
    onLeaderboardUpdate,
    onMatchStatusChange,
    onBetSettlement,
    onNotification,
    onConnected,
    onDisconnected,
    onError,
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const esRef = useRef<EventSource | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  // ── 连接逻辑 ────────────────────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (!mountedRef.current) return
    if (esRef.current) {
      esRef.current.close()
    }

    const es = new EventSource(url)
    esRef.current = es

    es.addEventListener('connected', () => {
      if (!mountedRef.current) return
      setIsConnected(true)
      setConnectionError(null)
      setRetryCount(0)
      onConnected?.()
    })

    // 排行榜更新
    es.addEventListener('leaderboard', (e) => {
      if (!mountedRef.current) return
      try {
        const data = JSON.parse(e.data) as LeaderboardPayload
        onLeaderboardUpdate?.(data)
      } catch {
        // ignore
      }
    })

    // 比赛状态变化
    es.addEventListener('match:status_change', (e) => {
      if (!mountedRef.current) return
      try {
        const data = JSON.parse(e.data) as MatchStatusPayload
        onMatchStatusChange?.(data)
      } catch {
        // ignore
      }
    })

    // 投注结算
    es.addEventListener('bet:settlement', (e) => {
      if (!mountedRef.current) return
      try {
        const data = JSON.parse(e.data) as BetSettlementPayload
        onBetSettlement?.(data)
      } catch {
        // ignore
      }
    })

    // 系统通知
    es.addEventListener('notification', (e) => {
      if (!mountedRef.current) return
      try {
        const data = JSON.parse(e.data) as NotificationPayload
        onNotification?.(data)
      } catch {
        // ignore
      }
    })

    es.onerror = (error) => {
      if (!mountedRef.current) return
      setIsConnected(false)
      onError?.(error)

      es.close()
      esRef.current = null

      // 重连逻辑
      if (maxRetries !== undefined && retryCount >= maxRetries) {
        setConnectionError(`连接失败，已停止重试（${retryCount} 次）`)
        return
      }

      retryTimerRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setRetryCount((c) => c + 1)
          connect()
        }
      }, reconnectInterval)
    }
  }, [
    url,
    reconnectInterval,
    maxRetries,
    retryCount,
    onLeaderboardUpdate,
    onMatchStatusChange,
    onBetSettlement,
    onNotification,
    onConnected,
    onError,
  ])

  // ── 断开连接 ────────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }
    setIsConnected(false)
    onDisconnected?.()
  }, [onDisconnected])

  // ── 生命周期 ────────────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true
    if (autoConnect) {
      connect()
    }
    return () => {
      mountedRef.current = false
      disconnect()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isConnected,
    connectionError,
    retryCount,
    connect,
    disconnect,
  }
}

// ─── 便捷 Hook：仅监听通知 ─────────────────────────────────────────────────────

export function useSSENotifications() {
  const [notifications, setNotifications] = useState<NotificationPayload[]>([])

  const handleNotification = useCallback((data: NotificationPayload) => {
    setNotifications((prev) => [
      { ...data, timestamp: new Date().toISOString() },
      ...prev.slice(0, 49), // 最多保留 50 条
    ])
  }, [])

  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  const { isConnected } = useSSE({
    onNotification: handleNotification,
  })

  return {
    notifications,
    clearNotifications,
    isConnected,
  }
}
