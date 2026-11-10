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
    const context = this.extractContext(optionalParams)
    // NestJS passes stack trace as second arg for errors
    const trace =
      optionalParams.length > 1 && typeof optionalParams[0] === 'string'
        ? optionalParams[0]
        : undefined
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
    const text = typeof message === 'string' ? message : JSON.stringify(message)
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
  }
}
