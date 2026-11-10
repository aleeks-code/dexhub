import { Controller, Post, Req, Res } from '@nestjs/common'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { Public } from './auth.guard'
import { AuthService } from './auth.service'
import { successResponse } from '../common/response/api-response'

@Public()
@Controller('auth')
export class LogoutController {
  constructor(private readonly authService: AuthService) {}

  @Post('logout')
  async logout(@Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const clearCookie = await this.authService.logout(req.headers['cookie'])
    reply.header('Set-Cookie', clearCookie)
    return successResponse(null)
  }
}
