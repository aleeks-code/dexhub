import { Body, Controller, ForbiddenException, HttpCode, HttpStatus, Post, Res, UnauthorizedException } from '@nestjs/common'
import type { FastifyReply } from 'fastify'
import { eq, getClient, users } from '@dexhub/db'
import { Public } from './auth.guard'
import { AuthService } from './auth.service'
import { RecoveryCodesService } from './recovery-codes.service'
import { successResponse } from '../common/response/api-response'

@Public()
@Controller('auth/recovery')
export class RecoveryLoginController {
  constructor(
    private readonly authService: AuthService,
    private readonly recoveryCodes: RecoveryCodesService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: { email: string; code: string },
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const db = getClient()

    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, (body.email ?? '').toLowerCase().trim()))
      .limit(1)
      .then((r) => r[0])

    if (!user) throw new UnauthorizedException('Invalid recovery code')
    if (!user.isActive) throw new ForbiddenException('This account has been disabled.')

    const valid = await this.recoveryCodes.verify(user.id, body.code ?? '')
    if (!valid) throw new UnauthorizedException('Invalid recovery code')

    const sessionCookie = await this.authService.createSession(user.id)
    reply.header('Set-Cookie', sessionCookie)

    return successResponse({ message: 'Recovery successful' })
  }
}
