"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.LogLevel = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel["ERROR"] = "error";
    LogLevel["WARN"] = "warn";
    LogLevel["INFO"] = "info";
    LogLevel["DEBUG"] = "debug";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    isDevelopment = process.env.NODE_ENV === 'development';
    formatLog(entry) {
        const baseLog = {
            level: entry.level,
            message: entry.message,
            timestamp: entry.timestamp,
        };
        if (entry.requestId) {
            baseLog.requestId = entry.requestId;
        }
        if (entry.userId) {
            baseLog.userId = entry.userId;
        }
        if (entry.ip) {
            baseLog.ip = entry.ip;
        }
        if (entry.userAgent) {
            baseLog.userAgent = entry.userAgent;
        }
        if (entry.url) {
            baseLog.url = entry.url;
        }
        if (entry.method) {
            baseLog.method = entry.method;
        }
        if (entry.statusCode) {
            baseLog.statusCode = entry.statusCode;
        }
        if (entry.responseTime) {
            baseLog.responseTime = entry.responseTime;
        }
        if (entry.error) {
            baseLog.error = entry.error;
        }
        if (entry.metadata) {
            baseLog.metadata = entry.metadata;
        }
        return JSON.stringify(baseLog);
    }
    log(level, message, metadata) {
        const entry = {
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
    error(message, metadata) {
        this.log(LogLevel.ERROR, message, metadata);
    }
    warn(message, metadata) {
        this.log(LogLevel.WARN, message, metadata);
    }
    info(message, metadata) {
        this.log(LogLevel.INFO, message, metadata);
    }
    debug(message, metadata) {
        this.log(LogLevel.DEBUG, message, metadata);
    }
    logRequest(req, res, responseTime) {
        const metadata = {
            requestId: req.headers['x-request-id'],
            userId: req.user?.id,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            url: req.originalUrl,
            method: req.method,
            statusCode: res.statusCode,
            responseTime,
        };
        if (res.statusCode >= 400) {
            this.error(`Request failed: ${req.method} ${req.originalUrl}`, metadata);
        }
        else {
            this.info(`Request completed: ${req.method} ${req.originalUrl}`, metadata);
        }
    }
    logError(error, req, metadata) {
        const errorMetadata = {
            ...metadata,
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack,
            },
        };
        if (req) {
            errorMetadata.requestId = req.headers['x-request-id'];
            errorMetadata.userId = req.user?.id;
            errorMetadata.ip = req.ip;
            errorMetadata.userAgent = req.get('User-Agent');
            errorMetadata.url = req.originalUrl;
            errorMetadata.method = req.method;
        }
        this.error(`Error occurred: ${error.message}`, errorMetadata);
    }
    logSecurity(event, req, metadata) {
        const securityMetadata = {
            event,
            requestId: req.headers['x-request-id'],
            userId: req.user?.id,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            url: req.originalUrl,
            method: req.method,
            ...metadata,
        };
        this.warn(`Security event: ${event}`, securityMetadata);
    }
    logPerformance(operation, duration, metadata) {
        this.info(`Performance: ${operation}`, {
            operation,
            duration,
            ...metadata,
        });
    }
}
exports.logger = new Logger();
exports.default = exports.logger;
//# sourceMappingURL=logger.js.map