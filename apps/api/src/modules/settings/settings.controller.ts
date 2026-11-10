import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Put, UseGuards } from '@nestjs/common'
import { z } from 'zod'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { AuthUser } from '../../common/types/request'
import { successResponse } from '../../common/response/api-response'
import { Audit } from '../../common/audit/audit.decorator'
import { SettingsService } from './settings.service'
import { AdminGuard } from '../../common/guards/admin.guard'

const SetSchema = z.object({ value: z.unknown() })

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getAll() {
    const data = await this.settingsService.getAll()
    return successResponse(data)
  }

  @Get(':key')
  async get(@Param('key') key: string) {
    const value = await this.settingsService.get(key)
    return successResponse({ key, value })
  }

  @Put(':key')
  @UseGuards(AdminGuard)
  @Audit({ action: 'settings.set', category: 'ADMIN', severity: 'info' })
  async set(
    @Param('key') key: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ) {
    const { value } = SetSchema.parse(body)
    await this.settingsService.set(key, value, user.id)
    return successResponse({ key, value })
  }

  @Delete(':key')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Audit({ action: 'settings.delete', category: 'ADMIN', severity: 'warning' })
  async delete(@Param('key') key: string) {
    await this.settingsService.delete(key)
  }
}
