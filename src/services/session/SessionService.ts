import { JWTService } from '../auth/jwtService';
import { redisService } from '../cache/RedisService';
import { UserModel } from '../database/models/userModel';

export interface SessionInfo {
  sessionId: string;
  userId: string;
  deviceId?: string;
  deviceInfo?: {
    platform: string;
    version: string;
    model: string;
    brand: string;
  };
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActiveAt: Date;
  isActive: boolean;
}

export class SessionService {
  /**
   * Create a new session
   */
  static async createSession(
    userId: string,
    deviceId: string,
    ipAddress: string,
    userAgent: string,
    deviceInfo?: any
  ): Promise<string> {
    // Check if this is a new device BEFORE creating the session
    let isNewDevice = false;
    try {
      const existingSessions = await this.getUserSessions(userId);
      const currentDeviceCount = await this.getDeviceCount(userId);
      
      console.log(`🔍 Device check for user ${userId}: current count=${currentDeviceCount}, existing sessions=${existingSessions.length}`);
      
      // Check if any existing session has the same device ID
      isNewDevice = !existingSessions.some(s => s.deviceId === deviceId);
      
      if (isNewDevice) {
        console.log(`🆕 New device detected for user ${userId}: ${deviceId} (count will be ${currentDeviceCount + 1})`);
        await UserModel.incrementDeviceCount(userId);
      } else {
        console.log(`🔄 Existing device for user ${userId}: ${deviceId} (count remains ${currentDeviceCount})`);
      }
    } catch (error) {
      console.warn('Failed to check/increment device count:', error);
      // Assume it's a new device if we can't check
      isNewDevice = true;
      try {
        await UserModel.incrementDeviceCount(userId);
      } catch (incrementError) {
        console.warn('Failed to increment device count:', incrementError);
      }
    }

    const sessionId = this.generateSessionId();
    const now = new Date();
    
    const session: SessionInfo = {
      sessionId,
      userId,
      deviceId,
      deviceInfo,
      ipAddress,
      userAgent,
      createdAt: now,
      lastActiveAt: now,
      isActive: true,
    };
    
    // Retry logic for Redis storage with exponential backoff
    let retries = 3;
    let lastError: any;
    
    while (retries > 0) {
      try {
        await redisService.storeSession(sessionId, session);
        
        // Verify session was stored successfully
        const storedSession = await redisService.getSession(sessionId);
        if (!storedSession) {
          throw new Error('Session storage verification failed');
        }
        
        console.log(`✅ Session stored successfully: ${sessionId}`);
        break; // Success
      } catch (error) {
        lastError = error;
        retries--;
        
        if (retries === 0) {
          console.error(`❌ Failed to store session after 3 retries: ${sessionId}`, error);
          throw new Error(`Session storage failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        // Exponential backoff: 200ms, 400ms, 800ms
        const delay = 200 * Math.pow(2, 3 - retries);
        console.warn(`⚠️ Session storage attempt failed, retrying in ${delay}ms (${retries} retries left)`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // Increment session count for the user
    try {
      await UserModel.incrementSessionCount(userId);
    } catch (error) {
      console.warn('Failed to increment session count:', error);
    }
    
    // Clean up old sessions for this user (keep only last 5 sessions per user)
    await this.cleanupOldSessions(userId);
    
    return sessionId;
  }

  /**
   * Update session activity
   */
  static async updateSessionActivity(sessionId: string): Promise<boolean> {
    const session = await redisService.getSession(sessionId);
    if (session && session.isActive) {
      await redisService.updateSession(sessionId, { lastActiveAt: new Date() });
      return true;
    }
    return false;
  }

  /**
   * Get session info
   */
  static async getSession(sessionId: string): Promise<SessionInfo | null> {
    return await redisService.getSession(sessionId);
  }

  /**
   * Get all active sessions for a user
   */
  static async getUserSessions(userId: string): Promise<SessionInfo[]> {
    const sessions = await redisService.getUserSessions(userId);
    const activeSessions = sessions.filter(session => session.isActive);
    console.log(`📊 Found ${activeSessions.length} active sessions for user ${userId}:`, 
      activeSessions.map(s => ({ deviceId: s.deviceId, createdAt: s.createdAt })));
    return activeSessions;
  }

  /**
   * Revoke a specific session
   */
  static async revokeSession(sessionId: string): Promise<boolean> {
    const session = await redisService.getSession(sessionId);
    if (session) {
      await redisService.updateSession(sessionId, { isActive: false });
      
      // Decrement session count
      try {
        await UserModel.decrementSessionCount(session.userId);
      } catch (error) {
        console.warn('Failed to decrement session count:', error);
      }
      
      // Check if this was the last session for this device and decrement device count
      try {
        const remainingSessions = await this.getUserSessions(session.userId);
        const hasOtherSessionsOnDevice = remainingSessions.some(s => s.deviceId === session.deviceId);
        
        if (!hasOtherSessionsOnDevice && session.deviceId) {
          await UserModel.decrementDeviceCount(session.userId);
        }
      } catch (error) {
        console.warn('Failed to check/decrement device count:', error);
      }
      
      // Also revoke associated tokens
      if (session.deviceId) {
        // session.userId is now Firebase UID, which matches JWT tokens
        await JWTService.revokeDeviceTokens(session.userId, session.deviceId);
      }
      
      return true;
    }
    return false;
  }

  /**
   * Revoke all sessions for a user
   */
  static async revokeAllUserSessions(userId: string): Promise<number> {
    const sessions = await redisService.getUserSessions(userId);
    let revokedCount = 0;
    
    for (const session of sessions) {
      if (session.isActive) {
        await redisService.updateSession(session.sessionId, { isActive: false });
        revokedCount++;
      }
    }
    
    // Reset counters to 0 since all sessions are revoked
    try {
      const user = await UserModel.getByUid(userId);
      if (user) {
        await UserModel.update(user.id, {
          sessionCount: 0,
          deviceCount: 0
        });
      }
    } catch (error) {
      console.warn('Failed to reset counters:', error);
    }
    
    // Also revoke all JWT tokens for the user (userId is now Firebase UID)
    await JWTService.revokeAllUserTokens(userId);
    
    return revokedCount;
  }

  /**
   * Revoke all sessions except the current one
   */
  static async revokeOtherSessions(userId: string, currentSessionId: string): Promise<number> {
    const sessions = await redisService.getUserSessions(userId);
    let revokedCount = 0;
    
    for (const session of sessions) {
      if (session.sessionId !== currentSessionId && session.isActive) {
        await redisService.updateSession(session.sessionId, { isActive: false });
        revokedCount++;
        
        // Revoke tokens for this device (userId is now Firebase UID)
        if (session.deviceId) {
          await JWTService.revokeDeviceTokens(userId, session.deviceId);
        }
      }
    }
    
    return revokedCount;
  }

  /**
   * Clean up expired sessions (Redis handles TTL automatically)
   */
  static async cleanupExpiredSessions(): Promise<number> {
    // Redis automatically handles expiration with TTL
    // This method is kept for compatibility but doesn't need to do anything
    console.log('🧹 Session cleanup completed (handled by Redis TTL)');
    return 0;
  }

  /**
   * Clean up old sessions for a user (keep only the most recent ones)
   */
  private static async cleanupOldSessions(userId: string, keepCount: number = 5): Promise<void> {
    const userSessions = await this.getUserSessions(userId);
    
    if (userSessions.length > keepCount) {
      const sessionsToRemove = userSessions.slice(keepCount);
      
      for (const session of sessionsToRemove) {
        await this.revokeSession(session.sessionId);
      }
    }
  }

  /**
   * Generate a unique session ID
   */
  private static generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Get session statistics
   */
  static async getSessionStats(): Promise<{
    totalSessions: number;
    activeSessions: number;
    inactiveSessions: number;
    uniqueUsers: number;
  }> {
    // This method needs to be implemented with Redis data
    // For now, return default values
    return {
      totalSessions: 0,
      activeSessions: 0,
      inactiveSessions: 0,
      uniqueUsers: 0,
    };
  }

  /**
   * Get device count for a user (for debugging)
   */
  static async getDeviceCount(userId: string): Promise<number> {
    try {
      const user = await UserModel.getByUid(userId);
      return user?.deviceCount || 0;
    } catch (error) {
      console.warn('Failed to get device count:', error);
      return 0;
    }
  }

  /**
   * Check if session is from a suspicious IP or device
   */
  static isSuspiciousSession(session: SessionInfo, userSessions: SessionInfo[]): boolean {
    // Check for multiple sessions from different IPs
    const uniqueIPs = new Set(userSessions.map(s => s.ipAddress));
    if (uniqueIPs.size > 3) {
      return true;
    }
    
    // Check for sessions from different platforms simultaneously
    const activePlatforms = new Set(
      userSessions
        .filter(s => s.isActive && s.deviceInfo?.platform)
        .map(s => s.deviceInfo?.platform)
    );
    if (activePlatforms.size > 2) {
      return true;
    }
    
    return false;
  }
}

// Periodic cleanup of expired sessions
setInterval(async () => {
  const cleaned = await SessionService.cleanupExpiredSessions();
  if (cleaned > 0) {
    console.log(`🧹 Cleaned up ${cleaned} expired sessions`);
  }
}, 60 * 60 * 1000); // Run every hour

export default SessionService;
