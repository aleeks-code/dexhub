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
import { TagsService } from '../services/tags.service'
import { CreateTagDto, UpdateTagDto } from '../dto/tag.dto'
import { successResponse } from '../../../common/response/api-response'

type AuthReq = FastifyRequest & { session: { user: { id: string } } }

@Controller('tasks')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get('spaces/:spaceId/tags')
  async listForSpace(@Param('spaceId') spaceId: string, @Req() req: AuthReq) {
    const tags = await this.tagsService.listForSpace(spaceId, req.session.user.id)
    return successResponse(tags)
  }

  @Post('spaces/:spaceId/tags')
  async create(
    @Param('spaceId') spaceId: string,
    @Body() dto: CreateTagDto,
    @Req() req: AuthReq,
  ) {
    const tag = await this.tagsService.create(spaceId, req.session.user.id, dto)
    return successResponse(tag)
  }

  @Patch('tags/:id')
  async update(@Param('id') id: string, @Body() dto: UpdateTagDto, @Req() req: AuthReq) {
    const tag = await this.tagsService.update(id, req.session.user.id, dto)
    return successResponse(tag)
  }

  @Delete('tags/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Req() req: AuthReq) {
    await this.tagsService.delete(id, req.session.user.id)
  }

  @Post('tasks/:taskId/tags/:tagId')
  async addToTask(
    @Param('taskId') taskId: string,
    @Param('tagId') tagId: string,
    @Req() req: AuthReq,
  ) {
    await this.tagsService.addToTask(taskId, tagId, req.session.user.id)
    return successResponse({ ok: true })
  }

  @Delete('tasks/:taskId/tags/:tagId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFromTask(
    @Param('taskId') taskId: string,
    @Param('tagId') tagId: string,
    @Req() req: AuthReq,
  ) {
    await this.tagsService.removeFromTask(taskId, tagId, req.session.user.id)
  }
}
