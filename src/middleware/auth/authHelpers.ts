import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../types';
import { AppError } from '../error/errorHandler';

/**
 * Middleware to check if user is authenticated
 * Eliminates the repeated pattern: if (!req.user) { throw new AppError('User not authenticated', 401); }
 */
export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }
  next();
};

/**
 * Middleware to check if user has required role
 */
export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }
    
    if (!roles.includes(req.user.type)) {
      throw new AppError('Insufficient permissions', 403);
    }
    
    next();
  };
};

/**
 * Middleware to check if user is active
 */
export const requireActiveUser = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }
  
  if (!req.user.isActive) {
    throw new AppError('User account is inactive', 403);
  }
  
  next();
};
