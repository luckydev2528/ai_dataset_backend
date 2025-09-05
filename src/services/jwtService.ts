import jwt from 'jsonwebtoken';
import { JWTPayload, User } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-here';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export class JWTService {
  /**
   * Generate JWT token for user
   */
  static generateToken(user: User): string {
    const payload: JWTPayload = {
      uid: user.id,
      email: user.email,
      type: user.type,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.getExpirationTime(),
    };

    return jwt.sign(payload, JWT_SECRET, {
      issuer: 'drr-backend',
      audience: 'drr-app',
    } as jwt.SignOptions);
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'drr-backend',
        audience: 'drr-app',
      }) as JWTPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  /**
   * Decode JWT token without verification (for debugging)
   */
  static decodeToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string): boolean {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) {
        return true;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  /**
   * Get token expiration time in seconds
   */
  private static getExpirationTime(): number {
    const expiresIn = JWT_EXPIRES_IN;
    
    if (expiresIn.endsWith('d')) {
      return parseInt(expiresIn) * 24 * 60 * 60; // days to seconds
    } else if (expiresIn.endsWith('h')) {
      return parseInt(expiresIn) * 60 * 60; // hours to seconds
    } else if (expiresIn.endsWith('m')) {
      return parseInt(expiresIn) * 60; // minutes to seconds
    } else if (expiresIn.endsWith('s')) {
      return parseInt(expiresIn); // already in seconds
    } else {
      // Default to 7 days if format is not recognized
      return 7 * 24 * 60 * 60;
    }
  }

  /**
   * Generate refresh token (longer expiration)
   */
  static generateRefreshToken(user: User): string {
    const payload: JWTPayload = {
      uid: user.id,
      email: user.email,
      type: user.type,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
    };

    return jwt.sign(payload, JWT_SECRET, {
      issuer: 'drr-backend',
      audience: 'drr-app',
    });
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1] || null;
  }

  /**
   * Get token info (for debugging/logging)
   */
  static getTokenInfo(token: string): {
    isValid: boolean;
    isExpired: boolean;
    payload?: JWTPayload;
    error?: string;
  } {
    try {
      const payload = this.verifyToken(token);
      return {
        isValid: true,
        isExpired: false,
        payload,
      };
    } catch (error) {
      return {
        isValid: false,
        isExpired: error instanceof jwt.TokenExpiredError,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export default JWTService;
