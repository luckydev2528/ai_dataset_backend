import express from 'express';
import { ValidatorController } from '../controllers/validator/validatorController';
import { authenticateJWT } from '../middleware/auth/auth';
import { generalRateLimit } from '../middleware/rateLimit/redisRateLimit';

const router = express.Router();

// Apply rate limiting to all validator routes
router.use(generalRateLimit);

// All validator routes require authentication
router.use(authenticateJWT);

/**
 * @route GET /api/validator/dashboard
 * @desc Get validator dashboard overview with statistics
 * @access Private (Validator only)
 */
router.get('/dashboard', ValidatorController.getDashboard);

/**
 * @route GET /api/validator/pending
 * @desc Get pending video submissions for validation
 * @access Private (Validator only)
 */
router.get('/pending', ValidatorController.getPendingSubmissions);

/**
 * @route GET /api/validator/submission/:submissionId
 * @desc Get specific video submission for review
 * @access Private (Validator only)
 */
router.get('/submission/:submissionId', ValidatorController.getSubmissionForReview);

/**
 * @route POST /api/validator/approve/:submissionId
 * @desc Approve a video submission with tags
 * @access Private (Validator only)
 */
router.post('/approve/:submissionId', ValidatorController.approveSubmission);

/**
 * @route POST /api/validator/reject/:submissionId
 * @desc Reject a video submission with reason
 * @access Private (Validator only)
 */
router.post('/reject/:submissionId', ValidatorController.rejectSubmission);

/**
 * @route GET /api/validator/history
 * @desc Get validator's validation history
 * @access Private (Validator only)
 */
router.get('/history', ValidatorController.getValidationHistory);

/**
 * @route GET /api/validator/stats
 * @desc Get validation statistics
 * @access Private (Validator only)
 */
router.get('/stats', ValidatorController.getValidationStats);

export default router; 