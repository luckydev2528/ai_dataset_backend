import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  deleteAccount,
  getUserById,
  getAllUsers,
  updateUserStatus,
  getUserStats,
  searchUsers,
  exportUserData,
} from '../controllers/user/userController';
import {
  validateUserUpdate,
  handleValidationErrors,
} from '../middleware/validation/validation';
import { authenticateJWT, requireRole } from '../middleware/auth/auth';

const router = Router();

/**
 * @route   GET /api/user/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticateJWT, getProfile);

/**
 * @route   PUT /api/user/profile
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/profile', authenticateJWT, validateUserUpdate(), handleValidationErrors, updateProfile);

/**
 * @route   DELETE /api/user/account
 * @desc    Delete current user account
 * @access  Private
 */
router.delete('/account', authenticateJWT, deleteAccount);

/**
 * @route   GET /api/user/:userId
 * @desc    Get user by ID (admin only)
 * @access  Private (Admin)
 */
router.get('/:userId', authenticateJWT, requireRole(['admin']), getUserById);

/**
 * @route   GET /api/user
 * @desc    Get all users (admin only)
 * @access  Private (Admin)
 */
router.get('/', authenticateJWT, requireRole(['admin']), getAllUsers);

/**
 * @route   PATCH /api/user/:userId/status
 * @desc    Update user status (admin only)
 * @access  Private (Admin)
 */
router.patch('/:userId/status', authenticateJWT, requireRole(['admin']), updateUserStatus);

/**
 * @route   GET /api/user/stats/overview
 * @desc    Get user statistics (admin only)
 * @access  Private (Admin)
 */
router.get('/stats/overview', authenticateJWT, requireRole(['admin']), getUserStats);

/**
 * @route   GET /api/user/search
 * @desc    Search users (admin only)
 * @access  Private (Admin)
 */
router.get('/search', authenticateJWT, requireRole(['admin']), searchUsers);

/**
 * @route   GET /api/user/export/data
 * @desc    Export user data (GDPR compliance)
 * @access  Private
 */
router.get('/export/data', authenticateJWT, exportUserData);

export default router;
