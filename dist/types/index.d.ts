import { Request } from 'express';
export interface User {
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
export interface CreateUserData {
    email: string;
    name: string;
    photo?: string;
    type: 'email' | 'google' | 'twitter' | 'facebook';
    firebaseUid: string;
}
export interface UpdateUserData {
    name?: string;
    photo?: string;
}
export interface AuthResponse {
    success: boolean;
    message: string;
    user?: User;
    token?: string;
}
export interface LoginRequest {
    email: string;
    password: string;
}
export interface RegisterRequest {
    email: string;
    password: string;
    name: string;
}
export interface SocialAuthRequest {
    idToken: string;
    provider: 'email' | 'google' | 'twitter' | 'facebook';
}
export interface PasswordResetRequest {
    email: string;
}
export interface PasswordResetConfirmRequest {
    oobCode: string;
    newPassword: string;
}
export interface JWTPayload {
    uid: string;
    email: string;
    type: 'email' | 'google' | 'twitter' | 'facebook';
    iat: number;
    exp: number;
    jti?: string;
    deviceId?: string;
}
export interface AuthenticatedRequest extends Request {
    user?: User;
    firebaseUser?: any;
}
export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T | undefined;
    error?: string | undefined;
    timestamp: string;
}
export interface ApiError extends Error {
    statusCode: number;
    isOperational: boolean;
}
export interface SocialProviderData {
    providerId: string;
    uid: string;
    email?: string;
    displayName?: string;
    photoURL?: string;
}
export interface CustomClaims {
    role?: string;
    permissions?: string[];
    provider?: string;
    screen_name?: string;
    twitter_id?: string;
    email?: string;
    [key: string]: any;
}
export interface ValidationError {
    field: string;
    message: string;
    value?: any;
}
export interface RateLimitInfo {
    limit: number;
    remaining: number;
    reset: number;
}
export interface HealthCheckResponse {
    status: string;
    timestamp: string;
    uptime: number;
    environment: string;
    memory: {
        used: number;
        total: number;
        percentage: number;
    };
    version: string;
}
//# sourceMappingURL=index.d.ts.map