import { firestoreService } from '../firestoreService';

export interface VideoSubmissionDocument {
  id: string;
  videoId: string;
  taskId: string;
  userId: string; // Contributor who submitted the video
  challengePrompt: string;
  status: 'pending' | 'approved' | 'rejected';
  validatorId?: string; // ID of the validator who reviewed it
  validatedAt?: Date;
  validationNotes?: string;
  tags?: {
    environment?: 'kitchen' | 'outdoors' | 'living_room' | 'bedroom' | 'office' | 'other';
    lighting?: 'daylight' | 'artificial' | 'low_light' | 'mixed' | 'other';
    handUsed?: 'left' | 'right' | 'both' | 'none' | 'other';
    outcome?: 'success' | 'failure' | 'partial' | 'unclear' | 'other';
    objectsPresent?: string[]; // Array of object names
    angleView?: 'first_person' | 'third_person' | 'overhead' | 'side' | 'other';
  };
  videoMetadata: {
    duration: number;
    width: number;
    height: number;
    fileSize: number;
    resolution: string;
    frameRate: number;
    quality: string;
  };
  downloadUrl: string;
  thumbnailUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVideoSubmissionData {
  videoId: string;
  taskId: string;
  userId: string;
  challengePrompt: string;
  videoMetadata: {
    duration: number;
    width: number;
    height: number;
    fileSize: number;
    resolution: string;
    frameRate: number;
    quality: string;
  };
  downloadUrl: string;
  thumbnailUrl?: string;
}

export interface UpdateVideoSubmissionData {
  status?: 'pending' | 'approved' | 'rejected';
  validatorId?: string;
  validationNotes?: string | undefined;
  tags?: {
    environment?: 'kitchen' | 'outdoors' | 'living_room' | 'bedroom' | 'office' | 'other';
    lighting?: 'daylight' | 'artificial' | 'low_light' | 'mixed' | 'other';
    handUsed?: 'left' | 'right' | 'both' | 'none' | 'other';
    outcome?: 'success' | 'failure' | 'partial' | 'unclear' | 'other';
    objectsPresent?: string[];
    angleView?: 'first_person' | 'third_person' | 'overhead' | 'side' | 'other';
  };
}

export interface VideoSubmissionFilters {
  status?: 'pending' | 'approved' | 'rejected';
  taskId?: string;
  userId?: string;
  validatorId?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

export class VideoSubmissionModel {
  private static collection = 'video_submissions' as const;

  /**
   * Create a new video submission
   */
  static async create(data: CreateVideoSubmissionData): Promise<VideoSubmissionDocument> {
    try {
      const now = new Date();
      const submissionData: Omit<VideoSubmissionDocument, 'id'> = {
        ...data,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await firestoreService.add<Omit<VideoSubmissionDocument, 'id'>>(
        this.collection,
        submissionData
      );
      
      const submission = await this.getById(docRef.id);
      if (!submission) {
        throw new Error('Failed to create video submission');
      }

      console.log(`Video submission created: ${submission.id} for task ${submission.taskId}`);
      return submission;
    } catch (error) {
      console.error('Error creating video submission:', error);
      throw error;
    }
  }

  /**
   * Get video submission by ID
   */
  static async getById(id: string): Promise<VideoSubmissionDocument | null> {
    try {
      return await firestoreService.get<VideoSubmissionDocument>(this.collection, id);
    } catch (error) {
      console.error(`Error getting video submission by ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get all video submissions with optional filtering
   */
  static async getSubmissions(
    filters: VideoSubmissionFilters = {},
    limit: number = 50,
    startAfter?: any
  ): Promise<{ data: VideoSubmissionDocument[]; lastDoc: any; hasMore: boolean }> {
    try {
      return await firestoreService.queryWithPagination<VideoSubmissionDocument>(
        this.collection,
        limit,
        startAfter,
        (query) => {
          let q: any = query;
          
          if (filters.status) {
            q = q.where('status', '==', filters.status);
          }
          if (filters.taskId) {
            q = q.where('taskId', '==', filters.taskId);
          }
          if (filters.userId) {
            q = q.where('userId', '==', filters.userId);
          }
          if (filters.validatorId) {
            q = q.where('validatorId', '==', filters.validatorId);
          }
          if (filters.createdAfter) {
            q = q.where('createdAt', '>', filters.createdAfter);
          }
          if (filters.createdBefore) {
            q = q.where('createdAt', '<', filters.createdBefore);
          }
          
          return q.orderBy('createdAt', 'desc');
        }
      );
    } catch (error) {
      console.error('Error getting video submissions:', error);
      throw error;
    }
  }

  /**
   * Get pending submissions for validation
   */
  static async getPendingSubmissions(
    limit: number = 20,
    startAfter?: any
  ): Promise<{ data: VideoSubmissionDocument[]; lastDoc: any; hasMore: boolean }> {
    try {
      return await this.getSubmissions({ status: 'pending' }, limit, startAfter);
    } catch (error) {
      console.error('Error getting pending submissions:', error);
      throw error;
    }
  }

  /**
   * Update video submission
   */
  static async update(
    id: string,
    updates: UpdateVideoSubmissionData
  ): Promise<VideoSubmissionDocument | null> {
    try {
      const updateData: any = {
        ...updates,
        updatedAt: new Date(),
      };

      if (updates.status && updates.status !== 'pending') {
        updateData.validatedAt = new Date();
      }

      await firestoreService.update(this.collection, id, updateData);
      
      const updatedSubmission = await this.getById(id);
      if (updatedSubmission) {
        console.log(`Video submission updated: ${id} - status: ${updates.status}`);
      }
      
      return updatedSubmission;
    } catch (error) {
      console.error(`Error updating video submission ${id}:`, error);
      throw error;
    }
  }

  /**
   * Approve a video submission
   */
  static async approve(
    id: string,
    validatorId: string,
    tags: UpdateVideoSubmissionData['tags'],
    notes?: string
  ): Promise<VideoSubmissionDocument | null> {
    try {
      const updateData: any = {
        status: 'approved',
        validatorId,
        tags,
        validationNotes: notes,
      };
      return await this.update(id, updateData);
    } catch (error) {
      console.error(`Error approving video submission ${id}:`, error);
      throw error;
    }
  }

  /**
   * Reject a video submission
   */
  static async reject(
    id: string,
    validatorId: string,
    notes: string
  ): Promise<VideoSubmissionDocument | null> {
    try {
      return await this.update(id, {
        status: 'rejected',
        validatorId,
        validationNotes: notes,
      });
    } catch (error) {
      console.error(`Error rejecting video submission ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get submission statistics
   */
  static async getStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  }> {
    try {
      const allSubmissions = await firestoreService.query<VideoSubmissionDocument>(this.collection);
      
      const stats = {
        total: allSubmissions.length,
        pending: allSubmissions.filter(s => s.status === 'pending').length,
        approved: allSubmissions.filter(s => s.status === 'approved').length,
        rejected: allSubmissions.filter(s => s.status === 'rejected').length,
      };

      return stats;
    } catch (error) {
      console.error('Error getting submission stats:', error);
      return { total: 0, pending: 0, approved: 0, rejected: 0 };
    }
  }

  /**
   * Get submissions by validator
   */
  static async getByValidator(
    validatorId: string,
    limit: number = 50
  ): Promise<VideoSubmissionDocument[]> {
    try {
      const result = await this.getSubmissions({ validatorId }, limit);
      return result.data;
    } catch (error) {
      console.error(`Error getting submissions by validator ${validatorId}:`, error);
      throw error;
    }
  }

  /**
   * Delete video submission
   */
  static async delete(id: string): Promise<boolean> {
    try {
      await firestoreService.delete(this.collection, id);
      console.log(`Video submission deleted: ${id}`);
      return true;
    } catch (error) {
      console.error(`Error deleting video submission ${id}:`, error);
      throw error;
    }
  }
}

export default VideoSubmissionModel; 