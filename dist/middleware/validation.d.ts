import { Request, Response, NextFunction } from 'express';
import { ValidationChain } from 'express-validator';
export declare const handleValidationErrors: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateEmail: () => ValidationChain;
export declare const validatePassword: () => ValidationChain;
export declare const validateName: () => ValidationChain;
export declare const validateLogin: () => ValidationChain[];
export declare const validateRegistration: () => ValidationChain[];
export declare const validateSocialAuth: () => ValidationChain[];
export declare const validatePasswordReset: () => ValidationChain;
export declare const validatePasswordResetConfirm: () => ValidationChain[];
export declare const validateUserUpdate: () => ValidationChain[];
export declare const validateString: (field: string, minLength?: number, maxLength?: number) => ValidationChain;
export declare const validateRequired: (field: string) => ValidationChain;
export declare const validateOptional: (field: string, type?: "string" | "email" | "url") => ValidationChain;
export declare const sanitizeInput: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=validation.d.ts.map