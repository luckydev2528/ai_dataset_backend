import { firestoreService } from '../firestoreService';
import { BaseModel, BaseDocument, BaseCreateData, BaseUpdateData, BaseFilters } from '../BaseModel';
import { awardPointsForCompletedTask } from '../../../utils/pointsAwarder';

export interface TaskDocument extends BaseDocument {
  title: string;
  description: string;
  bountyPoints: number;
  expiryDate: Date;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  status: 'active' | 'pending' | 'completed' | 'expired';
  createdBy: string;
  isActive: boolean;
  challengeIds: string[];
  completedBy?: string;
  completedAt?: Date;
  metadata?: {
    tags?: string[];
    requirements?: string[];
    instructions?: string[];
    estimatedTime?: number;
    maxParticipants?: number;
    currentParticipants?: number;
  };
}

export interface CreateTaskData extends BaseCreateData {
  title: string;
  description: string;
  bountyPoints: number;
  expiryDate: Date;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  createdBy: string;
  challengeIds: string[];
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

export interface UpdateTaskData extends BaseUpdateData {
  title?: string;
  description?: string;
  bountyPoints?: number;
  expiryDate?: Date;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  status?: 'active' | 'pending' | 'completed' | 'expired';
  challengeIds?: string[];
  isActive?: boolean;
  completedBy?: string;
  completedAt?: Date;
  metadata?: {
    tags?: string[];
    requirements?: string[];
    instructions?: string[];
    estimatedTime?: number;
    maxParticipants?: number;
    currentParticipants?: number;
  };
}

export interface TaskFilters extends BaseFilters {
  status?: 'active' | 'pending' | 'completed' | 'expired';
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  isActive?: boolean;
  createdBy?: string;
  completedBy?: string;
  challengeId?: string;
  minPoints?: number;
  maxPoints?: number;
  expiresAfter?: Date;
  expiresBefore?: Date;
}

export class TaskModel extends BaseModel<TaskDocument, CreateTaskData, UpdateTaskData, TaskFilters> {
  protected static override collection = 'tasks' as const;

  /**
   * Create a new task
   */
  static async createTask(data: CreateTaskData): Promise<TaskDocument> {
    return this.createDocument(this.collection, data, (data, timestamps) => ({
      ...data,
      status: 'active',
      isActive: data.isActive !== false,
      ...timestamps,
    }));
  }

  /**
   * Get task by ID
   */
  static async getTaskById(id: string): Promise<TaskDocument | null> {
    return this.getDocumentById(this.collection, id);
  }

  /**
   * Get tasks with filtering
   */
  static async getTasks(filters: TaskFilters = {}): Promise<TaskDocument[]> {
    const queryFilters = this.buildQueryFilters(filters);
    return this.getDocuments(this.collection, queryFilters);
  }

  /**
   * Update task
   */
  static async updateTask(id: string, data: UpdateTaskData): Promise<TaskDocument | null> {
    return this.updateDocument(this.collection, id, data, (data, timestamps) => ({
      ...data,
      ...timestamps,
    }));
  }

  /**
   * Delete task
   */
  static async deleteTask(id: string): Promise<boolean> {
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
  }

  /**
   * Get task statistics
   */
  static async getTaskStats(): Promise<{
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
  }
}