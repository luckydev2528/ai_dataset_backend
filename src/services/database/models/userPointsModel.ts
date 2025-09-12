import { firestoreService } from '../firestoreService';

export interface UserPointsDocument {
  id: string;
  userId: string;
  totalPoints: number;
  availablePoints: number;
  spentPoints: number;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
  pointsHistory?: PointsTransaction[];
}

export interface PointsTransaction {
  id: string;
  type: 'earned' | 'spent' | 'bonus' | 'penalty' | 'refund';
  amount: number;
  description: string;
  taskId?: string; // If points were earned from a task
  reference?: string; // Reference to the source (task ID, purchase ID, etc.)
  timestamp: Date;
  metadata?: {
    category?: string;
    difficulty?: string;
    multiplier?: number;
    reason?: string;
  };
}

export interface AddPointsData {
  userId: string;
  amount: number;
  type: 'earned' | 'bonus' | 'refund';
  description: string;
  taskId?: string;
  reference?: string;
  metadata?: {
    category?: string;
    difficulty?: string;
    multiplier?: number;
    reason?: string;
  };
}

export interface SpendPointsData {
  userId: string;
  amount: number;
  description: string;
  reference?: string;
  metadata?: {
    category?: string;
    reason?: string;
  };
}

export interface UserPointsStats {
  totalUsers: number;
  totalPointsInSystem: number;
  averagePointsPerUser: number;
  totalPointsEarned: number;
  totalPointsSpent: number;
  pointsByCategory: Record<string, number>;
  topEarners: Array<{
    userId: string;
    totalPoints: number;
    availablePoints: number;
  }>;
}

export class UserPointsModel {
  private static collection = 'user_points' as const;
  private static historyCollection = 'points_history' as const;

  /**
   * Initialize user points (call when user is created)
   */
  static async initializeUserPoints(userId: string): Promise<UserPointsDocument> {
    try {
      const now = new Date();
      const pointsData: Omit<UserPointsDocument, 'id'> = {
        userId,
        totalPoints: 0,
        availablePoints: 0,
        spentPoints: 0,
        lastUpdated: now,
        createdAt: now,
        updatedAt: now,
        pointsHistory: [],
      };

      const docRef = await firestoreService.add<Omit<UserPointsDocument, 'id'>>(this.collection, pointsData);
      const userPoints = await this.getUserPoints(userId);
      
      if (!userPoints) {
        throw new Error('Failed to initialize user points');
      }

      return userPoints;
    } catch (error) {
      console.error('Error initializing user points:', error);
      throw error;
    }
  }

  /**
   * Get user points by user ID
   */
  static async getUserPoints(userId: string): Promise<UserPointsDocument | null> {
    try {
      const points = await firestoreService.query<UserPointsDocument>(this.collection, (query) => 
        query.where('userId', '==', userId).limit(1)
      );
      return points.length > 0 ? points[0]! : null;
    } catch (error) {
      console.error('Error getting user points:', error);
      return null;
    }
  }

  /**
   * Add points to user account
   */
  static async addPoints(data: AddPointsData): Promise<UserPointsDocument | null> {
    try {
      const userPoints = await this.getUserPoints(data.userId);
      if (!userPoints) {
        throw new Error('User points not found');
      }

      const now = new Date();
      const transaction: PointsTransaction = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: data.type,
        amount: data.amount,
        description: data.description,
        ...(data.taskId && { taskId: data.taskId }),
        ...(data.reference && { reference: data.reference }),
        timestamp: now,
        ...(data.metadata && { metadata: data.metadata }),
      };

      const updatedPoints = {
        totalPoints: userPoints.totalPoints + data.amount,
        availablePoints: userPoints.availablePoints + data.amount,
        lastUpdated: now,
        updatedAt: now,
        pointsHistory: [...(userPoints.pointsHistory || []), transaction],
      };

      await firestoreService.update<UserPointsDocument>(this.collection, userPoints.id, updatedPoints);

      // Also store in history collection for analytics
      await firestoreService.add<PointsTransaction>(this.historyCollection, transaction);

      return this.getUserPoints(data.userId);
    } catch (error) {
      console.error('Error adding points:', error);
      return null;
    }
  }

  /**
   * Spend points from user account
   */
  static async spendPoints(data: SpendPointsData): Promise<UserPointsDocument | null> {
    try {
      const userPoints = await this.getUserPoints(data.userId);
      if (!userPoints) {
        throw new Error('User points not found');
      }

      if (userPoints.availablePoints < data.amount) {
        throw new Error('Insufficient points');
      }

      const now = new Date();
      const transaction: PointsTransaction = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'spent',
        amount: -data.amount, // Negative amount for spending
        description: data.description,
        ...(data.reference && { reference: data.reference }),
        timestamp: now,
        ...(data.metadata && { metadata: data.metadata }),
      };

      const updatedPoints = {
        availablePoints: userPoints.availablePoints - data.amount,
        spentPoints: userPoints.spentPoints + data.amount,
        lastUpdated: now,
        updatedAt: now,
        pointsHistory: [...(userPoints.pointsHistory || []), transaction],
      };

      await firestoreService.update<UserPointsDocument>(this.collection, userPoints.id, updatedPoints);

      // Also store in history collection for analytics
      await firestoreService.add<PointsTransaction>(this.historyCollection, transaction);

      return this.getUserPoints(data.userId);
    } catch (error) {
      console.error('Error spending points:', error);
      return null;
    }
  }

  /**
   * Award points for completing a task
   */
  static async awardTaskPoints(
    userId: string,
    taskId: string,
    points: number,
    taskCategory: string,
    taskDifficulty: string
  ): Promise<UserPointsDocument | null> {
    try {
      return this.addPoints({
        userId,
        amount: points,
        type: 'earned',
        description: `Completed task: ${taskId}`,
        taskId,
        metadata: {
          category: taskCategory,
          difficulty: taskDifficulty,
        },
      });
    } catch (error) {
      console.error('Error awarding task points:', error);
      return null;
    }
  }

  /**
   * Get user points history
   */
  static async getUserPointsHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<PointsTransaction[]> {
    try {
      return await firestoreService.query<PointsTransaction>(this.historyCollection, (query) => 
        query
          .where('userId', '==', userId)
          .orderBy('timestamp', 'desc')
          .limit(limit)
          .offset(offset)
      );
    } catch (error) {
      console.error('Error getting user points history:', error);
      return [];
    }
  }

  /**
<<<<<<< HEAD
   * Get approved submissions history for a user
   */
  static async getApprovedSubmissionsHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<PointsTransaction[]> {
    try {
      // Get approved task submissions for the user
      const submissions = await firestoreService.query<any>('task_submissions', (query) => 
        query
          .where('userId', '==', userId)
          .where('status', '==', 'approved')
          .limit(limit)
          .offset(offset)
      );

      console.log('🔍 UserPointsModel - Raw submissions found:', submissions.length);
      console.log('🔍 UserPointsModel - Raw submissions:', JSON.stringify(submissions, null, 2));

      // Sort submissions by reviewedAt date (most recent first)
      const sortedSubmissions = submissions.sort((a, b) => {
        const dateA = a.reviewedAt?.toDate() || a.submittedAt.toDate();
        const dateB = b.reviewedAt?.toDate() || b.submittedAt.toDate();
        return dateB.getTime() - dateA.getTime();
      });

      // Get task details for each submission
      const transactions: PointsTransaction[] = [];
      
      for (const submission of sortedSubmissions) {
        try {
          // Get task details
          const task = await firestoreService.get('tasks', submission.taskId);
          console.log(`🔍 UserPointsModel - Task for submission ${submission.id}:`, task);
          
          if (task) {
            const transaction: PointsTransaction = {
              id: submission.id,
              type: 'earned',
              amount: task.bountyPoints || 0,
              description: `Completed task: "${task.title}"`,
              taskId: submission.taskId,
              timestamp: submission.reviewedAt?.toDate() || submission.submittedAt.toDate(),
              metadata: {
                category: task.category || 'general',
                difficulty: task.difficulty || 'easy',
                multiplier: 1.0,
                reason: 'task_completion',
              },
            };
            transactions.push(transaction);
          }
        } catch (error) {
          console.error(`Error getting task details for submission ${submission.id}:`, error);
          // Still add the transaction even if task details are missing
          const transaction: PointsTransaction = {
            id: submission.id,
            type: 'earned',
            amount: 0, // Unknown amount if task not found
            description: `Completed task: ${submission.taskId}`,
            taskId: submission.taskId,
            timestamp: submission.reviewedAt?.toDate() || submission.submittedAt.toDate(),
            metadata: {
              category: 'unknown',
              difficulty: 'unknown',
              multiplier: 1.0,
              reason: 'task_completion',
            },
          };
          transactions.push(transaction);
        }
      }

      return transactions;
    } catch (error) {
      console.error('Error getting approved submissions history:', error);
      return [];
    }
  }

  /**
=======
>>>>>>> cafe11fdc9c284cc2da4ed1877ac8b8aab94138b
   * Get points statistics
   */
  static async getPointsStats(): Promise<UserPointsStats> {
    try {
      const allUserPoints = await firestoreService.query<UserPointsDocument>(this.collection);

      const stats: UserPointsStats = {
        totalUsers: allUserPoints.length,
        totalPointsInSystem: allUserPoints.reduce((sum, up) => sum + up.availablePoints, 0),
        averagePointsPerUser: 0,
        totalPointsEarned: allUserPoints.reduce((sum, up) => sum + up.totalPoints, 0),
        totalPointsSpent: allUserPoints.reduce((sum, up) => sum + up.spentPoints, 0),
        pointsByCategory: {},
        topEarners: [],
      };

      if (stats.totalUsers > 0) {
        stats.averagePointsPerUser = stats.totalPointsEarned / stats.totalUsers;
      }

      // Calculate top earners
      stats.topEarners = allUserPoints
        .map(up => ({
          userId: up.userId,
          totalPoints: up.totalPoints,
          availablePoints: up.availablePoints,
        }))
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .slice(0, 10);

      return stats;
    } catch (error) {
      console.error('Error getting points stats:', error);
      throw error;
    }
  }

  /**
   * Reset user points (admin only)
   */
  static async resetUserPoints(userId: string): Promise<boolean> {
    try {
      const userPoints = await this.getUserPoints(userId);
      if (!userPoints) {
        return false;
      }

      const now = new Date();
      await firestoreService.update<UserPointsDocument>(this.collection, userPoints.id, {
        totalPoints: 0,
        availablePoints: 0,
        spentPoints: 0,
        lastUpdated: now,
        updatedAt: now,
        pointsHistory: [],
      });

      return true;
    } catch (error) {
      console.error('Error resetting user points:', error);
      return false;
    }
  }

  /**
   * Get points leaderboard
   */
  static async getLeaderboard(limit: number = 10): Promise<Array<{
    userId: string;
    totalPoints: number;
    availablePoints: number;
    rank: number;
  }>> {
    try {
      const allUserPoints = await firestoreService.query<UserPointsDocument>(this.collection);

      return allUserPoints
        .map((up, index) => ({
          userId: up.userId,
          totalPoints: up.totalPoints,
          availablePoints: up.availablePoints,
          rank: index + 1,
        }))
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return [];
    }
  }
}
