import { redisService } from './RedisService';

export class CacheService {
  /**
   * Cache user data
   */
  static async cacheUser(userId: string, userData: any, ttl: number = 3600): Promise<void> {
    try {
      await redisService.set(`user:${userId}`, userData, ttl);
    } catch (error) {
      console.error('Error caching user data:', error);
    }
  }

  /**
   * Get cached user data
   */
  static async getCachedUser(userId: string): Promise<any | null> {
    try {
      return await redisService.get(`user:${userId}`);
    } catch (error) {
      console.error('Error getting cached user data:', error);
      return null;
    }
  }

  /**
   * Cache Firebase user data
   */
  static async cacheFirebaseUser(uid: string, firebaseUserData: any, ttl: number = 1800): Promise<void> {
    try {
      await redisService.set(`firebase_user:${uid}`, firebaseUserData, ttl);
    } catch (error) {
      console.error('Error caching Firebase user data:', error);
    }
  }

  /**
   * Get cached Firebase user data
   */
  static async getCachedFirebaseUser(uid: string): Promise<any | null> {
    try {
      return await redisService.get(`firebase_user:${uid}`);
    } catch (error) {
      console.error('Error getting cached Firebase user data:', error);
      return null;
    }
  }

  /**
   * Cache API response
   */
  static async cacheApiResponse(
    endpoint: string, 
    params: any, 
    response: any, 
    ttl: number = 300
  ): Promise<void> {
    try {
      const key = this.generateApiCacheKey(endpoint, params);
      await redisService.set(`api:${key}`, response, ttl);
    } catch (error) {
      console.error('Error caching API response:', error);
    }
  }

  /**
   * Get cached API response
   */
  static async getCachedApiResponse(endpoint: string, params: any): Promise<any | null> {
    try {
      const key = this.generateApiCacheKey(endpoint, params);
      return await redisService.get(`api:${key}`);
    } catch (error) {
      console.error('Error getting cached API response:', error);
      return null;
    }
  }

  /**
   * Cache configuration data
   */
  static async cacheConfig(configKey: string, configData: any, ttl: number = 7200): Promise<void> {
    try {
      await redisService.set(`config:${configKey}`, configData, ttl);
    } catch (error) {
      console.error('Error caching config data:', error);
    }
  }

  /**
   * Get cached configuration data
   */
  static async getCachedConfig(configKey: string): Promise<any | null> {
    try {
      return await redisService.get(`config:${configKey}`);
    } catch (error) {
      console.error('Error getting cached config data:', error);
      return null;
    }
  }

  /**
   * Cache frequently accessed data with automatic refresh
   */
  static async cacheWithRefresh<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttl: number = 3600,
    refreshThreshold: number = 0.8 // Refresh when 80% of TTL has passed
  ): Promise<T> {
    try {
      const cachedData = await redisService.get<T>(key);
      
      if (cachedData) {
        // Check if we need to refresh in background
        const client = redisService.getClient();
        const remainingTtl = await client.ttl(`cache:${key}`);
        const shouldRefresh = remainingTtl > 0 && remainingTtl < (ttl * refreshThreshold);
        
        if (shouldRefresh) {
          // Refresh in background
          this.refreshCacheInBackground(key, fetchFunction, ttl);
        }
        
        return cachedData;
      }
      
      // Data not in cache, fetch and cache it
      const freshData = await fetchFunction();
      await redisService.set(key, freshData, ttl);
      return freshData;
    } catch (error) {
      console.error('Error in cache with refresh:', error);
      // Fallback to direct fetch
      return await fetchFunction();
    }
  }

  /**
   * Refresh cache in background
   */
  private static async refreshCacheInBackground<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttl: number
  ): Promise<void> {
    try {
      const freshData = await fetchFunction();
      await redisService.set(key, freshData, ttl);
    } catch (error) {
      console.error('Error refreshing cache in background:', error);
    }
  }

  /**
   * Invalidate user cache
   */
  static async invalidateUserCache(userId: string): Promise<void> {
    try {
      await redisService.del(`user:${userId}`);
      await redisService.del(`firebase_user:${userId}`);
    } catch (error) {
      console.error('Error invalidating user cache:', error);
    }
  }

  /**
   * Invalidate all cache for a pattern
   */
  static async invalidateCachePattern(pattern: string): Promise<void> {
    try {
      const client = redisService.getClient();
      const keys = await client.keys(`cache:${pattern}*`);
      
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } catch (error) {
      console.error('Error invalidating cache pattern:', error);
    }
  }

  /**
   * Warm up cache with commonly accessed data
   */
  static async warmUpCache(): Promise<void> {
    console.log('🔥 Warming up cache...');
    
    try {
      // Warm up common configuration
      await this.cacheConfig('app_settings', {
        rateLimit: {
          general: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
          auth: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '10'),
        },
        security: {
          jwtExpiration: process.env.JWT_EXPIRES_IN || '1h',
          refreshTokenExpiration: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
        },
      });
      
      console.log('✅ Cache warmed up successfully');
    } catch (error) {
      console.error('❌ Error warming up cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    hitRate: number;
  }> {
    try {
      const client = redisService.getClient();
      const info = await client.info('memory');
      const keyspace = await client.info('keyspace');
      
      // Parse memory usage
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1] : 'Unknown';
      
      // Parse total keys
      const keysMatch = keyspace.match(/keys=(\d+)/);
      const totalKeys = keysMatch ? parseInt(keysMatch[1] || '0') : 0;
      
      // Calculate hit rate (simplified)
      const stats = await client.info('stats');
      const hitsMatch = stats.match(/keyspace_hits:(\d+)/);
      const missesMatch = stats.match(/keyspace_misses:(\d+)/);
      
      const hits = hitsMatch ? parseInt(hitsMatch[1] || '0') : 0;
      const misses = missesMatch ? parseInt(missesMatch[1] || '0') : 0;
      const hitRate = hits + misses > 0 ? (hits / (hits + misses)) * 100 : 0;
      
      return {
        totalKeys,
        memoryUsage: memoryUsage || 'Unknown',
        hitRate: Math.round(hitRate * 100) / 100,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        totalKeys: 0,
        memoryUsage: 'Unknown',
        hitRate: 0,
      };
    }
  }

  /**
   * Generate cache key for API responses
   */
  private static generateApiCacheKey(endpoint: string, params: any): string {
    const paramsString = JSON.stringify(params, Object.keys(params).sort());
    const hash = require('crypto')
      .createHash('md5')
      .update(`${endpoint}:${paramsString}`)
      .digest('hex');
    return hash;
  }

  /**
   * Cache middleware for Express routes
   */
  static cacheMiddleware(ttl: number = 300) {
    return async (req: any, res: any, next: any) => {
      try {
        const key = this.generateApiCacheKey(req.originalUrl, {
          query: req.query,
          user: req.user?.id,
        });
        
        const cachedResponse = await this.getCachedApiResponse(req.originalUrl, {
          query: req.query,
          user: req.user?.id,
        });
        
        if (cachedResponse) {
          return res.json(cachedResponse);
        }
        
        // Override res.json to cache the response
        const originalJson = res.json;
        res.json = function(data: any) {
          // Cache successful responses only
          if (res.statusCode >= 200 && res.statusCode < 300) {
            CacheService.cacheApiResponse(req.originalUrl, {
              query: req.query,
              user: req.user?.id,
            }, data, ttl);
          }
          return originalJson.call(this, data);
        };
        
        next();
      } catch (error) {
        console.error('Cache middleware error:', error);
        next();
      }
    };
  }

  /**
   * Clear all cache
   */
  static async clearAllCache(): Promise<void> {
    try {
      const client = redisService.getClient();
      const keys = await client.keys('cache:*');
      
      if (keys.length > 0) {
        await client.del(...keys);
      }
      
      console.log(`🧹 Cleared ${keys.length} cache entries`);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
}

export default CacheService;
