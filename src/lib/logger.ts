import { env } from '@/lib/env'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

function emit(level: LogLevel, msg: string, meta?: Record<string, unknown>) {
  const line = {
    ts: new Date().toISOString(),
    level,
    msg,
    service: 'textilestock',
    env: env.NODE_ENV,
    ...meta,
  }
  const text = JSON.stringify(line)
  if (level === 'error') console.error(text)
  else if (level === 'warn') console.warn(text)
  else console.log(text)
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => {
    if (env.NODE_ENV !== 'production') emit('debug', msg, meta)
  },
  info: (msg: string, meta?: Record<string, unknown>) => emit('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => emit('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => emit('error', msg, meta),
}

/** Optional Sentry hook: set SENTRY_DSN and install @sentry/nextjs for full capture. */
export function captureApiError(err: unknown, context?: Record<string, unknown>) {
  logger.error(err instanceof Error ? err.message : 'Unknown error', {
    ...context,
    stack: err instanceof Error ? err.stack : undefined,
  })
}
