/**
 * SSE 事件发射器（内存 Pub/Sub）
 * 用于在服务端触发事件，SSE 路由将事件推送给所有连接的客户端
 */

import { EventEmitter } from 'events'

// ─── 事件类型定义 ────────────────────────────────────────────────────────────

export interface SSEEvent {
  type: string
  data: any
  timestamp: string
}

export interface LeaderboardUpdate {
  type: 'leaderboard'
  data: {
    leaderboard: Array<{
      rank: number
      userId: number
      username: string
      balance: number
    }>
    totalParticipants: number
  }
}

export interface MatchStatusEvent {
  type: 'match:status_change'
  data: {
    matchId: number
    status: 'upcoming' | 'live' | 'finished' | 'cancelled' | 'postponed'
    homeTeam: string
    awayTeam: string
    homeScore?: number
    awayScore?: number
  }
}

export interface BetSettlementEvent {
  type: 'bet:settlement'
  data: {
    matchId: number
    matchName: string
    status: 'won' | 'lost' | 'void'
    settledCount: number
    totalPayout?: number
  }
}

export interface SystemNotification {
  type: 'notification'
  data: {
    title: string
    message: string
    level: 'info' | 'success' | 'warning' | 'error'
  }
}

export type SSEEventPayload = LeaderboardUpdate | MatchStatusEvent | BetSettlementEvent | SystemNotification

// ─── 全局发射器（单例）────────────────────────────────────────────────────────

class SSEEmitter extends EventEmitter {
  private static instance: SSEEmitter

  private constructor() {
    super()
    // 提高默认限制，避免警告
    this.setMaxListeners(100)
  }

  static getInstance(): SSEEmitter {
    if (!SSEEmitter.instance) {
      SSEEmitter.instance = new SSEEmitter()
    }
    return SSEEmitter.instance
  }

  /**
   * 广播事件给所有 SSE 客户端
   */
  broadcast(event: SSEEventPayload) {
    this.emit('event', event)
  }

  /**
   * 订阅事件（返回取消订阅函数）
   */
  subscribe(handler: (event: SSEEventPayload) => void): () => void {
    this.on('event', handler)
    return () => this.off('event', handler)
  }
}

export const sseEmitter = SSEEmitter.getInstance()

// ─── 快捷 Helper 函数 ─────────────────────────────────────────────────────────

/**
 * 通知排行榜更新（通常在结算/余额变动后调用）
 */
export function notifyLeaderboardUpdate(leaderboard: LeaderboardUpdate['data']) {
  sseEmitter.broadcast({
    type: 'leaderboard',
    data: leaderboard,
  })
}

/**
 * 通知比赛状态变化
 */
export function notifyMatchStatusChange(match: MatchStatusEvent['data']) {
  sseEmitter.broadcast({
    type: 'match:status_change',
    data: match,
  })
}

/**
 * 通知结算结果
 */
export function notifyBetSettlement(settlement: BetSettlementEvent['data']) {
  sseEmitter.broadcast({
    type: 'bet:settlement',
    data: settlement,
  })
}

/**
 * 发送系统通知（全员广播）
 */
export function notifySystem(
  title: string,
  message: string,
  level: 'info' | 'success' | 'warning' | 'error' = 'info'
) {
  sseEmitter.broadcast({
    type: 'notification',
    data: { title, message, level },
  })
}
