import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import { AdminGuard } from '../../common/guards/admin.guard'
import { AdminUsersService } from './admin-users.service'
import { successResponse } from '../../common/response/api-response'

type AdminReq = FastifyRequest & { session: { user: { id: string } } }

@UseGuards(AdminGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly adminUsers: AdminUsersService) {}

  @Get()
  async listUsers() {
    return successResponse(await this.adminUsers.listUsers())
  }

  @Post('invite')
  async inviteUser(@Body() body: { email?: string }, @Req() req: AdminReq) {
    const result = await this.adminUsers.inviteUser(body.email, req.session.user.id)
    return successResponse(result)
  }

  @Patch(':id/status')
  async setStatus(
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
    @Req() req: AdminReq,
  ) {
    await this.adminUsers.setUserStatus(id, body.isActive, req.session.user.id)
    return successResponse(null)
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string, @Req() req: AdminReq) {
    await this.adminUsers.deleteUser(id, req.session.user.id)
    return successResponse(null)
  }

  @Post(':id/recovery-codes')
  async regenerateRecoveryCodes(@Param('id') id: string, @Req() req: AdminReq) {
    const result = await this.adminUsers.regenerateRecoveryCodes(id, req.session.user.id)
    return successResponse(result)
  }

  @Get(':id/recovery-code')
  async getRecoveryCode(@Param('id') id: string, @Req() req: AdminReq) {
    const result = await this.adminUsers.getRecoveryCode(id, req.session.user.id)
    return successResponse(result)
  }

  @Post(':id/recovery-code/copy-event')
  async logRecoveryCodeCopy(@Param('id') id: string, @Req() req: AdminReq) {
    await this.adminUsers.logRecoveryCodeCopied(id, req.session.user.id)
    return successResponse(null)
  }

  @Get(':id/passkeys')
  async getUserPasskeys(@Param('id') id: string) {
    return successResponse(await this.adminUsers.getUserPasskeys(id))
  }

  @Delete(':id/passkeys/:passkeyId')
  async deleteUserPasskey(
    @Param('id') id: string,
    @Param('passkeyId') passkeyId: string,
    @Req() req: AdminReq,
  ) {
    await this.adminUsers.deletePasskey(id, passkeyId, req.session.user.id)
    return successResponse(null)
  }
}
