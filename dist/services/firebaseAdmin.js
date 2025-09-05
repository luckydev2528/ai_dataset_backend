"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserByEmail = exports.getUserProviderData = exports.confirmPasswordReset = exports.verifyPasswordResetCode = exports.sendPasswordResetEmail = exports.setCustomClaims = exports.deleteUser = exports.updateUser = exports.createUser = exports.getUserByUid = exports.createCustomToken = exports.verifyIdToken = exports.getFirestore = exports.getAuth = exports.getFirebaseAdmin = exports.initializeFirebaseAdmin = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
let firebaseAdmin = null;
const initializeFirebaseAdmin = () => {
    if (firebaseAdmin) {
        return firebaseAdmin;
    }
    try {
        if (firebase_admin_1.default.apps.length > 0) {
            firebaseAdmin = firebase_admin_1.default.apps[0];
            return firebaseAdmin;
        }
        console.log('🔍 Debugging Firebase Admin initialization:');
        console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? 'Set' : 'Not set');
        console.log('FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? 'Set' : 'Not set');
        console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? 'Set' : 'Not set');
        if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
            console.warn('⚠️ Firebase environment variables not set. Firebase Admin will not be initialized.');
            console.warn('Required variables: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL');
            return null;
        }
        let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
        if (privateKey.includes('\\n')) {
            privateKey = privateKey.replace(/\\n/g, '\n');
        }
        else if (!privateKey.includes('\n') && privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
            privateKey = privateKey.replace(/-----BEGIN PRIVATE KEY-----/, '-----BEGIN PRIVATE KEY-----\n')
                .replace(/-----END PRIVATE KEY-----/, '\n-----END PRIVATE KEY-----');
        }
        const serviceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey: privateKey,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        };
        console.log('🔧 Initializing Firebase Admin with project:', process.env.FIREBASE_PROJECT_ID);
        firebaseAdmin = firebase_admin_1.default.initializeApp({
            credential: firebase_admin_1.default.credential.cert(serviceAccount),
            projectId: process.env.FIREBASE_PROJECT_ID,
        });
        console.log('✅ Firebase Admin initialized successfully');
        return firebaseAdmin;
    }
    catch (error) {
        console.error('❌ Failed to initialize Firebase Admin:', error);
        console.error('Error details:', error);
        console.warn('⚠️ Continuing without Firebase Admin. Some features may not work.');
        return null;
    }
};
exports.initializeFirebaseAdmin = initializeFirebaseAdmin;
const getFirebaseAdmin = () => {
    if (!firebaseAdmin) {
        console.warn('⚠️ Firebase Admin not initialized');
        return null;
    }
    return firebaseAdmin;
};
exports.getFirebaseAdmin = getFirebaseAdmin;
const getAuth = () => {
    const app = (0, exports.getFirebaseAdmin)();
    if (!app) {
        return null;
    }
    return app.auth();
};
exports.getAuth = getAuth;
const getFirestore = () => {
    const app = (0, exports.getFirebaseAdmin)();
    if (!app) {
        return null;
    }
    return app.firestore();
};
exports.getFirestore = getFirestore;
const verifyIdToken = async (idToken) => {
    try {
        const auth = (0, exports.getAuth)();
        if (!auth) {
            throw new Error('Firebase Auth not initialized');
        }
        const decodedToken = await auth.verifyIdToken(idToken);
        return decodedToken;
    }
    catch (error) {
        console.error('Error verifying ID token:', error);
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
exports.verifyIdToken = verifyIdToken;
const createCustomToken = async (uid, additionalClaims) => {
    try {
        const auth = (0, exports.getAuth)();
        if (!auth) {
            throw new Error('Firebase Auth not initialized');
        }
        const customToken = await auth.createCustomToken(uid, additionalClaims);
        return customToken;
    }
    catch (error) {
        console.error('Error creating custom token:', error);
        throw new Error('Failed to create custom token');
    }
};
exports.createCustomToken = createCustomToken;
const getUserByUid = async (uid) => {
    try {
        const auth = (0, exports.getAuth)();
        if (!auth) {
            throw new Error('Firebase Auth not initialized');
        }
        const userRecord = await auth.getUser(uid);
        return userRecord;
    }
    catch (error) {
        console.error('Error getting user by UID:', error);
        if (error.code === 'auth/internal-error' && error.message.includes('PERMISSION_DENIED')) {
            throw new Error('Firebase service account lacks required permissions. Please grant the service account the "Firebase Authentication Admin" role in the Google Cloud Console.');
        }
        if (error.code === 'auth/user-not-found') {
            throw new Error('User not found');
        }
        throw new Error('Failed to retrieve user information');
    }
};
exports.getUserByUid = getUserByUid;
const createUser = async (userData) => {
    try {
        const auth = (0, exports.getAuth)();
        if (!auth) {
            throw new Error('Firebase Auth not initialized');
        }
        const userRecord = await auth.createUser(userData);
        return userRecord;
    }
    catch (error) {
        console.error('Error creating user:', error);
        throw new Error('Failed to create user');
    }
};
exports.createUser = createUser;
const updateUser = async (uid, userData) => {
    try {
        const auth = (0, exports.getAuth)();
        if (!auth) {
            throw new Error('Firebase Auth not initialized');
        }
        const userRecord = await auth.updateUser(uid, userData);
        return userRecord;
    }
    catch (error) {
        console.error('Error updating user:', error);
        throw new Error('Failed to update user');
    }
};
exports.updateUser = updateUser;
const deleteUser = async (uid) => {
    try {
        const auth = (0, exports.getAuth)();
        if (!auth) {
            throw new Error('Firebase Auth not initialized');
        }
        await auth.deleteUser(uid);
    }
    catch (error) {
        console.error('Error deleting user:', error);
        throw new Error('Failed to delete user');
    }
};
exports.deleteUser = deleteUser;
const setCustomClaims = async (uid, claims) => {
    try {
        const auth = (0, exports.getAuth)();
        if (!auth) {
            throw new Error('Firebase Auth not initialized');
        }
        await auth.setCustomUserClaims(uid, claims);
    }
    catch (error) {
        console.error('Error setting custom claims:', error);
        throw new Error('Failed to set custom claims');
    }
};
exports.setCustomClaims = setCustomClaims;
const sendPasswordResetEmail = async (email) => {
    try {
        const auth = (0, exports.getAuth)();
        if (!auth) {
            throw new Error('Firebase Auth not initialized');
        }
        const resetLink = await auth.generatePasswordResetLink(email);
        console.log('Password reset link generated for:', email);
        console.log('Reset link:', resetLink);
    }
    catch (error) {
        console.error('Error sending password reset email:', error);
        throw new Error('Failed to send password reset email');
    }
};
exports.sendPasswordResetEmail = sendPasswordResetEmail;
const verifyPasswordResetCode = async (oobCode) => {
    try {
        console.log('Verifying password reset code:', oobCode);
        return 'user@example.com';
    }
    catch (error) {
        console.error('Error verifying password reset code:', error);
        throw new Error('Invalid or expired password reset code');
    }
};
exports.verifyPasswordResetCode = verifyPasswordResetCode;
const confirmPasswordReset = async (oobCode, newPassword) => {
    try {
        console.log('Confirming password reset for code:', oobCode);
        console.log('New password length:', newPassword.length);
    }
    catch (error) {
        console.error('Error confirming password reset:', error);
        throw new Error('Failed to reset password');
    }
};
exports.confirmPasswordReset = confirmPasswordReset;
const getUserProviderData = (userRecord) => {
    return userRecord.providerData.map(provider => ({
        providerId: provider.providerId,
        uid: provider.uid,
        email: provider.email,
        displayName: provider.displayName,
        photoURL: provider.photoURL,
    }));
};
exports.getUserProviderData = getUserProviderData;
const getUserByEmail = async (email) => {
    try {
        const auth = (0, exports.getAuth)();
        if (!auth) {
            throw new Error('Firebase Auth not initialized');
        }
        const userRecord = await auth.getUserByEmail(email);
        return userRecord;
    }
    catch (error) {
        if (error.code === 'auth/user-not-found') {
            return null;
        }
        console.error('Error getting user by email:', error);
        throw new Error('Failed to check user existence');
    }
};
exports.getUserByEmail = getUserByEmail;
exports.default = {
    initializeFirebaseAdmin: exports.initializeFirebaseAdmin,
    getFirebaseAdmin: exports.getFirebaseAdmin,
    getAuth: exports.getAuth,
    getFirestore: exports.getFirestore,
    verifyIdToken: exports.verifyIdToken,
    createCustomToken: exports.createCustomToken,
    getUserByUid: exports.getUserByUid,
    createUser: exports.createUser,
    updateUser: exports.updateUser,
    deleteUser: exports.deleteUser,
    setCustomClaims: exports.setCustomClaims,
    sendPasswordResetEmail: exports.sendPasswordResetEmail,
    verifyPasswordResetCode: exports.verifyPasswordResetCode,
    confirmPasswordReset: exports.confirmPasswordReset,
    getUserProviderData: exports.getUserProviderData,
    getUserByEmail: exports.getUserByEmail,
};
//# sourceMappingURL=firebaseAdmin.js.map