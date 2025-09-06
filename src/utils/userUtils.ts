import { User } from '../types';

/**
 * Standardized user object creation from Firebase user data
 * Eliminates duplication between authController.ts and auth.ts middleware
 */
export const createStandardUserObject = (
  firebaseUser: any,
  userType: 'email' | 'google' | 'twitter' | 'facebook' = 'email',
  databaseUserId?: string
): User => {
  return {
    id: databaseUserId || firebaseUser.uid, // Use database ID if provided, fallback to Firebase UID
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
 * Create user data object for database storage
 */
export const createUserDataForDatabase = (firebaseUser: any, userType: 'user' | 'admin' | 'moderator' = 'user') => {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || 'User',
    ...(firebaseUser.photoURL && { photoURL: firebaseUser.photoURL }),
    type: userType,
    isActive: !firebaseUser.disabled
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
) => {
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
