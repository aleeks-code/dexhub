import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { Public } from '../../auth/auth.guard'
import { FastifyThrottlerGuard } from '../../common/guards/fastify-throttler.guard'
import { z } from 'zod'
import { SetupService } from './setup.service'
import { successResponse } from '../../common/response/api-response'

const InitSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
})

@Public()
@Controller('setup')
export class SetupController {
  constructor(private readonly setupService: SetupService) {}

  @Get('status')
  async status() {
    const needed = await this.setupService.isSetupNeeded()
    return successResponse({ setupNeeded: needed })
  }

  @UseGuards(FastifyThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('init')
  async init(@Body() body: unknown) {
    const { name, email } = InitSchema.parse(body)
    const result = await this.setupService.initSetup(name, email)
    return successResponse(result)
  }

  @Get('passkey/options')
  async passkeyOptions(@Query('token') token: string) {
    const options = await this.setupService.getPasskeyRegistrationOptions(token)
    return options
  }

  @UseGuards(FastifyThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('passkey/verify')
  async passkeyVerify(@Query('token') token: string, @Body() credential: object) {
    await this.setupService.verifyPasskeyRegistration(token, credential)
    return successResponse({ ok: true })
  }

  @UseGuards(FastifyThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('complete')
  async complete(@Query('token') token: string) {
    const result = await this.setupService.completeSetup(token)
    return successResponse(result)
  }
}
