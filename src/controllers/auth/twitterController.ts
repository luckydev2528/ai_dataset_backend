import { Request, Response } from 'express';
import { TwitterOAuthService } from '../../services/auth/twitterOAuthService';
import { FirebaseWrapper } from '../../services/firebase/firebaseWrapper';
import { 
  getDeviceId, 
  generateUserTokens, 
  createUserSession,
  storeOrUpdateUser,
  handleMultiProviderAuth
} from '../../utils/authUtils';
import { UserStateValidator } from '../../utils/userStateValidator';
import { createJWTUserData } from '../../utils/userUtils';
import { Logger } from '../../utils/logger';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createAuthSuccessResponse,
  createValidationErrorResponse,
  createNotFoundErrorResponse
} from '../../utils/responseUtils';

const twitterOAuth = new TwitterOAuthService();

/**
 * Shared Twitter authentication logic
 */
const processTwitterAuthentication = async (
  result: any,
  req: Request
): Promise<{ user: any; token: string; refreshToken: string; firebaseToken: string }> => {
  Logger.info('Twitter OAuth result retrieved', { userId: result.userId, screenName: result.screenName });

  // Handle multi-provider authentication
  const userEmail = result.email || `twitter_${result.userId}@app.local`;
  
  const { firebaseUid, isNewUser } = await handleMultiProviderAuth(
    userEmail,
    'twitter',
    {
      providerId: result.userId,
      displayName: result.screenName
    }
  );

  // Create Firebase custom token for client-side authentication
  const firebaseToken = await FirebaseWrapper.createCustomToken(firebaseUid, {
    provider: 'twitter',
    screen_name: result.screenName,
    twitter_id: result.userId,
    email: userEmail
  });

  Logger.firebaseSuccess('Firebase custom token created');

  // Create user object for database
  const userData = {
    uid: firebaseUid,
    email: userEmail,
    name: result.screenName,
    type: 'user' as const,
    isActive: true,
    socialProviders: [{
      provider: 'twitter' as const,
      providerId: result.userId,
      email: userEmail,
      displayName: result.screenName,
      connectedAt: new Date()
    }]
  };

  // Create user object for JWT tokens
  const jwtUserData = createJWTUserData(
    firebaseUid,
    userEmail,
    result.screenName,
    'twitter'
  );

  // Store/update user in database with batched operations
  await storeOrUpdateUser(firebaseUid, userData, jwtUserData, isNewUser);

  // Validate user state consistency before proceeding
  const validationResult = await UserStateValidator.validateAuthFlowConsistency(
    firebaseUid,
    'twitter',
    userEmail
  );

  if (!validationResult.isConsistent) {
    Logger.warning('Twitter auth user state validation issues detected', {
      firebaseUid,
      issues: validationResult.issues,
      recommendations: validationResult.recommendations
    });

    // Auto-fix common issues
    const autoFixResult = await UserStateValidator.autoFixUserState(firebaseUid);
    if (autoFixResult.fixed) {
      Logger.info('Twitter auth user state auto-fixed', {
        firebaseUid,
        fixesApplied: autoFixResult.fixesApplied
      });
    } else {
      Logger.warning('Failed to auto-fix Twitter auth user state', {
        firebaseUid,
        errors: autoFixResult.errors
      });
    }
  }

  // Generate app JWT tokens
  const deviceId = getDeviceId(req);
  const { token, refreshToken } = await generateUserTokens(jwtUserData, deviceId);
  
  Logger.authSuccess('JWT tokens generated');

  // Create session only once to prevent multiple session creation
  try {
    const newSessionId = await createUserSession(userData.uid, deviceId, req);
    Logger.info('Session created', { sessionId: newSessionId });
  } catch (sessionError: any) {
    Logger.warning('Failed to create session', { error: sessionError.message });
    // Continue without session - not critical for auth flow
  }

  return {
    user: jwtUserData,
    token,
    refreshToken,
    firebaseToken
  };
};

/**
 * @route   POST /api/auth/twitter/initiate
 * @desc    Initiate Twitter OAuth flow
 * @access  Public
 */
export const initiateTwitterAuth = async (req: Request, res: Response) => {
  Logger.info('Initiating Twitter OAuth...');
  
  try {
    const deviceId = getDeviceId(req);
    const { authUrl, sessionId } = await twitterOAuth.initiateOAuth(deviceId);
    
    const { response, statusCode } = createSuccessResponse(
      'Twitter OAuth initiated successfully',
      { authUrl, sessionId }
    );

    Logger.authSuccess('Twitter OAuth initiation successful');
    res.status(statusCode).json(response);
    
  } catch (error: any) {
    Logger.authError('Twitter OAuth initiation failed', { error: error.message });
    
    const { response, statusCode } = createErrorResponse(
      'Failed to initiate Twitter OAuth',
      error.message
    );
    
    res.status(statusCode).json(response);
  }
};

/**
 * @route   GET /api/auth/twitter/callback
 * @desc    Handle Twitter OAuth callback
 * @access  Public
 */
export const handleTwitterCallback = async (req: Request, res: Response) => {
  Logger.info('Handling Twitter OAuth callback...', req.query);
  
  try {
    const { oauth_token, oauth_verifier, denied } = req.query;
    
    // Handle user denial
    if (denied) {
      Logger.authError('User denied Twitter authorization');
      const errorLink = `datarefining://twitter-callback?status=error&message=${encodeURIComponent('User denied authorization')}`;
      return res.redirect(errorLink);
    }
    
    if (!oauth_token || !oauth_verifier) {
      Logger.authError('Missing OAuth parameters');
      const errorLink = `datarefining://twitter-callback?status=error&message=${encodeURIComponent('Missing OAuth parameters')}`;
      return res.redirect(errorLink);
    }

    const { result, sessionId } = await twitterOAuth.handleCallback(
      oauth_token as string,
      oauth_verifier as string
    );

    Logger.authSuccess('Twitter OAuth callback handled successfully');
    
    // Redirect to app with session ID
    const deepLink = `datarefining://twitter-callback?session_id=${sessionId}&status=success`;
    res.redirect(deepLink);
    
  } catch (error: any) {
    Logger.authError('Twitter OAuth callback error', { error: error.message });
    const errorLink = `datarefining://twitter-callback?status=error&message=${encodeURIComponent(error.message)}`;
    res.redirect(errorLink);
  }
};

/**
 * @route   POST /api/auth/twitter/process
 * @desc    Process Twitter OAuth tokens and complete authentication
 * @access  Public
 */
export const processTwitterAuth = async (req: Request, res: Response): Promise<void> => {
  Logger.info('Processing Twitter OAuth tokens...');
  
  try {
    const { oauth_token, oauth_verifier } = req.body;
    
    if (!oauth_token || !oauth_verifier) {
      const { response, statusCode } = createValidationErrorResponse(
        'OAuth token and verifier are required'
      );
      res.status(statusCode).json(response);
      return;
    }

    const { result } = await twitterOAuth.handleCallback(
      oauth_token,
      oauth_verifier
    );

    const { user, token, refreshToken, firebaseToken } = await processTwitterAuthentication(result, req);

    const { response, statusCode } = createAuthSuccessResponse(
      'Twitter authentication successful',
      user,
      token,
      refreshToken,
      firebaseToken
    );

    Logger.authSuccess('Twitter authentication completed successfully');
    res.status(statusCode).json(response);
    
  } catch (error: any) {
    Logger.authError('Twitter OAuth processing error', { error: error.message });
    
    const { response, statusCode } = createErrorResponse(
      'Failed to process Twitter authentication',
      error.message
    );
    
    res.status(statusCode).json(response);
  }
};

/**
 * @route   GET /api/auth/twitter/result/:sessionId
 * @desc    Get Twitter OAuth result and complete authentication
 * @access  Public
 */
export const getTwitterResult = async (req: Request, res: Response): Promise<void> => {
  Logger.info('Getting Twitter OAuth result...');
  
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      const { response, statusCode } = createValidationErrorResponse(
        'Session ID is required'
      );
      res.status(statusCode).json(response);
      return;
    }

    const result = await twitterOAuth.getResult(sessionId);
    
    if (!result) {
      const { response, statusCode } = createNotFoundErrorResponse(
        'Session not found or expired'
      );
      res.status(statusCode).json(response);
      return;
    }

    const { user, token, refreshToken, firebaseToken } = await processTwitterAuthentication(result, req);

    const { response, statusCode } = createAuthSuccessResponse(
      'Twitter authentication successful',
      user,
      token,
      refreshToken,
      firebaseToken
    );

    Logger.authSuccess('Twitter authentication completed successfully');
    res.status(statusCode).json(response);
    
  } catch (error: any) {
    Logger.authError('Twitter OAuth result error', { error: error.message });
    
    const { response, statusCode } = createErrorResponse(
      'Failed to retrieve Twitter auth result',
      error.message
    );
    
    res.status(statusCode).json(response);
  }
};
