/**
 * Socket.IO 服务端工具
 *
 * 提供 emit helpers，供 API Routes 在数据变更时调用。
 * 在 server.js 中通过 global.io 全局访问。
 */

import { Server as SocketServer, Socket } from 'socket.io'
import { Server as HttpServer } from 'http'

// ─── 类型定义 ─────────────────────────────────────────────────────────────
export interface ServerToClientEvents {
  // 比赛事件
  'match:score_update': (data: MatchScorePayload) => void
  'match:status_change': (data: MatchStatusPayload) => void
  'match:created': (data: MatchPayload) => void

  // 赔率事件
  'odds:update': (data: OddsPayload) => void
  'odds:suspended': (data: { oddsId: number; matchId: number }) => void

  // 用户个人事件
  'user:bet:settled': (data: BetSettledPayload) => void
  'user:balance:update': (data: { balanceCents: number }) => void
  'user:deposit:success': (data: { amountCents: number; newBalance: number }) => void
  'user:withdraw:approved': (data: { amountCents: number; newBalance: number }) => void

  // 系统事件
  'notification': (data: { title: string; message: string; type: 'info' | 'success' | 'warning' }) => void

  // 认证
  'authenticated': (data: { userId: string }) => void
  'auth_error': (data: { message: string }) => void
  'subscribed': (data: { room: string }) => void
}

export interface ClientToServerEvents {
  'subscribe:match': (matchId: number) => void
  'unsubscribe:match': (matchId: number) => void
  'subscribe:matches': () => void
}

interface MatchScorePayload {
  matchId: number
  homeScore: number
  awayScore: number
  updatedAt: string
}

interface MatchStatusPayload {
  matchId: number
  status: 'upcoming' | 'live' | 'finished' | 'cancelled' | 'postponed'
  updatedAt: string
}

interface MatchPayload {
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

interface OddsPayload {
  matchId: number
  oddsId: number
  odds: { [key: string]: number }
}

interface BetSettledPayload {
  betId: number
  status: 'won' | 'lost' | 'void'
  amountCents: number
  payoutCents: number
  matchId: number
}

// ─── 全局 io 实例（来自 server.js）─────────────────────────────────────────
let _io: SocketServer<ClientToServerEvents, ServerToClientEvents> | null = null

export function setSocketIO(io: SocketServer) {
  _io = io
}

export function getIO(): SocketServer<ClientToServerEvents, ServerToClientEvents> | null {
  return _io
}

// ─── Emit Helpers（供 API Routes 调用）────────────────────────────────────

/**
 * 比赛比分更新 → 通知该比赛房间 + 全局比赛列表房间
 */
export function emitMatchScoreUpdate(payload: MatchScorePayload) {
  if (!_io) return
  _io.to(`match:${payload.matchId}`).emit('match:score_update', payload)
  _io.to('matches:all').emit('match:score_update', payload)
}

/**
 * 比赛状态变更
 */
export function emitMatchStatusChange(payload: MatchStatusPayload) {
  if (!_io) return
  _io.to(`match:${payload.matchId}`).emit('match:status_change', payload)
  _io.to('matches:all').emit('match:status_change', payload)
}

/**
 * 新比赛创建
 */
export function emitMatchCreated(payload: MatchPayload) {
  if (!_io) return
  _io.to('matches:all').emit('match:created', payload)
}

/**
 * 赔率更新
 */
export function emitOddsUpdate(payload: OddsPayload) {
  if (!_io) return
  _io.to(`match:${payload.matchId}`).emit('odds:update', payload)
}

/**
 * 赔率暂停
 */
export function emitOddsSuspended(matchId: number, oddsId: number) {
  if (!_io) return
  _io.to(`match:${matchId}`).emit('odds:suspended', { oddsId, matchId })
}

/**
 * 通知特定用户（个人通知）
 */
export function emitToUser(
  userId: number,
  event: keyof ServerToClientEvents,
  data: any
) {
  if (!_io) return
  _io.to(`user:${userId}`).emit(event as any, data)
}

/**
 * 用户余额更新
 */
export function emitBalanceUpdate(userId: number, balanceCents: number) {
  emitToUser(userId, 'user:balance:update', { balanceCents })
}

/**
 * 投注结算通知
 */
export function emitBetSettled(userId: number, payload: BetSettledPayload) {
  emitToUser(userId, 'user:bet:settled', payload)
}

/**
 * 充值成功通知
 */
export function emitDepositSuccess(
  userId: number,
  amountCents: number,
  newBalance: number
) {
  emitToUser(userId, 'user:deposit:success', { amountCents, newBalance })
}

/**
 * 全局广播（系统通知）
 */
export function broadcastNotification(
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' = 'info'
) {
  if (!_io) return
  _io.emit('notification', { title, message, type })
}
