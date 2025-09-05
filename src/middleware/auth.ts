import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { JWTService } from '../services/jwtService';
import { verifyIdToken, getUserByUid } from '../services/firebaseAdmin';

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
    const authHeader = req.headers.authorization;
    const token = JWTService.extractTokenFromHeader(authHeader);

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
    const payload = JWTService.verifyToken(token);

    // Get user from Firebase
    const firebaseUser = await getUserByUid(payload.uid);

    // Create user object
    const user = {
      id: firebaseUser.uid,
      email: firebaseUser.email || '',
      name: firebaseUser.displayName || 'User',
      photo: firebaseUser.photoURL || undefined,
      type: payload.type,
      createdAt: new Date(firebaseUser.metadata.creationTime),
      updatedAt: new Date(firebaseUser.metadata.lastSignInTime || firebaseUser.metadata.creationTime),
      lastLoginAt: firebaseUser.metadata.lastSignInTime ? new Date(firebaseUser.metadata.lastSignInTime) : undefined,
      isActive: !firebaseUser.disabled,
    };

    // Add user to request
    req.user = user;
    req.firebaseUser = firebaseUser;

    next();
  } catch (error) {
    console.error('JWT Authentication error:', error);
    
    const response: ApiResponse = {
      success: false,
      message: error instanceof Error ? error.message : 'Authentication failed',
      timestamp: new Date().toISOString(),
    };
    
    res.status(401).json(response);
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
    const authHeader = req.headers.authorization;
    const token = JWTService.extractTokenFromHeader(authHeader);

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
    const decodedToken = await verifyIdToken(token);

    // Get user from Firebase
    const firebaseUser = await getUserByUid(decodedToken.uid);

    // Determine user type from provider data
    const providerData = firebaseUser.providerData[0];
    let userType: 'email' | 'google' | 'twitter' | 'facebook' = 'email';
    
    if (providerData) {
      switch (providerData.providerId) {
        case 'google.com':
          userType = 'google';
          break;
        case 'twitter.com':
          userType = 'twitter';
          break;
        case 'facebook.com':
          userType = 'facebook';
          break;
        default:
          userType = 'email';
      }
    }

    // Create user object
    const user = {
      id: firebaseUser.uid,
      email: firebaseUser.email || '',
      name: firebaseUser.displayName || 'User',
      photo: firebaseUser.photoURL || undefined,
      type: userType,
      createdAt: new Date(firebaseUser.metadata.creationTime),
      updatedAt: new Date(firebaseUser.metadata.lastSignInTime || firebaseUser.metadata.creationTime),
      lastLoginAt: firebaseUser.metadata.lastSignInTime ? new Date(firebaseUser.metadata.lastSignInTime) : undefined,
      isActive: !firebaseUser.disabled,
    };

    // Add user to request
    req.user = user;
    req.firebaseUser = firebaseUser;

    next();
  } catch (error) {
    console.error('Firebase Authentication error:', error);
    
    const response: ApiResponse = {
      success: false,
      message: error instanceof Error ? error.message : 'Authentication failed',
      timestamp: new Date().toISOString(),
    };
    
    res.status(401).json(response);
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
    const authHeader = req.headers.authorization;
    const token = JWTService.extractTokenFromHeader(authHeader);

    if (!token) {
      next();
      return;
    }

    // Try to verify token
    try {
      const payload = JWTService.verifyToken(token);
      const firebaseUser = await getUserByUid(payload.uid);

      const user = {
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        name: firebaseUser.displayName || 'User',
        photo: firebaseUser.photoURL || undefined,
        type: payload.type,
        createdAt: new Date(firebaseUser.metadata.creationTime),
        updatedAt: new Date(firebaseUser.metadata.lastSignInTime || firebaseUser.metadata.creationTime),
        lastLoginAt: firebaseUser.metadata.lastSignInTime ? new Date(firebaseUser.metadata.lastSignInTime) : undefined,
        isActive: !firebaseUser.disabled,
      };

      req.user = user;
      req.firebaseUser = firebaseUser;
    } catch (error) {
      // Token is invalid, but we don't fail the request
      console.warn('Optional auth failed:', error);
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next(); // Continue even if there's an error
  }
};

/**
 * Role-based Authorization Middleware
 */
export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        message: 'Authentication required',
        timestamp: new Date().toISOString(),
      };
      res.status(401).json(response);
      return;
    }

    // Check if user has required role (this would need to be implemented based on your role system)
    // For now, we'll just check if user is active
    if (!req.user.isActive) {
      const response: ApiResponse = {
        success: false,
        message: 'Account is disabled',
        timestamp: new Date().toISOString(),
      };
      res.status(403).json(response);
      return;
    }

    next();
  };
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
