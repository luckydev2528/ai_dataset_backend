import admin from 'firebase-admin';
import { CustomClaims, SocialProviderData } from '../types';
export declare const initializeFirebaseAdmin: () => admin.app.App | null;
export declare const getFirebaseAdmin: () => admin.app.App | null;
export declare const getAuth: () => admin.auth.Auth | null;
export declare const getFirestore: () => admin.firestore.Firestore | null;
export declare const verifyIdToken: (idToken: string) => Promise<admin.auth.DecodedIdToken>;
export declare const createCustomToken: (uid: string, additionalClaims?: CustomClaims) => Promise<string>;
export declare const getUserByUid: (uid: string) => Promise<admin.auth.UserRecord>;
export declare const createUser: (userData: {
    email: string;
    password?: string;
    displayName?: string;
    photoURL?: string;
    disabled?: boolean;
}) => Promise<admin.auth.UserRecord>;
export declare const updateUser: (uid: string, userData: {
    email?: string;
    displayName?: string;
    photoURL?: string;
    disabled?: boolean;
}) => Promise<admin.auth.UserRecord>;
export declare const deleteUser: (uid: string) => Promise<void>;
export declare const setCustomClaims: (uid: string, claims: CustomClaims) => Promise<void>;
export declare const sendPasswordResetEmail: (email: string) => Promise<void>;
export declare const verifyPasswordResetCode: (oobCode: string) => Promise<string>;
export declare const confirmPasswordReset: (oobCode: string, newPassword: string) => Promise<void>;
export declare const getUserProviderData: (userRecord: admin.auth.UserRecord) => SocialProviderData[];
export declare const getUserByEmail: (email: string) => Promise<admin.auth.UserRecord | null>;
declare const _default: {
    initializeFirebaseAdmin: () => admin.app.App | null;
    getFirebaseAdmin: () => admin.app.App | null;
    getAuth: () => admin.auth.Auth | null;
    getFirestore: () => admin.firestore.Firestore | null;
    verifyIdToken: (idToken: string) => Promise<admin.auth.DecodedIdToken>;
    createCustomToken: (uid: string, additionalClaims?: CustomClaims) => Promise<string>;
    getUserByUid: (uid: string) => Promise<admin.auth.UserRecord>;
    createUser: (userData: {
        email: string;
        password?: string;
        displayName?: string;
        photoURL?: string;
        disabled?: boolean;
    }) => Promise<admin.auth.UserRecord>;
    updateUser: (uid: string, userData: {
        email?: string;
        displayName?: string;
        photoURL?: string;
        disabled?: boolean;
    }) => Promise<admin.auth.UserRecord>;
    deleteUser: (uid: string) => Promise<void>;
    setCustomClaims: (uid: string, claims: CustomClaims) => Promise<void>;
    sendPasswordResetEmail: (email: string) => Promise<void>;
    verifyPasswordResetCode: (oobCode: string) => Promise<string>;
    confirmPasswordReset: (oobCode: string, newPassword: string) => Promise<void>;
    getUserProviderData: (userRecord: admin.auth.UserRecord) => SocialProviderData[];
    getUserByEmail: (email: string) => Promise<admin.auth.UserRecord | null>;
};
export default _default;
//# sourceMappingURL=firebaseAdmin.d.ts.map