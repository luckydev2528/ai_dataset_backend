import { Response } from 'express';
import { ApiResponse } from '../types';

// Re-export ApiResponse for use in controllers
export { ApiResponse };

/**
 * Send success response
 */
export const sendSuccess = (
  res: Response,
  data: any = null,
  message: string = 'Success',
  statusCode: number = 200
): void => {
  const response: ApiResponse = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(response);
};

/**
 * Send error response
 */
export const sendError = (
  res: Response,
  message: string = 'Error',
  statusCode: number = 500,
  error?: string
): void => {
  const response: ApiResponse = {
    success: false,
    message,
    error,
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(response);
};

/**
 * Send validation error response
 */
export const sendValidationError = (
  res: Response,
  errors: any[],
  message: string = 'Validation failed'
): void => {
  const response: ApiResponse = {
    success: false,
    message,
    data: errors,
    timestamp: new Date().toISOString(),
  };

  res.status(400).json(response);
};

/**
 * Send not found response
 */
export const sendNotFound = (
  res: Response,
  message: string = 'Resource not found'
): void => {
  const response: ApiResponse = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };

  res.status(404).json(response);
};

/**
 * Send unauthorized response
 */
export const sendUnauthorized = (
  res: Response,
  message: string = 'Unauthorized'
): void => {
  const response: ApiResponse = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };

  res.status(401).json(response);
};

/**
 * Send forbidden response
 */
export const sendForbidden = (
  res: Response,
  message: string = 'Forbidden'
): void => {
  const response: ApiResponse = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };

  res.status(403).json(response);
};

/**
 * Send conflict response
 */
export const sendConflict = (
  res: Response,
  message: string = 'Conflict'
): void => {
  const response: ApiResponse = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };

  res.status(409).json(response);
};

/**
 * Send rate limit response
 */
export const sendRateLimit = (
  res: Response,
  message: string = 'Too many requests'
): void => {
  const response: ApiResponse = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };

  res.status(429).json(response);
};

/**
 * Send paginated response
 */
export const sendPaginated = (
  res: Response,
  data: any[],
  total: number,
  page: number,
  limit: number,
  message: string = 'Data retrieved successfully'
): void => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  const response: ApiResponse = {
    success: true,
    message,
    data: {
      items: data,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    },
    timestamp: new Date().toISOString(),
  };

  res.json(response);
};

/**
 * Send created response
 */
export const sendCreated = (
  res: Response,
  data: any = null,
  message: string = 'Resource created successfully'
): void => {
  sendSuccess(res, data, message, 201);
};

/**
 * Send no content response
 */
export const sendNoContent = (res: Response): void => {
  res.status(204).send();
};

/**
 * Send accepted response
 */
export const sendAccepted = (
  res: Response,
  data: any = null,
  message: string = 'Request accepted'
): void => {
  sendSuccess(res, data, message, 202);
};
