import { firestoreService } from '../firestoreService';

export interface TaskDocument {
  id: string;
  title: string;
  description: string;
  bountyPoints: number;
  expiryDate: Date;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  status: 'active' | 'completed' | 'expired';
  createdBy: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    tags?: string[];
    requirements?: string[];
    instructions?: string[];
    estimatedTime?: number;
    maxParticipants?: number;
    currentParticipants?: number;
  };
}

export interface CreateTaskData {
  title: string;
  description: string;
  bountyPoints: number;
  expiryDate: Date;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  createdBy: string;
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

export interface UpdateTaskData {
  title?: string;
  description?: string;
  bountyPoints?: number;
  expiryDate?: Date;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  status?: 'active' | 'completed' | 'expired';
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

export interface TaskFilters {
  status?: 'active' | 'completed' | 'expired';
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  isActive?: boolean;
  createdBy?: string;
  minPoints?: number;
  maxPoints?: number;
  expiresAfter?: Date;
  expiresBefore?: Date;
}

export class TaskModel {
  private static collection = 'tasks' as const;

  /**
   * Create a new task
   */
  static async createTask(data: CreateTaskData): Promise<TaskDocument> {
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
  }

  /**
   * Get task by ID
   */
  static async getTaskById(id: string): Promise<TaskDocument | null> {
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
  }

  /**
   * Update task
   */
  static async updateTask(id: string, data: UpdateTaskData): Promise<TaskDocument | null> {
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
  }

  /**
   * Delete task
   */
  static async deleteTask(id: string): Promise<boolean> {
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
  }

  /**
   * Get task statistics
   */
  static async getTaskStats(): Promise<{
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
  }
}