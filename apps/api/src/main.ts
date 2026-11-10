import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'
import type { FastifyInstance } from 'fastify'
import helmet from '@fastify/helmet'
import { AppModule } from './app.module'
import { JsonLogger } from './common/logger/json-logger'
import { runMigrations } from './db/migrate'

// Normalize environment variables: trim keys/values, remove quotes, handle aliases
for (const [key, val] of Object.entries(process.env)) {
  const trimmedKey = key.trim()
  if (trimmedKey !== key && val !== undefined) {
    process.env[trimmedKey] = val
  }
}

if (!process.env['DATABASE_URL']) {
  process.env['DATABASE_URL'] =
    process.env['DATEBASE_URL'] ||
    process.env['POSTGRES_URL'] ||
    process.env['DATABASE_URI'] ||
    process.env['DB_URL'] ||
    process.env['POSTGRESQL_URL'] ||
    process.env['NEON_DATABASE_URL']
}

if (process.env['DATABASE_URL']) {
  process.env['DATABASE_URL'] = process.env['DATABASE_URL']!.replace(/^["']|["']$/g, '').trim()
}

if (!process.env['BETTER_AUTH_SECRET'] && process.env['AUTH_SECRET']) {
  process.env['BETTER_AUTH_SECRET'] = process.env['AUTH_SECRET']
}

if (!process.env['BETTER_AUTH_URL'] && process.env['FRONTEND_URL']) {
  process.env['BETTER_AUTH_URL'] = process.env['FRONTEND_URL']
}

if (!process.env['WEBAUTHN_ORIGIN'] && process.env['FRONTEND_URL']) {
  process.env['WEBAUTHN_ORIGIN'] = process.env['FRONTEND_URL']
}

const REQUIRED_ENV: Array<{ key: string; hint: string }> = [
  {
    key: 'DATABASE_URL',
    hint: 'PostgreSQL connection string, e.g. postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require',
  },
  {
    key: 'BETTER_AUTH_SECRET',
    hint: 'Secret key for Better Auth (min 32 chars), e.g. openssl rand -hex 32',
  },
  {
    key: 'RECOVERY_CODE_ENCRYPTION_KEY',
    hint: 'Generate with: openssl rand -hex 32',
  },
  {
    key: 'FRONTEND_URL',
    hint: 'Public URL of the web app, e.g. https://www.dexhub.it',
  },
  {
    key: 'BETTER_AUTH_URL',
    hint: 'Same as FRONTEND_URL (used by Better Auth for session cookies), e.g. https://www.dexhub.it',
  },
  {
    key: 'WEBAUTHN_RP_ID',
    hint: 'Hostname only (no scheme/port), e.g. dexhub.it',
  },
  {
    key: 'WEBAUTHN_ORIGIN',
    hint: 'Full origin URL of the web app, e.g. https://www.dexhub.it',
  },
]

for (const { key, hint } of REQUIRED_ENV) {
  if (!process.env[key]) {
    const detected = Object.keys(process.env)
      .filter((k) => /DATABASE|POSTGRES|AUTH|URL|WEBAUTHN|SECRET|KEY/i.test(k))
      .join(', ')
    process.stderr.write(
      `\n[FATAL] Missing required environment variable: ${key}\n  Hint: ${hint}\n  Detected related env keys in process.env: [${detected || 'none'}]\n\n`,
    )
    process.exit(1)
  }
}

async function bootstrap() {
  const logger = new JsonLogger()

  logger.log('Starting DexHub API bootstrap...', 'Bootstrap')

  // Run database migrations before initializing Nest modules so all tables exist
  logger.log('Applying database migrations...', 'Bootstrap')
  try {
    await runMigrations()
    logger.log('Database migrations applied successfully', 'Bootstrap')
  } catch (err: any) {
    logger.error('Database migration failed', err?.stack || err, 'Bootstrap')
    process.stderr.write(`\n[FATAL MIGRATION ERROR] ${err?.stack || err}\n\n`)
    process.exit(1)
  }

  logger.log('Creating Nest application...', 'Bootstrap')
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

  const port = parseInt(process.env['PORT'] ?? '3001', 10)
  await app.listen(port, '0.0.0.0')
  logger.log(`API running on http://0.0.0.0:${port}`, 'Bootstrap')
}

bootstrap().catch((err) => {
  process.stderr.write(`\n[FATAL BOOTSTRAP ERROR] ${err?.stack || err}\n\n`)
  process.exit(1)
})
