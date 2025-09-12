import { Request, Response } from 'express';
import { TaskModel, CreateTaskData, UpdateTaskData, TaskFilters } from '../../services/database/models/taskModel';
import { TaskSubmissionModel } from '../../services/database/models/taskSubmissionModel';
import { BaseController } from '../BaseController';
import { Logger } from '../../utils/logger';
import { transformTaskDocuments, transformTaskDocument } from '../../utils/taskTransform';
import { ValidationUtils } from '../../utils/ValidationUtils';
import { NotificationService } from '../../services/notifications/notificationService';
import { firestoreService } from '../../services/database/firestoreService';

class TaskController extends BaseController {
  /**
   * Get all tasks with optional filtering
   */
  static async getTasks(req: Request, res: Response): Promise<void> {
    try {
      const filters: TaskFilters = this.buildFiltersFromQuery(req.query);
      
      const tasks = await TaskModel.getTasks(filters);
      
      TaskController.sendSuccessResponse(res, { tasks: transformTaskDocuments(tasks) }, 'Tasks retrieved successfully');
    } catch (error) {
      TaskController.handleError(error, 'get tasks', res);
    }
  }

  /**
   * Get task by ID
   */
  static async getTaskById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        TaskController.sendValidationError(res, 'Task ID is required');
        return;
      }

      const task = await TaskModel.getTaskById(id);
      
      if (!task) {
        TaskController.sendNotFoundError(res, 'Task');
        return;
      }

      TaskController.sendSuccessResponse(res, { task: transformTaskDocument(task) }, 'Task retrieved successfully');
    } catch (error) {
      TaskController.handleError(error, 'get task by ID', res);
    }
  }

  /**
   * Create a new task
   */
  static async createTask(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.requireUserId(req);
      
      const taskData: CreateTaskData = {
        ...req.body,
        createdBy: userId,
      };

      // Validate required fields
      const validation = ValidationUtils.validateTaskData(taskData);
      if (!validation.isValid) {
        TaskController.sendValidationError(res, 'Invalid task data', validation.errors);
        return;
      }

      const task = await TaskModel.createTask(taskData);
      
      // Send notification if task is created as 'active'
      if (task.status === 'active') {
        try {
          const notificationService = NotificationService.getInstance();
          // Get all users with FCM tokens
          const users = await firestoreService.getCollection('users');
          const tokens = users
            .filter((user: any) => user.fcmToken)
            .map((user: any) => user.fcmToken);
          
          if (tokens.length > 0) {
            await notificationService.sendNewTaskNotification(
              task.title,
              task.id,
              task.bountyPoints || 0,
              tokens
            );
            Logger.info(`New task notification sent for task: ${task.id} to ${tokens.length} users`);
          } else {
            Logger.info('No users with FCM tokens found, skipping notification');
          }
        } catch (notificationError) {
          Logger.error('Failed to send new task notification:', notificationError);
          // Don't fail the task creation if notification fails
        }
      }
      
      TaskController.sendSuccessResponse(res, { task: transformTaskDocument(task) }, 'Task created successfully', 201);
    } catch (error) {
      TaskController.handleError(error, 'create task', res);
    }
  }

  /**
   * Update task
   */
  static async updateTask(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData: UpdateTaskData = req.body;

      if (!id) {
        TaskController.sendValidationError(res, 'Task ID is required');
        return;
      }

      // Get the task before updating to check if status is changing to 'active'
      const oldTask = await TaskModel.getTaskById(id);
      const task = await TaskModel.updateTask(id, updateData);
      
      if (!task) {
        TaskController.sendNotFoundError(res, 'Task');
        return;
      }

      // Send notification if task status changed to 'active'
      if (updateData.status === 'active' && oldTask?.status !== 'active') {
        try {
          const notificationService = NotificationService.getInstance();
          // Get all users with FCM tokens
          const users = await firestoreService.getCollection('users');
          const tokens = users
            .filter((user: any) => user.fcmToken)
            .map((user: any) => user.fcmToken);
          
          if (tokens.length > 0) {
            await notificationService.sendNewTaskNotification(
              task.title,
              task.id,
              task.bountyPoints || 0,
              tokens
            );
            Logger.info(`New task notification sent for task: ${task.id} to ${tokens.length} users`);
          } else {
            Logger.info('No users with FCM tokens found, skipping notification');
          }
        } catch (notificationError) {
          Logger.error('Failed to send new task notification:', notificationError);
          // Don't fail the task update if notification fails
        }
      }

      TaskController.sendSuccessResponse(res, { task: transformTaskDocument(task) }, 'Task updated successfully');
    } catch (error) {
      TaskController.handleError(error, 'update task', res);
    }
  }

  /**
   * Delete task
   */
  static async deleteTask(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        TaskController.sendValidationError(res, 'Task ID is required');
        return;
      }

      const success = await TaskModel.deleteTask(id);
      
      if (!success) {
        TaskController.sendNotFoundError(res, 'Task');
        return;
      }

      TaskController.sendSuccessResponse(res, null, 'Task deleted successfully');
    } catch (error) {
      TaskController.handleError(error, 'delete task', res);
    }
  }

  /**
   * Get active tasks only
   */
  static async getActiveTasks(req: Request, res: Response): Promise<void> {
    try {
      const tasks = await TaskModel.getActiveTasks();
      
      TaskController.sendSuccessResponse(res, { tasks: transformTaskDocuments(tasks) }, 'Active tasks retrieved successfully');
    } catch (error) {
      TaskController.handleError(error, 'get active tasks', res);
    }
  }

  /**
   * Get task statistics
   */
  static async getTaskStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await TaskModel.getTaskStats();
      
      TaskController.sendSuccessResponse(res, { stats }, 'Task statistics retrieved successfully');
    } catch (error) {
      TaskController.handleError(error, 'get task statistics', res);
    }
  }

  /**
   * Mark task as pending
   */
  static async markTaskPending(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = this.requireUserId(req);

      if (!id) {
        TaskController.sendValidationError(res, 'Task ID is required');
        return;
      }

      const task = await TaskModel.markTaskPending(id, userId);
      
      if (!task) {
        TaskController.sendNotFoundError(res, 'Task');
        return;
      }

      TaskController.sendSuccessResponse(res, { task: transformTaskDocument(task) }, 'Task marked as pending');
    } catch (error) {
      TaskController.handleError(error, 'mark task pending', res);
    }
  }

  /**
   * Complete task (admin approval)
   */
  static async completeTask(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const approvedBy = this.requireUserId(req);

      if (!id) {
        TaskController.sendValidationError(res, 'Task ID is required');
        return;
      }

      const task = await TaskModel.completeTask(id, approvedBy);
      
      if (!task) {
        TaskController.sendNotFoundError(res, 'Task');
        return;
      }

      TaskController.sendSuccessResponse(res, { task: transformTaskDocument(task) }, 'Task completed successfully');
    } catch (error) {
      TaskController.handleError(error, 'complete task', res);
    }
  }

  /**
   * Reject task
   */
  static async rejectTask(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const rejectedBy = this.requireUserId(req);

      if (!id) {
        TaskController.sendValidationError(res, 'Task ID is required');
        return;
      }

      const task = await TaskModel.rejectTask(id, rejectedBy);
      
      if (!task) {
        TaskController.sendNotFoundError(res, 'Task');
        return;
      }

      TaskController.sendSuccessResponse(res, { task: transformTaskDocument(task) }, 'Task rejected');
    } catch (error) {
      TaskController.handleError(error, 'reject task', res);
    }
  }

  /**
   * Mark expired tasks (admin only)
   */
  static async markExpiredTasks(req: Request, res: Response): Promise<void> {
    try {
      const expiredCount = await TaskModel.markExpiredTasks();
      
      TaskController.sendSuccessResponse(res, { 
        expiredCount
      }, 'Expired tasks marked successfully');
    } catch (error) {
      TaskController.handleError(error, 'mark expired tasks', res);
    }
  }

  /**
   * Get categorized tasks for a user (Available, Pending, Completed)
   * GET /api/task/categorized
   */
  static async getCategorizedTasks(req: Request, res: Response): Promise<void> {
    try {
      const userId = TaskController.requireUserId(req);
      
      // Get all tasks and user submissions in parallel
      const [allTasks, userSubmissions] = await Promise.all([
        TaskModel.getTasks({ isActive: true }), // Get all active tasks regardless of status
        TaskSubmissionModel.getSubmissionsByUser(userId)
      ]);

      // Create a map of taskId to submission for quick lookup
      const submissionMap = new Map();
      userSubmissions.forEach(submission => {
        submissionMap.set(submission.taskId, submission);
      });

      // Categorize tasks
      const available: any[] = [];
      const pending: any[] = [];
      const completed: any[] = [];

      allTasks.forEach(task => {
        const submission = submissionMap.get(task.id);
        const transformedTask = transformTaskDocument(task);

        if (!submission) {
          // No submission = Available (only if task is active)
          if (task.status === 'active') {
            available.push(transformedTask);
          }
        } else {
          // Has submission - add submission details
          const taskWithSubmission = {
            ...transformedTask,
            submission: {
              id: submission.id,
              taskId: submission.taskId,
              userId: submission.userId,
              challengeId: submission.challengeId,
              videoId: submission.videoId,
              videoUrl: submission.videoUrl,
              thumbnailUrl: submission.thumbnailUrl,
              status: submission.status,
              submittedAt: submission.submittedAt,
              reviewedAt: submission.reviewedAt,
              reviewedBy: submission.reviewedBy,
              reviewNotes: submission.reviewNotes,
              challengePrompt: submission.challengePrompt
            }
          };

          if (submission.status === 'pending') {
            pending.push(taskWithSubmission);
          } else if (submission.status === 'approved' || submission.status === 'rejected') {
            completed.push(taskWithSubmission);
          }
        }
      });

      Logger.info('📋 Categorized tasks retrieved', {
        userId,
        available: available.length,
        pending: pending.length,
        completed: completed.length,
        totalTasks: allTasks.length
      });

      TaskController.sendSuccessResponse(res, {
        available,
        pending,
        completed,
        counts: {
          available: available.length,
          pending: pending.length,
          completed: completed.length
        }
      }, 'Categorized tasks retrieved successfully');

    } catch (error) {
      TaskController.handleError(error, 'get categorized tasks', res);
    }
  }

  /**
   * Build filters from query parameters
   */
  private static buildFiltersFromQuery(query: any): TaskFilters {
    const filters: TaskFilters = {};

    if (query.status) filters.status = query.status as 'active' | 'pending' | 'completed' | 'expired';
    if (query.category) filters.category = query.category as string;
    if (query.difficulty) filters.difficulty = query.difficulty as 'easy' | 'medium' | 'hard';
    if (query.isActive !== undefined) filters.isActive = query.isActive === 'true';
    if (query.createdBy) filters.createdBy = query.createdBy as string;
    if (query.completedBy) filters.completedBy = query.completedBy as string;
    if (query.challengeId) filters.challengeId = query.challengeId as string;
    if (query.minPoints) filters.minPoints = parseInt(query.minPoints as string);
    if (query.maxPoints) filters.maxPoints = parseInt(query.maxPoints as string);
    if (query.expiresAfter) filters.expiresAfter = new Date(query.expiresAfter as string);
    if (query.expiresBefore) filters.expiresBefore = new Date(query.expiresBefore as string);

    return filters;
  }
}

// Export individual methods for route imports
export const getTasks = TaskController.getTasks;
export const getActiveTasks = TaskController.getActiveTasks;
export const getCategorizedTasks = TaskController.getCategorizedTasks;
export const getTaskById = TaskController.getTaskById;
export const createTask = TaskController.createTask;
export const updateTask = TaskController.updateTask;
export const completeTask = TaskController.completeTask;
export const deleteTask = TaskController.deleteTask;
export const getTaskStats = TaskController.getTaskStats;
export const markExpiredTasks = TaskController.markExpiredTasks;

export default TaskController;