import admin from 'firebase-admin';
import { getAuth, getFirebaseAdmin } from '../auth/firebaseAdmin';
import { Logger } from '../../utils/logger';

/**
 * Firebase service wrapper to eliminate repeated null checks
 */
export class FirebaseWrapper {
  /**
   * Get Firebase Auth instance with null check
   */
  static getAuth(): admin.auth.Auth {
    const auth = getAuth();
    if (!auth) {
      throw new Error('Firebase Auth not initialized. Please check your Firebase configuration.');
    }
    return auth;
  }

  /**
   * Get Firebase Admin instance with null check
   */
  static getAdmin(): admin.app.App {
    const admin = getFirebaseAdmin();
    if (!admin) {
      throw new Error('Firebase Admin not initialized. Please check your Firebase configuration.');
    }
    return admin;
  }

  /**
   * Get Firestore instance with null check
   */
  static getFirestore(): admin.firestore.Firestore {
    const app = this.getAdmin();
    return app.firestore();
  }

  /**
   * Verify ID token with error handling
   */
  static async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    try {
      Logger.info('Verifying ID token...', { tokenLength: idToken?.length });
      const auth = this.getAuth();
      const decodedToken = await auth.verifyIdToken(idToken);
      Logger.firebaseSuccess('ID token verified successfully', { uid: decodedToken.uid });
      return decodedToken;
    } catch (error: any) {
      Logger.firebaseError('ID token verification failed', { error: error.message });
      
      // Handle specific Firebase errors
      if (error.code === 'auth/argument-error' && error.message.includes('audience')) {
        throw new Error('Invalid ID token - audience mismatch. Please check your Firebase project configuration.');
      }
      
      if (error.code === 'auth/internal-error' && error.message.includes('PERMISSION_DENIED')) {
        throw new Error('Firebase service account lacks required permissions. Please grant the service account the "Firebase Authentication Admin" role in the Google Cloud Console.');
      }
      
      if (error.code === 'auth/invalid-id-token') {
        throw new Error('Invalid ID token');
      }
      
      if (error.code === 'auth/id-token-expired') {
        throw new Error('ID token has expired');
      }
      
      throw new Error('Failed to verify ID token');
    }
  }

  /**
   * Get user by UID with error handling
   */
  static async getUserByUid(uid: string): Promise<admin.auth.UserRecord> {
    try {
      const auth = this.getAuth();
      const userRecord = await auth.getUser(uid);
      Logger.firebaseSuccess('User retrieved by UID', { uid });
      return userRecord;
    } catch (error: any) {
      Logger.firebaseError('Failed to get user by UID', { uid, error: error.message });
      
      if (error.code === 'auth/internal-error' && error.message.includes('PERMISSION_DENIED')) {
        throw new Error('Firebase service account lacks required permissions. Please grant the service account the "Firebase Authentication Admin" role in the Google Cloud Console.');
      }
      
      if (error.code === 'auth/user-not-found') {
        throw new Error('User not found');
      }
      
      throw new Error('Failed to retrieve user information');
    }
  }

  /**
   * Create user with error handling
   */
  static async createUser(userData: {
    uid?: string;
    email: string;
    password?: string;
    displayName?: string;
    photoURL?: string;
    disabled?: boolean;
  }): Promise<admin.auth.UserRecord> {
    try {
      const auth = this.getAuth();
      const userRecord = await auth.createUser(userData);
      Logger.firebaseSuccess('User created successfully', { uid: userRecord.uid, email: userData.email });
      return userRecord;
    } catch (error: any) {
      Logger.firebaseError('Failed to create user', { email: userData.email, error: error.message });
      throw new Error('Failed to create user');
    }
  }

  /**
   * Update user with error handling
   */
  static async updateUser(uid: string, userData: {
    email?: string;
    displayName?: string;
    photoURL?: string;
    disabled?: boolean;
  }): Promise<admin.auth.UserRecord> {
    try {
      const auth = this.getAuth();
      const userRecord = await auth.updateUser(uid, userData);
      Logger.firebaseSuccess('User updated successfully', { uid });
      return userRecord;
    } catch (error: any) {
      Logger.firebaseError('Failed to update user', { uid, error: error.message });
      throw new Error('Failed to update user');
    }
  }

  /**
   * Delete user with error handling
   */
  static async deleteUser(uid: string): Promise<void> {
    try {
      const auth = this.getAuth();
      await auth.deleteUser(uid);
      Logger.firebaseSuccess('User deleted successfully', { uid });
    } catch (error: any) {
      Logger.firebaseError('Failed to delete user', { uid, error: error.message });
      throw new Error('Failed to delete user');
    }
  }

  /**
   * Get user by email with error handling
   */
  static async getUserByEmail(email: string): Promise<admin.auth.UserRecord | null> {
    try {
      const auth = this.getAuth();
      const userRecord = await auth.getUserByEmail(email);
      Logger.firebaseSuccess('User retrieved by email', { email });
      return userRecord;
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        Logger.info('User not found by email', { email });
        return null;
      }
      Logger.firebaseError('Failed to get user by email', { email, error: error.message });
      throw new Error('Failed to check user existence');
    }
  }

  /**
   * Create custom token with error handling
   */
  static async createCustomToken(uid: string, additionalClaims?: any): Promise<string> {
    try {
      const auth = this.getAuth();
      const customToken = await auth.createCustomToken(uid, additionalClaims);
      Logger.firebaseSuccess('Custom token created successfully', { uid });
      return customToken;
    } catch (error: any) {
      Logger.firebaseError('Failed to create custom token', { uid, error: error.message });
      throw new Error('Failed to create custom token');
    }
  }
}
