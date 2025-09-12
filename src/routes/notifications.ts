import express from 'express';
import { NotificationController } from '../controllers/notifications/notificationController';
import { authenticateJWT } from '../middleware/auth/auth';
import { requireAuth } from '../middleware/auth/authHelpers';

const router = express.Router();

// Test notification endpoint
router.post('/test', authenticateJWT, requireAuth, NotificationController.sendTestNotification);

// Send notification to all users (admin only)
router.post('/send-to-all', authenticateJWT, requireAuth, NotificationController.sendToAllUsers);

// Send notification to specific user
router.post('/send-to-user', authenticateJWT, requireAuth, NotificationController.sendToUser);

// Send new task notification to all users
router.post('/new-task', authenticateJWT, requireAuth, NotificationController.sendNewTaskNotification);

// Send task approval notification
router.post('/task-approved', authenticateJWT, requireAuth, NotificationController.sendTaskApprovedNotification);

// Send task rejection notification
router.post('/task-rejected', authenticateJWT, requireAuth, NotificationController.sendTaskRejectedNotification);

// Get notification statistics
router.get('/stats', authenticateJWT, requireAuth, NotificationController.getNotificationStats);

export default router;
