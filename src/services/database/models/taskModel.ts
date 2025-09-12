import { firestoreService } from '../firestoreService';
<<<<<<< HEAD
import { BaseModel, BaseDocument, BaseCreateData, BaseUpdateData, BaseFilters } from '../BaseModel';
import { awardPointsForCompletedTask } from '../../../utils/pointsAwarder';

export interface TaskDocument extends BaseDocument {
=======

export interface TaskDocument {
  id: string;
>>>>>>> cafe11fdc9c284cc2da4ed1877ac8b8aab94138b
  title: string;
  description: string;
  bountyPoints: number;
  expiryDate: Date;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
<<<<<<< HEAD
  status: 'active' | 'pending' | 'completed' | 'expired';
  createdBy: string;
  isActive: boolean;
  challengeIds: string[];
  completedBy?: string;
  completedAt?: Date;
=======
  status: 'active' | 'completed' | 'expired';
  createdBy: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
>>>>>>> cafe11fdc9c284cc2da4ed1877ac8b8aab94138b
  metadata?: {
    tags?: string[];
    requirements?: string[];
    instructions?: string[];
    estimatedTime?: number;
    maxParticipants?: number;
    currentParticipants?: number;
  };
}

<<<<<<< HEAD
export interface CreateTaskData extends BaseCreateData {
=======
export interface CreateTaskData {
>>>>>>> cafe11fdc9c284cc2da4ed1877ac8b8aab94138b
  title: string;
  description: string;
  bountyPoints: number;
  expiryDate: Date;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  createdBy: string;
<<<<<<< HEAD
  challengeIds: string[];
=======
>>>>>>> cafe11fdc9c284cc2da4ed1877ac8b8aab94138b
  isActive?: boolean;
  metadata?: {
    tags?: string[];
    requirements?: string[];
    instructions?: string[];
    estimatedTime?: number;
    maxParticipants?: number;
    currentParticipants?: number;
  };
}

<<<<<<< HEAD
export interface UpdateTaskData extends BaseUpdateData {
=======
export interface UpdateTaskData {
>>>>>>> cafe11fdc9c284cc2da4ed1877ac8b8aab94138b
  title?: string;
  description?: string;
  bountyPoints?: number;
  expiryDate?: Date;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
<<<<<<< HEAD
  status?: 'active' | 'pending' | 'completed' | 'expired';
  challengeIds?: string[];
  isActive?: boolean;
  completedBy?: string;
  completedAt?: Date;
=======
  status?: 'active' | 'completed' | 'expired';
  isActive?: boolean;
>>>>>>> cafe11fdc9c284cc2da4ed1877ac8b8aab94138b
  metadata?: {
    tags?: string[];
    requirements?: string[];
    instructions?: string[];
    estimatedTime?: number;
    maxParticipants?: number;
    currentParticipants?: number;
  };
}

<<<<<<< HEAD
export interface TaskFilters extends BaseFilters {
  status?: 'active' | 'pending' | 'completed' | 'expired';
=======
export interface TaskFilters {
  status?: 'active' | 'completed' | 'expired';
>>>>>>> cafe11fdc9c284cc2da4ed1877ac8b8aab94138b
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  isActive?: boolean;
  createdBy?: string;
<<<<<<< HEAD
  completedBy?: string;
  challengeId?: string;
=======
>>>>>>> cafe11fdc9c284cc2da4ed1877ac8b8aab94138b
  minPoints?: number;
  maxPoints?: number;
  expiresAfter?: Date;
  expiresBefore?: Date;
}

<<<<<<< HEAD
export class TaskModel extends BaseModel<TaskDocument, CreateTaskData, UpdateTaskData, TaskFilters> {
  protected static override collection = 'tasks' as const;
=======
export class TaskModel {
  private static collection = 'tasks' as const;
>>>>>>> cafe11fdc9c284cc2da4ed1877ac8b8aab94138b

  /**
   * Create a new task
   */
  static async createTask(data: CreateTaskData): Promise<TaskDocument> {
<<<<<<< HEAD
    return this.createDocument(this.collection, data, (data, timestamps) => ({
      ...data,
      status: 'active',
      isActive: data.isActive !== false,
      ...timestamps,
    }));
=======
    try {
      const now = new Date();
      const taskData: Omit<TaskDocument, 'id'> = {
        ...data,
        status: 'active',
        isActive: data.isActive !== false, // Default to true
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await firestoreService.add<Omit<TaskDocument, 'id'>>(this.collection, taskData);
      const task = await this.getTaskById(docRef.id);
      
      if (!task) {
        throw new Error('Failed to create task');
      }

      return task;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
>>>>>>> cafe11fdc9c284cc2da4ed1877ac8b8aab94138b
  }

  /**
   * Get task by ID
   */
  static async getTaskById(id: string): Promise<TaskDocument | null> {
<<<<<<< HEAD
    return this.getDocumentById(this.collection, id);
  }

  /**
   * Get tasks with filtering
   */
  static async getTasks(filters: TaskFilters = {}): Promise<TaskDocument[]> {
    const queryFilters = this.buildQueryFilters(filters);
    return this.getDocuments(this.collection, queryFilters);
=======
    try {
      const doc = await firestoreService.get<TaskDocument>(this.collection, id);
      return doc;
    } catch (error) {
      console.error('Error getting task by ID:', error);
      return null;
    }
  }

  /**
   * Get all tasks with optional filtering
   */
  static async getTasks(filters: TaskFilters = {}): Promise<TaskDocument[]> {
    try {
      console.log('🔍 TaskModel.getTasks called with filters:', filters);
      
      const tasks = await firestoreService.query<TaskDocument>(this.collection, (query) => {
        let filteredQuery: any = query;

        // Apply filters
        if (filters.status) {
          console.log('📋 Filtering by status:', filters.status);
          filteredQuery = filteredQuery.where('status', '==', filters.status);
        }
        if (filters.category) {
          console.log('📋 Filtering by category:', filters.category);
          filteredQuery = filteredQuery.where('category', '==', filters.category);
        }
        if (filters.difficulty) {
          console.log('📋 Filtering by difficulty:', filters.difficulty);
          filteredQuery = filteredQuery.where('difficulty', '==', filters.difficulty);
        }
        if (filters.isActive !== undefined) {
          console.log('📋 Filtering by isActive:', filters.isActive);
          filteredQuery = filteredQuery.where('isActive', '==', filters.isActive);
        }
        if (filters.createdBy) {
          console.log('📋 Filtering by createdBy:', filters.createdBy);
          filteredQuery = filteredQuery.where('createdBy', '==', filters.createdBy);
        }
        if (filters.minPoints !== undefined) {
          console.log('📋 Filtering by minPoints:', filters.minPoints);
          filteredQuery = filteredQuery.where('bountyPoints', '>=', filters.minPoints);
        }
        if (filters.maxPoints !== undefined) {
          console.log('📋 Filtering by maxPoints:', filters.maxPoints);
          filteredQuery = filteredQuery.where('bountyPoints', '<=', filters.maxPoints);
        }
        if (filters.expiresAfter) {
          console.log('📋 Filtering by expiresAfter:', filters.expiresAfter);
          filteredQuery = filteredQuery.where('expiryDate', '>', filters.expiresAfter);
        }
        if (filters.expiresBefore) {
          console.log('📋 Filtering by expiresBefore:', filters.expiresBefore);
          filteredQuery = filteredQuery.where('expiryDate', '<', filters.expiresBefore);
        }

        // Don't use orderBy to avoid composite index requirement
        // We'll sort in memory instead
        return filteredQuery;
      });

      // Sort in memory by creation date (newest first)
      const sortedTasks = tasks.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });

      console.log(`📊 TaskModel.getTasks returning ${sortedTasks.length} tasks`);
      return sortedTasks;
    } catch (error) {
      console.error('Error getting tasks:', error);
      return [];
    }
  }

  /**
   * Get active tasks (not expired and active)
   */
  static async getActiveTasks(): Promise<TaskDocument[]> {
    try {
      const now = new Date();
      console.log('🔍 Getting active tasks, current time:', now);
      
      // Get all tasks first (no filters to avoid index issues)
      const allTasks = await firestoreService.query<TaskDocument>(this.collection, (query) => {
        return query; // No filters at all
      });
      
      console.log(`📊 Retrieved ${allTasks.length} total tasks from Firestore`);
      
      // Filter in memory for active, non-expired tasks
      const validTasks = allTasks.filter(task => {
        const isActive = task.status === 'active';
        
        // Convert Firestore Timestamp to Date if needed
        let expiryDate: Date = task.expiryDate;
        if (expiryDate && typeof expiryDate === 'object' && 'toDate' in expiryDate && typeof (expiryDate as any).toDate === 'function') {
          expiryDate = (expiryDate as any).toDate();
        } else if (typeof expiryDate === 'string') {
          expiryDate = new Date(expiryDate);
        }
        
        const isNotExpired = expiryDate > now;
        const isTaskActive = task.isActive !== false; // Default to true if not set
        
        console.log(`📋 Task "${task.title}": status=${task.status}, isActive=${isTaskActive}, expiry=${expiryDate}, valid=${isActive && isNotExpired && isTaskActive}`);
        
        return isActive && isNotExpired && isTaskActive;
      });
      
      console.log(`✅ Found ${validTasks.length} valid active tasks out of ${allTasks.length} total tasks`);
      return validTasks;
    } catch (error) {
      console.error('Error getting active tasks:', error);
      return [];
    }
>>>>>>> cafe11fdc9c284cc2da4ed1877ac8b8aab94138b
  }

  /**
   * Update task
   */
  static async updateTask(id: string, data: UpdateTaskData): Promise<TaskDocument | null> {
<<<<<<< HEAD
    return this.updateDocument(this.collection, id, data, (data, timestamps) => ({
      ...data,
      ...timestamps,
    }));
=======
    try {
      const updateData = {
        ...data,
        updatedAt: new Date(),
      };

      await firestoreService.update(this.collection, id, updateData);
      return this.getTaskById(id);
    } catch (error) {
      console.error('Error updating task:', error);
      return null;
    }
  }

  /**
   * Complete a task
   */
  static async completeTask(id: string, completedBy: string): Promise<TaskDocument | null> {
    try {
      const updateData = {
        status: 'completed' as const,
        updatedAt: new Date(),
        completedBy,
        completedAt: new Date(),
      };

      await firestoreService.update(this.collection, id, updateData);
      return this.getTaskById(id);
    } catch (error) {
      console.error('Error completing task:', error);
      return null;
    }
>>>>>>> cafe11fdc9c284cc2da4ed1877ac8b8aab94138b
  }

  /**
   * Delete task
   */
  static async deleteTask(id: string): Promise<boolean> {
<<<<<<< HEAD
    return this.deleteDocument(this.collection, id);
  }

  /**
   * Get active tasks only
   */
  static async getActiveTasks(): Promise<TaskDocument[]> {
    // Get all active tasks first, then filter by expiry date in memory
    // This avoids the need for a composite index
    const tasks = await this.getTasks({
      status: 'active',
      isActive: true,
    });
    
    const now = new Date();
    return tasks.filter(task => {
      // Handle Firestore Timestamp objects
      const expiryDate = (task.expiryDate as any)?.toDate ? (task.expiryDate as any).toDate() : new Date(task.expiryDate);
      return expiryDate > now;
    });
  }

  /**
   * Mark task as pending
   */
  static async markTaskPending(id: string, userId: string): Promise<TaskDocument | null> {
    return this.updateTask(id, {
      status: 'pending',
      completedBy: userId,
      completedAt: new Date(),
    });
  }

  /**
   * Complete task (admin approval)
   */
  static async completeTask(id: string, approvedBy: string): Promise<TaskDocument | null> {
    // First get the task data to award points
    const task = await this.getTaskById(id);
    if (!task) {
      throw new Error('Task not found');
    }

    // Update the task status
    const updatedTask = await this.updateTask(id, {
      status: 'completed',
      approvedBy,
      completedBy: approvedBy,
      completedAt: new Date(),
    });

    // Automatically award points to the user
    if (updatedTask && task.completedBy) {
      try {
        await awardPointsForCompletedTask(
          id,
          task.completedBy,
          task.bountyPoints,
          task.category,
          task.difficulty,
          approvedBy
        );
      } catch (error) {
        console.error('Failed to award points for completed task:', error);
        // Don't fail the task completion if points awarding fails
      }
    }

    return updatedTask;
  }

  /**
   * Reject task
   */
  static async rejectTask(id: string, rejectedBy: string): Promise<TaskDocument | null> {
    return this.updateTask(id, {
      status: 'active',
      rejectedBy,
      rejectedAt: new Date(),
    });
  }

  /**
   * Mark expired tasks
   */
  static async markExpiredTasks(): Promise<number> {
    const now = new Date();
    const expiredTasks = await this.getTasks({
      status: 'active',
      expiresBefore: now,
    });

    let count = 0;
    for (const task of expiredTasks) {
      const updated = await this.updateTask(task.id, { status: 'expired' });
      if (updated) count++;
    }

    return count;
=======
    try {
      await firestoreService.delete(this.collection, id);
      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      return false;
    }
  }

  /**
   * Search tasks by title or description
   */
  static async searchTasks(searchTerm: string, filters: TaskFilters = {}): Promise<TaskDocument[]> {
    try {
      const tasks = await this.getTasks(filters);
      
      const searchLower = searchTerm.toLowerCase();
      return tasks.filter(task => 
        task.title.toLowerCase().includes(searchLower) ||
        task.description.toLowerCase().includes(searchLower)
      );
    } catch (error) {
      console.error('Error searching tasks:', error);
      return [];
    }
>>>>>>> cafe11fdc9c284cc2da4ed1877ac8b8aab94138b
  }

  /**
   * Get task statistics
   */
  static async getTaskStats(): Promise<{
<<<<<<< HEAD
    totalTasks: number;
    activeTasks: number;
    pendingTasks: number;
    completedTasks: number;
    expiredTasks: number;
    totalPointsAwarded: number;
    averagePointsPerTask: number;
    tasksByCategory: Record<string, number>;
    tasksByDifficulty: Record<string, number>;
  }> {
    const allTasks = await this.getTasks();
    
    const stats = {
      totalTasks: allTasks.length,
      activeTasks: allTasks.filter(t => t.status === 'active').length,
      pendingTasks: allTasks.filter(t => t.status === 'pending').length,
      completedTasks: allTasks.filter(t => t.status === 'completed').length,
      expiredTasks: allTasks.filter(t => t.status === 'expired').length,
      totalPointsAwarded: allTasks
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + t.bountyPoints, 0),
      averagePointsPerTask: 0,
      tasksByCategory: {} as Record<string, number>,
      tasksByDifficulty: {} as Record<string, number>,
    };

    stats.averagePointsPerTask = stats.totalTasks > 0 
      ? allTasks.reduce((sum, t) => sum + t.bountyPoints, 0) / stats.totalTasks 
      : 0;

    // Count by category
    allTasks.forEach(task => {
      stats.tasksByCategory[task.category] = (stats.tasksByCategory[task.category] || 0) + 1;
      stats.tasksByDifficulty[task.difficulty] = (stats.tasksByDifficulty[task.difficulty] || 0) + 1;
    });

    return stats;
=======
    total: number;
    active: number;
    completed: number;
    expired: number;
  }> {
    try {
      const allTasks = await this.getTasks();
      
      const stats = {
        total: allTasks.length,
        active: allTasks.filter(task => task.status === 'active').length,
        completed: allTasks.filter(task => task.status === 'completed').length,
        expired: allTasks.filter(task => task.status === 'expired').length,
      };

      return stats;
    } catch (error) {
      console.error('Error getting task stats:', error);
      return { total: 0, active: 0, completed: 0, expired: 0 };
    }
  }

  /**
   * Mark expired tasks
   */
  static async markExpiredTasks(): Promise<number> {
    try {
      const now = new Date();
      const activeTasks = await this.getTasks({ status: 'active' });
      
      const expiredTasks = activeTasks.filter(task => task.expiryDate < now);
      
      for (const task of expiredTasks) {
        await this.updateTask(task.id, { status: 'expired' });
      }

      return expiredTasks.length;
    } catch (error) {
      console.error('Error marking expired tasks:', error);
      return 0;
    }
>>>>>>> cafe11fdc9c284cc2da4ed1877ac8b8aab94138b
  }
}