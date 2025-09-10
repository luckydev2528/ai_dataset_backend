/**
 * BaseController - Abstract base class for all controllers
 * Eliminates duplicate patterns across controllers
 */

import { Request, Response } from 'express';
import { ApiResponse } from '../types/api';
import { Logger } from '../utils/logger';

export abstract class BaseController {
  /**
   * Extract user ID from authenticated request
   */
  protected static extractUserId(req: Request): string | null {
    return (req as any).user?.id || null;
  }

  /**
   * Extract user ID and throw error if not found
   */
  protected static requireUserId(req: Request): string {
    const userId = this.extractUserId(req);
    if (!userId) {
      throw new Error('Authentication required');
    }
    return userId;
  }

  /**
   * Send authentication error response
   */
  protected static sendAuthError(res: Response, message: string = 'Authentication required'): void {
    const response: ApiResponse = {
      success: false,
      message,
      error: 'AUTHENTICATION_REQUIRED',
      timestamp: new Date().toISOString(),
    };
    res.status(401).json(response);
  }

  /**
   * Send success response
   */
  protected static sendSuccessResponse<T>(
    res: Response,
    data: T,
    message: string = 'Operation successful',
    statusCode: number = 200
  ): void {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
    res.status(statusCode).json(response);
  }

  /**
   * Send error response
   */
  protected static sendErrorResponse(
    res: Response,
    message: string,
    error: string,
    statusCode: number = 500,
    details?: any
  ): void {
    const response: ApiResponse = {
      success: false,
      message,
      error,
      timestamp: new Date().toISOString(),
    };
    
    if (details) {
      (response as any).details = details;
    }
    
    res.status(statusCode).json(response);
  }

  /**
   * Send validation error response
   */
  protected static sendValidationError(
    res: Response,
    message: string = 'Validation failed',
    details?: any
  ): void {
    this.sendErrorResponse(res, message, 'VALIDATION_ERROR', 400, details);
  }

  /**
   * Send not found error response
   */
  protected static sendNotFoundError(
    res: Response,
    resource: string = 'Resource'
  ): void {
    this.sendErrorResponse(res, `${resource} not found`, 'NOT_FOUND', 404);
  }

  /**
   * Send conflict error response
   */
  protected static sendConflictError(
    res: Response,
    message: string = 'Resource already exists'
  ): void {
    this.sendErrorResponse(res, message, 'CONFLICT', 409);
  }

  /**
   * Send forbidden error response
   */
  protected static sendForbiddenError(
    res: Response,
    message: string = 'Access forbidden'
  ): void {
    this.sendErrorResponse(res, message, 'FORBIDDEN', 403);
  }

  /**
   * Handle controller errors with consistent logging
   */
  protected static handleError(
    error: any,
    operation: string,
    res?: Response
  ): void {
    Logger.error(`Error in ${operation}:`, {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    if (res) {
      this.sendErrorResponse(
        res,
        `Failed to ${operation}`,
        'INTERNAL_ERROR',
        500
      );
    }
  }

  /**
   * Validate required fields in request body
   */
  protected static validateRequiredFields(
    body: any,
    requiredFields: string[]
  ): string[] {
    const missing: string[] = [];
    requiredFields.forEach(field => {
      if (body[field] === undefined || body[field] === null || body[field] === '') {
        missing.push(field);
      }
    });
    return missing;
  }

  /**
   * Validate and send error if fields are missing
   */
  protected static validateAndSendError(
    res: Response,
    body: any,
    requiredFields: string[]
  ): boolean {
    const missing = this.validateRequiredFields(body, requiredFields);
    if (missing.length > 0) {
      this.sendValidationError(
        res,
        `Missing required fields: ${missing.join(', ')}`,
        { missingFields: missing }
      );
      return true;
    }
    return false;
  }

  /**
   * Extract pagination parameters from query
   */
  protected static extractPaginationParams(query: any): {
    page: number;
    limit: number;
    offset: number;
  } {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
    const offset = (page - 1) * limit;
    
    return { page, limit, offset };
  }

  /**
   * Create paginated response
   */
  protected static createPaginatedResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number
  ): ApiResponse<{ items: T[]; pagination: any }> {
    const totalPages = Math.ceil(total / limit);
    
    return {
      success: true,
      message: 'Data retrieved successfully',
      data: {
        items: data,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        }
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Wrap controller method with error handling
   */
  protected static asyncHandler(
    fn: (req: Request, res: Response) => Promise<void>
  ) {
    return async (req: Request, res: Response) => {
      try {
        await fn(req, res);
      } catch (error) {
        this.handleError(error, fn.name, res);
      }
    };
  }
}
