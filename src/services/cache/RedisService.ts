import Redis, { RedisOptions } from 'ioredis';

export class RedisService {
  private static instance: RedisService;
  private redis: Redis;
  private isConnected: boolean = false;

  private constructor() {
    const redisConfig: RedisOptions = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
      db: parseInt(process.env.REDIS_DB || '0'),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 10000,
      commandTimeout: 5000,
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'drr:',
    };

    this.redis = new Redis(redisConfig);
    this.setupEventHandlers();
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      console.log('✅ Redis connected successfully');
      this.isConnected = true;
    });

    this.redis.on('ready', () => {
      console.log('🚀 Redis is ready to accept commands');
    });

    this.redis.on('error', (error) => {
      console.error('❌ Redis connection error:', error);
      this.isConnected = false;
    });

    this.redis.on('close', () => {
      console.log('🔌 Redis connection closed');
      this.isConnected = false;
    });

    this.redis.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });
  }

  public async connect(): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.redis.connect();
      }
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.redis.disconnect();
      this.isConnected = false;
    } catch (error) {
      console.error('Error disconnecting from Redis:', error);
    }
  }

  public isReady(): boolean {
    return this.isConnected && this.redis.status === 'ready';
  }

  // Token Blacklist Operations
  public async addToBlacklist(token: string, expiresIn: number = 3600): Promise<void> {
    try {
      await this.redis.setex(`blacklist:${token}`, expiresIn, '1');
    } catch (error) {
      console.error('Error adding token to blacklist:', error);
      throw error;
    }
  }

  public async isBlacklisted(token: string): Promise<boolean> {
    try {
      const result = await this.redis.get(`blacklist:${token}`);
      return result === '1';
    } catch (error) {
      console.error('Error checking token blacklist:', error);
      return false; // Fail open for availability
    }
  }

  public async removeFromBlacklist(token: string): Promise<void> {
    try {
      await this.redis.del(`blacklist:${token}`);
    } catch (error) {
      console.error('Error removing token from blacklist:', error);
    }
  }

  // Refresh Token Storage
  public async storeRefreshToken(
    tokenId: string, 
    data: { userId: string; issuedAt: number; deviceId?: string },
    expiresIn: number = 30 * 24 * 3600 // 30 days
  ): Promise<void> {
    try {
      await this.redis.setex(
        `refresh_token:${tokenId}`,
        expiresIn,
        JSON.stringify(data)
      );
    } catch (error) {
      console.error('Error storing refresh token:', error);
      throw error;
    }
  }

  public async getRefreshToken(tokenId: string): Promise<{ userId: string; issuedAt: number; deviceId?: string } | null> {
    try {
      const result = await this.redis.get(`refresh_token:${tokenId}`);
      return result ? JSON.parse(result) : null;
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  }

  public async deleteRefreshToken(tokenId: string): Promise<void> {
    try {
      await this.redis.del(`refresh_token:${tokenId}`);
    } catch (error) {
      console.error('Error deleting refresh token:', error);
    }
  }

  public async deleteUserRefreshTokens(userId: string): Promise<void> {
    try {
      const keys = await this.redis.keys(`refresh_token:*`);
      const pipeline = this.redis.pipeline();
      
      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const tokenData = JSON.parse(data);
          if (tokenData.userId === userId) {
            pipeline.del(key);
          }
        }
      }
      
      await pipeline.exec();
    } catch (error) {
      console.error('Error deleting user refresh tokens:', error);
    }
  }

  // Session Storage
  public async storeSession(
    sessionId: string,
    sessionData: any,
    expiresIn: number = 30 * 24 * 3600 // 30 days
  ): Promise<void> {
    try {
      const key = `drr:session:${sessionId}`;
      console.log(`🔍 Redis storeSession: Storing session ${key} for user ${sessionData.userId}, device ${sessionData.deviceId}`);
      
      await this.redis.setex(
        key,
        expiresIn,
        JSON.stringify(sessionData)
      );
      
      // Verify the session was stored
      const stored = await this.redis.get(key);
      if (stored) {
        console.log(`✅ Redis storeSession: Session ${key} stored successfully`);
      } else {
        console.error(`❌ Redis storeSession: Failed to verify session ${key} was stored`);
      }
    } catch (error) {
      console.error('Error storing session:', error);
      throw error;
    }
  }

  public async getSession(sessionId: string): Promise<any | null> {
    try {
      const result = await this.redis.get(`drr:session:${sessionId}`);
      return result ? JSON.parse(result) : null;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  public async updateSession(sessionId: string, updates: any): Promise<void> {
    try {
      const existing = await this.getSession(sessionId);
      if (existing) {
        const updated = { ...existing, ...updates };
        const ttl = await this.redis.ttl(`session:${sessionId}`);
        await this.redis.setex(
          `session:${sessionId}`,
          ttl > 0 ? ttl : 30 * 24 * 3600,
          JSON.stringify(updated)
        );
      }
    } catch (error) {
      console.error('Error updating session:', error);
    }
  }

  public async deleteSession(sessionId: string): Promise<void> {
    try {
      await this.redis.del(`drr:session:${sessionId}`);
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  }

  public async getUserSessions(userId: string): Promise<any[]> {
    try {
      // Use the correct key pattern with drr: prefix
      const keys = await this.redis.keys(`drr:session:*`);
      console.log(`🔍 Redis getUserSessions: Found ${keys.length} session keys for user ${userId}`);
      
      const sessions: any[] = [];
      
      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const sessionData = JSON.parse(data);
          console.log(`🔍 Redis session key ${key}: userId=${sessionData.userId}, deviceId=${sessionData.deviceId}, isActive=${sessionData.isActive}`);
          if (sessionData.userId === userId) {
            sessions.push(sessionData);
          }
        }
      }
      
      console.log(`🔍 Redis getUserSessions: Returning ${sessions.length} sessions for user ${userId}`);
      return sessions.sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime());
    } catch (error) {
      console.error('Error getting user sessions:', error);
      return [];
    }
  }

  public async deleteUserSessions(userId: string): Promise<number> {
    try {
      const keys = await this.redis.keys(`drr:session:*`);
      const pipeline = this.redis.pipeline();
      let deletedCount = 0;
      
      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const sessionData = JSON.parse(data);
          if (sessionData.userId === userId) {
            pipeline.del(key);
            deletedCount++;
          }
        }
      }
      
      await pipeline.exec();
      return deletedCount;
    } catch (error) {
      console.error('Error deleting user sessions:', error);
      return 0;
    }
  }

  // Rate Limiting
  public async incrementRateLimit(
    key: string,
    windowMs: number,
    maxRequests: number
  ): Promise<{ count: number; ttl: number; isAllowed: boolean }> {
    try {
      const multi = this.redis.multi();
      multi.incr(`rate_limit:${key}`);
      multi.expire(`rate_limit:${key}`, Math.ceil(windowMs / 1000));
      multi.ttl(`rate_limit:${key}`);
      
      const results = await multi.exec();
      const count = results?.[0]?.[1] as number || 0;
      const ttl = results?.[2]?.[1] as number || 0;
      
      return {
        count,
        ttl: ttl * 1000, // Convert to milliseconds
        isAllowed: count <= maxRequests,
      };
    } catch (error) {
      console.error('Error checking rate limit:', error);
      // Fail open for availability
      return { count: 0, ttl: 0, isAllowed: true };
    }
  }

  // Caching Operations
  public async set(key: string, value: any, expiresIn?: number): Promise<void> {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      if (expiresIn) {
        await this.redis.setex(`cache:${key}`, expiresIn, serialized);
      } else {
        await this.redis.set(`cache:${key}`, serialized);
      }
    } catch (error) {
      console.error('Error setting cache:', error);
    }
  }

  public async get<T = any>(key: string): Promise<T | null> {
    try {
      const result = await this.redis.get(`cache:${key}`);
      if (!result) return null;
      
      try {
        return JSON.parse(result);
      } catch {
        return result as T;
      }
    } catch (error) {
      console.error('Error getting cache:', error);
      return null;
    }
  }

  public async del(key: string): Promise<void> {
    try {
      await this.redis.del(`cache:${key}`);
    } catch (error) {
      console.error('Error deleting cache:', error);
    }
  }

  public async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(`cache:${key}`);
      return result === 1;
    } catch (error) {
      console.error('Error checking cache existence:', error);
      return false;
    }
  }

  // Health Check
  public async healthCheck(): Promise<{ status: string; latency: number }> {
    const start = Date.now();
    try {
      await this.redis.ping();
      const latency = Date.now() - start;
      return { status: 'healthy', latency };
    } catch (error) {
      const latency = Date.now() - start;
      return { status: 'unhealthy', latency };
    }
  }

  // Cleanup expired keys (called periodically)
  public async cleanup(): Promise<void> {
    try {
      // Redis automatically handles TTL, but we can add custom cleanup logic here
      console.log('🧹 Redis cleanup completed');
    } catch (error) {
      console.error('Error during Redis cleanup:', error);
    }
  }

  // Get Redis client for advanced operations
  public getClient(): Redis {
    return this.redis;
  }

  // Debug method to check what's actually in Redis
  public async debugRedisKeys(): Promise<void> {
    try {
      const allKeys = await this.redis.keys(`*`);
      console.log(`🔍 Redis Debug: Found ${allKeys.length} total keys:`, allKeys);
      
      for (const key of allKeys) {
        const data = await this.redis.get(key);
        console.log(`🔍 Redis Debug: Key ${key} = ${data ? 'EXISTS' : 'NULL'}`);
      }
    } catch (error) {
      console.error('Error debugging Redis keys:', error);
    }
  }
}

// Export singleton instance
export const redisService = RedisService.getInstance();
export default redisService;
