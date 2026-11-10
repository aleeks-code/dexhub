import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import { SpacesService } from '../services/spaces.service'
import { JoinCodeService } from '../services/join-code.service'
import { CreateSpaceDto, InviteToSpaceDto, JoinSpaceDto, UpdateSpaceDto } from '../dto/space.dto'
import { successResponse } from '../../../common/response/api-response'

type AuthReq = FastifyRequest & { session: { user: { id: string } } }

@Controller('tasks')
export class SpacesController {
  constructor(
    private readonly spacesService: SpacesService,
    private readonly joinCodeService: JoinCodeService,
  ) {}

  @Get('spaces')
  async list(@Req() req: AuthReq) {
    const spaces = await this.spacesService.listForUser(req.session.user.id)
    return successResponse(
      spaces.map((s) => ({
        ...s,
        joinCodeFormatted: s.joinCode ? this.joinCodeService.format(s.joinCode) : null,
      })),
    )
  }

  @Post('spaces')
  async create(@Body() dto: CreateSpaceDto, @Req() req: AuthReq) {
    const space = await this.spacesService.create(req.session.user.id, dto)
    return successResponse({
      ...space,
      joinCodeFormatted: space.joinCode ? this.joinCodeService.format(space.joinCode) : null,
    })
  }

  @Get('spaces/:id')
  async findOne(@Param('id') id: string, @Req() req: AuthReq) {
    const space = await this.spacesService.findByIdForUser(id, req.session.user.id)
    return successResponse({
      ...space,
      joinCodeFormatted: space.joinCode ? this.joinCodeService.format(space.joinCode) : null,
    })
  }

  @Patch('spaces/:id')
  async update(@Param('id') id: string, @Body() dto: UpdateSpaceDto, @Req() req: AuthReq) {
    const space = await this.spacesService.update(id, req.session.user.id, dto)
    return successResponse(space)
  }

  @Delete('spaces/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Req() req: AuthReq) {
    await this.spacesService.delete(id, req.session.user.id)
  }

  @Get('spaces/:id/members')
  async members(@Param('id') id: string, @Req() req: AuthReq) {
    const members = await this.spacesService.getMembers(id, req.session.user.id)
    return successResponse(members)
  }

  @Get('spaces/:id/invites')
  async invites(@Param('id') id: string, @Req() req: AuthReq) {
    const invites = await this.spacesService.getInvites(id, req.session.user.id)
    return successResponse(invites)
  }

  @Post('spaces/:id/invites')
  async invite(
    @Param('id') id: string,
    @Body() dto: InviteToSpaceDto,
    @Req() req: AuthReq,
  ) {
    const invite = await this.spacesService.invite(id, req.session.user.id, dto.email)
    return successResponse(invite)
  }

  @Delete('spaces/:id/invites/:inviteId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelInvite(
    @Param('id') id: string,
    @Param('inviteId') inviteId: string,
    @Req() req: AuthReq,
  ) {
    await this.spacesService.cancelInvite(id, req.session.user.id, inviteId)
  }

  @Delete('spaces/:id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @Req() req: AuthReq,
  ) {
    await this.spacesService.removeMember(id, req.session.user.id, targetUserId)
  }

  @Post('join')
  async join(@Body() dto: JoinSpaceDto, @Req() req: AuthReq) {
    const space = await this.spacesService.join(req.session.user.id, dto.code)
    return successResponse({
      ...space,
      joinCodeFormatted: space.joinCode ? this.joinCodeService.format(space.joinCode) : null,
    })
  }

  @Post('spaces/:id/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  async leave(@Param('id') id: string, @Req() req: AuthReq) {
    await this.spacesService.leave(id, req.session.user.id)
  }

  @Post('spaces/:id/regenerate-code')
  async regenerateCode(@Param('id') id: string, @Req() req: AuthReq) {
    const space = await this.spacesService.regenerateCode(id, req.session.user.id)
    return successResponse({
      ...space,
      joinCodeFormatted: space.joinCode ? this.joinCodeService.format(space.joinCode) : null,
    })
  }
}
