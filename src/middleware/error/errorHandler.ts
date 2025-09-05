import { Request, Response, NextFunction } from 'express';
import { ApiResponse, ApiError } from '../../types';

/**
 * Custom Error Class
 */
export class AppError extends Error implements ApiError {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global Error Handler Middleware
 */
export const errorHandler = (
  error: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let isOperational = false;

  // Handle custom AppError
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    isOperational = error.isOperational;
  }
  // Handle validation errors
  else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  }
  // Handle JWT errors
  else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }
  // Handle Firebase errors
  else if (error.message.includes('auth/')) {
    statusCode = 401;
    message = 'Authentication error';
  }
  // Handle rate limit errors
  else if (error.message.includes('Too many requests')) {
    statusCode = 429;
    message = 'Too many requests';
  }
  // Handle CORS errors
  else if (error.message.includes('CORS')) {
    statusCode = 403;
    message = 'CORS error';
  }

  // Log error
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

  // Send error response (prevent information leakage in production)
  const response: ApiResponse = {
    success: false,
    message: isOperational ? message : 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    timestamp: new Date().toISOString(),
  };

  // Remove sensitive headers in production
  if (process.env.NODE_ENV === 'production') {
    res.removeHeader('X-Powered-By');
  }

  res.status(statusCode).json(response);
};

/**
 * Async Error Handler Wrapper
 * Wraps async route handlers to catch errors
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 Not Found Handler
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const response: ApiResponse = {
    success: false,
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  };

  res.status(404).json(response);
};

/**
 * Validation Error Handler
 */
export const validationErrorHandler = (errors: any[]) => {
  const response: ApiResponse = {
    success: false,
    message: 'Validation failed',
    data: errors,
    timestamp: new Date().toISOString(),
  };

  return response;
};

/**
 * Unhandled Promise Rejection Handler
 */
export const handleUnhandledRejection = (reason: any, promise: Promise<any>) => {
  console.error('Unhandled Promise Rejection at:', promise, 'reason:', reason);
  
  // In production, you might want to restart the server or send alerts
  if (process.env.NODE_ENV === 'production') {
    // Log to external service or restart server
    process.exit(1);
  }
};

/**
 * Uncaught Exception Handler
 */
export const handleUncaughtException = (error: Error) => {
  console.error('Uncaught Exception:', error);
  
  // In production, you might want to restart the server
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
};

// Set up global error handlers
process.on('unhandledRejection', handleUnhandledRejection);
process.on('uncaughtException', handleUncaughtException);
