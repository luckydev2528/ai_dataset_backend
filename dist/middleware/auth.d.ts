import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
export declare const authenticateJWT: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const authenticateFirebase: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const optionalAuth: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const requireRole: (roles: string[]) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export declare const userRateLimit: (maxRequests: number, windowMs: number) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map