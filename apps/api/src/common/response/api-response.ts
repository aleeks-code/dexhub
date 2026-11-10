import { randomUUID } from 'crypto'

export function successResponse<T>(data: T) {
  return {
    data,
    meta: {
      requestId: randomUUID(),
      timestamp: new Date().toISOString(),
    },
  }
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
) {
  return {
    data,
    meta: {
      total,
      page,
      pageSize,
      requestId: randomUUID(),
      timestamp: new Date().toISOString(),
    },
  }
}
