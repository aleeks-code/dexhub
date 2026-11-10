import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import type { FastifyReply } from 'fastify'
import { Public } from '../../auth/auth.guard'
import { HealthService } from './health.service'

@SkipThrottle()
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async health(@Res({ passthrough: true }) reply: FastifyReply) {
    const status = await this.healthService.check()
    if (status.status !== 'healthy') {
      reply.status(HttpStatus.SERVICE_UNAVAILABLE)
    }
    return status
  }
}
