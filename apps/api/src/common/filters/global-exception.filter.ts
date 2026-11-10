import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common'
import type { FastifyReply } from 'fastify'
import { DexHubError } from '@dexhub/sdk'
import { randomUUID } from 'crypto'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const reply = ctx.getResponse<FastifyReply>()
    const requestId = randomUUID()

    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      return reply.status(status).send({
        error: {
          code: exception.name,
          message: exception.message,
          requestId,
        },
      })
    }

    if (exception instanceof DexHubError) {
      const status = this.dexHubErrorToStatus(exception.code)
      return reply.status(status).send({
        error: {
          code: exception.code,
          message: exception.message,
          requestId,
        },
      })
    }

    this.logger.error('Unhandled exception', exception)

    return reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        requestId,
      },
    })
  }

  private dexHubErrorToStatus(code: string): number {
    const map: Record<string, number> = {
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      PERMISSION_DENIED: 403,
      NOT_FOUND: 404,
      VALIDATION_ERROR: 422,
      CONFLICT: 409,
    }
    return map[code] ?? 500
  }
}
