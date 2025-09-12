import { Router } from 'express';
import {
  getUserPoints,
  getMyPoints,
  addPoints,
  spendPoints,
  awardTaskPoints,
  getPointsHistory,
<<<<<<< HEAD
  getMyPointsHistory,
=======
>>>>>>> cafe11fdc9c284cc2da4ed1877ac8b8aab94138b
  getLeaderboard,
  getPointsStats,
  initializeUserPoints,
  resetUserPoints,
} from '../controllers/userPoints/userPointsController';
import { authenticateJWT } from '../middleware/auth/auth';
import { requireAuth, requireRole } from '../middleware/auth/authHelpers';

const router = Router();

/**
 * @route   GET /api/user-points/my
 * @desc    Get current user's points
 * @access  Private
 */
router.get('/my', authenticateJWT, requireAuth, getMyPoints);

/**
<<<<<<< HEAD
 * @route   GET /api/user-points/history
 * @desc    Get current user's points history
 * @access  Private
 */
router.get('/history', authenticateJWT, requireAuth, getMyPointsHistory);

/**
=======
>>>>>>> cafe11fdc9c284cc2da4ed1877ac8b8aab94138b
 * @route   GET /api/user-points/leaderboard
 * @desc    Get points leaderboard
 * @access  Public
 */
router.get('/leaderboard', getLeaderboard);

/**
 * @route   GET /api/user-points/stats
 * @desc    Get points statistics
 * @access  Public
 */
router.get('/stats', getPointsStats);

/**
 * @route   GET /api/user-points/:userId
 * @desc    Get user points by user ID
 * @access  Private
 */
router.get('/:userId', authenticateJWT, requireAuth, getUserPoints);

/**
 * @route   GET /api/user-points/:userId/history
 * @desc    Get user points history
 * @access  Private
 */
router.get('/:userId/history', authenticateJWT, requireAuth, getPointsHistory);

/**
 * @route   POST /api/user-points/add
 * @desc    Add points to current user account
 * @access  Private
 */
router.post('/add', authenticateJWT, requireAuth, addPoints);

/**
 * @route   POST /api/user-points/spend
 * @desc    Spend points from current user account
 * @access  Private
 */
router.post('/spend', authenticateJWT, requireAuth, spendPoints);

/**
 * @route   POST /api/user-points/award-task
 * @desc    Award points for completing a task
 * @access  Private
 */
router.post('/award-task', authenticateJWT, requireAuth, awardTaskPoints);

/**
 * @route   POST /api/user-points/:userId/initialize
 * @desc    Initialize user points (admin only)
 * @access  Private (Admin)
 */
router.post('/:userId/initialize', authenticateJWT, requireAuth, requireRole(['admin']), initializeUserPoints);

/**
 * @route   POST /api/user-points/:userId/reset
 * @desc    Reset user points (admin only)
 * @access  Private (Admin)
 */
router.post('/:userId/reset', authenticateJWT, requireAuth, requireRole(['admin']), resetUserPoints);

export default router;
