// Standard library
import http from 'http'

// Third party
import cookieParser from 'cookie-parser'
import { createTerminus } from '@godaddy/terminus'
import express from 'express'
import neo4j from 'neo4j-driver'

// Local
import { apiRoutes } from './routes/api'
import { corsMiddleware } from './middleware/cors'

// Configurations
import {
  ENVIRONMENT,
  NEO4J_PASSWORD,
  NEO4J_USERNAME,
  NEO4J_URI,
  PORT
} from './config'

// Ensure necessary configurations are set
if ([NEO4J_PASSWORD, NEO4J_USERNAME, NEO4J_URI].some((e) => !e)) {
  console.error('NEO4J_PASSWORD, NEO4J_USERNAME and NEO4J_URI must be set')
  process.exit(1)
}

console.log(`App starting in ${ENVIRONMENT} mode`)

const app = express()
app.use(cookieParser())
app.use(express.json())

app.locals.driver = neo4j.driver(
  NEO4J_URI,
  neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD)
)

app.use(corsMiddleware)
app.use('/api', apiRoutes)

app.use('*', (req, res) => {
  return res.status(404).send('Route not found')
})

const server = http.createServer(app)

async function onSignal() {
  console.log('\nServer is starting cleanup')
  await app.locals.driver.close()
  console.log('Successfully closed Neo4j driver')
}

async function onHealthCheck() {
  return Promise.resolve()
}

createTerminus(server, {
  signals: ['SIGHUP', 'SIGINT', 'SIGTERM'],
  healthChecks: { '/health': onHealthCheck },
  onSignal
})

server.listen(PORT, () => {
  console.log('Server running on port:', PORT)
})

export { app }
