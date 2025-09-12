import { Request, Response } from 'express';
import { BaseController } from '../BaseController';
import { Logger } from '../../utils/logger';
import { processAllCompletedTasks, processSpecificTask } from '../../utils/manualPointsProcessor';

export class AdminController extends BaseController {
  /**
   * Process all completed tasks for points
   * POST /api/admin/process-completed-tasks
   */
  static async processCompletedTasks(req: Request, res: Response): Promise<void> {
    try {
      Logger.info('🔧 Admin processing completed tasks for points');

      await processAllCompletedTasks();

      AdminController.sendSuccessResponse(
        res, 
        { message: 'Completed tasks processed successfully' }, 
        'All completed tasks have been processed for points'
      );

    } catch (error) {
      AdminController.handleError(error, 'process completed tasks', res);
    }
  }

  /**
   * Process a specific task for points
   * POST /api/admin/process-task/:taskId
   */
  static async processSpecificTask(req: Request, res: Response): Promise<void> {
    try {
      const { taskId } = req.params;

      if (!taskId) {
        res.status(400).json({
          success: false,
          error: 'Task ID is required'
        });
        return;
      }

      Logger.info('🔧 Admin processing specific task for points', { taskId });

      const success = await processSpecificTask(taskId);

      if (success) {
        AdminController.sendSuccessResponse(
          res, 
          { message: 'Task processed successfully' }, 
          'Task has been processed for points'
        );
      } else {
        res.status(400).json({
          success: false,
          error: 'Failed to process task for points'
        });
      }

    } catch (error) {
      AdminController.handleError(error, 'process specific task', res);
    }
  }

  /**
   * Get system status and statistics
   * GET /api/admin/status
   */
  static async getSystemStatus(req: Request, res: Response): Promise<void> {
    try {
      // This could be expanded to include more system statistics
      const status = {
        timestamp: new Date().toISOString(),
        status: 'operational',
        features: {
          automaticPointsAwarding: true,
          manualPointsProcessing: true
        }
      };

      AdminController.sendSuccessResponse(res, status, 'System status retrieved successfully');

    } catch (error) {
      AdminController.handleError(error, 'get system status', res);
    }
  }
}
