import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { AuthUser } from '../../common/types/request'
import { successResponse } from '../../common/response/api-response'
import { Audit } from '../../common/audit/audit.decorator'
import { AdminGuard } from '../../common/guards/admin.guard'
import { RegistryService } from './registry.service'

@Controller('modules')
export class RegistryController {
  constructor(private readonly registryService: RegistryService) {}

  @Get()
  async list() {
    const data = await this.registryService.list()
    return successResponse(data)
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.registryService.findById(id)
    return successResponse(data)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AdminGuard)
  @Audit({ action: 'module.install', category: 'MODULE', severity: 'info' })
  async install(
    @Body() body: { manifest?: unknown },
    @CurrentUser() user: AuthUser,
  ) {
    const data = await this.registryService.install(body.manifest, user.id)
    return successResponse(data)
  }

  @Post(':id/enable')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  @Audit({ action: 'module.enable', category: 'MODULE', severity: 'info' })
  async enable(@Param('id') id: string) {
    const data = await this.registryService.enable(id)
    return successResponse(data)
  }

  @Post(':id/disable')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  @Audit({ action: 'module.disable', category: 'MODULE', severity: 'warning' })
  async disable(@Param('id') id: string) {
    const data = await this.registryService.disable(id)
    return successResponse(data)
  }
}
