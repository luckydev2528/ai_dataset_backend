import { Request, Response } from 'express';
import { TaskModel, CreateTaskData, UpdateTaskData, TaskFilters } from '../../services/database/models/taskModel';
import { ApiResponse } from '../../utils/response';
import { Logger } from '../../utils/logger';
import { transformTaskDocuments, transformTaskDocument } from '../../utils/taskTransform';

class TaskController {
  /**
   * Get all tasks with optional filtering
   */
  static async getTasks(req: Request, res: Response): Promise<void> {
    try {
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
      const tasks = await TaskModel.getActiveTasks();

      const response: ApiResponse = {
        success: true,
        message: 'Active tasks retrieved successfully',
        data: { tasks: transformTaskDocuments(tasks) },
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
    }
  }

  /**
   * Get task by ID
   */
  static async getTaskById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

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

      const task = await TaskModel.getTaskById(id);

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
    }
  }

  /**
   * Create a new task
   */
  static async createTask(req: Request, res: Response): Promise<void> {
    try {
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
    }
  }

  /**
   * Delete task
   */
  static async deleteTask(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

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

      const success = await TaskModel.deleteTask(id);

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
    }
  }

  /**
   * Get task statistics
   */
  static async getTaskStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await TaskModel.getTaskStats();

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
    }
  }

  /**
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
export const getTaskById = TaskController.getTaskById;
export const createTask = TaskController.createTask;
export const updateTask = TaskController.updateTask;
export const completeTask = TaskController.completeTask;
export const deleteTask = TaskController.deleteTask;
export const getTaskStats = TaskController.getTaskStats;
export const markExpiredTasks = TaskController.markExpiredTasks;
