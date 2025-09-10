import { Request, Response } from 'express';
import { ChallengeModel, CreateChallengeData, UpdateChallengeData, ChallengeFilters } from '../../services/database/models/challengeModel';
import { BaseController } from '../BaseController';
import { Logger } from '../../utils/logger';
import { ValidationUtils } from '../../utils/ValidationUtils';

class ChallengeController extends BaseController {
  /**
   * Create a new challenge
   */
  static async createChallenge(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.requireUserId(req);
      
      const challengeData: CreateChallengeData = {
        ...req.body,
        createdBy: userId,
      };

      // Validate required fields
      const validation = ValidationUtils.validateChallengeData(challengeData);
      if (!validation.isValid) {
        ChallengeController.sendValidationError(res, 'Invalid challenge data', validation.errors);
        return;
      }

      const challenge = await ChallengeModel.createChallenge(challengeData);
      
      ChallengeController.sendSuccessResponse(res, { challenge }, 'Challenge created successfully', 201);
    } catch (error) {
      ChallengeController.handleError(error, 'create challenge', res);
    }
  }

  /**
   * Get challenge by ID
   */
  static async getChallengeById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        ChallengeController.sendValidationError(res, 'Challenge ID is required');
        return;
      }

      const challenge = await ChallengeModel.getChallengeById(id);
      
      if (!challenge) {
        ChallengeController.sendNotFoundError(res, 'Challenge');
        return;
      }

      ChallengeController.sendSuccessResponse(res, { challenge }, 'Challenge retrieved successfully');
    } catch (error) {
      ChallengeController.handleError(error, 'get challenge by ID', res);
    }
  }

  /**
   * Get challenges with filtering
   */
  static async getChallenges(req: Request, res: Response): Promise<void> {
    try {
      const filters: ChallengeFilters = this.buildFiltersFromQuery(req.query);
      
      const challenges = await ChallengeModel.getChallenges(filters);
      
      ChallengeController.sendSuccessResponse(res, { challenges }, 'Challenges retrieved successfully');
    } catch (error) {
      ChallengeController.handleError(error, 'get challenges', res);
    }
  }

  /**
   * Get active challenges only
   */
  static async getActiveChallenges(req: Request, res: Response): Promise<void> {
    try {
      const challenges = await ChallengeModel.getActiveChallenges();
      
      ChallengeController.sendSuccessResponse(res, { challenges }, 'Active challenges retrieved successfully');
    } catch (error) {
      ChallengeController.handleError(error, 'get active challenges', res);
    }
  }

  /**
   * Update challenge
   */
  static async updateChallenge(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData: UpdateChallengeData = req.body;

      if (!id) {
        ChallengeController.sendValidationError(res, 'Challenge ID is required');
        return;
      }

      const challenge = await ChallengeModel.updateChallenge(id, updateData);
      
      if (!challenge) {
        ChallengeController.sendNotFoundError(res, 'Challenge');
        return;
      }

      ChallengeController.sendSuccessResponse(res, { challenge }, 'Challenge updated successfully');
    } catch (error) {
      ChallengeController.handleError(error, 'update challenge', res);
    }
  }

  /**
   * Delete challenge
   */
  static async deleteChallenge(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        ChallengeController.sendValidationError(res, 'Challenge ID is required');
        return;
      }

      const success = await ChallengeModel.deleteChallenge(id);
      
      if (!success) {
        ChallengeController.sendNotFoundError(res, 'Challenge');
        return;
      }

      ChallengeController.sendSuccessResponse(res, null, 'Challenge deleted successfully');
    } catch (error) {
      ChallengeController.handleError(error, 'delete challenge', res);
    }
  }

  /**
   * Get random challenge
   */
  static async getRandomChallenge(req: Request, res: Response): Promise<void> {
    try {
      const { difficulty } = req.query;
      
      const challenge = await ChallengeModel.getRandomChallenge(
        difficulty as 'easy' | 'medium' | 'hard' | undefined
      );
      
      if (!challenge) {
        ChallengeController.sendNotFoundError(res, 'No challenges available');
        return;
      }

      ChallengeController.sendSuccessResponse(res, { challenge }, 'Random challenge retrieved successfully');
    } catch (error) {
      ChallengeController.handleError(error, 'get random challenge', res);
    }
  }

  /**
   * Get challenge statistics
   */
  static async getChallengeStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await ChallengeModel.getChallengeStats();
      
      ChallengeController.sendSuccessResponse(res, { stats }, 'Challenge statistics retrieved successfully');
    } catch (error) {
      ChallengeController.handleError(error, 'get challenge statistics', res);
    }
  }

  /**
   * Build filters from query parameters
   */
  private static buildFiltersFromQuery(query: any): ChallengeFilters {
    const filters: ChallengeFilters = {};

    if (query.category) filters.category = query.category as string;
    if (query.difficulty) filters.difficulty = query.difficulty as 'easy' | 'medium' | 'hard';
    if (query.isActive !== undefined) filters.isActive = query.isActive === 'true';
    if (query.createdBy) filters.createdBy = query.createdBy as string;

    return filters;
  }
}

export default ChallengeController;