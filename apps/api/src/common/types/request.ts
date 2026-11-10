export interface AuthUser {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image: string | null
  isAdmin: boolean | undefined
  isActive: boolean | undefined
  createdAt: Date
  updatedAt: Date
}

export interface RequestSession {
  user: AuthUser
  session: {
    id: string
    userId: string
    token: string
    expiresAt: Date
    createdAt: Date
    updatedAt: Date
  }
}
