import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import { AdminGuard } from '../../common/guards/admin.guard'
import { successResponse } from '../../common/response/api-response'
import { SettingsService } from '../settings/settings.service'
import { auditLogs, getClient } from '@dexhub/db'

type AdminReq = FastifyRequest & { session: { user: { id: string } } }

export const BROADCAST_BANNER_KEY = 'app.broadcast_banner'

export interface BroadcastBannerConfig {
  enabled: boolean
  message: string
  type: 'info' | 'warning' | 'alert' | 'success'
  dismissible: boolean
  updatedAt?: string
}

@UseGuards(AdminGuard)
@Controller('admin/broadcast')
export class AdminBroadcastController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  async getBroadcastConfig() {
    const value = (await this.settings.get(BROADCAST_BANNER_KEY)) as BroadcastBannerConfig | null
    return successResponse(
      value ?? {
        enabled: false,
        message: '',
        type: 'info',
        dismissible: true,
      },
    )
  }

  @Put()
  async updateBroadcastConfig(
    @Body() body: BroadcastBannerConfig,
    @Req() req: AdminReq,
  ) {
    const config: BroadcastBannerConfig = {
      enabled: Boolean(body.enabled),
      message: String(body.message || ''),
      type: ['info', 'warning', 'alert', 'success'].includes(body.type) ? body.type : 'info',
      dismissible: Boolean(body.dismissible),
      updatedAt: new Date().toISOString(),
    }

    await this.settings.set(BROADCAST_BANNER_KEY, config, req.session.user.id)

    const db = getClient()
    await db.insert(auditLogs).values({
      category: 'ADMIN',
      action: config.enabled ? 'broadcast.published' : 'broadcast.disabled',
      severity: config.enabled ? 'warning' : 'info',
      outcome: 'success',
      actorId: req.session.user.id,
      actorType: 'user',
      metadata: { enabled: config.enabled, type: config.type, message: config.message },
    })

    return successResponse(config)
  }
}
