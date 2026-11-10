import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common'
import type { FastifyReply } from 'fastify'
import { z } from 'zod'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { AuthUser } from '../../common/types/request'
import { successResponse } from '../../common/response/api-response'
import { Audit } from '../../common/audit/audit.decorator'
import { AdminGuard } from '../../common/guards/admin.guard'
import { BackupService } from './backup.service'

const RestoreBodySchema = z.union([
  z.object({ backupId: z.string().uuid(), content: z.undefined().optional() }),
  z.object({ backupId: z.undefined().optional(), content: z.string().min(1) }),
])

@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get()
  async list() {
    const data = await this.backupService.list()
    return successResponse(data)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AdminGuard)
  @Audit({ action: 'backup.create', category: 'ADMIN', severity: 'info' })
  async create(@CurrentUser() _user: AuthUser) {
    const data = await this.backupService.create()
    return successResponse(data)
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @Res() reply: FastifyReply) {
    const { buffer, filename } = await this.backupService.getFile(id)
    void reply
      .header('Content-Type', 'application/json')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(buffer)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AdminGuard)
  @Audit({ action: 'backup.delete', category: 'ADMIN', severity: 'warning' })
  async delete(@Param('id') id: string) {
    await this.backupService.delete(id)
  }

  @Post('restore')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AdminGuard)
  @Audit({ action: 'backup.restore', category: 'ADMIN', severity: 'critical' })
  async restore(@Body() body: unknown) {
    const parsed = RestoreBodySchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException('Invalid restore body')
    await this.backupService.restore(parsed.data)
  }
}
