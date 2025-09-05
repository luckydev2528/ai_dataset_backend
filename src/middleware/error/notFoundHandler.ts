import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../types';

/**
 * 404 Not Found Handler Middleware
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const response: ApiResponse = {
    success: false,
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  };

  res.status(404).json(response);
};
