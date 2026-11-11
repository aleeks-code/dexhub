import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { WorklogService } from '../services/worklog.service'
import { StimaService } from '../services/stima.service'
import {
  UpsertDayDto,
  UpdateContractDto,
  CreateTemplateDto,
  UpdateTemplateDto,
  UpsertFiscalConfigDto,
  CreateRetribuzioneDto,
  CreateVariabileFlatDto,
  UpdateVariabileFlatDto,
  UpsertCigConfigDto,
  UpsertSindacatoConfigDto,
  UpsertMensaConfigDto,
  UpsertAddizionaliConfigDto,
  UpsertCometaConfigDto,
  UpsertNettoRealeDto,
} from '../dto/worklog.dto'
import { successResponse } from '../../../common/response/api-response'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'

const MonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'month must be YYYY-MM')

const VariabileFlatSchema = z.object({
  mese: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'mese must be YYYY-MM'),
  tipo: z.enum(['premio_produzione_feriale', 'premio_produzione_variabile']),
  importo: z.number().min(0),
  note: z.string().max(500).nullable().optional(),
})

const EnsureHolidayDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  hours: z.number().min(0).max(24),
})

const CigConfigSchema = z.object({
  tipo: z.enum(['solidarieta']),
  coefficiente: z.number().min(0).max(1),
  massimaleMensile: z.number().nonnegative().nullable().optional(),
  note: z.string().max(500).nullable().optional(),
})

const SindacatoConfigSchema = z.object({
  iscritto: z.boolean(),
  coefficiente: z.number().min(0).max(1),
  // '' / solo-spazi → null: la card mostra `sindacatoNome ?? default`, una stringa vuota
  // salvata romperebbe il fallback (''  ?? default === '', non il default).
  nome: z.string().max(100).nullable().optional()
    .transform((v) => (v == null || v.trim() === '' ? null : v.trim())),
})

const MensaConfigSchema = z.object({
  attivo: z.boolean(),
  importo: z.number().min(0),
})

const AddizionaliConfigSchema = z.object({
  attivo: z.boolean(),
  addizionaleRegionale: z.number().min(0),
  addizionaleComunale: z.number().min(0),
  accontoComunale: z.number().min(0),
  meseInizio: z.number().int().min(1).max(12).optional().default(3),
  meseFine: z.number().int().min(1).max(12).optional().default(11),
})

const CometaConfigSchema = z.object({
  iscritto: z.boolean(),
  // Nessun default applicativo: a differenza della sindacale non c'è una % "tipica" da
  // presupporre — l'utente deve dichiararla esplicitamente, null finché non lo fa.
  coefficiente: z.number().min(0).max(1).nullable(),
})

const NettoRealeSchema = z.object({
  mese: MonthSchema,
  netto: z.number().min(0),
  cedolinoSnapshot: z.record(z.unknown()).nullable().optional(),
})

const RetribuzioneSchema = z.object({
  decorrenza: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'decorrenza must be YYYY-MM'),
  tipo: z.enum(['monthly', 'hourly']),
  importo: z.number().positive(),
  premioFisso: z.number().nonnegative().nullable().optional(),
  minimoTabellare: z.number().nonnegative().nullable().optional(),
  superminimo: z.number().nonnegative().nullable().optional(),
  scattiAnzianita: z.number().nonnegative().nullable().optional(),
  premioProduzioneFisso: z.number().nonnegative().nullable().optional(),
  note: z.string().max(500).nullable().optional(),
}).superRefine((data, ctx) => {
  if (data.tipo !== 'monthly') return
  const componenti = [data.minimoTabellare, data.superminimo, data.scattiAnzianita, data.premioProduzioneFisso]
  if (componenti.some((v) => v == null)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['minimoTabellare'],
      message: 'minimoTabellare, superminimo, scattiAnzianita e premioProduzioneFisso sono obbligatori per la retribuzione di fatto',
    })
    return
  }
  const somma = componenti.reduce<number>((acc, v) => acc + (v ?? 0), 0)
  if (Math.abs(somma - data.importo) > 0.01) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['minimoTabellare'],
      message: `La somma dei componenti (${somma.toFixed(2)}) non corrisponde alla retribuzione di fatto (${data.importo.toFixed(2)})`,
    })
  }
})

type AuthReq = FastifyRequest & { session: { user: { id: string } } }

@Controller('worklog')
export class WorklogController {
  constructor(
    private readonly worklogService: WorklogService,
    private readonly stimaService: StimaService,
  ) {}

  // ── Days ──────────────────────────────────────────────────────────────────

  @Get('days')
  async getDays(
    @Req() req: AuthReq,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const days = await this.worklogService.getDays(req.session.user.id, from, to)
    return successResponse(days)
  }

  @Post('days')
  async upsertDay(@Req() req: AuthReq, @Body() dto: UpsertDayDto) {
    const day = await this.worklogService.upsertDay(req.session.user.id, dto)
    return successResponse(day)
  }

  @Delete('days/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDay(@Param('id') id: string, @Req() req: AuthReq) {
    await this.worklogService.deleteDay(req.session.user.id, id)
  }

  // Fix C-bis: auto-popolamento festivi, create-only — mai chiamare upsertDay per questo (de-cestinerebbe).
  @Post('days/ensure-holiday')
  async ensureHolidayDay(
    @Req() req: AuthReq,
    @Body(new ZodValidationPipe(EnsureHolidayDaySchema)) body: z.infer<typeof EnsureHolidayDaySchema>,
  ) {
    const result = await this.worklogService.ensureHolidayDay(req.session.user.id, body.date, body.hours)
    return successResponse(result)
  }

  // ── Trash ─────────────────────────────────────────────────────────────────

  @Get('trash')
  async getTrash(@Req() req: AuthReq) {
    const days = await this.worklogService.getTrash(req.session.user.id)
    return successResponse(days)
  }

  @Post('days/:id/restore')
  @HttpCode(HttpStatus.NO_CONTENT)
  async restoreDay(@Param('id') id: string, @Req() req: AuthReq) {
    await this.worklogService.restoreDay(req.session.user.id, id)
  }

  // ── Search ────────────────────────────────────────────────────────────────

  @Get('search')
  async search(@Req() req: AuthReq, @Query('q') q: string) {
    const days = await this.worklogService.searchDays(req.session.user.id, q ?? '')
    return successResponse(days)
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  @Get('summary')
  async getSummary(@Req() req: AuthReq, @Query('month') month: string) {
    const summary = await this.worklogService.getMonthlySummary(req.session.user.id, month)
    return successResponse(summary)
  }

  // ── Contract ──────────────────────────────────────────────────────────────

  @Get('contract')
  async getContract(@Req() req: AuthReq) {
    const contract = await this.worklogService.getContract(req.session.user.id)
    return successResponse(contract)
  }

  @Put('contract')
  async updateContract(@Req() req: AuthReq, @Body() dto: UpdateContractDto) {
    const contract = await this.worklogService.updateContract(req.session.user.id, dto)
    return successResponse(contract)
  }

  // ── Templates ─────────────────────────────────────────────────────────────

  @Get('templates')
  async getTemplates(@Req() req: AuthReq) {
    const templates = await this.worklogService.getTemplates(req.session.user.id)
    return successResponse(templates)
  }

  @Post('templates')
  async createTemplate(@Req() req: AuthReq, @Body() dto: CreateTemplateDto) {
    const template = await this.worklogService.createTemplate(req.session.user.id, dto)
    return successResponse(template)
  }

  @Put('templates/:id')
  async updateTemplate(@Param('id') id: string, @Req() req: AuthReq, @Body() dto: UpdateTemplateDto) {
    const template = await this.worklogService.updateTemplate(req.session.user.id, id, dto)
    return successResponse(template)
  }

  @Delete('templates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTemplate(@Param('id') id: string, @Req() req: AuthReq) {
    await this.worklogService.deleteTemplate(req.session.user.id, id)
  }

  // ── CCNL ─────────────────────────────────────────────────────────────────

  @Get('ccnl')
  async getCcnlList() {
    const list = await this.worklogService.getCcnlList()
    return successResponse(list)
  }

  // ── Fiscal config ─────────────────────────────────────────────────────────

  @Get('fiscal-config')
  async getFiscalConfig(@Req() req: AuthReq) {
    const data = await this.worklogService.getFiscalConfig(req.session.user.id)
    return successResponse(data)
  }

  @Put('fiscal-config')
  async upsertFiscalConfig(@Req() req: AuthReq, @Body() body: unknown) {
    const schema = z.object({
      ccnlId: z.string().min(1),
      tipoContratto: z.enum(['ordinario', 'apprendistato']),
      regione: z.string().max(50).nullable().optional(),
      comune: z.string().max(100).nullable().optional(),
      aliquotaAddRegionale: z.number().min(0).max(1).nullable().optional(),
      aliquotaAddComunale: z.number().min(0).max(1).nullable().optional(),
      mensilita: z.union([z.literal(13), z.literal(14)]).optional(),
      contributiInpsOverride: z.number().min(0).max(1).nullable().optional(),
    })
    const parsed = schema.safeParse(body)
    if (!parsed.success) throw new BadRequestException({ code: 'VALIDATION_ERROR', details: parsed.error.issues })
    const config = await this.worklogService.upsertFiscalConfig(req.session.user.id, parsed.data as UpsertFiscalConfigDto)
    return successResponse(config)
  }

  // ── Retribuzione ─────────────────────────────────────────────────────────

  @Get('retribuzione')
  async getRetribuzione(@Req() req: AuthReq) {
    const data = await this.worklogService.getRetribuzione(req.session.user.id)
    return successResponse(data)
  }

  @Post('retribuzione')
  async createRetribuzione(@Req() req: AuthReq, @Body() body: unknown) {
    const parsed = RetribuzioneSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException({ code: 'VALIDATION_ERROR', details: parsed.error.issues })
    const entry = await this.worklogService.createRetribuzione(req.session.user.id, parsed.data as CreateRetribuzioneDto)
    return successResponse(entry)
  }

  @Put('retribuzione/:id')
  async updateRetribuzione(@Param('id') id: string, @Req() req: AuthReq, @Body() body: unknown) {
    const parsed = RetribuzioneSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException({ code: 'VALIDATION_ERROR', details: parsed.error.issues })
    const entry = await this.worklogService.updateRetribuzione(req.session.user.id, id, parsed.data as CreateRetribuzioneDto)
    return successResponse(entry)
  }

  @Delete('retribuzione/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRetribuzione(@Param('id') id: string, @Req() req: AuthReq) {
    await this.worklogService.deleteRetribuzione(req.session.user.id, id)
  }

  // ── Variabili flat (Step 6) — premio produzione feriale/variabile ──────────

  @Get('variabili-flat')
  async getVariabiliFlat(@Req() req: AuthReq, @Query('mese') mese?: string) {
    const data = await this.worklogService.getVariabiliFlat(req.session.user.id, mese)
    return successResponse(data)
  }

  @Post('variabili-flat')
  async createVariabileFlat(@Req() req: AuthReq, @Body() body: unknown) {
    const parsed = VariabileFlatSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException({ code: 'VALIDATION_ERROR', details: parsed.error.issues })
    const entry = await this.worklogService.createVariabileFlat(req.session.user.id, parsed.data as CreateVariabileFlatDto)
    return successResponse(entry)
  }

  @Put('variabili-flat/:id')
  async updateVariabileFlat(@Param('id') id: string, @Req() req: AuthReq, @Body() body: unknown) {
    const parsed = VariabileFlatSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException({ code: 'VALIDATION_ERROR', details: parsed.error.issues })
    const entry = await this.worklogService.updateVariabileFlat(req.session.user.id, id, parsed.data as UpdateVariabileFlatDto)
    return successResponse(entry)
  }

  @Delete('variabili-flat/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteVariabileFlat(@Param('id') id: string, @Req() req: AuthReq) {
    await this.worklogService.deleteVariabileFlat(req.session.user.id, id)
  }

  // ── CIG config (Step 5) ─────────────────────────────────────────────────────

  @Get('cig-config')
  async getCigConfig(@Req() req: AuthReq) {
    const data = await this.worklogService.getCigConfig(req.session.user.id)
    return successResponse(data)
  }

  @Put('cig-config')
  async upsertCigConfig(@Req() req: AuthReq, @Body() body: unknown) {
    const parsed = CigConfigSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException({ code: 'VALIDATION_ERROR', details: parsed.error.issues })
    const config = await this.worklogService.upsertCigConfig(req.session.user.id, parsed.data as UpsertCigConfigDto)
    return successResponse(config)
  }

  @Get('cig-massimali')
  async getCigMassimali() {
    const data = await this.worklogService.getCigMassimali()
    return successResponse(data)
  }

  // ── Sindacato config (trattenuta CGIL) ──────────────────────────────────────

  @Get('sindacato-config')
  async getSindacatoConfig(@Req() req: AuthReq) {
    const data = await this.worklogService.getSindacatoConfig(req.session.user.id)
    return successResponse(data)
  }

  @Put('sindacato-config')
  async upsertSindacatoConfig(@Req() req: AuthReq, @Body() body: unknown) {
    const parsed = SindacatoConfigSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException({ code: 'VALIDATION_ERROR', details: parsed.error.issues })
    const config = await this.worklogService.upsertSindacatoConfig(req.session.user.id, parsed.data as UpsertSindacatoConfigDto)
    return successResponse(config)
  }

  // ── Mensa config (trattenuta mensa) ──────────────────────────────────────────

  @Get('mensa-config')
  async getMensaConfig(@Req() req: AuthReq) {
    const data = await this.worklogService.getMensaConfig(req.session.user.id)
    return successResponse(data)
  }

  @Put('mensa-config')
  async upsertMensaConfig(@Req() req: AuthReq, @Body() body: unknown) {
    const parsed = MensaConfigSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException({ code: 'VALIDATION_ERROR', details: parsed.error.issues })
    const config = await this.worklogService.upsertMensaConfig(req.session.user.id, parsed.data as UpsertMensaConfigDto)
    return successResponse(config)
  }

  // ── Addizionali config (trattenuta addizionali regionale/comunale) ───────────

  @Get('addizionali-config')
  async getAddizionaliConfig(@Req() req: AuthReq) {
    const data = await this.worklogService.getAddizionaliConfig(req.session.user.id)
    return successResponse(data)
  }

  @Put('addizionali-config')
  async upsertAddizionaliConfig(@Req() req: AuthReq, @Body() body: unknown) {
    const parsed = AddizionaliConfigSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException({ code: 'VALIDATION_ERROR', details: parsed.error.issues })
    const config = await this.worklogService.upsertAddizionaliConfig(req.session.user.id, parsed.data as UpsertAddizionaliConfigDto)
    return successResponse(config)
  }

  // ── Cometa config (previdenza complementare) ────────────────────────────────

  @Get('cometa-config')
  async getCometaConfig(@Req() req: AuthReq) {
    const data = await this.worklogService.getCometaConfig(req.session.user.id)
    return successResponse(data)
  }

  @Put('cometa-config')
  async upsertCometaConfig(@Req() req: AuthReq, @Body() body: unknown) {
    const parsed = CometaConfigSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException({ code: 'VALIDATION_ERROR', details: parsed.error.issues })
    const config = await this.worklogService.upsertCometaConfig(req.session.user.id, parsed.data as UpsertCometaConfigDto)
    return successResponse(config)
  }

  // ── Netto reale (per mese, chiave composta userId+mese) ───────────────────────

  @Get('netto-reale')
  async getNettoReale(@Req() req: AuthReq, @Query('mese') mese?: string) {
    const parsedMese = MonthSchema.safeParse(mese)
    if (!parsedMese.success) throw new BadRequestException({ code: 'VALIDATION_ERROR', details: parsedMese.error.issues })
    const data = await this.worklogService.getNettoReale(req.session.user.id, parsedMese.data)
    return successResponse(data)
  }

  @Get('netto-reale/history')
  async getNettoRealeHistory(@Req() req: AuthReq, @Query('anno') anno?: string) {
    const yearNum = anno ? parseInt(anno, 10) : new Date().getFullYear()
    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Anno non valido' })
    }
    const data = await this.worklogService.getNettoRealeHistory(req.session.user.id, yearNum)
    return successResponse(data)
  }

  @Put('netto-reale')
  async upsertNettoReale(@Req() req: AuthReq, @Body() body: unknown) {
    const parsed = NettoRealeSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException({ code: 'VALIDATION_ERROR', details: parsed.error.issues })
    const data = await this.worklogService.upsertNettoReale(req.session.user.id, parsed.data as UpsertNettoRealeDto)
    return successResponse(data)
  }

  @Delete('netto-reale/:mese')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNettoReale(
    @Req() req: AuthReq,
    @Param('mese', new ZodValidationPipe(MonthSchema)) mese: string,
  ) {
    await this.worklogService.deleteNettoReale(req.session.user.id, mese)
  }

  // ── Stima busta paga ──────────────────────────────────────────────────────

  @Get('stima')
  async getStima(
    @Req() req: AuthReq,
    @Query('month', new ZodValidationPipe(MonthSchema)) month: string,
  ) {
    const data = await this.stimaService.getStima(req.session.user.id, month)
    return successResponse(data)
  }

  @Get('stima/conguaglio-raw')
  async getConguaglioRaw(@Req() req: AuthReq) {
    const data = await this.stimaService.getConguaglioRaw(req.session.user.id)
    return successResponse(data)
  }

  // ── Export ────────────────────────────────────────────────────────────────

  @Get('export')
  async exportData(
    @Req() req: AuthReq,
    @Res() res: FastifyReply,
    @Query('format') format: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const fmt = format === 'csv' ? 'csv' : 'json'
    const { contentType, data } = await this.worklogService.exportData(
      req.session.user.id,
      fmt,
      from,
      to,
    )
    const filename = `worklog_${from}_${to}.${fmt}`
    void res
      .header('Content-Type', contentType)
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(data)
  }
}
