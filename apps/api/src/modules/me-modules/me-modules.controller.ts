import { BadRequestException, Body, Controller, Get, Param, Put } from '@nestjs/common'
import { z } from 'zod'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { AuthUser } from '../../common/types/request'
import { successResponse } from '../../common/response/api-response'
import { MeModulesService } from './me-modules.service'

const UpdatePreferenceSchema = z.object({
  enabled: z.boolean().optional(),
  inOverview: z.boolean().optional(),
})

@Controller('me/modules')
export class MeModulesController {
  constructor(private readonly meModulesService: MeModulesService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const data = await this.meModulesService.list(user.id)
    return successResponse(data)
  }

  @Put(':id')
  async setPreference(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const dto = UpdatePreferenceSchema.parse(body)
    if (dto.enabled === undefined && dto.inOverview === undefined) {
      throw new BadRequestException('At least one of enabled or inOverview must be provided')
    }
    const data = await this.meModulesService.setPreference(user.id, id, dto)
    return successResponse(data)
  }
}
