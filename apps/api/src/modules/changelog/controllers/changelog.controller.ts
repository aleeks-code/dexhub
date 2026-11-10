import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Param, Post, Put, UseGuards } from '@nestjs/common'
import { z } from 'zod'
import { ChangelogService } from '../services/changelog.service'
import { successResponse } from '../../../common/response/api-response'
import { Audit } from '../../../common/audit/audit.decorator'
import { AdminGuard } from '../../../common/guards/admin.guard'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import type { AuthUser } from '../../../common/types/request'
import type { CreateChangeDto, CreateReleaseDto, UpdateChangeDto, UpdateReleaseDto } from '../dto/changelog.dto'

// Forma basilare (^\d+\.\d+\.\d+$) — nessun parsing/ordinamento SemVer semantico ora.
const VersioneSchema = z.string().regex(/^\d+\.\d+\.\d+$/, 'versione must be basic SemVer (x.y.z)')

const ReleaseSchema = z.object({
  versione: VersioneSchema,
  titolo: z.string().min(1),
  descrizione: z.string().nullable().optional(),
})

const ChangeSchema = z.object({
  categoria: z.enum(['feature', 'improvement', 'fix', 'security', 'breaking']),
  visibilita: z.enum(['user', 'developer', 'internal']).optional(),
  modulo: z.string().nullable().optional(),
  titolo: z.string().min(1),
  descrizione: z.string().nullable().optional(),
  linkWiki: z.string().nullable().optional(),
  migrationNote: z.string().nullable().optional(),
  ordine: z.number().optional(),
})

@Controller('changelog')
export class ChangelogController {
  constructor(private readonly changelogService: ChangelogService) {}

  // ── Releases ─────────────────────────────────────────────────────────────────

  @Get('releases')
  async listReleases(@CurrentUser() user: AuthUser) {
    return successResponse(await this.changelogService.listReleases(!!user.isAdmin))
  }

  @Get('releases/:id')
  async getRelease(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return successResponse(await this.changelogService.getRelease(id, !!user.isAdmin))
  }

  @Get('releases/version/:version')
  async getReleaseByVersion(@Param('version') version: string, @CurrentUser() user: AuthUser) {
    const parsed = VersioneSchema.safeParse(version)
    if (!parsed.success) throw new BadRequestException({ code: 'VALIDATION_ERROR', details: parsed.error.issues })

    const release = await this.changelogService.getReleaseByVersion(parsed.data, !!user.isAdmin)
    if (!release) throw new NotFoundException('Release not found')
    return successResponse(release)
  }

  @Post('releases')
  @UseGuards(AdminGuard)
  @Audit({ action: 'changelog.release.create', category: 'DATA', severity: 'info' })
  async createRelease(@Body() body: unknown) {
    const parsed = ReleaseSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException({ code: 'VALIDATION_ERROR', details: parsed.error.issues })
    return successResponse(await this.changelogService.createRelease(parsed.data as CreateReleaseDto))
  }

  @Put('releases/:id')
  @UseGuards(AdminGuard)
  @Audit({ action: 'changelog.release.update', category: 'DATA', severity: 'info' })
  async updateRelease(@Param('id') id: string, @Body() body: unknown) {
    const parsed = ReleaseSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException({ code: 'VALIDATION_ERROR', details: parsed.error.issues })
    return successResponse(await this.changelogService.updateRelease(id, parsed.data as UpdateReleaseDto))
  }

  @Post('releases/:id/publish')
  @UseGuards(AdminGuard)
  @Audit({ action: 'changelog.release.publish', category: 'DATA', severity: 'info' })
  async publishRelease(@Param('id') id: string) {
    return successResponse(await this.changelogService.publishRelease(id))
  }

  @Delete('releases/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AdminGuard)
  @Audit({ action: 'changelog.release.delete', category: 'DATA', severity: 'warning' })
  async deleteRelease(@Param('id') id: string) {
    await this.changelogService.deleteRelease(id)
  }

  // ── Changes ──────────────────────────────────────────────────────────────────

  @Post('releases/:id/changes')
  @UseGuards(AdminGuard)
  @Audit({ action: 'changelog.change.create', category: 'DATA', severity: 'info' })
  async createChange(@Param('id') id: string, @Body() body: unknown) {
    const parsed = ChangeSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException({ code: 'VALIDATION_ERROR', details: parsed.error.issues })
    return successResponse(await this.changelogService.createChange(id, parsed.data as CreateChangeDto))
  }

  @Put('changes/:changeId')
  @UseGuards(AdminGuard)
  @Audit({ action: 'changelog.change.update', category: 'DATA', severity: 'info' })
  async updateChange(@Param('changeId') changeId: string, @Body() body: unknown) {
    const parsed = ChangeSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException({ code: 'VALIDATION_ERROR', details: parsed.error.issues })
    return successResponse(await this.changelogService.updateChange(changeId, parsed.data as UpdateChangeDto))
  }

  @Delete('changes/:changeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AdminGuard)
  @Audit({ action: 'changelog.change.delete', category: 'DATA', severity: 'warning' })
  async deleteChange(@Param('changeId') changeId: string) {
    await this.changelogService.deleteChange(changeId)
  }
}
