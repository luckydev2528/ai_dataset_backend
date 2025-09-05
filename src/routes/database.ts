import { Router } from 'express';
import { DatabaseController } from '../controllers/database/databaseController';
import { authenticateJWT } from '../middleware/auth/auth';
import { userRateLimit } from '../middleware/rateLimit/redisRateLimit';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateJWT);

// Apply rate limiting
router.use(userRateLimit(100, 15 * 60 * 1000)); // 100 requests per 15 minutes

// Database health check
router.get('/health', DatabaseController.getHealth);

// Statistics endpoints
router.get('/stats/users', DatabaseController.getUserStats);
router.get('/stats/devices', DatabaseController.getDeviceStats);

// Analytics endpoints
router.get('/analytics/dashboard', DatabaseController.getAnalyticsDashboard);
router.get('/analytics/realtime', DatabaseController.getRealTimeMetrics);
router.post('/analytics/track', DatabaseController.trackEvent);
router.get('/analytics/user/:userId/timeline', DatabaseController.getUserActivityTimeline);

// Maintenance endpoints
router.post('/cleanup', DatabaseController.cleanupOldData);

export default router;
