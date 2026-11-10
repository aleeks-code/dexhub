export class CreateSpaceDto {
  name!: string
  type!: 'personal' | 'shared'
  description?: string
  color?: string
  icon?: string
}

export class UpdateSpaceDto {
  name?: string
  description?: string
  color?: string
  icon?: string
}

export class JoinSpaceDto {
  code!: string
}

export class InviteToSpaceDto {
  email!: string
}
