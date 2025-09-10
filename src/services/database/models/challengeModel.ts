import { firestoreService } from '../firestoreService';
import { BaseModel, BaseDocument, BaseCreateData, BaseUpdateData, BaseFilters } from '../BaseModel';

export interface ChallengeDocument extends BaseDocument {
  text: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  isActive: boolean;
  createdBy: string;
}

export interface CreateChallengeData extends BaseCreateData {
  text: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  createdBy: string;
  isActive?: boolean;
}

export interface UpdateChallengeData extends BaseUpdateData {
  text?: string;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  isActive?: boolean;
}

export interface ChallengeFilters extends BaseFilters {
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  isActive?: boolean;
  createdBy?: string;
}

export class ChallengeModel extends BaseModel<ChallengeDocument, CreateChallengeData, UpdateChallengeData, ChallengeFilters> {
  protected static override collection = 'challenges' as const;

  /**
   * Create a new challenge
   */
  static async createChallenge(data: CreateChallengeData): Promise<ChallengeDocument> {
    return this.createDocument(this.collection, data, (data, timestamps) => ({
      ...data,
      isActive: data.isActive !== false,
      ...timestamps,
    }));
  }

  /**
   * Get challenge by ID
   */
  static async getChallengeById(id: string): Promise<ChallengeDocument | null> {
    return this.getDocumentById(this.collection, id);
  }

  /**
   * Get challenges with filtering
   */
  static async getChallenges(filters: ChallengeFilters = {}): Promise<ChallengeDocument[]> {
    const queryFilters = this.buildQueryFilters(filters);
    return this.getDocuments(this.collection, queryFilters);
  }

  /**
   * Update challenge
   */
  static async updateChallenge(id: string, data: UpdateChallengeData): Promise<ChallengeDocument | null> {
    return this.updateDocument(this.collection, id, data, (data, timestamps) => ({
      ...data,
      ...timestamps,
    }));
  }

  /**
   * Delete challenge
   */
  static async deleteChallenge(id: string): Promise<boolean> {
    return this.deleteDocument(this.collection, id);
  }

  /**
   * Get active challenges only
   */
  static async getActiveChallenges(): Promise<ChallengeDocument[]> {
    return this.getChallenges({ isActive: true });
  }

  /**
   * Get random challenge
   */
  static async getRandomChallenge(difficulty?: 'easy' | 'medium' | 'hard'): Promise<ChallengeDocument | null> {
    const filters: ChallengeFilters = { isActive: true };
    if (difficulty) {
      filters.difficulty = difficulty;
    }
    
    const challenges = await this.getChallenges(filters);
    if (challenges.length === 0) {
      return null;
    }
    
    const randomIndex = Math.floor(Math.random() * challenges.length);
    return challenges[randomIndex] || null;
  }

  /**
   * Get challenge statistics
   */
  static async getChallengeStats(): Promise<{
    total: number;
    active: number;
    byCategory: Record<string, number>;
    byDifficulty: Record<string, number>;
  }> {
    const allChallenges = await this.getChallenges();
    
    const stats = {
      total: allChallenges.length,
      active: allChallenges.filter(c => c.isActive).length,
      byCategory: {} as Record<string, number>,
      byDifficulty: {} as Record<string, number>,
    };

    // Count by category and difficulty
    allChallenges.forEach(challenge => {
      stats.byCategory[challenge.category] = (stats.byCategory[challenge.category] || 0) + 1;
      stats.byDifficulty[challenge.difficulty] = (stats.byDifficulty[challenge.difficulty] || 0) + 1;
    });

    return stats;
  }
}