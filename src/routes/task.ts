import { Router } from 'express';
import {
  getTasks,
  getActiveTasks,
<<<<<<< HEAD
  getCategorizedTasks,
=======
>>>>>>> cafe11fdc9c284cc2da4ed1877ac8b8aab94138b
  getTaskById,
  createTask,
  updateTask,
  completeTask,
  deleteTask,
  getTaskStats,
  markExpiredTasks,
} from '../controllers/task/taskController';
import { authenticateJWT } from '../middleware/auth/auth';
import { requireAuth, requireRole } from '../middleware/auth/authHelpers';

const router = Router();

/**
 * @route   GET /api/task
 * @desc    Get all tasks with optional filtering
 * @access  Public
 */
router.get('/', getTasks);

/**
 * @route   GET /api/task/active
 * @desc    Get active tasks only
 * @access  Public
 */
router.get('/active', getActiveTasks);

/**
<<<<<<< HEAD
 * @route   GET /api/task/categorized
 * @desc    Get categorized tasks for user (Available/Pending/Completed)
 * @access  Private
 */
router.get('/categorized', authenticateJWT, requireAuth, getCategorizedTasks);

/**
=======
>>>>>>> cafe11fdc9c284cc2da4ed1877ac8b8aab94138b
 * @route   GET /api/task/stats
 * @desc    Get task statistics
 * @access  Public
 */
router.get('/stats', getTaskStats);

/**
 * @route   GET /api/task/:id
 * @desc    Get task by ID
 * @access  Public
 */
router.get('/:id', getTaskById);

/**
 * @route   POST /api/task
 * @desc    Create a new task
 * @access  Private
 */
router.post('/', authenticateJWT, requireAuth, createTask);

/**
 * @route   PUT /api/task/:id
 * @desc    Update task
 * @access  Private
 */
router.put('/:id', authenticateJWT, requireAuth, updateTask);

/**
 * @route   PATCH /api/task/:id/complete
 * @desc    Complete task
 * @access  Private
 */
router.patch('/:id/complete', authenticateJWT, requireAuth, completeTask);

/**
 * @route   DELETE /api/task/:id
 * @desc    Delete task
 * @access  Private
 */
router.delete('/:id', authenticateJWT, requireAuth, deleteTask);

/**
 * @route   POST /api/task/expired/mark
 * @desc    Mark expired tasks (admin only)
 * @access  Private (Admin)
 */
router.post('/expired/mark', authenticateJWT, requireAuth, requireRole(['admin']), markExpiredTasks);

export default router;
