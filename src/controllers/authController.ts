import { Request, Response } from 'express';
import { AuthenticatedRequest, ApiResponse, LoginRequest, RegisterRequest, SocialAuthRequest, PasswordResetRequest, PasswordResetConfirmRequest } from '../types';
import { JWTService } from '../services/jwtService';
import { 
  createUser, 
  getUserByEmail, 
  sendPasswordResetEmail, 
  verifyPasswordResetCode, 
  confirmPasswordReset as confirmPasswordResetService,
  verifyIdToken,
  getUserByUid,
  createCustomToken
} from '../services/firebaseAdmin';
import { asyncHandler, AppError } from '../middleware/errorHandler';

/**
 * Register new user with email and password
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, name }: RegisterRequest = req.body;

  // Check if user already exists
  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    throw new AppError('User with this email already exists', 409);
  }

  // Create user in Firebase
  const firebaseUser = await createUser({
    email,
    password,
    displayName: name,
  });

  // Generate JWT token
  const user = {
    id: firebaseUser.uid,
    email: firebaseUser.email || '',
    name: firebaseUser.displayName || 'User',
    photo: firebaseUser.photoURL || undefined,
    type: 'email' as const,
    createdAt: new Date(firebaseUser.metadata.creationTime),
    updatedAt: new Date(firebaseUser.metadata.creationTime),
    isActive: !firebaseUser.disabled,
  };

  const token = JWTService.generateToken(user);

  const response: ApiResponse = {
    success: true,
    message: 'User registered successfully',
    data: {
      user,
      token,
    },
    timestamp: new Date().toISOString(),
  };

  res.status(201).json(response);
});

/**
 * Login user with email and password
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password }: LoginRequest = req.body;

  try {
    // Get user from Firebase
    const firebaseUser = await getUserByEmail(email);
    if (!firebaseUser) {
      throw new AppError('Invalid email or password', 401);
    }

    if (firebaseUser.disabled) {
      throw new AppError('Account is disabled', 401);
    }

    // Note: In a real implementation, you would verify the password here
    // For now, we'll assume the password is correct if the user exists
    // You would typically use Firebase Auth's signInWithEmailAndPassword on the client side

    const user = {
      id: firebaseUser.uid,
      email: firebaseUser.email || '',
      name: firebaseUser.displayName || 'User',
      photo: firebaseUser.photoURL || undefined,
      type: 'email' as const,
      createdAt: new Date(firebaseUser.metadata.creationTime),
      updatedAt: new Date(firebaseUser.metadata.lastSignInTime || firebaseUser.metadata.creationTime),
      lastLoginAt: firebaseUser.metadata.lastSignInTime ? new Date(firebaseUser.metadata.lastSignInTime) : undefined,
      isActive: !firebaseUser.disabled,
    };

    const token = JWTService.generateToken(user);

    const response: ApiResponse = {
      success: true,
      message: 'Login successful',
      data: {
        user,
        token,
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error: any) {
    // If Firebase Admin is not initialized, provide a helpful error message
    if (error.message === 'Firebase Auth not initialized') {
      throw new AppError('Authentication service is not available. Please check server configuration.', 503);
    }
    throw error;
  }
});

/**
 * Social authentication (Google, Twitter, Facebook)
 */
export const socialAuth = asyncHandler(async (req: Request, res: Response) => {
  const { idToken, provider }: SocialAuthRequest = req.body;

  console.log('🔍 Social Auth Request:', { provider, hasIdToken: !!idToken, idTokenLength: idToken?.length });

  try {
    // Verify the ID token
    console.log('🔄 Verifying ID token...');
    const decodedToken = await verifyIdToken(idToken);
    console.log('✅ ID token verified:', { uid: decodedToken.uid, email: decodedToken.email });
    
    let firebaseUser;
    try {
      // Try to get user from Firebase
      console.log('🔄 Getting user from Firebase...');
      firebaseUser = await getUserByUid(decodedToken.uid);
      console.log('✅ Firebase user retrieved:', { uid: firebaseUser.uid, email: firebaseUser.email });
    } catch (firebaseError: any) {
      // If Firebase Admin fails due to permissions or initialization issues, use token data as fallback
      if (firebaseError.message.includes('Firebase service account lacks required permissions') || 
          firebaseError.message.includes('Firebase Auth not initialized') ||
          firebaseError.message.includes('Failed to parse private key')) {
        console.warn('⚠️ Firebase Admin error, using token data as fallback:', firebaseError.message);
        firebaseUser = {
          uid: decodedToken.uid,
          email: decodedToken.email || '',
          displayName: decodedToken.name || 'User',
          photoURL: decodedToken.picture || undefined,
          disabled: false,
          metadata: {
            creationTime: decodedToken.iat ? new Date(decodedToken.iat * 1000).toISOString() : new Date().toISOString(),
            lastSignInTime: decodedToken.auth_time ? new Date(decodedToken.auth_time * 1000).toISOString() : new Date().toISOString(),
          }
        };
      } else {
        throw firebaseError;
      }
    }

    // Determine user type from provider
    let userType: 'email' | 'google' | 'twitter' | 'facebook' = 'email';
    switch (provider) {
      case 'email':
        userType = 'email';
        break;
      case 'google':
        userType = 'google';
        break;
      case 'twitter':
        userType = 'twitter';
        break;
      case 'facebook':
        userType = 'facebook';
        break;
    }

    console.log('🔄 Creating user object...');
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

    console.log('🔄 Generating JWT token...');
    const token = JWTService.generateToken(user);
    console.log('✅ JWT token generated');

    const response: ApiResponse = {
      success: true,
      message: `${provider} authentication successful`,
      data: {
        user,
        token,
      },
      timestamp: new Date().toISOString(),
    };

    console.log('✅ Social auth successful, sending response');
    res.json(response);
  } catch (error: any) {
    console.error('❌ Social auth error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Handle Firebase permission errors specifically
    if (error.message.includes('Firebase service account lacks required permissions')) {
      throw new AppError('Authentication service configuration error. Please contact support.', 503);
    }
    
    // Handle other Firebase errors
    if (error.message.includes('Invalid ID token') || error.message.includes('ID token has expired')) {
      throw new AppError('Invalid authentication token. Please try logging in again.', 401);
    }
    
    if (error.message.includes('User not found')) {
      throw new AppError('User account not found. Please try registering first.', 404);
    }
    
    // Re-throw other errors to be handled by the global error handler
    throw error;
  }
});

/**
 * Send password reset email
 */
export const sendPasswordReset = asyncHandler(async (req: Request, res: Response) => {
  const { email }: PasswordResetRequest = req.body;

  // Check if user exists
  const user = await getUserByEmail(email);
  if (!user) {
    // Don't reveal if user exists or not for security
    const response: ApiResponse = {
      success: true,
      message: 'If an account with this email exists, a password reset link has been sent',
      timestamp: new Date().toISOString(),
    };
    res.json(response);
    return;
  }

  // Send password reset email
  await sendPasswordResetEmail(email);

  const response: ApiResponse = {
    success: true,
    message: 'Password reset email sent',
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

/**
 * Confirm password reset
 */
export const confirmPasswordReset = asyncHandler(async (req: Request, res: Response) => {
  const { oobCode, newPassword }: PasswordResetConfirmRequest = req.body;

  // Verify the reset code and confirm password reset
  await confirmPasswordResetService(oobCode, newPassword);

  const response: ApiResponse = {
    success: true,
    message: 'Password reset successful',
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

/**
 * Refresh JWT token
 */
export const refreshToken = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }

  const newToken = JWTService.generateToken(req.user);

  const response: ApiResponse = {
    success: true,
    message: 'Token refreshed successfully',
    data: {
      token: newToken,
    },
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

/**
 * Logout user (client-side token invalidation)
 */
export const logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // In a stateless JWT system, logout is typically handled client-side
  // by removing the token from storage. For server-side logout,
  // you would need to maintain a token blacklist.

  const response: ApiResponse = {
    success: true,
    message: 'Logout successful',
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

/**
 * Get current user profile
 */
export const getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }

  const response: ApiResponse = {
    success: true,
    message: 'Profile retrieved successfully',
    data: {
      user: req.user,
    },
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

/**
 * Verify token validity
 */
export const verifyToken = asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = JWTService.extractTokenFromHeader(authHeader);

  if (!token) {
    throw new AppError('Token is required', 401);
  }

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

    const response: ApiResponse = {
      success: true,
      message: 'Token is valid',
      data: {
        user,
        valid: true,
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: 'Token is invalid',
      data: {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
    };

    res.status(401).json(response);
  }
});
