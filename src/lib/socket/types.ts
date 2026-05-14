/**
 * Socket.IO 事件类型定义
 * 客户端和服务端共用此文件
 */

// ─── Server → Client Events ────────────────────────────────────────────────
export interface ServerToClientEvents {
  // 比赛
  'match:score_update': MatchScoreUpdate
  'match:status_change': MatchStatusChange
  'match:created': MatchCreated

  // 赔率
  'odds:update': OddsUpdate
  'odds:suspended': OddsSuspended

  // 用户
  'user:bet:settled': BetSettled
  'user:balance:update': BalanceUpdate
  'user:deposit:success': DepositSuccess
  'user:withdraw:approved': WithdrawApproved

  // 系统
  'notification': Notification
  'authenticated': { userId: string }
  'auth_error': { message: string }
  'subscribed': { room: string }
}

// ─── Client → Server Events ────────────────────────────────────────────────
export interface ClientToServerEvents {
  'subscribe:match': (matchId: number) => void
  'unsubscribe:match': (matchId: number) => void
  'subscribe:matches': () => void
}

// ─── Payload Types ─────────────────────────────────────────────────────────
export interface MatchScoreUpdate {
  matchId: number
  homeScore: number
  awayScore: number
  updatedAt: string
}

export interface MatchStatusChange {
  matchId: number
  status: 'upcoming' | 'live' | 'finished' | 'cancelled' | 'postponed'
  updatedAt: string
}

export interface MatchCreated {
  id: number
  homeTeamName: string
  awayTeamName: string
  homeTeamCode: string
  awayTeamCode: string
  startAt: string
  status: string
  homeScore: number | null
  awayScore: number | null
}

export interface OddsUpdate {
  matchId: number
  oddsId: number
  odds: Record<string, number>
}

export interface OddsSuspended {
  oddsId: number
  matchId: number
}

export interface BetSettled {
  betId: number
  status: 'won' | 'lost' | 'void'
  amountCents: number
  payoutCents: number
  matchId: number
}

export interface BalanceUpdate {
  balanceCents: number
}

export interface DepositSuccess {
  amountCents: number
  newBalance: number
}

export interface WithdrawApproved {
  amountCents: number
  newBalance: number
}

export interface Notification {
  title: string
  message: string
  type: 'info' | 'success' | 'warning'
}
