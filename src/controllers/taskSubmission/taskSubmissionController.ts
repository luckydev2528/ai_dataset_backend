import { Request, Response } from 'express';
import { TaskSubmissionModel, TaskSubmissionFilters, UpdateTaskSubmissionData } from '../../services/database/models/taskSubmissionModel';
import { TaskModel } from '../../services/database/models/taskModel';
import { BaseController } from '../BaseController';
import { Logger } from '../../utils/logger';

export class TaskSubmissionController extends BaseController {
  /**
   * Get all task submissions with optional filtering
   * GET /api/submissions
   */
  static async getSubmissions(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.requireUserId(req);

      const filters: TaskSubmissionFilters = {};

      // Apply query filters
      if (req.query.taskId) filters.taskId = req.query.taskId as string;
      if (req.query.userId) filters.userId = req.query.userId as string;
      if (req.query.challengeId) filters.challengeId = req.query.challengeId as string;
      if (req.query.status) filters.status = req.query.status as 'pending' | 'approved' | 'rejected';
      if (req.query.submittedAfter) filters.submittedAfter = new Date(req.query.submittedAfter as string);
      if (req.query.submittedBefore) filters.submittedBefore = new Date(req.query.submittedBefore as string);

      const submissions = await TaskSubmissionModel.getSubmissions(filters);

      Logger.info('📋 Task submissions retrieved', {
        count: submissions.length,
        filters,
        requestedBy: userId
      });

      TaskSubmissionController.sendSuccessResponse(res, { submissions }, 'Task submissions retrieved successfully');

    } catch (error) {
      TaskSubmissionController.handleError(error, 'get submissions', res);
    }
  }

  /**
   * Get pending submissions (admin only)
   * GET /api/submissions/pending
   */
  static async getPendingSubmissions(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // TODO: Add admin role check here
      // const userRole = (req as any).user?.role;
      // if (userRole !== 'admin') {
      //   res.status(403).json({
      //     success: false,
      //     error: 'Admin access required'
      //   });
      //   return;
      // }

      const submissions = await TaskSubmissionModel.getPendingSubmissions();

      Logger.info('📋 Pending submissions retrieved', {
        count: submissions.length,
        requestedBy: userId
      });

      res.status(200).json({
        success: true,
        data: { submissions }
      });

    } catch (error) {
      Logger.error('Error getting pending submissions:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get submissions by user
   * GET /api/submissions/user/:userId
   */
  static async getSubmissionsByUser(req: Request, res: Response): Promise<void> {
    try {
      const requesterId = (req as any).user?.id;
      if (!requesterId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { userId } = req.params;

      // Users can only view their own submissions unless they're admin
      if (requesterId !== userId) {
        // TODO: Add admin role check here
        // const userRole = (req as any).user?.role;
        // if (userRole !== 'admin') {
        //   res.status(403).json({
        //     success: false,
        //     error: 'Access denied'
        //   });
        //   return;
        // }
      }

      const submissions = await TaskSubmissionModel.getSubmissionsByUser(userId!);

      Logger.info('📋 User submissions retrieved', {
        userId,
        count: submissions.length,
        requestedBy: requesterId
      });

      res.status(200).json({
        success: true,
        data: { submissions }
      });

    } catch (error) {
      Logger.error('Error getting user submissions:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get submissions by task
   * GET /api/submissions/task/:taskId
   */
  static async getSubmissionsByTask(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { taskId } = req.params;

      const submissions = await TaskSubmissionModel.getSubmissionsByTask(taskId!);

      Logger.info('📋 Task submissions retrieved', {
        taskId,
        count: submissions.length,
        requestedBy: userId
      });

      res.status(200).json({
        success: true,
        data: { submissions }
      });

    } catch (error) {
      Logger.error('Error getting task submissions:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get submission by ID
   * GET /api/submissions/:id
   */
  static async getSubmissionById(req: Request, res: Response): Promise<void> {
    try {
      const requesterId = (req as any).user?.id;
      if (!requesterId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { id } = req.params;

      const submission = await TaskSubmissionModel.getSubmissionById(id!);

      if (!submission) {
        res.status(404).json({
          success: false,
          error: 'Submission not found'
        });
        return;
      }

      // Users can only view their own submissions unless they're admin
      if (requesterId !== submission.userId) {
        // TODO: Add admin role check here
        // const userRole = (req as any).user?.role;
        // if (userRole !== 'admin') {
        //   res.status(403).json({
        //     success: false,
        //     error: 'Access denied'
        //   });
        //   return;
        // }
      }

      Logger.info('📋 Submission retrieved', {
        submissionId: id,
        requestedBy: requesterId
      });

      res.status(200).json({
        success: true,
        data: { submission }
      });

    } catch (error) {
      Logger.error('Error getting submission by ID:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Approve submission (admin only)
   * POST /api/submissions/:id/approve
   */
  static async approveSubmission(req: Request, res: Response): Promise<void> {
    try {
      const adminId = (req as any).user?.id;
      if (!adminId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // TODO: Add admin role check here
      // const userRole = (req as any).user?.role;
      // if (userRole !== 'admin') {
      //   res.status(403).json({
      //     success: false,
      //     error: 'Admin access required'
      //   });
      //   return;
      // }

      const { id } = req.params;
      const { reviewNotes } = req.body;

      const submission = await TaskSubmissionModel.getSubmissionById(id!);
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
          error: `Submission is already ${submission.status}`
        });
        return;
      }

      // Approve the submission
      const updatedSubmission = await TaskSubmissionModel.approveSubmission(id!, adminId, reviewNotes);

      if (!updatedSubmission) {
        res.status(500).json({
          success: false,
          error: 'Failed to approve submission'
        });
        return;
      }

      // Mark the task as completed (this now automatically awards points)
      const updatedTask = await TaskModel.completeTask(submission.taskId, adminId);

      Logger.info('✅ Submission approved, task completed, points awarded (if task found)', {
        submissionId: id,
        taskId: submission.taskId,
        userId: submission.userId,
        approvedBy: adminId
      });

      res.status(200).json({
        success: true,
        data: { 
          submission: updatedSubmission,
          taskStatus: 'completed'
        }
      });

    } catch (error) {
      Logger.error('Error approving submission:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Reject submission (admin only)
   * POST /api/submissions/:id/reject
   */
  static async rejectSubmission(req: Request, res: Response): Promise<void> {
    try {
      const adminId = (req as any).user?.id;
      if (!adminId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // TODO: Add admin role check here
      // const userRole = (req as any).user?.role;
      // if (userRole !== 'admin') {
      //   res.status(403).json({
      //     success: false,
      //     error: 'Admin access required'
      //   });
      //   return;
      // }

      const { id } = req.params;
      const { reviewNotes } = req.body;

      if (!reviewNotes) {
        res.status(400).json({
          success: false,
          error: 'Review notes are required for rejection'
        });
        return;
      }

      const submission = await TaskSubmissionModel.getSubmissionById(id!);
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
          error: `Submission is already ${submission.status}`
        });
        return;
      }

      // Reject the submission
      const updatedSubmission = await TaskSubmissionModel.rejectSubmission(id!, adminId, reviewNotes);

      if (!updatedSubmission) {
        res.status(500).json({
          success: false,
          error: 'Failed to reject submission'
        });
        return;
      }

      // Mark the task as active again (allow resubmission)
      await TaskModel.rejectTask(submission.taskId, adminId);

      Logger.info('❌ Submission rejected and task returned to active', {
        submissionId: id,
        taskId: submission.taskId,
        userId: submission.userId,
        rejectedBy: adminId,
        reviewNotes
      });

      res.status(200).json({
        success: true,
        data: { 
          submission: updatedSubmission,
          taskStatus: 'active'
        }
      });

    } catch (error) {
      Logger.error('Error rejecting submission:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get submission statistics
   * GET /api/submissions/stats
   */
  static async getSubmissionStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const stats = await TaskSubmissionModel.getSubmissionStats();

      Logger.info('📊 Submission stats retrieved', {
        ...stats,
        requestedBy: userId
      });

      res.status(200).json({
        success: true,
        data: { stats }
      });

    } catch (error) {
      Logger.error('Error getting submission stats:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}
