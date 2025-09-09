import express from 'express';
import { VideoController, uploadMiddleware } from '../controllers/video/videoController';
import { authenticateJWT } from '../middleware/auth/auth';
import { generalRateLimit } from '../middleware/rateLimit/redisRateLimit';

const router = express.Router();

// Apply rate limiting to all video routes
router.use(generalRateLimit);

/**
 * @route POST /api/video/upload
 * @desc Upload a video file
 * @access Private
 */
router.post('/upload', uploadMiddleware, authenticateJWT, VideoController.uploadVideo);

/**
 * @route GET /api/video/:videoId
 * @desc Get video metadata by ID
 * @access Private
 */
router.get('/:videoId', authenticateJWT, VideoController.getVideoMetadata);

/**
 * @route GET /api/video/user/:userId
 * @desc Get videos by user ID
 * @access Private
 */
router.get('/user/:userId', authenticateJWT, VideoController.getVideosByUser);

/**
 * @route GET /api/video/task/:taskId
 * @desc Get videos by task ID
 * @access Private
 */
router.get('/task/:taskId', authenticateJWT, VideoController.getVideosByTask);

/**
 * @route DELETE /api/video/:videoId
 * @desc Delete a video
 * @access Private
 */
router.delete('/:videoId', authenticateJWT, VideoController.deleteVideo);

/**
 * @route GET /api/video/stats/:userId
 * @desc Get user storage statistics
 * @access Private
 */
router.get('/stats/:userId', authenticateJWT, VideoController.getUserStorageStats);

export default router;
