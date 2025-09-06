import { Request, Response } from 'express';
import { AuthenticatedRequest, ApiResponse, LoginRequest, RegisterRequest, SocialAuthRequest, PasswordResetRequest, PasswordResetConfirmRequest } from '../../types';
import { JWTService } from '../../services/auth/jwtService';
import { FirebaseWrapper } from '../../services/firebase/firebaseWrapper';
import { 
  sendPasswordResetEmail, 
  verifyPasswordResetCode, 
  confirmPasswordReset as confirmPasswordResetService
} from '../../services/auth/firebaseAdmin';
import { asyncHandler, AppError } from '../../middleware/error/errorHandler';
import { requireAuth } from '../../middleware/auth/authHelpers';
import { UserModel } from '../../services/database/models/userModel';
import { 
  getDeviceId, 
  generateUserTokens, 
  createUserSession,
  storeOrUpdateUser,
  determineUserType,
  createFirebaseUserFallback,
  addSocialProviderToUser,
  resolveFirebaseUserWithFallback
} from '../../utils/authUtils';
import { createStandardUserObject, createUserDataForDatabase, createJWTUserData } from '../../utils/userUtils';
import { DatabaseErrorHandler } from '../../utils/errorHandlers';
import { Logger } from '../../utils/logger';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createAuthSuccessResponse,
  createValidationErrorResponse,
  createUnauthorizedErrorResponse,
  createConflictErrorResponse
} from '../../utils/responseUtils';
import SessionService from '../../services/session/SessionService';

/**
 * Register new user with email and password
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, name }: RegisterRequest = req.body;

  // Check if user already exists
  const existingUser = await FirebaseWrapper.getUserByEmail(email);
  if (existingUser) {
    throw new AppError('User with this email already exists', 409);
  }

  // Create user in Firebase
  const firebaseUser = await FirebaseWrapper.createUser({
    email,
    password,
    displayName: name,
  });

  // Create user in database
  const userData = createUserDataForDatabase(firebaseUser, 'user');
  await DatabaseErrorHandler.handleUserOperation(
    () => UserModel.create(userData),
    'creation',
    true // Continue on error
  );

  // Generate JWT tokens and create session
  const user = createStandardUserObject(firebaseUser, 'email', firebaseUser.uid);
  const deviceId = getDeviceId(req);
  const { token, refreshToken } = await generateUserTokens(user, deviceId);
  const sessionId = await createUserSession(firebaseUser.uid, deviceId, req);

  const { response, statusCode } = createAuthSuccessResponse(
    'User registered successfully',
    user,
    token,
    refreshToken
  );

  res.status(statusCode).json(response);
});

/**
 * Login user with email and password (DEPRECATED - Use socialAuth instead)
 * This endpoint is deprecated in favor of client-side Firebase Auth + ID token verification
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  // Return deprecation notice
  const { response, statusCode } = createErrorResponse(
    'This endpoint is deprecated. Use client-side Firebase Auth and send ID token to /api/auth/social endpoint instead.',
    'DEPRECATED_ENDPOINT',
    410
  );
  
  res.status(statusCode).json(response);
});

/**
 * Social authentication (Google, Twitter, Facebook)
 */
export const socialAuth = asyncHandler(async (req: Request, res: Response) => {
  const { idToken, provider }: SocialAuthRequest = req.body;

  Logger.info('Social Auth Request', { provider, hasIdToken: !!idToken, idTokenLength: idToken?.length });

  try {
    // Verify the ID token
    const decodedToken = await FirebaseWrapper.verifyIdToken(idToken);
    
    let firebaseUser;
    try {
      // Try to get user from Firebase
      firebaseUser = await FirebaseWrapper.getUserByUid(decodedToken.uid);
    } catch (firebaseError: any) {
      // If Firebase Admin fails due to permissions or initialization issues, use token data as fallback
      if (firebaseError.message.includes('Firebase service account lacks required permissions') || 
          firebaseError.message.includes('Firebase Auth not initialized') ||
          firebaseError.message.includes('Failed to parse private key')) {
        Logger.firebaseWarning('Firebase Admin error, using token data as fallback', { error: firebaseError.message });
        firebaseUser = createFirebaseUserFallback(decodedToken);
      } else {
        throw firebaseError;
      }
    }

    // Determine user type from provider
    const userType = determineUserType(provider);

    // Store/update user in database
    const existingUser = await DatabaseErrorHandler.handleUserOperation(
      () => UserModel.getByUid(firebaseUser.uid),
      'retrieval',
      true
    );

    let databaseUserId: string;
    let user: any;

    if (existingUser) {
      // Update existing user
      await DatabaseErrorHandler.handleUserOperation(
        () => UserModel.update(existingUser.id, { 
          lastLoginAt: new Date(),
          updatedAt: new Date()
        }),
        'update',
        true
      );
      
      // Add social provider if it doesn't exist
      await DatabaseErrorHandler.handleUserOperation(
        () => addSocialProviderToUser(firebaseUser.uid, provider, firebaseUser),
        'social provider addition',
        true
      );
      
    // Use Firebase UID for JWT token consistency (not database ID)
    user = createStandardUserObject(firebaseUser, userType, firebaseUser.uid);
    
    // Update user data with existing user info
    user.email = existingUser.email;
    user.name = existingUser.displayName || firebaseUser.displayName || 'User';
    
    Logger.info('AUTH: Using Firebase UID for JWT token', { 
      firebaseUid: firebaseUser.uid, 
      databaseId: existingUser.id,
      userType 
    });
    } else {
      // Create new user in database
      const userData = createUserDataForDatabase(firebaseUser, 'user');
      const newUser = await DatabaseErrorHandler.handleUserOperation(
        () => UserModel.create(userData),
        'creation',
        true
      );
      
      // Add social provider
      await DatabaseErrorHandler.handleUserOperation(
        () => addSocialProviderToUser(firebaseUser.uid, provider, firebaseUser),
        'social provider addition',
        true
      );
      
      // Use Firebase UID for JWT token consistency (not database ID)
      user = createStandardUserObject(firebaseUser, userType, firebaseUser.uid);
      
      Logger.info('AUTH: Using Firebase UID for JWT token (new user)', { 
        firebaseUid: firebaseUser.uid, 
        databaseId: newUser?.id,
        userType 
      });
    }

    const deviceId = getDeviceId(req);
    const { token, refreshToken } = await generateUserTokens(user, deviceId);
    
    // Use Firebase UID for session management to match JWT tokens
    const sessionId = await createUserSession(firebaseUser.uid, deviceId, req);

    const { response, statusCode } = createAuthSuccessResponse(
      `${provider} authentication successful`,
      user,
      token,
      refreshToken
    );

    Logger.authSuccess('Social auth successful, sending response');
    res.status(statusCode).json(response);
  } catch (error: any) {
    Logger.authError('Social auth error', {
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
  const user = await FirebaseWrapper.getUserByEmail(email);
  if (!user) {
    // Don't reveal if user exists or not for security
    const { response, statusCode } = createSuccessResponse(
      'If an account with this email exists, a password reset link has been sent'
    );
    res.status(statusCode).json(response);
    return;
  }

  // Send password reset email
  await sendPasswordResetEmail(email);

  const { response, statusCode } = createSuccessResponse('Password reset email sent');
  res.status(statusCode).json(response);
});

/**
 * Confirm password reset
 */
export const confirmPasswordReset = asyncHandler(async (req: Request, res: Response) => {
  const { oobCode, newPassword }: PasswordResetConfirmRequest = req.body;

  // Verify the reset code and confirm password reset
  await confirmPasswordResetService(oobCode, newPassword);

  const { response, statusCode } = createSuccessResponse('Password reset successful');
  res.status(statusCode).json(response);
});

/**
 * Refresh JWT token
 */
export const refreshToken = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  requireAuth(req, res, () => {});

  const newToken = JWTService.generateToken(req.user!);

  const { response, statusCode } = createSuccessResponse(
    'Token refreshed successfully',
    { token: newToken }
  );
  res.status(statusCode).json(response);
});

/**
 * Logout user (client-side token invalidation)
 */
export const logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // In a stateless JWT system, logout is typically handled client-side
  // by removing the token from storage. For server-side logout,
  // you would need to maintain a token blacklist.

  const { response, statusCode } = createSuccessResponse('Logout successful');
  res.status(statusCode).json(response);
});

/**
 * Get current user profile
 */
export const getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  requireAuth(req, res, () => {});

  const { response, statusCode } = createSuccessResponse(
    'Profile retrieved successfully',
    { user: req.user }
  );
  res.status(statusCode).json(response);
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
    
    // Use centralized helper to resolve Firebase user with database fallback
    const { firebaseUser, databaseUserId } = await resolveFirebaseUserWithFallback(
      payload.uid, 
      'token verification'
    );

    const user = createStandardUserObject(firebaseUser, payload.type, firebaseUser.uid);

    const { response, statusCode } = createSuccessResponse(
      'Token is valid',
      { user, valid: true }
    );
    res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = createUnauthorizedErrorResponse(
      'Token is invalid',
      error instanceof Error ? error.message : 'Unknown error'
    );
    res.status(statusCode).json(response);
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

    const { response, statusCode } = createSuccessResponse(
      'Token refreshed successfully',
      {
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      }
    );
    res.status(statusCode).json(response);
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

  const { response, statusCode } = createSuccessResponse('Logged out successfully');
  res.status(statusCode).json(response);
});

/**
 * Get user sessions
 */
export const getUserSessions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  requireAuth(req, res, () => {});

  const sessions = await SessionService.getUserSessions(req.user!.id);
  
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

  const { response, statusCode } = createSuccessResponse(
    'Sessions retrieved successfully',
    { sessions: sanitizedSessions }
  );
  res.status(statusCode).json(response);
});

/**
 * Revoke a specific session
 */
export const revokeSession = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  requireAuth(req, res, () => {});

  const { sessionId } = req.params;
  
  if (!sessionId) {
    throw new AppError('Session ID is required', 400);
  }
  const success = await SessionService.revokeSession(sessionId);

  if (!success) {
    throw new AppError('Session not found', 404);
  }

  const { response, statusCode } = createSuccessResponse('Session revoked successfully');
  res.status(statusCode).json(response);
});

/**
 * Revoke all other sessions (keep current session active)
 */
export const revokeOtherSessions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  requireAuth(req, res, () => {});

  const currentDeviceId = req.headers['x-device-id'] as string;
  const currentSessions = await SessionService.getUserSessions(req.user!.id);
  const currentSession = currentSessions.find(s => s.deviceId === currentDeviceId);
  
  if (!currentSession) {
    throw new AppError('Current session not found', 400);
  }

  const revokedCount = await SessionService.revokeOtherSessions(req.user!.id, currentSession.sessionId);

  const { response, statusCode } = createSuccessResponse(
    `${revokedCount} other sessions revoked successfully`,
    { revokedCount }
  );
  res.status(statusCode).json(response);
});
