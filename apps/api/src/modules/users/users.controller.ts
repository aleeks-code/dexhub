import { Body, Controller, Get, Patch } from '@nestjs/common'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { AuthUser } from '../../common/types/request'
import { successResponse } from '../../common/response/api-response'
import { UsersService, UpdateMeSchema } from './users.service'

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser() user: AuthUser) {
    const row = await this.usersService.findById(user.id)
    return successResponse({
      id: row.id,
      name: row.name,
      email: row.email,
      image: row.image,
      isAdmin: row.isAdmin,
      isActive: row.isActive,
      lastLoginAt: row.lastLoginAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
  }

  @Patch('me')
  async updateMe(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const dto = UpdateMeSchema.parse(body)
    const row = await this.usersService.updateMe(user.id, dto)
    return successResponse({
      id: row.id,
      name: row.name,
      email: row.email,
      image: row.image,
      isAdmin: row.isAdmin,
      isActive: row.isActive,
      lastLoginAt: row.lastLoginAt,
      updatedAt: row.updatedAt,
    })
  }
}
