export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface ApiEndpointDefinition {
  method: ApiMethod
  path: string
  description?: string
}

export interface ApiSuccessResponse<T = unknown> {
  data: T
  meta: {
    requestId: string
    timestamp: string
  }
}

export interface ApiErrorResponse {
  error: {
    code: string
    message: string
    requestId: string
    details?: unknown
  }
}

export interface ApiPaginatedResponse<T = unknown> {
  data: T[]
  meta: {
    total: number
    page: number
    pageSize: number
    requestId: string
    timestamp: string
  }
}

export interface PaginationParams {
  page?: number
  pageSize?: number
}
