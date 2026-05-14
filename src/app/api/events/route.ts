/**
 * SSE 实时推送端点
 * GET /api/events - 建立 SSE 连接，实时接收事件流
 *
 * 支持事件类型:
 * - leaderboard: 排行榜更新
 * - match:status_change: 比赛状态变化
 * - bet:settlement: 投注结算通知
 * - notification: 系统通知
 */

import { NextRequest } from 'next/server'
import { sseEmitter, SSEEventPayload } from '@/lib/sse/emitter'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()

  // 创建可读流，用于发送 SSE 数据
  const stream = new ReadableStream({
    start(controller) {
      // 发送连接成功消息
      const connectMsg = formatSSEMessage('connected', {
        message: 'SSE 连接已建立',
        timestamp: new Date().toISOString(),
      })
      controller.enqueue(encoder.encode(connectMsg))

      // 订阅事件
      const unsubscribe = sseEmitter.subscribe((event: SSEEventPayload) => {
        try {
          const msg = formatSSEMessage(event.type, event.data)
          controller.enqueue(encoder.encode(msg))
        } catch {
          // 流已关闭时忽略
        }
      })

      // 心跳保活（每 25 秒发送一次）
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch {
          clearInterval(heartbeat)
        }
      }, 25000)

      // 客户端断开连接时清理
      request.signal.addEventListener('abort', () => {
        unsubscribe()
        clearInterval(heartbeat)
        try {
          controller.close()
        } catch {
          // 已关闭
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // 禁用 Nginx 缓冲
    },
  })
}

/**
 * 格式化 SSE 消息
 */
function formatSSEMessage(event: string, data: any): string {
  const json = JSON.stringify(data)
  return `event: ${event}\ndata: ${json}\n\n`
}
