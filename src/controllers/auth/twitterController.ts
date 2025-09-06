import { Request, Response } from 'express';
import { TwitterOAuthService } from '../../services/auth/twitterOAuthService';
import { verifyIdToken, createCustomToken, createUser, getUserByUid, getUserByEmail } from '../../services/auth/firebaseAdmin';
import { JWTService } from '../../services/auth/jwtService';
import { SessionService } from '../../services/session/SessionService';
import { ApiResponse } from '../../types';
import { UserModel } from '../../services/database/models/userModel';

const twitterOAuth = new TwitterOAuthService();

/**
 * @route   POST /api/auth/twitter/initiate
 * @desc    Initiate Twitter OAuth flow
 * @access  Public
 */
export const initiateTwitterAuth = async (req: Request, res: Response) => {
  console.log('🚀 Initiating Twitter OAuth...');
  
  try {
    const deviceId = req.headers['x-device-id'] as string;
    const { authUrl, sessionId } = await twitterOAuth.initiateOAuth(deviceId);
    
    const response: ApiResponse = {
      success: true,
      message: 'Twitter OAuth initiated successfully',
      data: { authUrl, sessionId },
      timestamp: new Date().toISOString()
    };

    console.log('✅ Twitter OAuth initiation successful');
    res.json(response);
    
  } catch (error: any) {
    console.error('❌ Twitter OAuth initiation failed:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Failed to initiate Twitter OAuth',
      error: error.message,
      timestamp: new Date().toISOString()
    };
    
    res.status(500).json(response);
  }
};

/**
 * @route   GET /api/auth/twitter/callback
 * @desc    Handle Twitter OAuth callback
 * @access  Public
 */
export const handleTwitterCallback = async (req: Request, res: Response) => {
  console.log('🔄 Handling Twitter OAuth callback...', req.query);
  
  try {
    const { oauth_token, oauth_verifier, denied } = req.query;
    
    // Handle user denial
    if (denied) {
      console.log('❌ User denied Twitter authorization');
      const errorLink = `datarefining://twitter-callback?status=error&message=${encodeURIComponent('User denied authorization')}`;
      return res.redirect(errorLink);
    }
    
    if (!oauth_token || !oauth_verifier) {
      console.error('❌ Missing OAuth parameters');
      const errorLink = `datarefining://twitter-callback?status=error&message=${encodeURIComponent('Missing OAuth parameters')}`;
      return res.redirect(errorLink);
    }

    const { result, sessionId } = await twitterOAuth.handleCallback(
      oauth_token as string,
      oauth_verifier as string
    );

    console.log('✅ Twitter OAuth callback handled successfully');
    
    // Redirect to app with session ID
    const deepLink = `datarefining://twitter-callback?session_id=${sessionId}&status=success`;
    res.redirect(deepLink);
    
  } catch (error: any) {
    console.error('❌ Twitter OAuth callback error:', error);
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
  console.log('🔄 Processing Twitter OAuth tokens...');
  
  try {
    const { oauth_token, oauth_verifier } = req.body;
    
    if (!oauth_token || !oauth_verifier) {
      const response: ApiResponse = {
        success: false,
        message: 'OAuth token and verifier are required',
        timestamp: new Date().toISOString()
      };
      res.status(400).json(response);
      return;
    }

    const { result } = await twitterOAuth.handleCallback(
      oauth_token,
      oauth_verifier
    );

    console.log('📝 Twitter OAuth result retrieved:', { userId: result.userId, screenName: result.screenName });

    // Handle multi-provider authentication
    const userEmail = result.email || `twitter_${result.userId}@app.local`;
    let firebaseUid: string;
    let isNewUser = false;
    
    try {
      // First, check if a user with this email already exists
      const existingUserByEmail = await getUserByEmail(userEmail);
      
      if (existingUserByEmail) {
        // User exists with this email, use their UID
        firebaseUid = existingUserByEmail.uid;
        console.log('✅ Found existing user with email:', userEmail);
        
        // Add Twitter as a linked provider to the existing user
        try {
          const existingDbUser = await UserModel.getByUid(firebaseUid);
          if (existingDbUser) {
            await UserModel.addSocialProvider(firebaseUid, {
              provider: 'twitter',
              providerId: result.userId,
              email: userEmail,
              displayName: result.screenName
            });
            console.log('✅ Twitter provider linked to existing user');
          } else {
            // User exists in Firebase Auth but not in database - create database record
            console.log('🔄 Creating database record for existing Firebase Auth user...');
            const userData = {
              uid: firebaseUid,
              email: userEmail,
              displayName: existingUserByEmail.displayName || result.screenName,
              type: 'user' as const,
              isActive: true
            };
            await UserModel.create(userData);
            console.log('✅ Database record created for existing user');
            
            // Now add Twitter provider
            await UserModel.addSocialProvider(firebaseUid, {
              provider: 'twitter',
              providerId: result.userId,
              email: userEmail,
              displayName: result.screenName
            });
            console.log('✅ Twitter provider linked to existing user');
          }
        } catch (linkError: any) {
          console.warn('⚠️ Failed to link Twitter provider:', linkError.message);
          // Continue without linking - not critical for auth flow
        }
      } else {
        // No user exists with this email, create new user
        firebaseUid = `twitter_${result.userId}`;
        isNewUser = true;
        
        console.log('🔄 Creating new Firebase Auth user...');
        await createUser({
          uid: firebaseUid,
          email: userEmail,
          displayName: result.screenName,
          disabled: false
        });
        console.log('✅ New Firebase Auth user created');
      }
    } catch (error: any) {
      if (error.message.includes('email-already-exists')) {
        // Handle edge case where email exists but getUserByEmail didn't find it
        console.log('🔄 Email exists but not found by getUserByEmail, trying to find by UID...');
        
        // Try to find user by checking if Twitter UID exists
        try {
          const existingTwitterUser = await getUserByUid(`twitter_${result.userId}`);
          firebaseUid = existingTwitterUser.uid;
          console.log('✅ Found existing Twitter user');
        } catch (uidError: any) {
          // Last resort: create with a unique UID
          firebaseUid = `twitter_${result.userId}_${Date.now()}`;
          console.log('🔄 Creating user with unique UID:', firebaseUid);
          await createUser({
            uid: firebaseUid,
            email: userEmail,
            displayName: result.screenName,
            disabled: false
          });
          isNewUser = true;
          console.log('✅ Firebase Auth user created with unique UID');
        }
      } else {
        throw error;
      }
    }

    // Create Firebase custom token
    const firebaseToken = await createCustomToken(firebaseUid, {
      provider: 'twitter',
      screen_name: result.screenName,
      twitter_id: result.userId,
      email: userEmail
    });

    console.log('✅ Firebase custom token created');

    // Create user object for database
    const userData = {
      uid: firebaseUid,
      email: userEmail, // Use consistent email
      name: result.screenName,
      // photo: undefined, // Omitted to avoid undefined values in Firestore
      type: 'user' as const,
      isActive: true
    };

    // Create user object for JWT tokens
    const jwtUserData = {
      id: firebaseUid,
      email: userEmail, // Use consistent email
      name: result.screenName,
      photo: undefined,
      type: 'twitter' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
      isActive: true
    };

    // Store/update user in database
    try {
      const existingUser = await UserModel.getByUid(firebaseUid);
      if (existingUser) {
        // Update existing user
        await UserModel.update(existingUser.id, { 
          lastLoginAt: jwtUserData.lastLoginAt,
          updatedAt: jwtUserData.updatedAt
        });
        console.log('✅ User updated in database');
        
        // Update user data for JWT with existing user info
        jwtUserData.id = existingUser.id;
        jwtUserData.email = existingUser.email;
        jwtUserData.name = existingUser.displayName || result.screenName;
      } else {
        // Create new user only if this is a new user
        if (isNewUser) {
          await UserModel.create(userData);
          console.log('✅ User created in database');
        } else {
          // This case is now handled above in the provider linking logic
          console.log('✅ User database record will be created during provider linking');
        }
      }
    } catch (dbError: any) {
      console.warn('⚠️ Failed to store user in database:', dbError.message);
      // Continue without database storage - not critical for auth flow
    }

    // Generate app JWT tokens
    const deviceId = req.headers['x-device-id'] as string;
    const token = JWTService.generateToken(jwtUserData, deviceId);
    const refreshToken = await JWTService.generateRefreshToken(jwtUserData, deviceId);
    
    console.log('🔑 JWT tokens generated');

    // Create session
    try {
      const newSessionId = await SessionService.createSession(
        userData.uid,
        deviceId,
        req.ip || 'unknown',
        req.get('User-Agent') || 'unknown'
      );
      console.log('📝 Session created:', newSessionId);
    } catch (sessionError: any) {
      console.warn('⚠️ Failed to create session:', sessionError.message);
      // Continue without session - not critical for auth flow
    }

    const response: ApiResponse = {
      success: true,
      message: 'Twitter authentication successful',
      data: {
        user: jwtUserData,
        token,
        refreshToken,
        firebaseToken
      },
      timestamp: new Date().toISOString()
    };

    console.log('✅ Twitter authentication completed successfully');
    res.json(response);
    
  } catch (error: any) {
    console.error('❌ Twitter OAuth processing error:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Failed to process Twitter authentication',
      error: error.message,
      timestamp: new Date().toISOString()
    };
    
    res.status(500).json(response);
  }
};

/**
 * @route   GET /api/auth/twitter/result/:sessionId
 * @desc    Get Twitter OAuth result and complete authentication
 * @access  Public
 */
export const getTwitterResult = async (req: Request, res: Response): Promise<void> => {
  console.log('🔍 Getting Twitter OAuth result...');
  
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      const response: ApiResponse = {
        success: false,
        message: 'Session ID is required',
        timestamp: new Date().toISOString()
      };
      res.status(400).json(response);
      return;
    }

    const result = await twitterOAuth.getResult(sessionId);
    
    if (!result) {
      const response: ApiResponse = {
        success: false,
        message: 'Session not found or expired',
        timestamp: new Date().toISOString()
      };
      res.status(404).json(response);
      return;
    }

    console.log('📝 Twitter OAuth result retrieved:', { userId: result.userId, screenName: result.screenName });

    // Handle multi-provider authentication
    const userEmail = result.email || `twitter_${result.userId}@app.local`;
    let firebaseUid: string;
    let isNewUser = false;
    
    try {
      // First, check if a user with this email already exists
      const existingUserByEmail = await getUserByEmail(userEmail);
      
      if (existingUserByEmail) {
        // User exists with this email, use their UID
        firebaseUid = existingUserByEmail.uid;
        console.log('✅ Found existing user with email:', userEmail);
        
        // Add Twitter as a linked provider to the existing user
        try {
          const existingDbUser = await UserModel.getByUid(firebaseUid);
          if (existingDbUser) {
            await UserModel.addSocialProvider(firebaseUid, {
              provider: 'twitter',
              providerId: result.userId,
              email: userEmail,
              displayName: result.screenName
            });
            console.log('✅ Twitter provider linked to existing user');
          } else {
            // User exists in Firebase Auth but not in database - create database record
            console.log('🔄 Creating database record for existing Firebase Auth user...');
            const userData = {
              uid: firebaseUid,
              email: userEmail,
              displayName: existingUserByEmail.displayName || result.screenName,
              type: 'user' as const,
              isActive: true
            };
            await UserModel.create(userData);
            console.log('✅ Database record created for existing user');
            
            // Now add Twitter provider
            await UserModel.addSocialProvider(firebaseUid, {
              provider: 'twitter',
              providerId: result.userId,
              email: userEmail,
              displayName: result.screenName
            });
            console.log('✅ Twitter provider linked to existing user');
          }
        } catch (linkError: any) {
          console.warn('⚠️ Failed to link Twitter provider:', linkError.message);
          // Continue without linking - not critical for auth flow
        }
      } else {
        // No user exists with this email, create new user
        firebaseUid = `twitter_${result.userId}`;
        isNewUser = true;
        
        console.log('🔄 Creating new Firebase Auth user...');
        await createUser({
          uid: firebaseUid,
          email: userEmail,
          displayName: result.screenName,
          disabled: false
        });
        console.log('✅ New Firebase Auth user created');
      }
    } catch (error: any) {
      if (error.message.includes('email-already-exists')) {
        // Handle edge case where email exists but getUserByEmail didn't find it
        console.log('🔄 Email exists but not found by getUserByEmail, trying to find by UID...');
        
        // Try to find user by checking if Twitter UID exists
        try {
          const existingTwitterUser = await getUserByUid(`twitter_${result.userId}`);
          firebaseUid = existingTwitterUser.uid;
          console.log('✅ Found existing Twitter user');
        } catch (uidError: any) {
          // Last resort: create with a unique UID
          firebaseUid = `twitter_${result.userId}_${Date.now()}`;
          console.log('🔄 Creating user with unique UID:', firebaseUid);
          await createUser({
            uid: firebaseUid,
            email: userEmail,
            displayName: result.screenName,
            disabled: false
          });
          isNewUser = true;
          console.log('✅ Firebase Auth user created with unique UID');
        }
      } else {
        throw error;
      }
    }

    // Create Firebase custom token
    const firebaseToken = await createCustomToken(firebaseUid, {
      provider: 'twitter',
      screen_name: result.screenName,
      twitter_id: result.userId,
      email: userEmail
    });

    console.log('✅ Firebase custom token created');

    // Create user object for database
    const userData = {
      uid: firebaseUid,
      email: userEmail, // Use consistent email
      name: result.screenName,
      // photo: undefined, // Omitted to avoid undefined values in Firestore
      type: 'user' as const,
      isActive: true
    };

    // Create user object for JWT tokens
    const jwtUserData = {
      id: firebaseUid,
      email: userEmail, // Use consistent email
      name: result.screenName,
      photo: undefined,
      type: 'twitter' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
      isActive: true
    };

    // Store/update user in database
    try {
      const existingUser = await UserModel.getByUid(firebaseUid);
      if (existingUser) {
        // Update existing user
        await UserModel.update(existingUser.id, { 
          lastLoginAt: jwtUserData.lastLoginAt,
          updatedAt: jwtUserData.updatedAt
        });
        console.log('✅ User updated in database');
        
        // Update user data for JWT with existing user info
        jwtUserData.id = existingUser.id;
        jwtUserData.email = existingUser.email;
        jwtUserData.name = existingUser.displayName || result.screenName;
      } else {
        // Create new user only if this is a new user
        if (isNewUser) {
          await UserModel.create(userData);
          console.log('✅ User created in database');
        } else {
          // This case is now handled above in the provider linking logic
          console.log('✅ User database record will be created during provider linking');
        }
      }
    } catch (dbError: any) {
      console.warn('⚠️ Failed to store user in database:', dbError.message);
      // Continue without database storage - not critical for auth flow
    }

    // Generate app JWT tokens
    const deviceId = req.headers['x-device-id'] as string;
    const token = JWTService.generateToken(jwtUserData, deviceId);
    const refreshToken = await JWTService.generateRefreshToken(jwtUserData, deviceId);
    
    console.log('🔑 JWT tokens generated');

    // Create session
    try {
      const newSessionId = await SessionService.createSession(
        userData.uid,
        deviceId,
        req.ip || 'unknown',
        req.get('User-Agent') || 'unknown'
      );
      console.log('📝 Session created:', newSessionId);
    } catch (sessionError: any) {
      console.warn('⚠️ Failed to create session:', sessionError.message);
      // Continue without session - not critical for auth flow
    }

    const response: ApiResponse = {
      success: true,
      message: 'Twitter authentication successful',
      data: {
        user: jwtUserData,
        token,
        refreshToken,
        firebaseToken
      },
      timestamp: new Date().toISOString()
    };

    console.log('✅ Twitter authentication completed successfully');
    res.json(response);
    
  } catch (error: any) {
    console.error('❌ Twitter OAuth result error:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Failed to retrieve Twitter auth result',
      error: error.message,
      timestamp: new Date().toISOString()
    };
    
    res.status(500).json(response);
  }
};
