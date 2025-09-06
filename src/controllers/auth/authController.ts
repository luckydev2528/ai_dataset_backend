import { Request, Response } from 'express';
import { AuthenticatedRequest, ApiResponse, LoginRequest, RegisterRequest, SocialAuthRequest, PasswordResetRequest, PasswordResetConfirmRequest } from '../../types';
import { JWTService } from '../../services/auth/jwtService';
import { 
  createUser, 
  getUserByEmail, 
  sendPasswordResetEmail, 
  verifyPasswordResetCode, 
  confirmPasswordReset as confirmPasswordResetService,
  verifyIdToken,
  getUserByUid,
  createCustomToken
} from '../../services/auth/firebaseAdmin';
import { asyncHandler, AppError } from '../../middleware/error/errorHandler';
import SessionService from '../../services/session/SessionService';
import { UserModel } from '../../services/database/models/userModel';

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

  // Create user in database
  try {
    const userData = {
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName || 'User',
      type: 'user' as const,
      isActive: !firebaseUser.disabled
    };
    await UserModel.create(userData);
    console.log('✅ User created in database');
  } catch (dbError: any) {
    console.warn('⚠️ Failed to store user in database:', dbError.message);
    // Continue without database storage - not critical for auth flow
  }

  // Generate JWT tokens
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

  const deviceId = req.headers['x-device-id'] as string;
  const token = JWTService.generateToken(user, deviceId);
  const refreshToken = await JWTService.generateRefreshToken(user, deviceId);
  
  // Create session
  const sessionId = await SessionService.createSession(
    user.id,
    deviceId,
    req.ip || 'unknown',
    req.get('User-Agent') || 'unknown'
  );

  const response: ApiResponse = {
    success: true,
    message: 'User registered successfully',
    data: {
      user,
      token,
      refreshToken,
    },
    timestamp: new Date().toISOString(),
  };

  res.status(201).json(response);
});

/**
 * Login user with email and password (DEPRECATED - Use socialAuth instead)
 * This endpoint is deprecated in favor of client-side Firebase Auth + ID token verification
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  // Return deprecation notice
  const response: ApiResponse = {
    success: false,
    message: 'This endpoint is deprecated. Use client-side Firebase Auth and send ID token to /api/auth/social endpoint instead.',
    error: 'DEPRECATED_ENDPOINT',
    timestamp: new Date().toISOString(),
  };
  
  res.status(410).json(response); // 410 Gone - Resource no longer available
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

    // Store/update user in database
    try {
      const existingUser = await UserModel.getByUid(firebaseUser.uid);
      if (existingUser) {
        // Update existing user
        await UserModel.update(existingUser.id, { 
          lastLoginAt: new Date(),
          updatedAt: new Date()
        });
        console.log('✅ User updated in database');
        
        // Add social provider if it doesn't exist
        try {
          await UserModel.addSocialProvider(firebaseUser.uid, {
            provider: provider as 'google' | 'facebook' | 'twitter' | 'apple',
            providerId: firebaseUser.uid,
            ...(firebaseUser.email && { email: firebaseUser.email }),
            ...(firebaseUser.displayName && { displayName: firebaseUser.displayName }),
            ...(firebaseUser.photoURL && { photoURL: firebaseUser.photoURL })
          });
          console.log('✅ Social provider added/updated for existing user');
        } catch (providerError: any) {
          console.warn('⚠️ Failed to add social provider:', providerError.message);
        }
        
        // Update user data for JWT with existing user info
        user.id = existingUser.id;
        user.email = existingUser.email;
        user.name = existingUser.displayName || firebaseUser.displayName || 'User';
      } else {
        // Create new user in database
        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || 'User',
          ...(firebaseUser.photoURL && { photoURL: firebaseUser.photoURL }),
          type: 'user' as const,
          isActive: !firebaseUser.disabled
        };
        await UserModel.create(userData);
        console.log('✅ User created in database');
        
        // Add social provider
        await UserModel.addSocialProvider(firebaseUser.uid, {
          provider: provider as 'google' | 'facebook' | 'twitter' | 'apple',
          providerId: firebaseUser.uid,
          ...(firebaseUser.email && { email: firebaseUser.email }),
          ...(firebaseUser.displayName && { displayName: firebaseUser.displayName }),
          ...(firebaseUser.photoURL && { photoURL: firebaseUser.photoURL })
        });
        console.log('✅ Social provider added to user');
      }
    } catch (dbError: any) {
      console.warn('⚠️ Failed to store user in database:', dbError.message);
      // Continue without database storage - not critical for auth flow
    }

    console.log('🔄 Generating JWT token...');
    const deviceId = req.headers['x-device-id'] as string;
    const token = JWTService.generateToken(user, deviceId);
    const refreshToken = await JWTService.generateRefreshToken(user, deviceId);
    
    // Create or update session
    const sessionId = await SessionService.createSession(
      user.id,
      deviceId,
      req.ip || 'unknown',
      req.get('User-Agent') || 'unknown'
    );
    
    console.log('✅ JWT tokens generated and session created');

    const response: ApiResponse = {
      success: true,
      message: `${provider} authentication successful`,
      data: {
        user,
        token,
        refreshToken,
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
    const payload = await JWTService.verifyToken(token);
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

/**
 * Refresh access token using refresh token
 */
export const refreshAccessToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken: clientRefreshToken } = req.body;

  if (!clientRefreshToken) {
    throw new AppError('Refresh token is required', 401);
  }

  try {
    const tokens = await JWTService.refreshAccessToken(clientRefreshToken);

    const response: ApiResponse = {
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    throw new AppError('Invalid or expired refresh token', 401);
  }
});

/**
 * Logout user and revoke tokens
 */
export const logoutUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = JWTService.extractTokenFromHeader(authHeader);
  const { refreshToken: clientRefreshToken, logoutAllDevices } = req.body;

  if (token) {
    // Revoke current access token
    await JWTService.revokeToken(token);
  }

  if (req.user) {
    if (logoutAllDevices) {
      // Revoke all tokens for user
      await JWTService.revokeAllUserTokens(req.user.id);
    } else if (clientRefreshToken) {
      // Try to extract device ID from refresh token and revoke only that device
      try {
        const decoded = JWTService.decodeToken(clientRefreshToken);
        if (decoded?.deviceId) {
          await JWTService.revokeDeviceTokens(req.user.id, decoded.deviceId);
        }
      } catch (error) {
        // If we can't decode, just continue with logout
      }
    }
  }

  const response: ApiResponse = {
    success: true,
    message: 'Logged out successfully',
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

/**
 * Get user sessions
 */
export const getUserSessions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const sessions = await SessionService.getUserSessions(req.user.id);
  
  // Remove sensitive information
  const sanitizedSessions = sessions.map(session => ({
    sessionId: session.sessionId,
    deviceInfo: session.deviceInfo,
    ipAddress: session.ipAddress.replace(/\.\d+$/, '.***'), // Mask last octet
    createdAt: session.createdAt,
    lastActiveAt: session.lastActiveAt,
    isActive: session.isActive,
    isCurrent: session.deviceId === req.headers['x-device-id'],
  }));

  const response: ApiResponse = {
    success: true,
    message: 'Sessions retrieved successfully',
    data: {
      sessions: sanitizedSessions,
    },
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

/**
 * Revoke a specific session
 */
export const revokeSession = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { sessionId } = req.params;
  
  if (!sessionId) {
    throw new AppError('Session ID is required', 400);
  }
  const success = await SessionService.revokeSession(sessionId);

  if (!success) {
    throw new AppError('Session not found', 404);
  }

  const response: ApiResponse = {
    success: true,
    message: 'Session revoked successfully',
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

/**
 * Revoke all other sessions (keep current session active)
 */
export const revokeOtherSessions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const currentDeviceId = req.headers['x-device-id'] as string;
  const currentSessions = await SessionService.getUserSessions(req.user.id);
  const currentSession = currentSessions.find(s => s.deviceId === currentDeviceId);
  
  if (!currentSession) {
    throw new AppError('Current session not found', 400);
  }

  const revokedCount = await SessionService.revokeOtherSessions(req.user.id, currentSession.sessionId);

  const response: ApiResponse = {
    success: true,
    message: `${revokedCount} other sessions revoked successfully`,
    data: {
      revokedCount,
    },
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});
