import { Request, Response } from 'express';
import { TaskModel, CreateTaskData, UpdateTaskData, TaskFilters } from '../../services/database/models/taskModel';
<<<<<<< HEAD
import { TaskSubmissionModel } from '../../services/database/models/taskSubmissionModel';
import { BaseController } from '../BaseController';
import { Logger } from '../../utils/logger';
import { transformTaskDocuments, transformTaskDocument } from '../../utils/taskTransform';
import { ValidationUtils } from '../../utils/ValidationUtils';
import { NotificationService } from '../../services/notifications/notificationService';
import { firestoreService } from '../../services/database/firestoreService';

class TaskController extends BaseController {
=======
import { ApiResponse } from '../../utils/response';
import { Logger } from '../../utils/logger';
import { transformTaskDocuments, transformTaskDocument } from '../../utils/taskTransform';
import CacheService from '../../services/cache/CacheService';

class TaskController {
>>>>>>> cafe11fdc9c284cc2da4ed1877ac8b8aab94138b
  /**
   * Get all tasks with optional filtering
   */
  static async getTasks(req: Request, res: Response): Promise<void> {
    try {
<<<<<<< HEAD
      const filters: TaskFilters = this.buildFiltersFromQuery(req.query);
      
      const tasks = await TaskModel.getTasks(filters);
      
      TaskController.sendSuccessResponse(res, { tasks: transformTaskDocuments(tasks) }, 'Tasks retrieved successfully');
    } catch (error) {
      TaskController.handleError(error, 'get tasks', res);
=======
      const {
        status,
        category,
        difficulty,
        isActive,
        createdBy,
        minPoints,
        maxPoints,
        expiresAfter,
        expiresBefore,
        search,
      } = req.query;

      const filters: TaskFilters = {};

      if (status) filters.status = status as 'active' | 'completed' | 'expired';
      if (category) filters.category = category as string;
      if (difficulty) filters.difficulty = difficulty as 'easy' | 'medium' | 'hard';
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      if (createdBy) filters.createdBy = createdBy as string;
      if (minPoints) filters.minPoints = parseInt(minPoints as string);
      if (maxPoints) filters.maxPoints = parseInt(maxPoints as string);
      if (expiresAfter) filters.expiresAfter = new Date(expiresAfter as string);
      if (expiresBefore) filters.expiresBefore = new Date(expiresBefore as string);

      let tasks;
      if (search) {
        tasks = await TaskModel.searchTasks(search as string, filters);
      } else {
        tasks = await TaskModel.getTasks(filters);
      }

      const response: ApiResponse = {
        success: true,
        message: 'Tasks retrieved successfully',
        data: { tasks: transformTaskDocuments(tasks) },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Error getting tasks:', { error: error instanceof Error ? error.message : String(error) });

      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve tasks',
        error: 'TASKS_FETCH_ERROR',
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get active tasks only
   */
  static async getActiveTasks(req: Request, res: Response): Promise<void> {
    try {
      const cacheKey = 'cache:api:task_active';

      const tasks = await CacheService.cacheWithRefresh(
        cacheKey,
        async () => {
          const docs = await TaskModel.getActiveTasks();
          return transformTaskDocuments(docs);
        },
        60, // 60s TTL
        0.8,
      );

      const response: ApiResponse = {
        success: true,
        message: 'Active tasks retrieved successfully',
        data: { tasks },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Error getting active tasks:', { error: error instanceof Error ? error.message : String(error) });

      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve active tasks',
        error: 'ACTIVE_TASKS_FETCH_ERROR',
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(response);
>>>>>>> cafe11fdc9c284cc2da4ed1877ac8b8aab94138b
    }
  }

  /**
   * Get task by ID
   */
  static async getTaskById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
<<<<<<< HEAD
      
      if (!id) {
        TaskController.sendValidationError(res, 'Task ID is required');
=======

      if (!id) {
        const response: ApiResponse = {
          success: false,
          message: 'Task ID is required',
          error: 'MISSING_TASK_ID',
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
>>>>>>> cafe11fdc9c284cc2da4ed1877ac8b8aab94138b
        return;
      }

      const task = await TaskModel.getTaskById(id);
<<<<<<< HEAD
      
      if (!task) {
        TaskController.sendNotFoundError(res, 'Task');
        return;
      }

      TaskController.sendSuccessResponse(res, { task: transformTaskDocument(task) }, 'Task retrieved successfully');
    } catch (error) {
      TaskController.handleError(error, 'get task by ID', res);
=======

      if (!task) {
        const response: ApiResponse = {
          success: false,
          message: 'Task not found',
          error: 'TASK_NOT_FOUND',
          timestamp: new Date().toISOString(),
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Task retrieved successfully',
        data: { task: transformTaskDocument(task) },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Error getting task by ID:', { error: error instanceof Error ? error.message : String(error) });

      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve task',
        error: 'TASK_FETCH_ERROR',
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(response);
>>>>>>> cafe11fdc9c284cc2da4ed1877ac8b8aab94138b
    }
  }

  /**
   * Create a new task
   */
  static async createTask(req: Request, res: Response): Promise<void> {
    try {
<<<<<<< HEAD
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
=======
      const {
        title,
        description,
        bountyPoints,
        expiryDate,
        category,
        difficulty,
        metadata,
      } = req.body;

      // Get user ID from auth middleware
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

      // Validate required fields
      if (!title || !description || !bountyPoints || !expiryDate || !category || !difficulty) {
        const response: ApiResponse = {
          success: false,
          message: 'Missing required fields',
          error: 'MISSING_REQUIRED_FIELDS',
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

      const taskData: CreateTaskData = {
        title,
        description,
        bountyPoints: parseInt(bountyPoints),
        expiryDate: new Date(expiryDate),
        category,
        difficulty,
        createdBy: userId,
        metadata,
      };

      const task = await TaskModel.createTask(taskData);

      const response: ApiResponse = {
        success: true,
        message: 'Task created successfully',
        data: { task: transformTaskDocument(task) },
        timestamp: new Date().toISOString(),
      };

      res.status(201).json(response);
    } catch (error) {
      Logger.error('Error creating task:', { error: error instanceof Error ? error.message : String(error) });

      const response: ApiResponse = {
        success: false,
        message: 'Failed to create task',
        error: 'TASK_CREATE_ERROR',
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(response);
>>>>>>> cafe11fdc9c284cc2da4ed1877ac8b8aab94138b
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
<<<<<<< HEAD
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
=======
        const response: ApiResponse = {
          success: false,
          message: 'Task ID is required',
          error: 'MISSING_TASK_ID',
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

      const task = await TaskModel.updateTask(id, updateData);

      if (!task) {
        const response: ApiResponse = {
          success: false,
          message: 'Task not found or update failed',
          error: 'TASK_UPDATE_ERROR',
          timestamp: new Date().toISOString(),
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Task updated successfully',
        data: { task: transformTaskDocument(task) },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Error updating task:', { error: error instanceof Error ? error.message : String(error) });

      const response: ApiResponse = {
        success: false,
        message: 'Failed to update task',
        error: 'TASK_UPDATE_ERROR',
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(response);
    }
  }

  /**
   * Complete task
   */
  static async completeTask(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      if (!id) {
        const response: ApiResponse = {
          success: false,
          message: 'Task ID is required',
          error: 'MISSING_TASK_ID',
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

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

      const task = await TaskModel.completeTask(id, userId);

      if (!task) {
        const response: ApiResponse = {
          success: false,
          message: 'Task not found or completion failed',
          error: 'TASK_COMPLETE_ERROR',
          timestamp: new Date().toISOString(),
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Task completed successfully',
        data: { task: transformTaskDocument(task) },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Error completing task:', { error: error instanceof Error ? error.message : String(error) });

      const response: ApiResponse = {
        success: false,
        message: 'Failed to complete task',
        error: 'TASK_COMPLETE_ERROR',
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(response);
>>>>>>> cafe11fdc9c284cc2da4ed1877ac8b8aab94138b
    }
  }

  /**
   * Delete task
   */
  static async deleteTask(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
<<<<<<< HEAD
        TaskController.sendValidationError(res, 'Task ID is required');
=======
        const response: ApiResponse = {
          success: false,
          message: 'Task ID is required',
          error: 'MISSING_TASK_ID',
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
>>>>>>> cafe11fdc9c284cc2da4ed1877ac8b8aab94138b
        return;
      }

      const success = await TaskModel.deleteTask(id);
<<<<<<< HEAD
      
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
=======

      if (!success) {
        const response: ApiResponse = {
          success: false,
          message: 'Task not found or deletion failed',
          error: 'TASK_DELETE_ERROR',
          timestamp: new Date().toISOString(),
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Task deleted successfully',
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Error deleting task:', { error: error instanceof Error ? error.message : String(error) });

      const response: ApiResponse = {
        success: false,
        message: 'Failed to delete task',
        error: 'TASK_DELETE_ERROR',
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(response);
>>>>>>> cafe11fdc9c284cc2da4ed1877ac8b8aab94138b
    }
  }

  /**
   * Get task statistics
   */
  static async getTaskStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await TaskModel.getTaskStats();
<<<<<<< HEAD
      
      TaskController.sendSuccessResponse(res, { stats }, 'Task statistics retrieved successfully');
    } catch (error) {
      TaskController.handleError(error, 'get task statistics', res);
=======

      const response: ApiResponse = {
        success: true,
        message: 'Task statistics retrieved successfully',
        data: { stats },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Error getting task stats:', { error: error instanceof Error ? error.message : String(error) });

      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve task statistics',
        error: 'TASK_STATS_ERROR',
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(response);
>>>>>>> cafe11fdc9c284cc2da4ed1877ac8b8aab94138b
    }
  }

  /**
<<<<<<< HEAD
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
=======
   * Mark expired tasks
   */
  static async markExpiredTasks(req: Request, res: Response): Promise<void> {
    try {
      const updatedCount = await TaskModel.markExpiredTasks();

      const response: ApiResponse = {
        success: true,
        message: `Marked ${updatedCount} tasks as expired`,
        data: { updatedCount },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Error marking expired tasks:', { error: error instanceof Error ? error.message : String(error) });

      const response: ApiResponse = {
        success: false,
        message: 'Failed to mark expired tasks',
        error: 'MARK_EXPIRED_ERROR',
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(response);
    }
  }
}

// Export individual methods
export const getTasks = TaskController.getTasks;
export const getActiveTasks = TaskController.getActiveTasks;
>>>>>>> cafe11fdc9c284cc2da4ed1877ac8b8aab94138b
export const getTaskById = TaskController.getTaskById;
export const createTask = TaskController.createTask;
export const updateTask = TaskController.updateTask;
export const completeTask = TaskController.completeTask;
export const deleteTask = TaskController.deleteTask;
export const getTaskStats = TaskController.getTaskStats;
export const markExpiredTasks = TaskController.markExpiredTasks;
<<<<<<< HEAD

export default TaskController;
=======
>>>>>>> cafe11fdc9c284cc2da4ed1877ac8b8aab94138b
