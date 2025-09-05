import { JWTPayload, User } from '../types';
export declare class JWTService {
    static generateToken(user: User): string;
    static verifyToken(token: string): JWTPayload;
    static decodeToken(token: string): JWTPayload | null;
    static isTokenExpired(token: string): boolean;
    private static getExpirationTime;
    static generateRefreshToken(user: User): string;
    static extractTokenFromHeader(authHeader: string | undefined): string | null;
    static getTokenInfo(token: string): {
        isValid: boolean;
        isExpired: boolean;
        payload?: JWTPayload;
        error?: string;
    };
}
export default JWTService;
//# sourceMappingURL=jwtService.d.ts.map