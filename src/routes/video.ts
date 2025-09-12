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
<<<<<<< HEAD
router.post('/upload', authenticateJWT, uploadMiddleware, VideoController.uploadVideo);
=======
router.post('/upload', uploadMiddleware, authenticateJWT, VideoController.uploadVideo);
>>>>>>> cafe11fdc9c284cc2da4ed1877ac8b8aab94138b

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

<<<<<<< HEAD
/**
 * @route POST /api/video/view
 * @desc Request to view a video with rate limiting
 * @access Private
 */
router.post('/view', authenticateJWT, VideoController.requestVideoView);

/**
 * @route GET /api/video/view-stats/:videoId
 * @desc Get video viewing statistics for a user
 * @access Private
 */
router.get('/view-stats/:videoId', authenticateJWT, VideoController.getVideoViewingStats);

=======
>>>>>>> cafe11fdc9c284cc2da4ed1877ac8b8aab94138b
export default router;
