/**
 * Custom Next.js Server with Socket.IO
 *
 * Usage:
 *   Dev:   node server.js
 *   Prod:  node server.js
 *
 * 替代默认的 next dev / next start
 */

const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  })

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  })

  // 将 io 实例挂到全局（方便 API Routes 访问）
  global.io = io

  // ─── Socket.IO 连接处理 ────────────────────────────────────────────────
  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`)

    // ── 认证（可选，JWT）───────────────────────────────────────────────
    const token = socket.handshake.auth?.token
    if (token) {
      try {
        const { verifyAccess } = require('./src/lib/api/jwt')
        const jwt = require('jose')
        const secret = new TextEncoder().encode(
          process.env.JWT_SECRET ?? 'dev-jwt-secret-key-at-least-32-chars!!'
        )
        // 同步验证（简化）
        jwt.jwtVerify(token, secret).then((payload) => {
          socket.data.userId = payload.payload.sub
          socket.data.role = payload.payload.role
          console.log(`[Socket] Authenticated: ${socket.data.userId}`)
          socket.emit('authenticated', { userId: payload.payload.sub })
        }).catch(() => {
          socket.emit('auth_error', { message: 'Invalid token' })
        })
      } catch { /* ignore */ }
    }

    // ── 订阅比赛房间 ──────────────────────────────────────────────────
    socket.on('subscribe:match', (matchId) => {
      const room = `match:${matchId}`
      socket.join(room)
      console.log(`[Socket] ${socket.id} joined ${room}`)
      socket.emit('subscribed', { room })
    })

    socket.on('unsubscribe:match', (matchId) => {
      socket.leave(`match:${matchId}`)
    })

    // ── 订阅所有比赛更新 ──────────────────────────────────────────────
    socket.on('subscribe:matches', () => {
      socket.join('matches:all')
      console.log(`[Socket] ${socket.id} joined matches:all`)
    })

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`)
    })

    socket.on('error', (err) => {
      console.error(`[Socket] Error for ${socket.id}:`, err)
    })
  })

  httpServer.listen(port, () => {
    console.log(`\n> Ready on http://${hostname}:${port}`)
    console.log(`> Socket.IO ready on same port`)
    console.log(`> Mode: ${dev ? 'development' : 'production'}`)
  })
})
