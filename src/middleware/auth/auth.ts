import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../../types';
import { JWTService } from '../../services/auth/jwtService';
import { FirebaseWrapper } from '../../services/firebase/firebaseWrapper';
import { createStandardUserObject } from '../../utils/userUtils';
import { Logger } from '../../utils/logger';
import { requireAuth } from './authHelpers';
import { determineUserType, extractTokenFromRequest, resolveFirebaseUserWithFallback, resolveFirebaseUserFast } from '../../utils/authUtils';

/**
 * JWT Authentication Middleware
 * Verifies JWT token and adds user to request
 */
export const authenticateJWT = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromRequest(req);

    if (!token) {
      const response: ApiResponse = {
        success: false,
        message: 'Access token is required',
        timestamp: new Date().toISOString(),
      };
      res.status(401).json(response);
      return;
    }

    // Verify JWT token
    const payload = await JWTService.verifyToken(token);

    // Use centralized helper to resolve Firebase user with database fallback
    const { firebaseUser, databaseUserId } = await resolveFirebaseUserWithFallback(
      payload.uid, 
      'JWT authentication'
    );

    // Create user object using Firebase UID for JWT consistency
    const user = createStandardUserObject(firebaseUser, payload.type, firebaseUser.uid);

    // Add user to request
    req.user = user;
    req.firebaseUser = firebaseUser;

    next();
  } catch (error) {
    Logger.authError('JWT Authentication error', { error: error instanceof Error ? error.message : 'Unknown error' });
    
    const response: ApiResponse = {
      success: false,
      message: error instanceof Error ? error.message : 'Authentication failed',
      timestamp: new Date().toISOString(),
    };
    
    res.status(401).json(response);
    return;
  }
};

/**
 * Firebase ID Token Authentication Middleware
 * Verifies Firebase ID token and adds user to request
 */
export const authenticateFirebase = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromRequest(req);

    if (!token) {
      const response: ApiResponse = {
        success: false,
        message: 'Firebase ID token is required',
        timestamp: new Date().toISOString(),
      };
      res.status(401).json(response);
      return;
    }

    // Verify Firebase ID token
    const decodedToken = await FirebaseWrapper.verifyIdToken(token);

    // Get user from Firebase
    const firebaseUser = await FirebaseWrapper.getUserByUid(decodedToken.uid);

    // Determine user type from provider data
    const providerData = firebaseUser.providerData[0];
    const userType = providerData ? determineUserType(providerData.providerId.replace('.com', '')) : 'email';

    // Create user object using standardized function
    const user = createStandardUserObject(firebaseUser, userType);

    // Add user to request
    req.user = user;
    req.firebaseUser = firebaseUser;

    next();
  } catch (error) {
    Logger.authError('Firebase Authentication error', { error: error instanceof Error ? error.message : 'Unknown error' });
    
    const response: ApiResponse = {
      success: false,
      message: error instanceof Error ? error.message : 'Authentication failed',
      timestamp: new Date().toISOString(),
    };
    
    res.status(401).json(response);
    return;
  }
};

/**
 * Optional Authentication Middleware
 * Adds user to request if token is present, but doesn't require it
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromRequest(req);

    if (!token) {
      next();
      return;
    }

    // Try to verify token
    try {
      const payload = await JWTService.verifyToken(token);
      
      // Use centralized helper to resolve Firebase user with database fallback
      const { firebaseUser, databaseUserId } = await resolveFirebaseUserWithFallback(
        payload.uid, 
        'optional authentication'
      );

      const user = createStandardUserObject(firebaseUser, payload.type, firebaseUser.uid);

      req.user = user;
      req.firebaseUser = firebaseUser;
    } catch (error) {
      // Token is invalid, but we don't fail the request
      Logger.warning('Optional auth failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    }

    next();
  } catch (error) {
    Logger.error('Optional auth error', { error: error instanceof Error ? error.message : 'Unknown error' });
    next(); // Continue even if there's an error
  }
};

// Note: requireRole is now imported from authHelpers.ts to avoid duplication

/**
 * Fast JWT Authentication Middleware for Video Uploads
 * Uses simplified authentication to avoid timeouts
 */
export const authenticateJWTFast = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromRequest(req);

    if (!token) {
      const response: ApiResponse = {
        success: false,
        message: 'Access token is required',
        timestamp: new Date().toISOString(),
      };
      res.status(401).json(response);
      return;
    }

    // Verify JWT token
    const payload = await JWTService.verifyToken(token);

    // Use fast resolver for video uploads
    const { firebaseUser, databaseUserId } = await resolveFirebaseUserFast(
      payload.uid, 
      'video upload authentication'
    );

    // Create user object using Firebase UID for JWT consistency
    const user = createStandardUserObject(firebaseUser, payload.type, firebaseUser.uid);

    // Add user to request
    req.user = user;
    req.firebaseUser = firebaseUser;

    next();
  } catch (error) {
    Logger.authError('Fast JWT Authentication error', { error: error instanceof Error ? error.message : 'Unknown error' });
    
    const response: ApiResponse = {
      success: false,
      message: error instanceof Error ? error.message : 'Authentication failed',
      timestamp: new Date().toISOString(),
    };
    
    res.status(401).json(response);
    return;
  }
};

/**
 * Rate limiting per user
 */
export const userRateLimit = (maxRequests: number, windowMs: number) => {
  const userRequests = new Map<string, { count: number; resetTime: number }>();

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next();
      return;
    }

    const userId = req.user.id;
    const now = Date.now();
    const userLimit = userRequests.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      userRequests.set(userId, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    if (userLimit.count >= maxRequests) {
      const response: ApiResponse = {
        success: false,
        message: 'Too many requests for this user',
        timestamp: new Date().toISOString(),
      };
      res.status(429).json(response);
      return;
    }

    userLimit.count++;
    next();
  };
};
