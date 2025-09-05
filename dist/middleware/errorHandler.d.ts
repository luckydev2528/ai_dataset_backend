import { Request, Response, NextFunction } from 'express';
import { ApiResponse, ApiError } from '../../types';
export declare class AppError extends Error implements ApiError {
    statusCode: number;
    isOperational: boolean;
    constructor(message: string, statusCode?: number, isOperational?: boolean);
}
export declare const errorHandler: (error: Error | ApiError, req: Request, res: Response, next: NextFunction) => void;
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
export declare const notFoundHandler: (req: Request, res: Response, next: NextFunction) => void;
export declare const validationErrorHandler: (errors: any[]) => ApiResponse<any>;
export declare const handleUnhandledRejection: (reason: any, promise: Promise<any>) => void;
export declare const handleUncaughtException: (error: Error) => void;
//# sourceMappingURL=errorHandler.d.ts.map