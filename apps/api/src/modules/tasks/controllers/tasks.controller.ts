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
  Query,
  Req,
} from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import { TasksService } from '../services/tasks.service'
import {
  CreateTaskDto,
  ReorderTaskDto,
  UpdateTaskDto,
  VALID_VIEWS,
  type TaskView,
  type TaskStatus,
  type TaskPriority,
} from '../dto/task.dto'
import { successResponse } from '../../../common/response/api-response'

type AuthReq = FastifyRequest & { session: { user: { id: string } } }

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('tasks')
  async list(
    @Req() req: AuthReq,
    @Query('spaceId') spaceId?: string,
    @Query('view') view?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('favorite') favorite?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const taskList = await this.tasksService.list(req.session.user.id, {
      spaceId,
      view: VALID_VIEWS.includes(view as TaskView) ? (view as TaskView) : undefined,
      status: status?.split(',').filter(Boolean) as TaskStatus[] | undefined,
      priority: priority?.split(',').filter(Boolean) as TaskPriority[] | undefined,
      favorite: favorite === 'true' ? true : undefined,
      search,
      sort: sort as never,
      order: order === 'desc' ? 'desc' : 'asc',
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    })
    return successResponse(taskList)
  }

  @Get('tasks/:id')
  async findOne(@Param('id') id: string, @Req() req: AuthReq) {
    const task = await this.tasksService.findById(id, req.session.user.id)
    return successResponse(task)
  }

  @Post('spaces/:spaceId/tasks')
  async create(
    @Param('spaceId') spaceId: string,
    @Body() dto: CreateTaskDto,
    @Req() req: AuthReq,
  ) {
    const task = await this.tasksService.create(spaceId, req.session.user.id, dto)
    return successResponse(task)
  }

  @Patch('tasks/:id')
  async update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @Req() req: AuthReq) {
    const task = await this.tasksService.update(id, req.session.user.id, dto)
    return successResponse(task)
  }

  @Delete('tasks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Req() req: AuthReq) {
    await this.tasksService.delete(id, req.session.user.id)
  }

  @Post('tasks/:id/complete')
  async complete(@Param('id') id: string, @Req() req: AuthReq) {
    const task = await this.tasksService.complete(id, req.session.user.id)
    return successResponse(task)
  }

  @Post('tasks/:id/reopen')
  async reopen(@Param('id') id: string, @Req() req: AuthReq) {
    const task = await this.tasksService.reopen(id, req.session.user.id)
    return successResponse(task)
  }

  @Patch('tasks/:id/reorder')
  async reorder(@Param('id') id: string, @Body() dto: ReorderTaskDto, @Req() req: AuthReq) {
    await this.tasksService.reorder(id, req.session.user.id, dto.sortOrder, dto.section)
    return successResponse({ ok: true })
  }

  @Post('tasks/:id/duplicate')
  async duplicate(@Param('id') id: string, @Req() req: AuthReq) {
    const task = await this.tasksService.duplicate(id, req.session.user.id)
    return successResponse(task)
  }
}
