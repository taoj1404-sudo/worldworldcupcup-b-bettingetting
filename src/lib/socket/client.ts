/**
 * Socket.IO 客户端单例
 *
 * 用法：
 *   import { socket } from '@/lib/socket/client'
 *   socket.emit('subscribe:match', 1)
 */

import { io, Socket } from 'socket.io-client'

let _socket: Socket | null = null

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || ''

export function getSocket(): Socket {
  if (_socket && _socket.connected) return _socket

  _socket = io(SOCKET_URL || window.location.origin, {
    auth: {
      token: typeof window !== 'undefined'
        ? sessionStorage.getItem('accessToken')
        : undefined,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  })

  _socket.on('connect', () => {
    console.log('[Socket] Connected:', _socket?.id)
  })

  _socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason)
  })

  _socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err.message)
  })

  return _socket
}

// ─── 连接状态 ────────────────────────────────────────────────────────────
export function disconnectSocket() {
  if (_socket) {
    _socket.disconnect()
    _socket = null
  }
}

// ─── React Hook ───────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    const s = getSocket()
    setSocket(s)
    return () => {
      // 不在 useSocket hook 中断开连接（单例全局管理）
    }
  }, [])

  return socket
}
