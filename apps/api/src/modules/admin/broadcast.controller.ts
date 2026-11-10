import { Controller, Get } from '@nestjs/common'
import { Public } from '../../auth/auth.guard'
import { successResponse } from '../../common/response/api-response'
import { SettingsService } from '../settings/settings.service'
import { BROADCAST_BANNER_KEY, type BroadcastBannerConfig } from './admin-broadcast.controller'

@Public()
@Controller('broadcast')
export class BroadcastController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  async getActiveBroadcast() {
    const banner = (await this.settings.get(BROADCAST_BANNER_KEY)) as BroadcastBannerConfig | null
    if (!banner || !banner.enabled || !banner.message.trim()) {
      return successResponse(null)
    }
    return successResponse(banner)
  }
}
