import { Request, Response } from 'express';
export declare const register: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const login: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const socialAuth: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const sendPasswordReset: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const confirmPasswordReset: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const refreshToken: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const logout: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getProfile: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const verifyToken: (req: Request, res: Response, next: import("express").NextFunction) => void;
//# sourceMappingURL=authController.d.ts.map