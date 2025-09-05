"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUncaughtException = exports.handleUnhandledRejection = exports.validationErrorHandler = exports.notFoundHandler = exports.asyncHandler = exports.errorHandler = exports.AppError = void 0;
class AppError extends Error {
    statusCode;
    isOperational;
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
const errorHandler = (error, req, res, next) => {
    let statusCode = 500;
    let message = 'Internal Server Error';
    let isOperational = false;
    if (error instanceof AppError) {
        statusCode = error.statusCode;
        message = error.message;
        isOperational = error.isOperational;
    }
    else if (error.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation Error';
    }
    else if (error.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    }
    else if (error.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    }
    else if (error.message.includes('auth/')) {
        statusCode = 401;
        message = 'Authentication error';
    }
    else if (error.message.includes('Too many requests')) {
        statusCode = 429;
        message = 'Too many requests';
    }
    else if (error.message.includes('CORS')) {
        statusCode = 403;
        message = 'CORS error';
    }
    console.error('Error occurred:', {
        message: error.message,
        stack: error.stack,
        statusCode,
        isOperational,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
    });
    const response = {
        success: false,
        message: isOperational ? message : 'Something went wrong',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString(),
    };
    res.status(statusCode).json(response);
};
exports.errorHandler = errorHandler;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
const notFoundHandler = (req, res, next) => {
    const response = {
        success: false,
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString(),
    };
    res.status(404).json(response);
};
exports.notFoundHandler = notFoundHandler;
const validationErrorHandler = (errors) => {
    const response = {
        success: false,
        message: 'Validation failed',
        data: errors,
        timestamp: new Date().toISOString(),
    };
    return response;
};
exports.validationErrorHandler = validationErrorHandler;
const handleUnhandledRejection = (reason, promise) => {
    console.error('Unhandled Promise Rejection at:', promise, 'reason:', reason);
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
};
exports.handleUnhandledRejection = handleUnhandledRejection;
const handleUncaughtException = (error) => {
    console.error('Uncaught Exception:', error);
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
};
exports.handleUncaughtException = handleUncaughtException;
process.on('unhandledRejection', exports.handleUnhandledRejection);
process.on('uncaughtException', exports.handleUncaughtException);
//# sourceMappingURL=errorHandler.js.map