import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'
import type { FastifyInstance } from 'fastify'
import helmet from '@fastify/helmet'
import { AppModule } from './app.module'
import { JsonLogger } from './common/logger/json-logger'
import { runMigrations } from './db/migrate'

const REQUIRED_ENV: Array<{ key: string; hint: string }> = [
  {
    key: 'RECOVERY_CODE_ENCRYPTION_KEY',
    hint: 'Generate with: openssl rand -hex 32',
  },
  {
    key: 'FRONTEND_URL',
    hint: 'Public URL of the web app, e.g. https://dexhub.app',
  },
  {
    key: 'BETTER_AUTH_URL',
    hint: 'Same as FRONTEND_URL (used by Better Auth for session cookies), e.g. https://dexhub.app',
  },
  {
    key: 'WEBAUTHN_RP_ID',
    hint: 'Hostname only (no scheme/port), e.g. dexhub.app',
  },
  {
    key: 'WEBAUTHN_ORIGIN',
    hint: 'Full origin URL of the web app, e.g. https://dexhub.app',
  },
]

for (const { key, hint } of REQUIRED_ENV) {
  if (!process.env[key]) {
    process.stderr.write(
      `\n[FATAL] Missing required environment variable: ${key}\n  Hint: ${hint}\n\n`,
    )
    process.exit(1)
  }
}

async function bootstrap() {
  const logger = new JsonLogger()

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true, bodyLimit: 10 * 1024 * 1024 }),
    { logger },
  )

  await app.register(helmet, { contentSecurityPolicy: false })

  app.setGlobalPrefix('api/v1')

  const frontendUrl = process.env['FRONTEND_URL'] ?? 'http://localhost:3000'
  const allowedOrigins = [
    frontendUrl,
    'https://dexhub.it',
    'https://www.dexhub.it',
    'http://localhost:3000',
  ].filter(Boolean)

  app.enableCors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.some((o) => origin.startsWith(o))) {
        cb(null, true)
      } else {
        cb(null, false)
      }
    },
    credentials: true,
  })

  // Structured HTTP access log — skip health endpoint to avoid polling noise
  const fastify = app.getHttpAdapter().getInstance() as FastifyInstance
  fastify.addHook('onResponse', async (request, reply) => {
    if (request.url === '/api/v1/health' || request.url === '/api/v1/admin/system/logs') return
    const level = (reply.statusCode >= 500 ? 'error' : reply.statusCode >= 400 ? 'warn' : 'info') as
      | 'error'
      | 'warn'
      | 'info'
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      context: 'HTTP',
      message: `${request.method} ${request.url} → ${reply.statusCode} (${Math.round(reply.elapsedTime)}ms)`,
    }
    JsonLogger.pushLog(entry)
    process.stdout.write(JSON.stringify(entry) + '\n')
  })

  await runMigrations()
  logger.log('Database migrations applied', 'Bootstrap')

  const port = parseInt(process.env['PORT'] ?? '3001', 10)
  await app.listen(port, '0.0.0.0')
  logger.log(`API running on http://0.0.0.0:${port}`, 'Bootstrap')
}

bootstrap()
