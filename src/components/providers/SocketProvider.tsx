'use client'

import { createContext, useContext, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from './AuthProvider'

interface SocketContextValue {
  socket: Socket | null
  connected: boolean
}

const SocketContext = createContext<SocketContextValue>({ socket: null, connected: false })

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    const token = sessionStorage.getItem('accessToken')
    if (!token) return

    const socket = io(window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id)
    })

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason)
    })

    socket.on('user:balance:update', (data: { balanceCents: number }) => {
      // Balance update event received
      console.log('[Socket] Balance update:', data.balanceCents)
      // Could dispatch to a global store or event emitter here
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [user?.id])  // Reconnect when user changes

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected: socketRef.current?.connected ?? false }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  return useContext(SocketContext)
}
