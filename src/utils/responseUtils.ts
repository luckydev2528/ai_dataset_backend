import { ApiResponse } from '../types';

/**
 * Create a successful API response
 */
export const createSuccessResponse = (
  message: string,
  data?: any,
  statusCode: number = 200
): { response: ApiResponse; statusCode: number } => {
  const response: ApiResponse = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
  
  return { response, statusCode };
};

/**
 * Create an error API response
 */
export const createErrorResponse = (
  message: string,
  error?: string,
  statusCode: number = 500
): { response: ApiResponse; statusCode: number } => {
  const response: ApiResponse = {
    success: false,
    message,
    error,
    timestamp: new Date().toISOString(),
  };
  
  return { response, statusCode };
};

/**
 * Create authentication success response
 */
export const createAuthSuccessResponse = (
  message: string,
  user: any,
  token: string,
  refreshToken: string,
  firebaseToken?: string
): { response: ApiResponse; statusCode: number } => {
  const data: any = {
    user,
    token,
    refreshToken,
  };
  
  if (firebaseToken) {
    data.firebaseToken = firebaseToken;
  }
  
  return createSuccessResponse(message, data);
};

/**
 * Create validation error response
 */
export const createValidationErrorResponse = (
  message: string,
  error?: string
): { response: ApiResponse; statusCode: number } => {
  return createErrorResponse(message, error, 400);
};

/**
 * Create not found error response
 */
export const createNotFoundErrorResponse = (
  message: string,
  error?: string
): { response: ApiResponse; statusCode: number } => {
  return createErrorResponse(message, error, 404);
};

/**
 * Create unauthorized error response
 */
export const createUnauthorizedErrorResponse = (
  message: string,
  error?: string
): { response: ApiResponse; statusCode: number } => {
  return createErrorResponse(message, error, 401);
};

/**
 * Create conflict error response
 */
export const createConflictErrorResponse = (
  message: string,
  error?: string
): { response: ApiResponse; statusCode: number } => {
  return createErrorResponse(message, error, 409);
};
