import { Router } from 'express';
import {
  register,
  login,
  socialAuth,
  sendPasswordReset,
  confirmPasswordReset,
  refreshAccessToken,
  logoutUser,
  getProfile,
  verifyToken,
  getUserSessions,
  revokeSession,
  revokeOtherSessions,
  validateUserState,
  autoFixUserState,
} from '../controllers/auth/authController';
import {
  initiateTwitterAuth,
  handleTwitterCallback,
  getTwitterResult,
  processTwitterAuth,
} from '../controllers/auth/twitterController';
import {
  validateRegistration,
  validateLogin,
  validateSocialAuth,
  validatePasswordReset,
  validatePasswordResetConfirm,
  handleValidationErrors,
} from '../middleware/validation/validation';
import { authenticateJWT } from '../middleware/auth/auth';
import { requireAuth } from '../middleware/auth/authHelpers';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register new user with email and password
 * @access  Public
 */
router.post('/register', validateRegistration(), handleValidationErrors, register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user with email and password
 * @access  Public
 */
router.post('/login', validateLogin(), handleValidationErrors, login);

/**
 * @route   POST /api/auth/social
 * @desc    Authenticate user with social provider (Google, Twitter, Facebook)
 * @access  Public
 */
router.post('/social', validateSocialAuth(), handleValidationErrors, socialAuth);

/**
 * @route   POST /api/auth/password-reset
 * @desc    Send password reset email
 * @access  Public
 */
router.post('/password-reset', validatePasswordReset(), handleValidationErrors, sendPasswordReset);

/**
 * @route   POST /api/auth/password-reset/confirm
 * @desc    Confirm password reset with code
 * @access  Public
 */
router.post('/password-reset/confirm', validatePasswordResetConfirm(), handleValidationErrors, confirmPasswordReset);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh JWT token
 * @access  Public (requires refresh token in body)
 */
router.post('/refresh', refreshAccessToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticateJWT, requireAuth, logoutUser);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticateJWT, requireAuth, getProfile);

/**
 * @route   POST /api/auth/verify
 * @desc    Verify JWT token validity
 * @access  Public
 */
router.post('/verify', verifyToken);

/**
 * @route   GET /api/auth/sessions
 * @desc    Get user sessions
 * @access  Private
 */
router.get('/sessions', authenticateJWT, requireAuth, getUserSessions);

/**
 * @route   DELETE /api/auth/sessions/:sessionId
 * @desc    Revoke a specific session
 * @access  Private
 */
router.delete('/sessions/:sessionId', authenticateJWT, requireAuth, revokeSession);

/**
 * @route   POST /api/auth/sessions/revoke-others
 * @desc    Revoke all other sessions (keep current session active)
 * @access  Private
 */
router.post('/sessions/revoke-others', authenticateJWT, requireAuth, revokeOtherSessions);

/**
 * @route   POST /api/auth/twitter/initiate
 * @desc    Initiate Twitter OAuth flow
 * @access  Public
 */
router.post('/twitter/initiate', initiateTwitterAuth);

/**
 * @route   POST /api/auth/twitter/process
 * @desc    Process Twitter OAuth tokens and complete authentication
 * @access  Public
 */
router.post('/twitter/process', processTwitterAuth);

/**
 * @route   GET /api/auth/twitter/callback
 * @desc    Handle Twitter OAuth callback
 * @access  Public
 */
router.get('/twitter/callback', handleTwitterCallback);

/**
 * @route   GET /api/auth/twitter/result/:sessionId
 * @desc    Get Twitter OAuth result and complete authentication
 * @access  Public
 */
router.get('/twitter/result/:sessionId', getTwitterResult);

/**
 * @route   GET /api/auth/validate-state
 * @desc    Validate user state consistency (for debugging and maintenance)
 * @access  Private
 */
router.get('/validate-state', authenticateJWT, requireAuth, validateUserState);

/**
 * @route   POST /api/auth/auto-fix-state
 * @desc    Auto-fix user state issues (for debugging and maintenance)
 * @access  Private
 */
router.post('/auto-fix-state', authenticateJWT, requireAuth, autoFixUserState);

export default router;
