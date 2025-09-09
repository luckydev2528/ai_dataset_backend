import { Request, Response, NextFunction } from 'express';
import { redisService } from '../../services/cache/RedisService';
import { ApiResponse } from '../../types';

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
  onLimitReached?: (req: Request, res: Response) => void;
}

export const createRedisRateLimit = (options: RateLimitOptions) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if request should be skipped
      if (options.skip && options.skip(req)) {
        return next();
      }

      // Generate rate limit key
      const key = options.keyGenerator 
        ? options.keyGenerator(req) 
        : `${req.ip}:${req.route?.path || req.path}`;

      // Check rate limit
      const result = await redisService.incrementRateLimit(
        key,
        options.windowMs,
        options.max
      );

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': options.max.toString(),
        'X-RateLimit-Remaining': Math.max(0, options.max - result.count).toString(),
        'X-RateLimit-Reset': new Date(Date.now() + result.ttl).toISOString(),
      });

      if (!result.isAllowed) {
        // Call onLimitReached callback if provided
        if (options.onLimitReached) {
          options.onLimitReached(req, res);
        }

        const response: ApiResponse = {
          success: false,
          message: options.message || 'Too many requests, please try again later.',
          error: 'RATE_LIMIT_EXCEEDED',
          timestamp: new Date().toISOString(),
        };

        res.status(429).json(response);
        return;
      }

      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Fail open - allow request if Redis is down
      next();
    }
  };
};

// Pre-configured rate limiters
export const generalRateLimit = createRedisRateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
  keyGenerator: (req) => `general:${req.ip}`,
  skip: (req) => req.path === '/health',
});

export const authRateLimit = createRedisRateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '50'), // Increased from 10 to 50 for development
  message: 'Too many authentication attempts from this IP, please try again later.',
  keyGenerator: (req) => `auth:${req.ip}`,
  onLimitReached: (req, res) => {
    console.warn(`🚨 Auth rate limit exceeded for IP: ${req.ip}`);
  },
});

export const userRateLimit = (maxRequests: number, windowMs: number) => {
  return createRedisRateLimit({
    windowMs,
    max: maxRequests,
    message: 'Too many requests from this user, please try again later.',
    keyGenerator: (req) => {
      const user = (req as any).user;
      return user ? `user:${user.id}` : `ip:${req.ip}`;
    },
  });
};

export const apiKeyRateLimit = createRedisRateLimit({
  windowMs: 60000, // 1 minute
  max: 1000,
  message: 'API key rate limit exceeded.',
  keyGenerator: (req) => {
    const apiKey = req.headers['x-api-key'] as string;
    return apiKey ? `apikey:${apiKey}` : `ip:${req.ip}`;
  },
});

// Sliding window rate limiter for more precise control
export const createSlidingWindowRateLimit = (options: RateLimitOptions & { precision?: number }) => {
  const precision = options.precision || 10; // Number of sub-windows
  
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (options.skip && options.skip(req)) {
        return next();
      }

      const key = options.keyGenerator 
        ? options.keyGenerator(req) 
        : `sliding:${req.ip}:${req.route?.path || req.path}`;
      
      const now = Date.now();
      const window = options.windowMs;
      const subWindow = Math.floor(window / precision);
      const currentWindow = Math.floor(now / subWindow);
      
      // Use Redis pipeline for atomic operations
      const client = redisService.getClient();
      const pipeline = client.pipeline();
      
      // Increment current sub-window
      const subWindowKey = `${key}:${currentWindow}`;
      pipeline.incr(subWindowKey);
      pipeline.expire(subWindowKey, Math.ceil(window / 1000));
      
      // Get counts for all relevant sub-windows
      const windowsToCheck = [];
      for (let i = 0; i < precision; i++) {
        const windowKey = `${key}:${currentWindow - i}`;
        windowsToCheck.push(windowKey);
        pipeline.get(windowKey);
      }
      
      const results = await pipeline.exec();
      
      // Calculate total requests in the sliding window
      let totalRequests = 0;
      if (results) {
        for (let i = precision; i < results.length; i++) {
          const result = results[i];
          if (result && result[1]) {
            const count = parseInt(result[1] as string) || 0;
            totalRequests += count;
          }
        }
      }
      
      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': options.max.toString(),
        'X-RateLimit-Remaining': Math.max(0, options.max - totalRequests).toString(),
        'X-RateLimit-Reset': new Date(now + subWindow).toISOString(),
      });
      
      if (totalRequests > options.max) {
        if (options.onLimitReached) {
          options.onLimitReached(req, res);
        }
        
        const response: ApiResponse = {
          success: false,
          message: options.message || 'Too many requests, please try again later.',
          error: 'RATE_LIMIT_EXCEEDED',
          timestamp: new Date().toISOString(),
        };
        
        res.status(429).json(response);
        return;
      }
      
      next();
    } catch (error) {
      console.error('Sliding window rate limiting error:', error);
      next(); // Fail open
    }
  };
};

export default {
  createRedisRateLimit,
  generalRateLimit,
  authRateLimit,
  userRateLimit,
  apiKeyRateLimit,
  createSlidingWindowRateLimit,
};
