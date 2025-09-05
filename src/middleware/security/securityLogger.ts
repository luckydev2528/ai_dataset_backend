import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../types';

/**
 * Security Event Logger
 * Logs security-related events for monitoring and auditing
 */
export const securityLogger = (req: Request, res: Response, next: NextFunction): void => {
  const originalSend = res.send;
  const startTime = Date.now();
  
  // Override res.send to capture response details
  res.send = function(data: any) {
    const duration = Date.now() - startTime;
    
    // Log security events
    if (res.statusCode === 401) {
      console.warn(`🚨 SECURITY: Unauthorized access attempt`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
        requestId: (req as any).id,
        duration: `${duration}ms`,
      });
    } else if (res.statusCode === 403) {
      console.warn(`🚨 SECURITY: Forbidden access attempt`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
        requestId: (req as any).id,
        duration: `${duration}ms`,
      });
    } else if (res.statusCode === 429) {
      console.warn(`🚨 SECURITY: Rate limit exceeded`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
        requestId: (req as any).id,
        duration: `${duration}ms`,
      });
    }
    
    // Log authentication events
    if (req.path.includes('/auth/')) {
      const authEvent = {
        event: 'auth_request',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        statusCode: res.statusCode,
        timestamp: new Date().toISOString(),
        requestId: (req as any).id,
        duration: `${duration}ms`,
      };
      
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`✅ AUTH: Successful authentication event`, authEvent);
      } else {
        console.warn(`❌ AUTH: Failed authentication event`, authEvent);
      }
    }
    
    // Call original send
    return originalSend.call(this, data);
  };
  
  next();
};

/**
 * Log token revocation events
 */
export const logTokenRevocation = (userId: string, deviceId?: string, reason?: string) => {
  console.warn(`🔒 SECURITY: Token revoked`, {
    userId,
    deviceId,
    reason: reason || 'User logout',
    timestamp: new Date().toISOString(),
  });
};

/**
 * Log suspicious activity
 */
export const logSuspiciousActivity = (req: Request, activity: string, details?: any) => {
  console.warn(`🚨 SECURITY: Suspicious activity detected`, {
    activity,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    path: req.path,
    method: req.method,
    details,
    timestamp: new Date().toISOString(),
    requestId: (req as any).id,
  });
};

export default {
  securityLogger,
  logTokenRevocation,
  logSuspiciousActivity,
};
