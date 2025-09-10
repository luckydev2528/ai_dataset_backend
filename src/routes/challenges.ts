import { Router } from 'express';
import ChallengeController from '../controllers/challenge/challengeController';
import { authenticateJWT } from '../middleware/auth/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateJWT);

// Challenge routes
router.post('/', ChallengeController.createChallenge);
router.get('/', ChallengeController.getChallenges);
router.get('/active', ChallengeController.getActiveChallenges);
router.get('/stats', ChallengeController.getChallengeStats);
router.get('/:id', ChallengeController.getChallengeById);
router.put('/:id', ChallengeController.updateChallenge);
router.delete('/:id', ChallengeController.deleteChallenge);

export default router;
