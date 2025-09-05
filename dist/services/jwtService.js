"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWTService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-here';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
class JWTService {
    static generateToken(user) {
        const payload = {
            uid: user.id,
            email: user.email,
            type: user.type,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + this.getExpirationTime(),
        };
        return jsonwebtoken_1.default.sign(payload, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN,
            issuer: 'drr-backend',
            audience: 'drr-app',
        });
    }
    static verifyToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET, {
                issuer: 'drr-backend',
                audience: 'drr-app',
            });
            return decoded;
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw new Error('Token has expired');
            }
            else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                throw new Error('Invalid token');
            }
            else {
                throw new Error('Token verification failed');
            }
        }
    }
    static decodeToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.decode(token);
            return decoded;
        }
        catch (error) {
            return null;
        }
    }
    static isTokenExpired(token) {
        try {
            const decoded = this.decodeToken(token);
            if (!decoded || !decoded.exp) {
                return true;
            }
            const currentTime = Math.floor(Date.now() / 1000);
            return decoded.exp < currentTime;
        }
        catch (error) {
            return true;
        }
    }
    static getExpirationTime() {
        const expiresIn = JWT_EXPIRES_IN;
        if (expiresIn.endsWith('d')) {
            return parseInt(expiresIn) * 24 * 60 * 60;
        }
        else if (expiresIn.endsWith('h')) {
            return parseInt(expiresIn) * 60 * 60;
        }
        else if (expiresIn.endsWith('m')) {
            return parseInt(expiresIn) * 60;
        }
        else if (expiresIn.endsWith('s')) {
            return parseInt(expiresIn);
        }
        else {
            return 7 * 24 * 60 * 60;
        }
    }
    static generateRefreshToken(user) {
        const payload = {
            uid: user.id,
            email: user.email,
            type: user.type,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
        };
        return jsonwebtoken_1.default.sign(payload, JWT_SECRET, {
            expiresIn: '30d',
            issuer: 'drr-backend',
            audience: 'drr-app',
        });
    }
    static extractTokenFromHeader(authHeader) {
        if (!authHeader) {
            return null;
        }
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return null;
        }
        return parts[1] || null;
    }
    static getTokenInfo(token) {
        try {
            const payload = this.verifyToken(token);
            return {
                isValid: true,
                isExpired: false,
                payload,
            };
        }
        catch (error) {
            return {
                isValid: false,
                isExpired: error instanceof jsonwebtoken_1.default.TokenExpiredError,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
}
exports.JWTService = JWTService;
exports.default = JWTService;
//# sourceMappingURL=jwtService.js.map