import { Server } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'

export async function initIO(server: any) {
  const io = new Server(server, { cors: { origin: true, credentials: true } })
  const url = process.env.REDIS_URL
  const pub = createClient({ url: url })
  const sub = pub.duplicate()
  await Promise.all([pub.connect(), sub.connect()])
  io.adapter(createAdapter(pub, sub))

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('AUTH_REQUIRED'))
    next()
  })

  io.on('connection', (socket) => {
    socket.on('subscribe:packet', (pid: string) => socket.join(`packet:${pid}`))
    socket.on('unsubscribe:packet', (pid: string) => socket.leave(`packet:${pid}`))
  })

  return io
}


