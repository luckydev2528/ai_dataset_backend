import { Request } from 'express';
import { JWTService } from '../services/auth/jwtService';
import SessionService from '../services/session/SessionService';
import { UserModel } from '../services/database/models/userModel';
import { getUserByUid, getUserByEmail, createUser } from '../services/auth/firebaseAdmin';
import { FirebaseWrapper } from '../services/firebase/firebaseWrapper';
import { Logger } from './logger';
import { areDatesEqual } from './dateUtils';

export interface UserData {
  id: string;
  email: string;
  name: string;
  photo?: string | undefined;
  type: 'email' | 'google' | 'twitter' | 'facebook';
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date | undefined;
  isActive: boolean;
}

export interface JWTUserData {
  id: string;
  email: string;
  name: string;
  photo?: string | undefined;
  type: 'email' | 'google' | 'twitter' | 'facebook';
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
  isActive: boolean;
}

/**
 * Create user object from Firebase user data
 */
export const createUserObject = (
  firebaseUser: any,
  userType: 'email' | 'google' | 'twitter' | 'facebook' = 'email'
): UserData => {
  return {
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
};

/**
 * Create JWT user data object
 */
export const createJWTUserData = (
  uid: string,
  email: string,
  name: string,
  userType: 'email' | 'google' | 'twitter' | 'facebook',
  photo?: string
): JWTUserData => {
  return {
    id: uid,
    email,
    name,
    ...(photo && { photo }),
    type: userType,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
    isActive: true
  };
};

/**
 * Extract device ID from request headers
 */
export const getDeviceId = (req: Request): string => {
  return req.headers['x-device-id'] as string;
};

/**
 * Extract and validate token from request headers
 */
export const extractTokenFromRequest = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  return JWTService.extractTokenFromHeader(authHeader);
};

/**
 * Generate JWT tokens for user
 */
export const generateUserTokens = async (user: UserData | JWTUserData, deviceId: string) => {
  const token = JWTService.generateToken(user, deviceId);
  const refreshToken = await JWTService.generateRefreshToken(user, deviceId);
  return { token, refreshToken };
};

/**
 * Create user session
 */
export const createUserSession = async (
  userId: string,
  deviceId: string,
  req: Request
): Promise<string> => {
  return await SessionService.createSession(
    userId,
    deviceId,
    req.ip || 'unknown',
    req.get('User-Agent') || 'unknown'
  );
};

/**
 * Handle multi-provider authentication logic
 */
export const handleMultiProviderAuth = async (
  userEmail: string,
  provider: 'google' | 'facebook' | 'twitter' | 'apple',
  providerData: {
    providerId: string;
    displayName: string;
    photoURL?: string;
  }
): Promise<{ firebaseUid: string; isNewUser: boolean }> => {
  let firebaseUid: string;
  let isNewUser = false;

  try {
    // First, check if a user with this email already exists in the database
    const existingDbUser = await UserModel.getByEmail(userEmail);
    
    if (existingDbUser) {
      // User exists in database, use their UID
      firebaseUid = existingDbUser.uid;
      console.log('✅ Found existing user in database with email:', userEmail);
      
      // Check if this provider is already linked
      const hasProvider = existingDbUser.socialProviders?.some(p => p.provider === provider);
      if (!hasProvider) {
        // Add this provider to existing user
        try {
          await UserModel.addSocialProvider(firebaseUid, {
            provider,
            providerId: providerData.providerId,
            email: userEmail,
            displayName: providerData.displayName,
            ...(providerData.photoURL && { photoURL: providerData.photoURL })
          });
          console.log(`✅ ${provider} provider linked to existing user`);
        } catch (linkError: any) {
          console.warn(`⚠️ Failed to link ${provider} provider:`, linkError.message);
        }
      } else {
        console.log(`✅ ${provider} provider already linked to user`);
      }
    } else {
      // No user exists in database, check if Firebase user exists
      // Fix UID generation - ensure clean, consistent format
      const cleanProviderId = providerData.providerId.replace(/[^a-zA-Z0-9_-]/g, '');
      const providerUid = `${provider}_${cleanProviderId}`;
      
      try {
        const existingProviderUser = await getUserByUid(providerUid);
        firebaseUid = existingProviderUser.uid;
        console.log(`✅ Found existing ${provider} user in Firebase with UID:`, firebaseUid);
      } catch (uidError: any) {
        // No user exists anywhere, create new user
        firebaseUid = providerUid;
        isNewUser = true;
        
        console.log('🔄 Creating new Firebase Auth user...');
        await createUser({
          uid: firebaseUid,
          email: userEmail,
          displayName: providerData.displayName,
          disabled: false
        });
        console.log('✅ New Firebase Auth user created');
      }
    }
  } catch (error: any) {
    if (error.message.includes('email-already-exists')) {
      // Handle edge case where email exists but getUserByEmail didn't find it
      console.log('🔄 Email exists but not found by getUserByEmail, trying to find by UID...');
      
      // Try to find user by checking if provider UID exists
      const cleanProviderId = providerData.providerId.replace(/[^a-zA-Z0-9_-]/g, '');
      const providerUid = `${provider}_${cleanProviderId}`;
      
      try {
        const existingProviderUser = await getUserByUid(providerUid);
        firebaseUid = existingProviderUser.uid;
        console.log(`✅ Found existing ${provider} user`);
      } catch (uidError: any) {
        // Last resort: create with a unique UID
        firebaseUid = `${provider}_${cleanProviderId}_${Date.now()}`;
        console.log('🔄 Creating user with unique UID:', firebaseUid);
        await createUser({
          uid: firebaseUid,
          email: userEmail,
          displayName: providerData.displayName,
          disabled: false
        });
        isNewUser = true;
        console.log('✅ Firebase Auth user created with unique UID');
      }
    } else {
      throw error;
    }
  }

  return { firebaseUid, isNewUser };
};

/**
 * Determine user type from provider
 */
export const determineUserType = (provider: string): 'email' | 'google' | 'twitter' | 'facebook' => {
  switch (provider) {
    case 'email':
      return 'email';
    case 'google':
      return 'google';
    case 'twitter':
      return 'twitter';
    case 'facebook':
      return 'facebook';
    default:
      return 'email';
  }
};

/**
 * Create Firebase user fallback from token data
 */
export const createFirebaseUserFallback = (decodedToken: any) => {
  return {
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
};

/**
 * Add social provider to user
 */
export const addSocialProviderToUser = async (
  firebaseUid: string,
  provider: string,
  firebaseUser: any
): Promise<void> => {
  // Get the provider-specific ID from Firebase user's provider data
  let providerId = firebaseUser.uid; // Fallback to Firebase UID
  
  if (firebaseUser.providerData && firebaseUser.providerData.length > 0) {
    // Find the matching provider data
    const providerData = firebaseUser.providerData.find((p: any) => 
      p.providerId.includes(provider) || p.providerId.includes('google.com')
    );
    
    if (providerData) {
      providerId = providerData.uid; // Use the provider-specific UID
    }
  }
  
  await UserModel.addSocialProvider(firebaseUid, {
    provider: provider as 'google' | 'facebook' | 'twitter' | 'apple',
    providerId: providerId,
    ...(firebaseUser.email && { email: firebaseUser.email }),
    ...(firebaseUser.displayName && { displayName: firebaseUser.displayName }),
    ...(firebaseUser.photoURL && { photoURL: firebaseUser.photoURL })
  });
};

// Debounce map for user updates to prevent multiple rapid updates
const updateDebounceMap = new Map<string, NodeJS.Timeout>();

/**
 * Store or update user in database with batching to prevent multiple updates
 */
export const storeOrUpdateUser = async (
  firebaseUid: string,
  userData: any,
  jwtUserData: JWTUserData,
  isNewUser: boolean
): Promise<void> => {
  const debounceKey = `${firebaseUid}_update`;
  
  // Clear existing timeout if any
  if (updateDebounceMap.has(debounceKey)) {
    clearTimeout(updateDebounceMap.get(debounceKey)!);
    console.log(`🔄 Debouncing user update for ${firebaseUid}`);
  }
  
  // Set new timeout for batched update
  const timeout = setTimeout(async () => {
    try {
      await performUserUpdate(firebaseUid, userData, jwtUserData, isNewUser);
    } finally {
      updateDebounceMap.delete(debounceKey);
    }
  }, 100); // 100ms debounce
  
  updateDebounceMap.set(debounceKey, timeout);
};

/**
 * Perform the actual user update operation
 */
const performUserUpdate = async (
  firebaseUid: string,
  userData: any,
  jwtUserData: JWTUserData,
  isNewUser: boolean
): Promise<void> => {
  try {
    const existingUser = await UserModel.getByUid(firebaseUid);
    if (existingUser) {
      // Batch all updates into a single operation to prevent multiple database calls
      const updateData: any = {
        lastLoginAt: jwtUserData.lastLoginAt,
        updatedAt: jwtUserData.updatedAt
      };
      
      // Only update if the data has actually changed to prevent unnecessary updates
      const needsUpdate = 
        !existingUser.lastLoginAt || 
        !areDatesEqual(existingUser.lastLoginAt, jwtUserData.lastLoginAt) ||
        !existingUser.updatedAt ||
        !areDatesEqual(existingUser.updatedAt, jwtUserData.updatedAt);
      
      if (needsUpdate) {
        await UserModel.update(existingUser.id, updateData);
        console.log('✅ User updated in database (batched)');
      } else {
        console.log('✅ User data unchanged, skipping database update');
      }
      
      // Update user data for JWT with existing user info
      jwtUserData.id = existingUser.id;
      jwtUserData.email = existingUser.email;
      jwtUserData.name = existingUser.displayName || jwtUserData.name;
    } else {
      // Create new user only if this is a new user
      if (isNewUser) {
        await UserModel.create(userData);
        console.log('✅ User created in database');
      } else {
        console.log('✅ User database record will be created during provider linking');
      }
    }
  } catch (dbError: any) {
    console.warn('⚠️ Failed to store user in database:', dbError.message);
    // Continue without database storage - not critical for auth flow
  }
};

/**
 * Helper function to resolve Firebase user with database fallback
 * Handles the common pattern of looking up Firebase user and falling back to database
 * Now expects JWT tokens to contain Firebase UID for consistency
 */
export const resolveFirebaseUserWithFallback = async (
  uid: string, 
  context: string = 'authentication'
): Promise<{ firebaseUser: any; databaseUserId: string }> => {
  let firebaseUser: any;
  let databaseUserId = uid; // Default to the UID from JWT
  
  try {
    // Try to get Firebase user by the UID (should be Firebase UID now)
    firebaseUser = await FirebaseWrapper.getUserByUid(uid);
    
    // If successful, try to get the database user ID for consistency
    try {
      const dbUser = await UserModel.getByUid(uid);
      if (dbUser) {
        databaseUserId = dbUser.id; // Use database ID for internal operations
      }
    } catch (dbError: any) {
      // Database lookup failed, but Firebase user exists - continue with Firebase UID
      Logger.warning(`AUTH: Database lookup failed during ${context}, using Firebase UID`, { 
        uid,
        error: dbError.message,
        context 
      });
    }
    
  } catch (error: any) {
    // If user not found in Firebase, this might be a legacy database user ID
    if (error.message.includes('User not found') || error.message.includes('There is no user record')) {
      Logger.warning(`AUTH: User not found in Firebase during ${context}, checking if this is a legacy database user ID`, { 
        uid,
        error: error.message 
      });
      
      // Try to find the user in database to get their Firebase UID
      // First try by database ID (document ID), then by Firebase UID
      try {
        let dbUser = await UserModel.getById(uid);
        
        // If not found by ID, try by Firebase UID (in case the JWT contains Firebase UID)
        if (!dbUser) {
          dbUser = await UserModel.getByUid(uid);
        }
        
        if (dbUser) {
          // Found in database, now try to get Firebase user by their Firebase UID
          try {
            firebaseUser = await FirebaseWrapper.getUserByUid(dbUser.uid);
            databaseUserId = dbUser.id; // Use database ID for internal operations
            Logger.info(`AUTH: Found Firebase user via database lookup during ${context}`, { 
              lookupId: uid, 
              databaseId: dbUser.id,
              firebaseUid: dbUser.uid 
            });
          } catch (firebaseError2: any) {
            // Firebase user still not found, create fallback
            Logger.warning(`AUTH: Firebase user not found even after database lookup during ${context}, creating fallback`, { 
              lookupId: uid,
              databaseId: dbUser.id,
              firebaseUid: dbUser.uid,
              error: firebaseError2.message 
            });
            firebaseUser = {
              uid: dbUser.uid,
              email: dbUser.email || '',
              displayName: dbUser.displayName || 'User',
              photoURL: dbUser.photoURL || undefined,
              disabled: false,
              metadata: {
                creationTime: dbUser.createdAt?.toISOString() || new Date().toISOString(),
                lastSignInTime: new Date().toISOString(),
              }
            };
            databaseUserId = dbUser.id;
          }
        } else {
          // Not found in database either, create fallback from JWT payload
          Logger.warning(`AUTH: User not found in database or Firebase during ${context}, using fallback`, { 
            lookupId: uid,
            context 
          });
          firebaseUser = {
            uid,
            email: '',
            displayName: 'User',
            photoURL: undefined,
            disabled: false,
            metadata: {
              creationTime: new Date().toISOString(),
              lastSignInTime: new Date().toISOString(),
            }
          };
        }
      } catch (dbError: any) {
        Logger.warning(`AUTH: Database lookup failed during ${context}, using fallback`, { 
          lookupId: uid, 
          error: dbError.message,
          context 
        });
        firebaseUser = {
          uid,
          email: '',
          displayName: 'User',
          photoURL: undefined,
          disabled: false,
          metadata: {
            creationTime: new Date().toISOString(),
            lastSignInTime: new Date().toISOString(),
          }
        };
      }
    } else {
      throw error;
    }
  }

  return { firebaseUser, databaseUserId };
};

/**
 * Fast authentication resolver for video uploads
 * Only does Firebase lookup to avoid database timeouts
 */
export const resolveFirebaseUserFast = async (
  uid: string, 
  context: string = 'video upload'
): Promise<{ firebaseUser: any; databaseUserId: string }> => {
  try {
    // Try Firebase lookup with a short timeout to avoid long stalls
    const lookup = FirebaseWrapper.getUserByUid(uid);
    const timeoutMs = parseInt(process.env.AUTH_FAST_LOOKUP_TIMEOUT_MS || '1500', 10);
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('FAST_LOOKUP_TIMEOUT')), timeoutMs));
    const firebaseUser = await Promise.race([lookup, timeout]) as any;
    
    Logger.info(`AUTH: Fast Firebase user lookup successful during ${context}`, { 
      uid,
      context 
    });
    
    return { firebaseUser, databaseUserId: uid };
    
  } catch (error: any) {
    const errMsg = error?.message === 'FAST_LOOKUP_TIMEOUT' ? 'timeout' : (error?.message || 'unknown');
    Logger.warning(`AUTH: Fast Firebase user lookup failed during ${context}, creating fallback`, { 
      uid,
      error: errMsg,
      context 
    });
    
    // Create fallback user for video uploads
    const firebaseUser = {
      uid,
      email: '',
      displayName: 'User',
      photoURL: undefined,
      disabled: false,
      metadata: {
        creationTime: new Date().toISOString(),
        lastSignInTime: new Date().toISOString(),
      }
    };
    
    return { firebaseUser, databaseUserId: uid };
  }
};
