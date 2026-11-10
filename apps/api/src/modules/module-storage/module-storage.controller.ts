import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Put,
} from '@nestjs/common'
import { z } from 'zod'
import { successResponse } from '../../common/response/api-response'
import { ModuleStorageService } from './module-storage.service'

const SetSchema = z.object({
  value: z.unknown(),
  ttlSeconds: z.number().int().positive().optional(),
})

@Controller('module-storage/:moduleId')
export class ModuleStorageController {
  constructor(private readonly storageService: ModuleStorageService) {}

  @Get('kv/:key')
  async get(@Param('moduleId') moduleId: string, @Param('key') key: string) {
    const value = await this.storageService.kvGet(moduleId, key)
    if (value === null) throw new NotFoundException('Key not found')
    return successResponse({ key, value })
  }

  @Put('kv/:key')
  async set(
    @Param('moduleId') moduleId: string,
    @Param('key') key: string,
    @Body() body: unknown,
  ) {
    const { value, ttlSeconds } = SetSchema.parse(body)
    await this.storageService.kvSet(moduleId, key, value, ttlSeconds)
    return successResponse({ key, value })
  }

  @Delete('kv/:key')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('moduleId') moduleId: string, @Param('key') key: string) {
    await this.storageService.kvDelete(moduleId, key)
  }

  @Delete('kv')
  @HttpCode(HttpStatus.NO_CONTENT)
  async clear(@Param('moduleId') moduleId: string) {
    await this.storageService.kvClear(moduleId)
  }
}
