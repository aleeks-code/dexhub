export type ChangelogCategoria = 'feature' | 'improvement' | 'fix' | 'security' | 'breaking'
export type ChangelogVisibilita = 'user' | 'developer' | 'internal'

export class CreateReleaseDto {
  versione!: string
  titolo!: string
  descrizione?: string | null
}

export class UpdateReleaseDto {
  versione!: string
  titolo!: string
  descrizione?: string | null
}

export class CreateChangeDto {
  categoria!: ChangelogCategoria
  visibilita?: ChangelogVisibilita
  modulo?: string | null
  titolo!: string
  descrizione?: string | null
  linkWiki?: string | null
  migrationNote?: string | null
  ordine?: number
}

export class UpdateChangeDto extends CreateChangeDto {}
