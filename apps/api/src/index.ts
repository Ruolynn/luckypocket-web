import { buildApp } from './app'

const app = await buildApp({ withJobs: true, withSocket: true })

// Start
const port = Number(process.env.PORT || 3001)
app
  .listen({ port, host: '0.0.0.0' })
  .then(() => app.log.info(`API listening on :${port}`))
  .catch((err) => {
    app.log.error(err)
    process.exit(1)
  })
