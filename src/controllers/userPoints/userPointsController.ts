import { Request, Response } from 'express';
import { UserPointsModel, AddPointsData, SpendPointsData } from '../../services/database/models/userPointsModel';
import { ApiResponse } from '../../utils/response';
import { Logger } from '../../utils/logger';
import { transformUserPointsDocument } from '../../utils/userPointsTransform';
import CacheService from '../../services/cache/CacheService';

class UserPointsController {
  /**
   * Get user points by user ID
   */
  static async getUserPoints(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User ID is required',
          error: 'MISSING_USER_ID',
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

      const userPoints = await UserPointsModel.getUserPoints(userId);

      if (!userPoints) {
        const response: ApiResponse = {
          success: false,
          message: 'User points not found',
          error: 'USER_POINTS_NOT_FOUND',
          timestamp: new Date().toISOString(),
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'User points retrieved successfully',
        data: { userPoints: transformUserPointsDocument(userPoints) },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Error getting user points:', { error: error instanceof Error ? error.message : String(error) });

      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve user points',
        error: 'USER_POINTS_FETCH_ERROR',
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get current user's points
   */
  static async getMyPoints(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User authentication required',
          error: 'AUTHENTICATION_REQUIRED',
          timestamp: new Date().toISOString(),
        };
        res.status(401).json(response);
        return;
      }

      console.log('🔍 Getting user points for userId:', userId);
      const cacheKey = `user_points:${userId}`;
      let userPoints = await CacheService.cacheWithRefresh(
        cacheKey,
        async () => {
          const doc = await UserPointsModel.getUserPoints(userId);
          return doc ? transformUserPointsDocument(doc) : null;
        },
        30,
        0.8,
      );

      if (!userPoints) {
        // Initialize user points if they don't exist
        const newUserPoints = await UserPointsModel.initializeUserPoints(userId);
        // Cache initialized points
        await CacheService.cacheWithRefresh(cacheKey, async () => transformUserPointsDocument(newUserPoints), 30, 0.8);
        
        const response: ApiResponse = {
          success: true,
          message: 'User points initialized',
          data: { userPoints: transformUserPointsDocument(newUserPoints) },
          timestamp: new Date().toISOString(),
        };
        res.status(200).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'User points retrieved successfully',
        data: { userPoints },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Error getting my points:', { error: error instanceof Error ? error.message : String(error) });

      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve user points',
        error: 'USER_POINTS_FETCH_ERROR',
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(response);
    }
  }

  /**
   * Add points to user account
   */
  static async addPoints(req: Request, res: Response): Promise<void> {
    try {
      const { amount, type, description, taskId, reference, metadata } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User authentication required',
          error: 'AUTHENTICATION_REQUIRED',
          timestamp: new Date().toISOString(),
        };
        res.status(401).json(response);
        return;
      }

      if (!amount || !type || !description) {
        const response: ApiResponse = {
          success: false,
          message: 'Missing required fields: amount, type, description',
          error: 'MISSING_REQUIRED_FIELDS',
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

      const addPointsData: AddPointsData = {
        userId,
        amount: parseInt(amount),
        type,
        description,
        taskId,
        reference,
        metadata,
      };

      const userPoints = await UserPointsModel.addPoints(addPointsData);

      if (!userPoints) {
        const response: ApiResponse = {
          success: false,
          message: 'Failed to add points',
          error: 'ADD_POINTS_ERROR',
          timestamp: new Date().toISOString(),
        };
        res.status(500).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Points added successfully',
        data: { userPoints: transformUserPointsDocument(userPoints) },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Error adding points:', { error: error instanceof Error ? error.message : String(error) });

      const response: ApiResponse = {
        success: false,
        message: 'Failed to add points',
        error: 'ADD_POINTS_ERROR',
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(response);
    }
  }

  /**
   * Spend points from user account
   */
  static async spendPoints(req: Request, res: Response): Promise<void> {
    try {
      const { amount, description, reference, metadata } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User authentication required',
          error: 'AUTHENTICATION_REQUIRED',
          timestamp: new Date().toISOString(),
        };
        res.status(401).json(response);
        return;
      }

      if (!amount || !description) {
        const response: ApiResponse = {
          success: false,
          message: 'Missing required fields: amount, description',
          error: 'MISSING_REQUIRED_FIELDS',
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

      const spendPointsData: SpendPointsData = {
        userId,
        amount: parseInt(amount),
        description,
        reference,
        metadata,
      };

      const userPoints = await UserPointsModel.spendPoints(spendPointsData);

      if (!userPoints) {
        const response: ApiResponse = {
          success: false,
          message: 'Failed to spend points (insufficient balance or other error)',
          error: 'SPEND_POINTS_ERROR',
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Points spent successfully',
        data: { userPoints: transformUserPointsDocument(userPoints) },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Error spending points:', { error: error instanceof Error ? error.message : String(error) });

      const response: ApiResponse = {
        success: false,
        message: 'Failed to spend points',
        error: 'SPEND_POINTS_ERROR',
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(response);
    }
  }

  /**
   * Award points for completing a task
   */
  static async awardTaskPoints(req: Request, res: Response): Promise<void> {
    try {
      const { taskId, points, category, difficulty } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User authentication required',
          error: 'AUTHENTICATION_REQUIRED',
          timestamp: new Date().toISOString(),
        };
        res.status(401).json(response);
        return;
      }

      if (!taskId || !points || !category || !difficulty) {
        const response: ApiResponse = {
          success: false,
          message: 'Missing required fields: taskId, points, category, difficulty',
          error: 'MISSING_REQUIRED_FIELDS',
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

      const userPoints = await UserPointsModel.awardTaskPoints(
        userId,
        taskId,
        parseInt(points),
        category,
        difficulty
      );

      if (!userPoints) {
        const response: ApiResponse = {
          success: false,
          message: 'Failed to award task points',
          error: 'AWARD_TASK_POINTS_ERROR',
          timestamp: new Date().toISOString(),
        };
        res.status(500).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Task points awarded successfully',
        data: { userPoints: transformUserPointsDocument(userPoints) },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Error awarding task points:', { error: error instanceof Error ? error.message : String(error) });

      const response: ApiResponse = {
        success: false,
        message: 'Failed to award task points',
        error: 'AWARD_TASK_POINTS_ERROR',
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get user points history
   */
  static async getPointsHistory(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { limit = '50', offset = '0' } = req.query;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User ID is required',
          error: 'MISSING_USER_ID',
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

      const history = await UserPointsModel.getUserPointsHistory(
        userId,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      const response: ApiResponse = {
        success: true,
        message: 'Points history retrieved successfully',
        data: { history },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Error getting points history:', { error: error instanceof Error ? error.message : String(error) });

      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve points history',
        error: 'POINTS_HISTORY_ERROR',
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(response);
    }
  }

  /**
<<<<<<< HEAD
   * Get current user's points history from approved task submissions
   */
  static async getMyPointsHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { limit = '50', offset = '0' } = req.query;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User authentication required',
          error: 'AUTHENTICATION_REQUIRED',
          timestamp: new Date().toISOString(),
        };
        res.status(401).json(response);
        return;
      }

      // Get approved task submissions for the user
      const approvedSubmissions = await UserPointsModel.getApprovedSubmissionsHistory(
        userId,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      console.log('🔍 Backend - Approved submissions found:', approvedSubmissions.length);
      console.log('🔍 Backend - Submissions data:', JSON.stringify(approvedSubmissions, null, 2));

      const response: ApiResponse = {
        success: true,
        message: 'Points history retrieved successfully',
        data: { transactions: approvedSubmissions },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Error getting my points history:', { error: error instanceof Error ? error.message : String(error) });

      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve points history',
        error: 'POINTS_HISTORY_ERROR',
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(response);
    }
  }

  /**
=======
>>>>>>> cafe11fdc9c284cc2da4ed1877ac8b8aab94138b
   * Get points leaderboard
   */
  static async getLeaderboard(req: Request, res: Response): Promise<void> {
    try {
      const { limit = '10' } = req.query;

      const leaderboard = await UserPointsModel.getLeaderboard(parseInt(limit as string));

      const response: ApiResponse = {
        success: true,
        message: 'Leaderboard retrieved successfully',
        data: { leaderboard },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Error getting leaderboard:', { error: error instanceof Error ? error.message : String(error) });

      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve leaderboard',
        error: 'LEADERBOARD_ERROR',
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get points statistics
   */
  static async getPointsStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await UserPointsModel.getPointsStats();

      const response: ApiResponse = {
        success: true,
        message: 'Points statistics retrieved successfully',
        data: { stats },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Error getting points stats:', { error: error instanceof Error ? error.message : String(error) });

      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve points statistics',
        error: 'POINTS_STATS_ERROR',
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(response);
    }
  }

  /**
   * Initialize user points (admin only)
   */
  static async initializeUserPoints(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User ID is required',
          error: 'MISSING_USER_ID',
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

      const userPoints = await UserPointsModel.initializeUserPoints(userId);

      const response: ApiResponse = {
        success: true,
        message: 'User points initialized successfully',
        data: { userPoints: transformUserPointsDocument(userPoints) },
        timestamp: new Date().toISOString(),
      };

      res.status(201).json(response);
    } catch (error) {
      Logger.error('Error initializing user points:', { error: error instanceof Error ? error.message : String(error) });

      const response: ApiResponse = {
        success: false,
        message: 'Failed to initialize user points',
        error: 'INITIALIZE_POINTS_ERROR',
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(response);
    }
  }

  /**
   * Reset user points (admin only)
   */
  static async resetUserPoints(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User ID is required',
          error: 'MISSING_USER_ID',
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

      const success = await UserPointsModel.resetUserPoints(userId);

      if (!success) {
        const response: ApiResponse = {
          success: false,
          message: 'Failed to reset user points',
          error: 'RESET_POINTS_ERROR',
          timestamp: new Date().toISOString(),
        };
        res.status(500).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'User points reset successfully',
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Error resetting user points:', { error: error instanceof Error ? error.message : String(error) });

      const response: ApiResponse = {
        success: false,
        message: 'Failed to reset user points',
        error: 'RESET_POINTS_ERROR',
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(response);
    }
  }
}

// Export individual methods
export const getUserPoints = UserPointsController.getUserPoints;
export const getMyPoints = UserPointsController.getMyPoints;
export const addPoints = UserPointsController.addPoints;
export const spendPoints = UserPointsController.spendPoints;
export const awardTaskPoints = UserPointsController.awardTaskPoints;
export const getPointsHistory = UserPointsController.getPointsHistory;
<<<<<<< HEAD
export const getMyPointsHistory = UserPointsController.getMyPointsHistory;
=======
>>>>>>> cafe11fdc9c284cc2da4ed1877ac8b8aab94138b
export const getLeaderboard = UserPointsController.getLeaderboard;
export const getPointsStats = UserPointsController.getPointsStats;
export const initializeUserPoints = UserPointsController.initializeUserPoints;
export const resetUserPoints = UserPointsController.resetUserPoints;
