import { Router } from 'express';
import { TaskSubmissionController } from '../controllers/taskSubmission/taskSubmissionController';
import { authenticateJWT } from '../middleware/auth/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateJWT);

// Task submission routes
router.get('/', TaskSubmissionController.getSubmissions);
router.get('/pending', TaskSubmissionController.getPendingSubmissions);
router.get('/stats', TaskSubmissionController.getSubmissionStats);
router.get('/user/:userId', TaskSubmissionController.getSubmissionsByUser);
router.get('/task/:taskId', TaskSubmissionController.getSubmissionsByTask);
router.get('/:id', TaskSubmissionController.getSubmissionById);

// Admin approval routes
router.post('/:id/approve', TaskSubmissionController.approveSubmission);
router.post('/:id/reject', TaskSubmissionController.rejectSubmission);

export default router;
