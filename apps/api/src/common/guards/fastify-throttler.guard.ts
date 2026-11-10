import { Injectable, ExecutionContext } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'

@Injectable()
export class FastifyThrottlerGuard extends ThrottlerGuard {
  protected override getRequestResponse(context: ExecutionContext) {
    const http = context.switchToHttp()
    return { req: http.getRequest(), res: http.getResponse() }
  }

  protected override async getTracker(req: Record<string, unknown>): Promise<string> {
    const ips = req['ips'] as string[] | undefined
    return ips?.length ? ips[0]! : ((req['ip'] as string) ?? 'unknown')
  }
}
