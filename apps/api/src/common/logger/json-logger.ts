import type { LoggerService } from '@nestjs/common'

export interface LogEntry {
  id: string
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug' | 'verbose' | 'fatal'
  context: string
  message: string
  trace?: string
}

export class JsonLogger implements LoggerService {
  private static buffer: LogEntry[] = []
  private static readonly MAX_BUFFER = 300

  static getRecentLogs(level?: string, search?: string): LogEntry[] {
    let list = [...this.buffer]
    if (level && level !== 'all') {
      list = list.filter((l) => l.level === level)
    }
    if (search && search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (l) => l.message.toLowerCase().includes(q) || l.context.toLowerCase().includes(q),
      )
    }
    return list
  }

  static pushLog(entry: Omit<LogEntry, 'id'>) {
    const item: LogEntry = {
      id: Math.random().toString(36).substring(2, 10),
      ...entry,
    }
    this.buffer.unshift(item)
    if (this.buffer.length > this.MAX_BUFFER) {
      this.buffer.pop()
    }
  }

  static clearLogs(): void {
    this.buffer = []
  }

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.write('info', message, this.extractContext(optionalParams))
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    let context: string | undefined
    let trace: string | undefined

    for (const param of optionalParams) {
      if (typeof param === 'string') {
        if (param.includes('\n') || param.startsWith('Error:') || param.length > 80) {
          trace = param
        } else if (!context) {
          context = param
        }
      }
    }

    if (message instanceof Error) {
      if (!trace && message.stack) trace = message.stack
      this.write('error', message.message || message.name || 'Error', context, trace)
      return
    }

    this.write('error', message, context, trace)
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.write('warn', message, this.extractContext(optionalParams))
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.write('debug', message, this.extractContext(optionalParams))
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.write('verbose', message, this.extractContext(optionalParams))
  }

  fatal(message: unknown, ...optionalParams: unknown[]): void {
    this.write('fatal', message, this.extractContext(optionalParams))
  }

  private extractContext(params: unknown[]): string | undefined {
    const last = params[params.length - 1]
    return typeof last === 'string' ? last : undefined
  }

  private write(level: LogEntry['level'], message: unknown, context?: string, trace?: string): void {
    let text: string
    if (typeof message === 'string') {
      text = message
    } else if (message instanceof Error) {
      text = message.message || message.name || 'Error'
      if (!trace && message.stack) trace = message.stack
    } else if (typeof message === 'object' && message !== null) {
      try {
        const errorLike = message as { message?: unknown; stack?: unknown }
        if (typeof errorLike.message === 'string') {
          text = errorLike.message
          if (!trace && typeof errorLike.stack === 'string') trace = errorLike.stack
        } else {
          text = JSON.stringify(message, Object.getOwnPropertyNames(message))
        }
      } catch {
        text = String(message)
      }
    } else {
      text = String(message)
    }

    const entry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      context: context ?? 'Application',
      message: text,
    }
    if (trace) entry['trace'] = trace

    JsonLogger.pushLog({
      timestamp: entry['timestamp'] as string,
      level,
      context: context ?? 'Application',
      message: text,
      trace,
    })

    process.stdout.write(JSON.stringify(entry) + '\n')
    if (level === 'error' || level === 'fatal') {
      process.stderr.write(`[${level.toUpperCase()}] [${entry['context']}] ${text}\n`)
      if (trace) {
        process.stderr.write(`${trace}\n`)
      }
    }
  }
}
