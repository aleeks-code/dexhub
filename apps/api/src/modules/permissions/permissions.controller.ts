import { Controller, Get, Query } from '@nestjs/common'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { AuthUser } from '../../common/types/request'
import { successResponse } from '../../common/response/api-response'
import { PermissionsService } from './permissions.service'

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  async list(@Query('module') moduleId?: string) {
    const data = await this.permissionsService.list(moduleId)
    return successResponse(data)
  }

  @Get('me')
  async getMyPermissions(@CurrentUser() user: AuthUser) {
    const data = await this.permissionsService.getUserPermissions(user.id)
    return successResponse(data)
  }
}
