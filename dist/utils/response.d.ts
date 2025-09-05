import { Response } from 'express';
export declare const sendSuccess: (res: Response, data?: any, message?: string, statusCode?: number) => void;
export declare const sendError: (res: Response, message?: string, statusCode?: number, error?: string) => void;
export declare const sendValidationError: (res: Response, errors: any[], message?: string) => void;
export declare const sendNotFound: (res: Response, message?: string) => void;
export declare const sendUnauthorized: (res: Response, message?: string) => void;
export declare const sendForbidden: (res: Response, message?: string) => void;
export declare const sendConflict: (res: Response, message?: string) => void;
export declare const sendRateLimit: (res: Response, message?: string) => void;
export declare const sendPaginated: (res: Response, data: any[], total: number, page: number, limit: number, message?: string) => void;
export declare const sendCreated: (res: Response, data?: any, message?: string) => void;
export declare const sendNoContent: (res: Response) => void;
export declare const sendAccepted: (res: Response, data?: any, message?: string) => void;
//# sourceMappingURL=response.d.ts.map