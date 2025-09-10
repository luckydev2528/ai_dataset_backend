import { Request, Response } from 'express';
import { VideoSubmissionModel } from '../../services/database/models/videoSubmissionModel';
import { UserModel } from '../../services/database/models/userModel';
import { TaskModel } from '../../services/database/models/taskModel';
import { Logger } from '../../utils/logger';

export class ValidatorController {
  /**
   * Get validator dashboard overview
   * GET /api/validator/dashboard
   */
  static async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const validatorId = (req as any).user?.uid;
      
      if (!validatorId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Get submission statistics
      const stats = await VideoSubmissionModel.getStats();
      
      // Get validator's recent activity
      const validatorSubmissions = await VideoSubmissionModel.getByValidator(validatorId, 10);
      
      res.status(200).json({
        success: true,
        data: {
          stats,
          recentValidations: validatorSubmissions,
        }
      });
    } catch (error) {
      Logger.error('Get validator dashboard error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get pending video submissions for validation
   * GET /api/validator/pending
   */
  static async getPendingSubmissions(req: Request, res: Response): Promise<void> {
    try {
      const validatorId = (req as any).user?.uid;
      const limit = parseInt(req.query.limit as string) || 20;
      const startAfter = req.query.startAfter as string;

      if (!validatorId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Verify user is a validator
      const user = await UserModel.getByUid(validatorId);
      if (!user || user.type !== 'validator') {
        res.status(403).json({
          success: false,
          error: 'Access denied. Validator role required.'
        });
        return;
      }

      const result = await VideoSubmissionModel.getPendingSubmissions(limit, startAfter);
      
      // Enrich with task and user information
      const enrichedSubmissions = await Promise.all(
        result.data.map(async (submission) => {
          const [task, contributor] = await Promise.all([
            TaskModel.getTaskById(submission.taskId),
            UserModel.getByUid(submission.userId)
          ]);
          
          return {
            ...submission,
            task: task ? { id: task.id, title: task.title, description: task.description } : null,
            contributor: contributor ? { 
              id: contributor.id, 
              email: contributor.email, 
              displayName: contributor.displayName 
            } : null,
          };
        })
      );

      res.status(200).json({
        success: true,
        data: {
          submissions: enrichedSubmissions,
          hasMore: result.hasMore,
          lastDoc: result.lastDoc,
        }
      });
    } catch (error) {
      Logger.error('Get pending submissions error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get specific video submission for review
   * GET /api/validator/submission/:submissionId
   */
  static async getSubmissionForReview(req: Request, res: Response): Promise<void> {
    try {
      const { submissionId } = req.params;
      const validatorId = (req as any).user?.uid;

      if (!validatorId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      if (!submissionId) {
        res.status(400).json({
          success: false,
          error: 'Submission ID is required'
        });
        return;
      }

      // Verify user is a validator
      const user = await UserModel.getByUid(validatorId);
      if (!user || user.type !== 'validator') {
        res.status(403).json({
          success: false,
          error: 'Access denied. Validator role required.'
        });
        return;
      }

      const submission = await VideoSubmissionModel.getById(submissionId);
      if (!submission) {
        res.status(404).json({
          success: false,
          error: 'Submission not found'
        });
        return;
      }

      // Get additional context
      const [task, contributor] = await Promise.all([
        TaskModel.getTaskById(submission.taskId),
        UserModel.getByUid(submission.userId)
      ]);

      const enrichedSubmission = {
        ...submission,
        task: task ? { 
          id: task.id, 
          title: task.title, 
          description: task.description,
          bountyPoints: task.bountyPoints,
        } : null,
        contributor: contributor ? {
          id: contributor.id,
          email: contributor.email,
          displayName: contributor.displayName,
        } : null,
      };

      res.status(200).json({
        success: true,
        data: enrichedSubmission
      });
    } catch (error) {
      Logger.error('Get submission for review error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Approve a video submission
   * POST /api/validator/approve/:submissionId
   */
  static async approveSubmission(req: Request, res: Response): Promise<void> {
    try {
      const { submissionId } = req.params;
      const validatorId = (req as any).user?.uid;
      const { tags, notes } = req.body;

      if (!validatorId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      if (!submissionId) {
        res.status(400).json({
          success: false,
          error: 'Submission ID is required'
        });
        return;
      }

      // Verify user is a validator
      const user = await UserModel.getByUid(validatorId);
      if (!user || user.type !== 'validator') {
        res.status(403).json({
          success: false,
          error: 'Access denied. Validator role required.'
        });
        return;
      }

      // Validate required tags
      if (!tags || !tags.environment || !tags.lighting || !tags.handUsed || !tags.outcome || !tags.angleView) {
        res.status(400).json({
          success: false,
          error: 'Missing required tags: environment, lighting, handUsed, outcome, angleView'
        });
        return;
      }

      const submission = await VideoSubmissionModel.getById(submissionId);
      if (!submission) {
        res.status(404).json({
          success: false,
          error: 'Submission not found'
        });
        return;
      }

      if (submission.status !== 'pending') {
        res.status(400).json({
          success: false,
          error: 'Submission has already been processed'
        });
        return;
      }

      const updatedSubmission = await VideoSubmissionModel.approve(
        submissionId,
        user.id,
        tags,
        notes
      );

      Logger.info(`Video submission approved: ${submissionId} by validator ${user.id}`);

      res.status(200).json({
        success: true,
        data: updatedSubmission
      });
    } catch (error) {
      Logger.error('Approve submission error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Reject a video submission
   * POST /api/validator/reject/:submissionId
   */
  static async rejectSubmission(req: Request, res: Response): Promise<void> {
    try {
      const { submissionId } = req.params;
      const validatorId = (req as any).user?.uid;
      const { notes } = req.body;

      if (!validatorId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      if (!submissionId) {
        res.status(400).json({
          success: false,
          error: 'Submission ID is required'
        });
        return;
      }

      // Verify user is a validator
      const user = await UserModel.getByUid(validatorId);
      if (!user || user.type !== 'validator') {
        res.status(403).json({
          success: false,
          error: 'Access denied. Validator role required.'
        });
        return;
      }

      if (!notes || notes.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'Rejection reason is required'
        });
        return;
      }

      const submission = await VideoSubmissionModel.getById(submissionId);
      if (!submission) {
        res.status(404).json({
          success: false,
          error: 'Submission not found'
        });
        return;
      }

      if (submission.status !== 'pending') {
        res.status(400).json({
          success: false,
          error: 'Submission has already been processed'
        });
        return;
      }

      const updatedSubmission = await VideoSubmissionModel.reject(
        submissionId,
        user.id,
        notes
      );

      Logger.info(`Video submission rejected: ${submissionId} by validator ${user.id}`);

      res.status(200).json({
        success: true,
        data: updatedSubmission
      });
    } catch (error) {
      Logger.error('Reject submission error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get validator's validation history
   * GET /api/validator/history
   */
  static async getValidationHistory(req: Request, res: Response): Promise<void> {
    try {
      const validatorId = (req as any).user?.uid;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!validatorId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Verify user is a validator
      const user = await UserModel.getByUid(validatorId);
      if (!user || user.type !== 'validator') {
        res.status(403).json({
          success: false,
          error: 'Access denied. Validator role required.'
        });
        return;
      }

      const validations = await VideoSubmissionModel.getByValidator(user.id, limit);
      
      res.status(200).json({
        success: true,
        data: {
          validations,
          count: validations.length,
        }
      });
    } catch (error) {
      Logger.error('Get validation history error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get validation statistics
   * GET /api/validator/stats
   */
  static async getValidationStats(req: Request, res: Response): Promise<void> {
    try {
      const validatorId = (req as any).user?.uid;

      if (!validatorId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Verify user is a validator
      const user = await UserModel.getByUid(validatorId);
      if (!user || user.type !== 'validator') {
        res.status(403).json({
          success: false,
          error: 'Access denied. Validator role required.'
        });
        return;
      }

      const [globalStats, validatorSubmissions] = await Promise.all([
        VideoSubmissionModel.getStats(),
        VideoSubmissionModel.getByValidator(user.id, 1000) // Get all for stats
      ]);

      const validatorStats = {
        totalReviewed: validatorSubmissions.length,
        approved: validatorSubmissions.filter(s => s.status === 'approved').length,
        rejected: validatorSubmissions.filter(s => s.status === 'rejected').length,
      };

      res.status(200).json({
        success: true,
        data: {
          global: globalStats,
          validator: validatorStats,
        }
      });
    } catch (error) {
      Logger.error('Get validation stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}

export default ValidatorController; 