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
  UseGuards,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { z } from 'zod'
import { Public } from '../../auth/auth.guard'
import { AdminGuard } from '../../common/guards/admin.guard'
import { successResponse } from '../../common/response/api-response'
import { InviteRequestsService } from './invite-requests.service'

const CreateSchema = z.object({
  email: z.string().email(),
  phone: z.string().max(30).optional(),
})

const StatusSchema = z.object({
  status: z.enum(['pending', 'invited', 'dismissed']),
})

@Controller('invite-requests')
export class InviteRequestsController {
  constructor(private readonly service: InviteRequestsService) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  async create(@Body() body: unknown) {
    const { email, phone } = CreateSchema.parse(body)
    await this.service.create(email, phone)
    return successResponse({ message: 'Request received' })
  }

  @Get()
  @UseGuards(AdminGuard)
  async list() {
    const data = await this.service.list()
    return successResponse(data)
  }

  @Patch(':id/status')
  @UseGuards(AdminGuard)
  async updateStatus(@Param('id') id: string, @Body() body: unknown) {
    const { status } = StatusSchema.parse(body)
    await this.service.updateStatus(id, status)
    return successResponse({ id, status })
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  async delete(@Param('id') id: string) {
    await this.service.delete(id)
    return successResponse(null)
  }
}
