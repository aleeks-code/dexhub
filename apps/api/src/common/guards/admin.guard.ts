import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import type { RequestSession } from '../types/request'

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<FastifyRequest & { session: RequestSession }>()

    if (!req.session?.user?.isAdmin) {
      throw new ForbiddenException('Admin access required')
    }
    return true
  }
}
