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
  UseGuards,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { FastifyRequest } from 'fastify'
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

const RejectSchema = z.object({
  sendEmail: z.boolean().optional(),
})

const DirectInviteSchema = z.object({
  email: z.string().email(),
  phone: z.string().max(30).optional(),
  sendEmail: z.boolean().optional(),
  origin: z.string().url().optional(),
})

const AcceptSchema = z.object({
  origin: z.string().url().optional(),
}).optional()

const ResendSchema = z.object({
  origin: z.string().url().optional(),
}).optional()

const BulkRejectSchema = z.object({
  ids: z.array(z.string().uuid()),
  sendEmail: z.boolean().optional(),
})

const BulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()),
})

type AdminReq = FastifyRequest & { session: { user: { id: string } } }

function extractOrigin(body: any, req: AdminReq): string | undefined {
  if (body?.origin && typeof body.origin === 'string') return body.origin
  const originH = req.headers['origin']
  if (typeof originH === 'string' && originH.trim()) return originH.trim()
  const hostH = req.headers['x-forwarded-host'] || req.headers['host']
  const protoH = req.headers['x-forwarded-proto'] || 'https'
  if (typeof hostH === 'string' && hostH.trim()) return `${protoH}://${hostH.trim()}`
  return undefined
}

@Controller('invite-requests')
export class InviteRequestsController {
  constructor(private readonly service: InviteRequestsService) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
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

  @Post('direct')
  @UseGuards(AdminGuard)
  async directInvite(@Body() body: unknown, @Req() req: AdminReq) {
    const parsed = DirectInviteSchema.parse(body)
    const origin = extractOrigin(body, req)
    const result = await this.service.createDirectInvite(
      parsed.email,
      parsed.phone,
      parsed.sendEmail !== false,
      req.session.user.id,
      origin,
    )
    return successResponse(result)
  }

  @Post(':id/accept')
  @UseGuards(AdminGuard)
  async accept(@Param('id') id: string, @Body() body: unknown, @Req() req: AdminReq) {
    AcceptSchema.parse(body ?? {})
    const origin = extractOrigin(body, req)
    const result = await this.service.accept(id, req.session.user.id, origin)
    return successResponse(result)
  }

  @Post(':id/resend')
  @UseGuards(AdminGuard)
  async resend(@Param('id') id: string, @Body() body: unknown, @Req() req: AdminReq) {
    ResendSchema.parse(body ?? {})
    const origin = extractOrigin(body, req)
    const result = await this.service.resend(id, req.session.user.id, origin)
    return successResponse(result)
  }

  @Post(':id/reject')
  @UseGuards(AdminGuard)
  async reject(@Param('id') id: string, @Body() body: unknown, @Req() req: AdminReq) {
    const parsed = RejectSchema.parse(body ?? {})
    const result = await this.service.reject(id, req.session.user.id, parsed.sendEmail !== false)
    return successResponse(result)
  }

  @Post('bulk-reject')
  @UseGuards(AdminGuard)
  async bulkReject(@Body() body: unknown, @Req() req: AdminReq) {
    const parsed = BulkRejectSchema.parse(body)
    const result = await this.service.bulkReject(parsed.ids, req.session.user.id, parsed.sendEmail !== false)
    return successResponse(result)
  }

  @Post('bulk-delete')
  @UseGuards(AdminGuard)
  async bulkDelete(@Body() body: unknown) {
    const parsed = BulkDeleteSchema.parse(body)
    await this.service.bulkDelete(parsed.ids)
    return successResponse({ count: parsed.ids.length })
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
