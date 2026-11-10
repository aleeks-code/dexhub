import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { type Observable, tap, catchError, throwError } from 'rxjs'
import type { FastifyRequest } from 'fastify'
import type { RequestSession } from '../types/request'
import { AuditService } from './audit.service'
import { AUDIT_KEY, type AuditMeta } from './audit.decorator'

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.getAllAndOverride<AuditMeta | undefined>(AUDIT_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ])

    if (!meta) return next.handle()

    const req = ctx
      .switchToHttp()
      .getRequest<FastifyRequest & { session?: RequestSession }>()

    const actorId = req.session?.user.id
    const actorIp = req.ip
    const actorUserAgent = req.headers['user-agent']
    const sessionId = req.session?.session.id

    return next.handle().pipe(
      tap(() => {
        void this.auditService.log({
          ...meta,
          outcome: 'success',
          actorId,
          actorType: actorId ? 'user' : 'system',
          actorIp,
          actorUserAgent,
          sessionId,
        })
      }),
      catchError((err: unknown) => {
        void this.auditService.log({
          ...meta,
          outcome: 'failure',
          actorId,
          actorType: actorId ? 'user' : 'system',
          actorIp,
          actorUserAgent,
          sessionId,
          metadata: { error: err instanceof Error ? err.message : String(err) },
        })
        return throwError(() => err)
      }),
    )
  }
}
