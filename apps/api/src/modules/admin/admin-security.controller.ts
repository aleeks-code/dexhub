import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import { AdminGuard } from '../../common/guards/admin.guard'
import { SettingsService } from '../settings/settings.service'
import { successResponse } from '../../common/response/api-response'
import { auditLogs, getClient } from '@dexhub/db'

type AdminReq = FastifyRequest & { session: { user: { id: string } } }

const ALLOW_NON_ADMIN_LOGINS_KEY = 'auth.allowNonAdminLogins'

@UseGuards(AdminGuard)
@Controller('admin/security')
export class AdminSecurityController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  async getSecuritySettings() {
    const value = await this.settings.get(ALLOW_NON_ADMIN_LOGINS_KEY)
    return successResponse({ allowNonAdminLogins: value !== false })
  }

  @Patch()
  async updateSecuritySettings(
    @Body() body: { allowNonAdminLogins: boolean },
    @Req() req: AdminReq,
  ) {
    await this.settings.set(
      ALLOW_NON_ADMIN_LOGINS_KEY,
      body.allowNonAdminLogins,
      req.session.user.id,
    )

    const db = getClient()
    await db.insert(auditLogs).values({
      category: 'SECURITY',
      action: body.allowNonAdminLogins
        ? 'security.global_login_enabled'
        : 'security.global_login_disabled',
      severity: body.allowNonAdminLogins ? 'info' : 'warning',
      outcome: 'success',
      actorId: req.session.user.id,
      actorType: 'user',
      metadata: { allowNonAdminLogins: body.allowNonAdminLogins },
    })

    return successResponse({ allowNonAdminLogins: body.allowNonAdminLogins })
  }
}
