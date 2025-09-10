import { firestoreService } from '../firestoreService';

export interface TaskSubmissionDocument {
  id: string;
  taskId: string;
  userId: string;
  challengeId: string;
  videoId: string;
  videoUrl: string;
  thumbnailUrl?: string | undefined;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewNotes?: string;
  metadata: {
    duration: number;
    width: number;
    height: number;
    fileSize: number;
    resolution: string;
    frameRate: number;
    quality: string;
  };
  challengePrompt: string;
}

export interface CreateTaskSubmissionData {
  taskId: string;
  userId: string;
  challengeId: string;
  videoId: string;
  videoUrl: string;
  thumbnailUrl?: string | undefined;
  metadata: {
    duration: number;
    width: number;
    height: number;
    fileSize: number;
    resolution: string;
    frameRate: number;
    quality: string;
  };
  challengePrompt: string;
}

export interface UpdateTaskSubmissionData {
  status?: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewNotes?: string | undefined;
  reviewedAt?: Date;
}

export interface TaskSubmissionFilters {
  taskId?: string;
  userId?: string;
  challengeId?: string;
  status?: 'pending' | 'approved' | 'rejected';
  submittedAfter?: Date;
  submittedBefore?: Date;
}

export class TaskSubmissionModel {
  private static collection = 'task_submissions' as const;

  /**
   * Create a new task submission
   */
  static async createSubmission(data: CreateTaskSubmissionData): Promise<TaskSubmissionDocument> {
    try {
      const now = new Date();
      const submissionData: Omit<TaskSubmissionDocument, 'id'> = {
        ...data,
        status: 'pending',
        submittedAt: now,
      };

      const docRef = await firestoreService.add<Omit<TaskSubmissionDocument, 'id'>>(this.collection, submissionData);
      const submission = await this.getSubmissionById(docRef.id);
      
      if (!submission) {
        throw new Error('Failed to create task submission');
      }

      return submission;
    } catch (error) {
      console.error('Error creating task submission:', error);
      throw error;
    }
  }

  /**
   * Get submission by ID
   */
  static async getSubmissionById(id: string): Promise<TaskSubmissionDocument | null> {
    try {
      const doc = await firestoreService.get<TaskSubmissionDocument>(this.collection, id);
      return doc;
    } catch (error) {
      console.error('Error getting submission by ID:', error);
      return null;
    }
  }

  /**
   * Get all submissions with optional filtering
   */
  static async getSubmissions(filters: TaskSubmissionFilters = {}): Promise<TaskSubmissionDocument[]> {
    try {
      console.log('🔍 TaskSubmissionModel.getSubmissions called with filters:', filters);
      
      const submissions = await firestoreService.query<TaskSubmissionDocument>(this.collection, (query) => {
        let filteredQuery: any = query;

        // Apply filters
        if (filters.taskId) {
          console.log('📋 Filtering by taskId:', filters.taskId);
          filteredQuery = filteredQuery.where('taskId', '==', filters.taskId);
        }
        if (filters.userId) {
          console.log('📋 Filtering by userId:', filters.userId);
          filteredQuery = filteredQuery.where('userId', '==', filters.userId);
        }
        if (filters.challengeId) {
          console.log('📋 Filtering by challengeId:', filters.challengeId);
          filteredQuery = filteredQuery.where('challengeId', '==', filters.challengeId);
        }
        if (filters.status) {
          console.log('📋 Filtering by status:', filters.status);
          filteredQuery = filteredQuery.where('status', '==', filters.status);
        }
        if (filters.submittedAfter) {
          console.log('📋 Filtering by submittedAfter:', filters.submittedAfter);
          filteredQuery = filteredQuery.where('submittedAt', '>', filters.submittedAfter);
        }
        if (filters.submittedBefore) {
          console.log('📋 Filtering by submittedBefore:', filters.submittedBefore);
          filteredQuery = filteredQuery.where('submittedAt', '<', filters.submittedBefore);
        }

        return filteredQuery;
      });

      // Sort in memory by submission date (newest first)
      const sortedSubmissions = submissions.sort((a, b) => {
        const dateA = a.submittedAt instanceof Date ? a.submittedAt : new Date(a.submittedAt);
        const dateB = b.submittedAt instanceof Date ? b.submittedAt : new Date(b.submittedAt);
        return dateB.getTime() - dateA.getTime();
      });

      console.log(`📊 TaskSubmissionModel.getSubmissions returning ${sortedSubmissions.length} submissions`);
      return sortedSubmissions;
    } catch (error) {
      console.error('Error getting submissions:', error);
      return [];
    }
  }

  /**
   * Get submissions by user
   */
  static async getSubmissionsByUser(userId: string): Promise<TaskSubmissionDocument[]> {
    try {
      return this.getSubmissions({ userId });
    } catch (error) {
      console.error('Error getting submissions by user:', error);
      return [];
    }
  }

  /**
   * Get submissions by task
   */
  static async getSubmissionsByTask(taskId: string): Promise<TaskSubmissionDocument[]> {
    try {
      return this.getSubmissions({ taskId });
    } catch (error) {
      console.error('Error getting submissions by task:', error);
      return [];
    }
  }

  /**
   * Get pending submissions
   */
  static async getPendingSubmissions(): Promise<TaskSubmissionDocument[]> {
    try {
      return this.getSubmissions({ status: 'pending' });
    } catch (error) {
      console.error('Error getting pending submissions:', error);
      return [];
    }
  }

  /**
   * Update submission (for admin approval/rejection)
   */
  static async updateSubmission(id: string, data: UpdateTaskSubmissionData): Promise<TaskSubmissionDocument | null> {
    try {
      const updateData: any = { ...data };
      
      // Set reviewedAt if status is being changed to approved or rejected
      if (data.status && data.status !== 'pending' && !data.reviewedAt) {
        updateData.reviewedAt = new Date();
      }

      await firestoreService.update(this.collection, id, updateData);
      return this.getSubmissionById(id);
    } catch (error) {
      console.error('Error updating submission:', error);
      return null;
    }
  }

  /**
   * Approve submission
   */
  static async approveSubmission(id: string, reviewedBy: string, reviewNotes?: string): Promise<TaskSubmissionDocument | null> {
    try {
      return this.updateSubmission(id, {
        status: 'approved',
        reviewedBy,
        reviewNotes: reviewNotes || undefined,
        reviewedAt: new Date(),
      });
    } catch (error) {
      console.error('Error approving submission:', error);
      return null;
    }
  }

  /**
   * Reject submission
   */
  static async rejectSubmission(id: string, reviewedBy: string, reviewNotes: string): Promise<TaskSubmissionDocument | null> {
    try {
      return this.updateSubmission(id, {
        status: 'rejected',
        reviewedBy,
        reviewNotes,
        reviewedAt: new Date(),
      });
    } catch (error) {
      console.error('Error rejecting submission:', error);
      return null;
    }
  }

  /**
   * Delete submission
   */
  static async deleteSubmission(id: string): Promise<boolean> {
    try {
      await firestoreService.delete(this.collection, id);
      return true;
    } catch (error) {
      console.error('Error deleting submission:', error);
      return false;
    }
  }

  /**
   * Get submission statistics
   */
  static async getSubmissionStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    byUser: Record<string, number>;
    byTask: Record<string, number>;
  }> {
    try {
      const allSubmissions = await this.getSubmissions();
      
      const byUser: Record<string, number> = {};
      const byTask: Record<string, number> = {};

      allSubmissions.forEach(submission => {
        // Count by user
        byUser[submission.userId] = (byUser[submission.userId] || 0) + 1;
        
        // Count by task
        byTask[submission.taskId] = (byTask[submission.taskId] || 0) + 1;
      });

      const stats = {
        total: allSubmissions.length,
        pending: allSubmissions.filter(sub => sub.status === 'pending').length,
        approved: allSubmissions.filter(sub => sub.status === 'approved').length,
        rejected: allSubmissions.filter(sub => sub.status === 'rejected').length,
        byUser,
        byTask,
      };

      return stats;
    } catch (error) {
      console.error('Error getting submission stats:', error);
      return { total: 0, pending: 0, approved: 0, rejected: 0, byUser: {}, byTask: {} };
    }
  }

  /**
   * Check if user has already submitted for a task
   */
  static async hasUserSubmittedForTask(userId: string, taskId: string): Promise<boolean> {
    try {
      const submissions = await this.getSubmissions({ userId, taskId });
      return submissions.length > 0;
    } catch (error) {
      console.error('Error checking user submission:', error);
      return false;
    }
  }

  /**
   * Get user's submission for a specific task
   */
  static async getUserSubmissionForTask(userId: string, taskId: string): Promise<TaskSubmissionDocument | null> {
    try {
      const submissions = await this.getSubmissions({ userId, taskId });
      return submissions.length > 0 ? submissions[0] || null : null;
    } catch (error) {
      console.error('Error getting user submission for task:', error);
      return null;
    }
  }
}
