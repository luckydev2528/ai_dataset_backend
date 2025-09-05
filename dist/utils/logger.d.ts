import { Request, Response } from 'express';
export declare enum LogLevel {
    ERROR = "error",
    WARN = "warn",
    INFO = "info",
    DEBUG = "debug"
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
declare class Logger {
    private isDevelopment;
    private formatLog;
    private log;
    error(message: string, metadata?: Record<string, any>): void;
    warn(message: string, metadata?: Record<string, any>): void;
    info(message: string, metadata?: Record<string, any>): void;
    debug(message: string, metadata?: Record<string, any>): void;
    logRequest(req: Request, res: Response, responseTime: number): void;
    logError(error: Error, req?: Request, metadata?: Record<string, any>): void;
    logSecurity(event: string, req: Request, metadata?: Record<string, any>): void;
    logPerformance(operation: string, duration: number, metadata?: Record<string, any>): void;
}
export declare const logger: Logger;
export default logger;
//# sourceMappingURL=logger.d.ts.map