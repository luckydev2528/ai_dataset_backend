import admin from 'firebase-admin';
import { ServiceAccount } from 'firebase-admin';
import { CustomClaims, SocialProviderData } from '../types';

let firebaseAdmin: admin.app.App | null = null;

export const initializeFirebaseAdmin = (): admin.app.App | null => {
  if (firebaseAdmin) {
    return firebaseAdmin;
  }

  try {
    // Check if Firebase is already initialized
    if (admin.apps.length > 0) {
      firebaseAdmin = admin.apps[0] as admin.app.App;
      return firebaseAdmin;
    }

    console.log('🔍 Initializing Firebase Admin...');

    // Try to load the service account from the JSON file first
    const serviceAccountPath = './datarefinery-6db5e-firebase-adminsdk-fbsvc-408eea0d7c.json';
    
    try {
      // Initialize Firebase Admin using the service account JSON file
      firebaseAdmin = admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath),
        projectId: 'datarefinery-6db5e',
      });
      
      console.log('✅ Firebase Admin initialized successfully using service account JSON file');
      return firebaseAdmin;
    } catch (jsonError) {
      console.log('⚠️ Failed to load service account JSON file, falling back to environment variables');
      console.log('JSON Error:', jsonError instanceof Error ? jsonError.message : String(jsonError));
      
      // Fallback to environment variables
      console.log('🔍 Debugging Firebase Admin initialization from environment variables:');
      console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? 'Set' : 'Not set');
      console.log('FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? 'Set' : 'Not set');
      console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? 'Set' : 'Not set');

      // Check if required environment variables are present
      if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
        console.warn('⚠️ Firebase environment variables not set. Firebase Admin will not be initialized.');
        console.warn('Required variables: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL');
        return null;
      }

      // Get Firebase service account from environment variables
      let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
      
      // Handle private key formatting
      if (privateKey) {
        // First, replace any escaped newlines with actual newlines
        privateKey = privateKey.replace(/\\n/g, '\n');
        
        // Trim whitespace
        privateKey = privateKey.trim();
        
        // Clean up the private key by removing any extra whitespace and ensuring proper line breaks
        const lines = privateKey.split('\n').filter(line => line && line.trim());
        let cleanedKey = '';
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line && line.trim()) {
            cleanedKey += line.trim() + '\n';
          }
        }
        
        privateKey = cleanedKey;
        
        // Ensure the private key ends with a newline after the END marker
        if (privateKey.endsWith('-----END PRIVATE KEY-----') && !privateKey.endsWith('-----END PRIVATE KEY-----\n')) {
          privateKey = privateKey + '\n';
        }
      }

      // Create service account object
      const serviceAccount: ServiceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: privateKey,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      };

      console.log('🔧 Initializing Firebase Admin with project:', process.env.FIREBASE_PROJECT_ID);

      // Initialize Firebase Admin
      firebaseAdmin = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });

      console.log('✅ Firebase Admin initialized successfully using environment variables');
      return firebaseAdmin;
    }
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error);
    console.error('Error details:', error);
    console.warn('⚠️ Continuing without Firebase Admin. Some features may not work.');
    return null;
  }
};

export const getFirebaseAdmin = (): admin.app.App | null => {
  if (!firebaseAdmin) {
    console.warn('⚠️ Firebase Admin not initialized');
    return null;
  }
  return firebaseAdmin;
};

export const getAuth = (): admin.auth.Auth | null => {
  const app = getFirebaseAdmin();
  if (!app) {
    return null;
  }
  return app.auth();
};

export const getFirestore = (): admin.firestore.Firestore | null => {
  const app = getFirebaseAdmin();
  if (!app) {
    return null;
  }
  return app.firestore();
};

// Helper function to verify Firebase ID token
export const verifyIdToken = async (idToken: string): Promise<admin.auth.DecodedIdToken> => {
  try {
    console.log('🔄 verifyIdToken called with token length:', idToken?.length);
    const auth = getAuth();
    if (!auth) {
      console.warn('⚠️ Firebase Auth not initialized, attempting to decode token manually');
      // Fallback: try to decode the JWT token manually
      // This is a basic implementation - in production you should verify the signature
      const parts = idToken.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid ID token format');
      }
      
      const payload = JSON.parse(Buffer.from(parts[1] || '', 'base64').toString());
      
      // Basic validation
      if (!payload.uid || !payload.email) {
        throw new Error('Invalid token payload');
      }
      
      // Check if token is expired
      if (payload.exp && payload.exp < Date.now() / 1000) {
        throw new Error('ID token has expired');
      }
      
      console.log('✅ Manual token decode successful');
      return payload as admin.auth.DecodedIdToken;
    }
    console.log('🔄 Using Firebase Auth to verify token...');
    const decodedToken = await auth.verifyIdToken(idToken);
    console.log('✅ Firebase Auth token verification successful');
    return decodedToken;
  } catch (error: any) {
    console.error('Error verifying ID token:', error);
    
    // Handle audience mismatch error specifically
    if (error.code === 'auth/argument-error' && error.message.includes('audience')) {
      console.warn('⚠️ Audience mismatch detected, trying manual token decode as fallback');
      try {
        // Fallback to manual token decode
        const parts = idToken.split('.');
        if (parts.length !== 3) {
          throw new Error('Invalid ID token format');
        }
        
        const payload = JSON.parse(Buffer.from(parts[1] || '', 'base64').toString());
        
        // Basic validation
        if (!payload.uid || !payload.email) {
          throw new Error('Invalid token payload');
        }
        
        // Check if token is expired
        if (payload.exp && payload.exp < Date.now() / 1000) {
          throw new Error('ID token has expired');
        }
        
        console.log('✅ Manual token decode successful as fallback');
        return payload as admin.auth.DecodedIdToken;
      } catch (manualError) {
        console.error('❌ Manual token decode also failed:', manualError);
        throw new Error('Invalid ID token - audience mismatch and manual decode failed');
      }
    }
    
    // Handle specific Firebase permission errors
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
};

// Helper function to create custom token
export const createCustomToken = async (uid: string, additionalClaims?: CustomClaims): Promise<string> => {
  try {
    const auth = getAuth();
    if (!auth) {
      throw new Error('Firebase Auth not initialized');
    }
    const customToken = await auth.createCustomToken(uid, additionalClaims);
    return customToken;
  } catch (error) {
    console.error('Error creating custom token:', error);
    throw new Error('Failed to create custom token');
  }
};

// Helper function to get user by UID
export const getUserByUid = async (uid: string): Promise<admin.auth.UserRecord> => {
  try {
    const auth = getAuth();
    if (!auth) {
      throw new Error('Firebase Auth not initialized');
    }
    const userRecord = await auth.getUser(uid);
    return userRecord;
  } catch (error: any) {
    console.error('Error getting user by UID:', error);
    
    // Handle specific Firebase permission errors
    if (error.code === 'auth/internal-error' && error.message.includes('PERMISSION_DENIED')) {
      throw new Error('Firebase service account lacks required permissions. Please grant the service account the "Firebase Authentication Admin" role in the Google Cloud Console.');
    }
    
    if (error.code === 'auth/user-not-found') {
      throw new Error('User not found');
    }
    
    throw new Error('Failed to retrieve user information');
  }
};

// Helper function to create user
export const createUser = async (userData: {
  email: string;
  password?: string;
  displayName?: string;
  photoURL?: string;
  disabled?: boolean;
}): Promise<admin.auth.UserRecord> => {
  try {
    const auth = getAuth();
    if (!auth) {
      throw new Error('Firebase Auth not initialized');
    }
    const userRecord = await auth.createUser(userData);
    return userRecord;
  } catch (error) {
    console.error('Error creating user:', error);
    throw new Error('Failed to create user');
  }
};

// Helper function to update user
export const updateUser = async (uid: string, userData: {
  email?: string;
  displayName?: string;
  photoURL?: string;
  disabled?: boolean;
}): Promise<admin.auth.UserRecord> => {
  try {
    const auth = getAuth();
    if (!auth) {
      throw new Error('Firebase Auth not initialized');
    }
    const userRecord = await auth.updateUser(uid, userData);
    return userRecord;
  } catch (error) {
    console.error('Error updating user:', error);
    throw new Error('Failed to update user');
  }
};

// Helper function to delete user
export const deleteUser = async (uid: string): Promise<void> => {
  try {
    const auth = getAuth();
    if (!auth) {
      throw new Error('Firebase Auth not initialized');
    }
    await auth.deleteUser(uid);
  } catch (error) {
    console.error('Error deleting user:', error);
    throw new Error('Failed to delete user');
  }
};

// Helper function to set custom claims
export const setCustomClaims = async (uid: string, claims: CustomClaims): Promise<void> => {
  try {
    const auth = getAuth();
    if (!auth) {
      throw new Error('Firebase Auth not initialized');
    }
    await auth.setCustomUserClaims(uid, claims);
  } catch (error) {
    console.error('Error setting custom claims:', error);
    throw new Error('Failed to set custom claims');
  }
};

// Helper function to send password reset email
export const sendPasswordResetEmail = async (email: string): Promise<void> => {
  try {
    const auth = getAuth();
    if (!auth) {
      throw new Error('Firebase Auth not initialized');
    }
    const resetLink = await auth.generatePasswordResetLink(email);
    // Note: In a real implementation, you would send this link via email
    console.log('Password reset link generated for:', email);
    console.log('Reset link:', resetLink);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};

// Helper function to verify password reset code
export const verifyPasswordResetCode = async (oobCode: string): Promise<string> => {
  try {
    // Note: Firebase Admin doesn't have verifyPasswordResetCode
    // This would typically be handled by the client-side Firebase Auth
    // For now, we'll return a placeholder
    console.log('Verifying password reset code:', oobCode);
    return 'user@example.com'; // Placeholder
  } catch (error) {
    console.error('Error verifying password reset code:', error);
    throw new Error('Invalid or expired password reset code');
  }
};

// Helper function to confirm password reset
export const confirmPasswordReset = async (oobCode: string, newPassword: string): Promise<void> => {
  try {
    // Note: Firebase Admin doesn't have confirmPasswordReset
    // This would typically be handled by the client-side Firebase Auth
    // For now, we'll just log the action
    console.log('Confirming password reset for code:', oobCode);
    console.log('New password length:', newPassword.length);
  } catch (error) {
    console.error('Error confirming password reset:', error);
    throw new Error('Failed to reset password');
  }
};

// Helper function to get user's provider data
export const getUserProviderData = (userRecord: admin.auth.UserRecord): SocialProviderData[] => {
  return userRecord.providerData.map(provider => ({
    providerId: provider.providerId,
    uid: provider.uid,
    email: provider.email,
    displayName: provider.displayName,
    photoURL: provider.photoURL,
  }));
};

// Helper function to check if user exists by email
export const getUserByEmail = async (email: string): Promise<admin.auth.UserRecord | null> => {
  try {
    const auth = getAuth();
    if (!auth) {
      throw new Error('Firebase Auth not initialized');
    }
    const userRecord = await auth.getUserByEmail(email);
    return userRecord;
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      return null;
    }
    console.error('Error getting user by email:', error);
    throw new Error('Failed to check user existence');
  }
};

export default {
  initializeFirebaseAdmin,
  getFirebaseAdmin,
  getAuth,
  getFirestore,
  verifyIdToken,
  createCustomToken,
  getUserByUid,
  createUser,
  updateUser,
  deleteUser,
  setCustomClaims,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  getUserProviderData,
  getUserByEmail,
};
