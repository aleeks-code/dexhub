import { All, Controller, Req, Res } from '@nestjs/common'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { AuthService } from './auth.service'
import { Public } from './auth.guard'

@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @All('*')
  async handler(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.authService.getHandler()(req.raw, reply.raw)
  }
}
