import { Request } from 'express';

// User Types
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

// Authentication Types
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

// JWT Payload
export interface JWTPayload {
  uid: string;
  email: string;
  type: 'email' | 'google' | 'twitter' | 'facebook';
  iat: number;
  exp: number;
}

// Express Request with User
export interface AuthenticatedRequest extends Request {
  user?: User;
  firebaseUser?: any;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T | undefined;
  error?: string | undefined;
  timestamp: string;
}

// Error Types
export interface ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
}

// Social Auth Provider Data
export interface SocialProviderData {
  providerId: string;
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
}

// Firebase Custom Claims
export interface CustomClaims {
  role?: string;
  permissions?: string[];
  provider?: string;
}

// Validation Error
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Rate Limit Info
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

// Health Check Response
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
