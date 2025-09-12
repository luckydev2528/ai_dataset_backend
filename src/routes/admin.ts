import { Router } from 'express';
import { AdminController } from '../controllers/admin/adminController';

const router = Router();

// Process all completed tasks for points
router.post('/process-completed-tasks', AdminController.processCompletedTasks);

// Process a specific task for points
router.post('/process-task/:taskId', AdminController.processSpecificTask);

// Get system status
router.get('/status', AdminController.getSystemStatus);

export default router;
