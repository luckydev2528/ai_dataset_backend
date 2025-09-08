import { Request, Response, NextFunction } from 'express';
import { Logger } from '../../utils/logger';

/**
 * Timeout middleware specifically for video uploads
 * Prevents requests from hanging for too long
 */
export const videoUploadTimeout = (timeoutMs: number = 120000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Set a timeout for the request
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        Logger.warning('⏰ Video upload request timeout', {
          url: req.url,
          method: req.method,
          timeout: timeoutMs,
          contentLength: req.headers['content-length']
        });
        
        res.status(408).json({
          success: false,
          error: 'Request timeout - video upload took too long',
          timeout: timeoutMs
        });
      }
    }, timeoutMs);

    // Clear timeout when response is sent
    const originalSend = res.send;
    res.send = function(data) {
      clearTimeout(timeout);
      return originalSend.call(this, data);
    };

    // Clear timeout on error
    req.on('error', () => {
      clearTimeout(timeout);
    });

    next();
  };
};
