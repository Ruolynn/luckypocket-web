import fp from 'fastify-plugin'
import { Server } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'

declare module 'fastify' {
  interface FastifyInstance {
    io: Server
  }
}

export default fp(async (app) => {
  const io = new Server(app.server, { cors: { origin: true, credentials: true } })

  const url = process.env.REDIS_URL
  const pub = createClient({ url: url })
  const sub = pub.duplicate()
  await Promise.all([pub.connect(), sub.connect()])
  io.adapter(createAdapter(pub, sub))

  io.on('connection', (socket) => {
    socket.on('subscribe:packet', (pid: string) => socket.join(`packet:${pid}`))
    socket.on('unsubscribe:packet', (pid: string) => socket.leave(`packet:${pid}`))
  })

  app.decorate('io', io)
  app.addHook('onClose', async () => {
    await pub.disconnect()
    await sub.disconnect()
    io.close()
  })
})


