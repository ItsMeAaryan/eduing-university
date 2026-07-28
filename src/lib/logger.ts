type LogLevel = 'info' | 'warn' | 'error' | 'critical'

interface LogContext {
  [key: string]: any
}

class Logger {
  private isProduction = process.env.NODE_ENV === 'production'

  private formatMessage(level: LogLevel, message: string, context?: LogContext) {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: context || {},
      environment: process.env.NODE_ENV || 'development'
    }
  }

  info(message: string, context?: LogContext) {
    if (this.isProduction) return // Silence verbose info logs in production
    console.info(JSON.stringify(this.formatMessage('info', message, context)))
  }

  warn(message: string, context?: LogContext) {
    console.warn(JSON.stringify(this.formatMessage('warn', message, context)))
  }

  error(message: string, error?: any, context?: LogContext) {
    const formatted = this.formatMessage('error', message, {
      ...context,
      errorMsg: error?.message,
      stack: error?.stack
    })
    console.error(JSON.stringify(formatted))
    
    // In the future, this is where we would inject Sentry or Crashlytics:
    // Sentry.captureException(error, { extra: context })
  }

  critical(message: string, error?: any, context?: LogContext) {
    const formatted = this.formatMessage('critical', message, {
      ...context,
      errorMsg: error?.message,
      stack: error?.stack
    })
    console.error(JSON.stringify(formatted))
    
    // Sentry.captureMessage(message, 'fatal')
  }
}

export const logger = new Logger()
