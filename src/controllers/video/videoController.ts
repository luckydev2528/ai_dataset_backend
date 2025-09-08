import { Request, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { videoStorageService, VideoUploadOptions } from '../../services/storage/VideoStorageService';
import { Logger } from '../../utils/logger';
import { authenticateJWT } from '../../middleware/auth/auth';

// Configure multer for video uploads with optimized settings
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024,
    fieldSize: 10 * 1024 * 1024,
    parts: 1000,
    files: 1,
  },
  fileFilter: (req: Request, file: any, cb: FileFilterCallback): void => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  }
});

export class VideoController {
  /**
   * Upload video endpoint
   * POST /api/video/upload
   */
  static async uploadVideo(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
      Logger.info('🎥 Video upload started', { 
        userId: (req as any).user?.id,
        contentLength: req.headers['content-length'],
        contentType: req.headers['content-type']
      });

      // Check if user is authenticated
      const userId = (req as any).user?.id;
      if (!userId) {
        Logger.warning('🚫 Video upload failed: No user ID', { userId });
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Validate required fields
      const { taskId, challengePrompt, videoMetadata } = req.body;
      if (!taskId || !challengePrompt || !videoMetadata) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: taskId, challengePrompt, videoMetadata'
        });
        return;
      }

      // Validate and normalize video metadata (may arrive as JSON string from FormData)
      const parsedMetadata = typeof videoMetadata === 'string' ? (() => {
        try { return JSON.parse(videoMetadata); } catch { return {}; }
      })() : videoMetadata;

      const {
        duration,
        width,
        height,
        fileSize,
        resolution,
        frameRate,
        quality
      } = parsedMetadata as any;

      if (!duration || !width || !height || !fileSize || !resolution || !frameRate || !quality) {
        res.status(400).json({
          success: false,
          error: 'Invalid video metadata. Required: duration, width, height, fileSize, resolution, frameRate, quality'
        });
        return;
      }

      // Get the uploaded file
      const file = (req as any).file as any;
      if (!file) {
        Logger.warning('🚫 Video upload failed: No file provided', { userId });
        res.status(400).json({
          success: false,
          error: 'No video file provided'
        });
        return;
      }

      Logger.info('📁 Video file received', {
        userId,
        fileName: file.originalname,
        fileSize: file.size,
        mimetype: file.mimetype
      });

      // Prepare upload options
      const uploadOptions: VideoUploadOptions = {
        userId,
        taskId,
        challengePrompt,
        videoMetadata: {
          duration: parseInt(duration),
          width: parseInt(width),
          height: parseInt(height),
          fileSize: parseInt(fileSize),
          resolution,
          frameRate: parseInt(frameRate),
          quality
        },
        originalFileName: file.originalname
      };

      // Upload the video
      Logger.info('📤 Starting video upload to Firebase Storage', { userId, taskId });
      const result = await videoStorageService.uploadVideo(file.buffer, uploadOptions);

      const uploadDuration = Date.now() - startTime;
      Logger.info('⏱️ Video upload completed', { 
        userId, 
        taskId, 
        duration: `${uploadDuration}ms`,
        success: result.success 
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          data: {
            videoId: result.videoId,
            downloadUrl: result.downloadUrl,
            thumbnailUrl: result.thumbnailUrl,
            metadata: result.metadata
          }
        });
      } else {
        Logger.error('❌ Video upload failed', { 
          userId, 
          taskId, 
          error: result.error,
          duration: `${uploadDuration}ms`
        });
        res.status(400).json({
          success: false,
          error: result.error || 'Video upload failed'
        });
      }

    } catch (error) {
      Logger.error('Video upload error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get video metadata
   * GET /api/video/:videoId
   */
  static async getVideoMetadata(req: Request, res: Response): Promise<void> {
    try {
      const { videoId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      if (!videoId) {
        res.status(400).json({
          success: false,
          error: 'Video ID is required'
        });
        return;
      }

      const videoData = await videoStorageService.getVideoMetadata(videoId);
      
      if (!videoData) {
        res.status(404).json({
          success: false,
          error: 'Video not found'
        });
        return;
      }

      // Check if user owns the video
      if (videoData.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: videoData
      });

    } catch (error) {
      Logger.error('Get video metadata error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get videos by user
   * GET /api/video/user/:userId
   */
  static async getVideosByUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const requestingUserId = (req as any).user?.id;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!requestingUserId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
        return;
      }

      // Users can only access their own videos
      if (userId !== requestingUserId) {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }

      const videos = await videoStorageService.getVideosByUser(userId, limit);

      res.status(200).json({
        success: true,
        data: {
          videos,
          count: videos.length,
          limit
        }
      });

    } catch (error) {
      Logger.error('Get videos by user error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get videos by task
   * GET /api/video/task/:taskId
   */
  static async getVideosByTask(req: Request, res: Response): Promise<void> {
    try {
      const { taskId } = req.params;
      const userId = (req as any).user?.uid;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      if (!taskId) {
        res.status(400).json({
          success: false,
          error: 'Task ID is required'
        });
        return;
      }

      const videos = await videoStorageService.getVideosByTask(taskId, limit);

      res.status(200).json({
        success: true,
        data: {
          videos,
          count: videos.length,
          limit
        }
      });

    } catch (error) {
      Logger.error('Get videos by task error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Delete video
   * DELETE /api/video/:videoId
   */
  static async deleteVideo(req: Request, res: Response): Promise<void> {
    try {
      const { videoId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      if (!videoId) {
        res.status(400).json({
          success: false,
          error: 'Video ID is required'
        });
        return;
      }

      const success = await videoStorageService.deleteVideo(videoId, userId);

      if (success) {
        res.status(200).json({
          success: true,
          message: 'Video deleted successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Video not found or access denied'
        });
      }

    } catch (error) {
      Logger.error('Delete video error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get user storage statistics
   * GET /api/video/stats/:userId
   */
  static async getUserStorageStats(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const requestingUserId = (req as any).user?.id;

      if (!requestingUserId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
        return;
      }

      // Users can only access their own stats
      if (userId !== requestingUserId) {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }

      const stats = await videoStorageService.getUserStorageStats(userId);

      res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error) {
      Logger.error('Get user storage stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}

// Export multer middleware for use in routes with timeout handling
export const uploadMiddleware = (req: any, res: any, next: any) => {
  // Set a timeout for multer processing
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      Logger.warning('⏰ Multer processing timeout', {
        url: req.url,
        contentLength: req.headers['content-length']
      });
      res.status(408).json({
        success: false,
        error: 'File upload timeout - processing took too long'
      });
    }
  }, 60000); // 60 seconds timeout for multer

  // Clear timeout when multer completes
  const originalNext = next;
  next = function(this: any, err?: any) {
    clearTimeout(timeout);
    return originalNext.call(this, err);
  };

  return upload.single('video')(req, res, next);
};
