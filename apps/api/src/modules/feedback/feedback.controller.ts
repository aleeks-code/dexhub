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
  UseGuards,
} from '@nestjs/common'
import { z } from 'zod'
import type { FastifyRequest } from 'fastify'
import { AdminGuard } from '../../common/guards/admin.guard'
import { successResponse } from '../../common/response/api-response'
import { FeedbackService } from './feedback.service'

type AuthedRequest = FastifyRequest & {
  session: { user: { id: string }; session: unknown }
}

const CreateSchema = z.object({
  type: z.enum(['bug', 'feature']),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
})

const StatusSchema = z.object({
  status: z.enum(['open', 'in_progress', 'closed']),
})

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly service: FeedbackService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: unknown, @Req() req: AuthedRequest) {
    const { type, title, message } = CreateSchema.parse(body)
    const feedback = await this.service.create(req.session.user.id, type, title, message)
    return successResponse(feedback)
  }

  @Get('mine')
  async listMine(@Req() req: AuthedRequest) {
    const data = await this.service.listMyBugs(req.session.user.id)
    return successResponse(data)
  }

  @Get('admin/count')
  @UseGuards(AdminGuard)
  async adminCount() {
    const data = await this.service.counts()
    return successResponse(data)
  }

  @Get('admin')
  @UseGuards(AdminGuard)
  async listAdmin(@Query('type') type: string) {
    const feedbackType = type === 'feature' ? 'feature' : 'bug'
    const data = await this.service.listAll(feedbackType)
    return successResponse(data)
  }

  @Patch(':id/status')
  @UseGuards(AdminGuard)
  async updateStatus(@Param('id') id: string, @Body() body: unknown) {
    const { status } = StatusSchema.parse(body)
    const feedback = await this.service.updateStatus(id, status)
    return successResponse(feedback)
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  async delete(@Param('id') id: string) {
    await this.service.delete(id)
    return successResponse(null)
  }
}
