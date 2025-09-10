/**
 * Shared API types for backend to eliminate duplication
 */

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ErrorResponse extends ApiResponse {
  success: false;
  error: string;
  details?: any;
}

export interface SuccessResponse<T = any> extends ApiResponse<T> {
  success: true;
  data: T;
}


