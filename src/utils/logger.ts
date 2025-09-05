import { Request, Response } from 'express';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  requestId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  url?: string;
  method?: string;
  statusCode?: number;
  responseTime?: number;
  error?: any;
  metadata?: Record<string, any>;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatLog(entry: LogEntry): string {
    const baseLog = {
      level: entry.level,
      message: entry.message,
      timestamp: entry.timestamp,
    };

    if (entry.requestId) {
      (baseLog as any).requestId = entry.requestId;
    }

    if (entry.userId) {
      (baseLog as any).userId = entry.userId;
    }

    if (entry.ip) {
      (baseLog as any).ip = entry.ip;
    }

    if (entry.userAgent) {
      (baseLog as any).userAgent = entry.userAgent;
    }

    if (entry.url) {
      (baseLog as any).url = entry.url;
    }

    if (entry.method) {
      (baseLog as any).method = entry.method;
    }

    if (entry.statusCode) {
      (baseLog as any).statusCode = entry.statusCode;
    }

    if (entry.responseTime) {
      (baseLog as any).responseTime = entry.responseTime;
    }

    if (entry.error) {
      (baseLog as any).error = entry.error;
    }

    if (entry.metadata) {
      (baseLog as any).metadata = entry.metadata;
    }

    return JSON.stringify(baseLog);
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...metadata,
    };

    const formattedLog = this.formatLog(entry);

    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedLog);
        break;
      case LogLevel.WARN:
        console.warn(formattedLog);
        break;
      case LogLevel.INFO:
        console.info(formattedLog);
        break;
      case LogLevel.DEBUG:
        if (this.isDevelopment) {
          console.debug(formattedLog);
        }
        break;
    }
  }

  error(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  debug(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  // Request logging
  logRequest(req: Request, res: Response, responseTime: number): void {
    const metadata = {
      requestId: req.headers['x-request-id'] as string,
      userId: (req as any).user?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      method: req.method,
      statusCode: res.statusCode,
      responseTime,
    };

    if (res.statusCode >= 400) {
      this.error(`Request failed: ${req.method} ${req.originalUrl}`, metadata);
    } else {
      this.info(`Request completed: ${req.method} ${req.originalUrl}`, metadata);
    }
  }

  // Error logging
  logError(error: Error, req?: Request, metadata?: Record<string, any>): void {
    const errorMetadata: Record<string, any> = {
      ...metadata,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    };

    if (req) {
      errorMetadata.requestId = req.headers['x-request-id'] as string;
      errorMetadata.userId = (req as any).user?.id;
      errorMetadata.ip = req.ip;
      errorMetadata.userAgent = req.get('User-Agent');
      errorMetadata.url = req.originalUrl;
      errorMetadata.method = req.method;
    }

    this.error(`Error occurred: ${error.message}`, errorMetadata);
  }

  // Security logging
  logSecurity(event: string, req: Request, metadata?: Record<string, any>): void {
    const securityMetadata = {
      event,
      requestId: req.headers['x-request-id'] as string,
      userId: (req as any).user?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      method: req.method,
      ...metadata,
    };

    this.warn(`Security event: ${event}`, securityMetadata);
  }

  // Performance logging
  logPerformance(operation: string, duration: number, metadata?: Record<string, any>): void {
    this.info(`Performance: ${operation}`, {
      operation,
      duration,
      ...metadata,
    });
  }
}

export const logger = new Logger();
export default logger;
