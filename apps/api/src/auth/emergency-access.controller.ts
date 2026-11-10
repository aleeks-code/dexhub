import { Body, Controller, HttpCode, HttpStatus, Post, Res, UnauthorizedException } from '@nestjs/common'
import { timingSafeEqual } from 'crypto'
import { z } from 'zod'
import type { FastifyReply } from 'fastify'
import { Public } from './auth.guard'
import { AuthService } from './auth.service'
import { eq, getClient, users } from '@dexhub/db'
import { successResponse } from '../common/response/api-response'

const Schema = z.object({ token: z.string().min(1) })

@Public()
@Controller('auth/emergency')
export class EmergencyAccessController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const emergencyToken = process.env['EMERGENCY_ACCESS_TOKEN']

    if (!emergencyToken) {
      throw new UnauthorizedException('Emergency access is not configured')
    }

    const { token } = Schema.parse(body)

    const provided = Buffer.from(token)
    const expected = Buffer.from(emergencyToken)

    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      throw new UnauthorizedException('Invalid emergency access token')
    }

    const adminUser = await getClient()
      .select()
      .from(users)
      .where(eq(users.isAdmin, true))
      .limit(1)
      .then((r) => r[0])

    if (!adminUser) {
      throw new UnauthorizedException('No administrator account found')
    }

    const sessionCookie = await this.authService.createSession(adminUser.id)
    reply.header('Set-Cookie', sessionCookie)

    return successResponse({
      message: 'Emergency access granted.',
      warning: 'Rotate or remove EMERGENCY_ACCESS_TOKEN after use.',
    })
  }
}
