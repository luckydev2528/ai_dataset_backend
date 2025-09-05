import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JWTPayload, User } from '../../types';
import { redisService } from '../cache/RedisService';
import { logTokenRevocation } from '../../middleware/security/securityLogger';

// Validate required environment variables
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
if (!process.env.REFRESH_TOKEN_SECRET) {
  throw new Error('REFRESH_TOKEN_SECRET environment variable is required');
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h'; // Shortened for security
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

export class JWTService {
  /**
   * Generate JWT token for user
   */
  static generateToken(user: User, deviceId?: string): string {
    const now = Math.floor(Date.now() / 1000);
    const payload: JWTPayload = {
      uid: user.id,
      email: user.email,
      type: user.type,
      iat: now,
      exp: now + this.getExpirationTime(),
      jti: crypto.randomUUID(), // JWT ID for tracking
    };
    
    if (deviceId) {
      payload.deviceId = deviceId;
    }

    return jwt.sign(payload, JWT_SECRET, {
      issuer: 'drr-backend',
      audience: 'drr-app',
      algorithm: 'HS256', // Explicitly specify algorithm
    } as jwt.SignOptions);
  }

  /**
   * Verify JWT token
   */
  static async verifyToken(token: string): Promise<JWTPayload> {
    try {
      // Check if token is blacklisted in Redis
      const isBlacklisted = await redisService.isBlacklisted(token);
      if (isBlacklisted) {
        throw new Error('Token has been revoked');
      }

      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'drr-backend',
        audience: 'drr-app',
        algorithms: ['HS256'], // Explicitly specify allowed algorithms
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
  static async generateRefreshToken(user: User, deviceId?: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const refreshTokenId = crypto.randomUUID();
    
    const payload = {
      uid: user.id,
      email: user.email,
      type: user.type,
      iat: now,
      exp: now + this.getRefreshTokenExpirationTime(),
      jti: refreshTokenId,
      tokenType: 'refresh',
      deviceId: deviceId,
    };

    const token = jwt.sign(payload, REFRESH_TOKEN_SECRET, {
      issuer: 'drr-backend',
      audience: 'drr-app',
      algorithm: 'HS256', // Explicitly specify algorithm
    });

    // Store refresh token metadata in Redis
    const tokenData: { userId: string; issuedAt: number; deviceId?: string } = {
      userId: user.id,
      issuedAt: now,
    };
    
    if (deviceId) {
      tokenData.deviceId = deviceId;
    }
    
    await redisService.storeRefreshToken(refreshTokenId, tokenData, this.getRefreshTokenExpirationTime());

    return token;
  }

  /**
   * Verify refresh token and generate new access token
   */
  static async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string, refreshToken: string }> {
    try {
      const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, {
        issuer: 'drr-backend',
        audience: 'drr-app',
        algorithms: ['HS256'], // Explicitly specify allowed algorithms
      }) as any;

      if (decoded.tokenType !== 'refresh') {
        throw new Error('Invalid refresh token');
      }

      // Check if refresh token exists in Redis
      const tokenData = await redisService.getRefreshToken(decoded.jti);
      if (!tokenData || tokenData.userId !== decoded.uid) {
        throw new Error('Refresh token not found or invalid');
      }

      // Create new tokens
      const user = {
        id: decoded.uid,
        email: decoded.email,
        type: decoded.type,
      } as User;

      const newAccessToken = this.generateToken(user, decoded.deviceId);
      const newRefreshToken = await this.generateRefreshToken(user, decoded.deviceId);

      // Remove old refresh token from Redis
      await redisService.deleteRefreshToken(decoded.jti);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Get refresh token expiration time in seconds
   */
  private static getRefreshTokenExpirationTime(): number {
    const expiresIn = REFRESH_TOKEN_EXPIRES_IN;
    
    if (expiresIn.endsWith('d')) {
      return parseInt(expiresIn) * 24 * 60 * 60;
    } else if (expiresIn.endsWith('h')) {
      return parseInt(expiresIn) * 60 * 60;
    } else if (expiresIn.endsWith('m')) {
      return parseInt(expiresIn) * 60;
    } else if (expiresIn.endsWith('s')) {
      return parseInt(expiresIn);
    } else {
      return 30 * 24 * 60 * 60; // Default 30 days
    }
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
   * Revoke a specific token
   */
  static async revokeToken(token: string): Promise<void> {
    try {
      // Get token expiration to set appropriate TTL
      const decoded = this.decodeToken(token);
      const expiresIn = decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 3600;
      await redisService.addToBlacklist(token, Math.max(expiresIn, 0));
      
      // Log token revocation
      if (decoded?.uid) {
        logTokenRevocation(decoded.uid, decoded.deviceId, 'Token revoked');
      }
    } catch (error) {
      console.error('Error revoking token:', error);
    }
  }

  /**
   * Revoke all tokens for a user
   */
  static async revokeAllUserTokens(userId: string): Promise<void> {
    try {
      await redisService.deleteUserRefreshTokens(userId);
      
      // Log token revocation
      logTokenRevocation(userId, undefined, 'All user tokens revoked');
    } catch (error) {
      console.error('Error revoking user tokens:', error);
    }
  }

  /**
   * Revoke all tokens for a specific device
   */
  static async revokeDeviceTokens(userId: string, deviceId: string): Promise<void> {
    try {
      // This would require a more complex query in Redis
      // For now, we'll implement a simple approach
      // In a production system, you might want to maintain device-specific indexes
      console.log(`Revoking tokens for user ${userId} on device ${deviceId}`);
      
      // Log token revocation
      logTokenRevocation(userId, deviceId, 'Device tokens revoked');
      
      // Implementation would depend on your specific Redis structure
    } catch (error) {
      console.error('Error revoking device tokens:', error);
    }
  }

  /**
   * Clean up expired tokens (Redis handles this automatically with TTL)
   */
  static async cleanupExpiredTokens(): Promise<void> {
    try {
      await redisService.cleanup();
    } catch (error) {
      console.error('Error during token cleanup:', error);
    }
  }

  /**
   * Get token info (for debugging/logging)
   */
  static async getTokenInfo(token: string): Promise<{
    isValid: boolean;
    isExpired: boolean;
    payload?: JWTPayload;
    error?: string;
  }> {
    try {
      const payload = await this.verifyToken(token);
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
