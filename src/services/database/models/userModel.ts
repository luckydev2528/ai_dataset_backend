import { firestoreService } from '../firestoreService';

export interface UserDocument {
  id: string;
  uid: string; // Firebase Auth UID
  email: string;
  displayName?: string;
  photoURL?: string;
  type: 'user' | 'admin' | 'moderator' | 'validator';
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  preferences?: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    notifications: boolean;
  };
  profile?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    dateOfBirth?: Date;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      country?: string;
      zipCode?: string;
    };
  };
  socialProviders?: Array<{
    provider: 'google' | 'facebook' | 'twitter' | 'apple';
    providerId: string;
    email?: string;
    displayName?: string;
    photoURL?: string;
    connectedAt: Date;
  }>;
  deviceCount: number;
  sessionCount: number;
}

export class UserModel {
  private static collection = 'users' as const;

  /**
   * Create a new user document
   */
  static async create(userData: Omit<UserDocument, 'id' | 'createdAt' | 'updatedAt' | 'deviceCount' | 'sessionCount'>): Promise<UserDocument> {
    try {
      const docRef = await firestoreService.add<Omit<UserDocument, 'id' | 'createdAt' | 'updatedAt'>>(this.collection, {
        ...userData,
        deviceCount: 0,
        sessionCount: 0,
      });
      
      const user = await this.getById(docRef.id);
      if (!user) {
        throw new Error('Failed to create user');
      }
      
      console.log(`User created: ${user.email} (${user.id})`);
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  static async getById(id: string): Promise<UserDocument | null> {
    try {
      return await firestoreService.get<UserDocument>(this.collection, id);
    } catch (error) {
      console.error(`Error getting user by ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get user by Firebase UID
   */
  static async getByUid(uid: string): Promise<UserDocument | null> {
    try {
      const users = await firestoreService.query<UserDocument>(
        this.collection,
        (query) => query.where('uid', '==', uid).limit(1)
      );
      
      return users.length > 0 ? users[0]! : null;
    } catch (error) {
      console.error(`Error getting user by UID ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Get user by email
   */
  static async getByEmail(email: string): Promise<UserDocument | null> {
    try {
      const users = await firestoreService.query<UserDocument>(
        this.collection,
        (query) => query.where('email', '==', email).limit(1)
      );
      
      return users.length > 0 ? users[0]! : null;
    } catch (error) {
      console.error(`Error getting user by email ${email}:`, error);
      throw error;
    }
  }

  /**
   * Update user
   */
  static async update(id: string, updates: Partial<UserDocument>): Promise<UserDocument | null> {
    try {
      await firestoreService.update(this.collection, id, updates);
      
      const updatedUser = await this.getById(id);
      if (updatedUser) {
        console.log(`User updated: ${updatedUser.email} (${id})`);
      }
      
      return updatedUser;
    } catch (error) {
      console.error(`Error updating user ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update user by UID
   */
  static async updateByUid(uid: string, updates: Partial<UserDocument>): Promise<UserDocument | null> {
    try {
      const user = await this.getByUid(uid);
      if (!user) {
        return null;
      }
      
      return await this.update(user.id, updates);
    } catch (error) {
      console.error(`Error updating user by UID ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Delete user
   */
  static async delete(id: string): Promise<boolean> {
    try {
      await firestoreService.delete(this.collection, id);
      console.log(`User deleted: ${id}`);
      return true;
    } catch (error) {
      console.error(`Error deleting user ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get all users with pagination
   */
  static async getAll(
    limit: number = 10,
    startAfter?: any,
    filters?: {
      type?: 'user' | 'admin' | 'moderator';
      isActive?: boolean;
    }
  ): Promise<{ data: UserDocument[]; lastDoc: any; hasMore: boolean }> {
    try {
      return await firestoreService.queryWithPagination<UserDocument>(
        this.collection,
        limit,
        startAfter,
        (query) => {
          let q: any = query;
          if (filters?.type) {
            q = q.where('type', '==', filters.type);
          }
          if (filters?.isActive !== undefined) {
            q = q.where('isActive', '==', filters.isActive);
          }
          return q.orderBy('createdAt', 'desc');
        }
      );
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }

  /**
   * Search users
   */
  static async search(
    searchTerm: string,
    limit: number = 10
  ): Promise<UserDocument[]> {
    try {
      // Note: Firestore doesn't support full-text search natively
      // This is a basic implementation - consider using Algolia or Elasticsearch for better search
      const users = await firestoreService.query<UserDocument>(
        this.collection,
        (query) => query
          .where('email', '>=', searchTerm)
          .where('email', '<=', searchTerm + '\uf8ff')
          .limit(limit)
      );
      
      return users;
    } catch (error) {
      console.error(`Error searching users with term "${searchTerm}":`, error);
      throw error;
    }
  }

  /**
   * Update user's last login
   */
  static async updateLastLogin(uid: string): Promise<void> {
    try {
      await this.updateByUid(uid, {
        lastLoginAt: new Date(),
      });
    } catch (error) {
      console.error(`Error updating last login for user ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Increment device count
   */
  static async incrementDeviceCount(uid: string): Promise<void> {
    try {
      const user = await this.getByUid(uid);
      if (user) {
        await this.update(user.id, {
          deviceCount: user.deviceCount + 1,
        });
      }
    } catch (error) {
      console.error(`Error incrementing device count for user ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Decrement device count
   */
  static async decrementDeviceCount(uid: string): Promise<void> {
    try {
      const user = await this.getByUid(uid);
      if (user && user.deviceCount > 0) {
        await this.update(user.id, {
          deviceCount: user.deviceCount - 1,
        });
      }
    } catch (error) {
      console.error(`Error decrementing device count for user ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Increment session count
   */
  static async incrementSessionCount(uid: string): Promise<void> {
    try {
      const user = await this.getByUid(uid);
      if (user) {
        await this.update(user.id, {
          sessionCount: user.sessionCount + 1,
        });
      }
    } catch (error) {
      console.error(`Error incrementing session count for user ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Decrement session count
   */
  static async decrementSessionCount(uid: string): Promise<void> {
    try {
      const user = await this.getByUid(uid);
      if (user && user.sessionCount > 0) {
        await this.update(user.id, {
          sessionCount: user.sessionCount - 1,
        });
      }
    } catch (error) {
      console.error(`Error decrementing session count for user ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Add social provider
   */
  static async addSocialProvider(
    uid: string,
    provider: {
      provider: 'google' | 'facebook' | 'twitter' | 'apple';
      providerId: string;
      email?: string;
      displayName?: string;
      photoURL?: string;
    }
  ): Promise<void> {
    try {
      const user = await this.getByUid(uid);
      if (user) {
        const socialProviders = user.socialProviders || [];
        
        // Check if provider already exists
        const existingProvider = socialProviders.find(p => p.provider === provider.provider);
        
        if (existingProvider) {
          // Update existing provider
          const updatedProviders = socialProviders.map(p => 
            p.provider === provider.provider 
              ? { ...provider, connectedAt: p.connectedAt }
              : p
          );
          await this.update(user.id, { socialProviders: updatedProviders });
        } else {
          // Add new provider
          const updatedProviders = [
            ...socialProviders,
            { ...provider, connectedAt: new Date() }
          ];
          await this.update(user.id, { socialProviders: updatedProviders });
        }
      }
    } catch (error) {
      console.error(`Error adding social provider for user ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Remove social provider
   */
  static async removeSocialProvider(uid: string, provider: string): Promise<void> {
    try {
      const user = await this.getByUid(uid);
      if (user && user.socialProviders) {
        const updatedProviders = user.socialProviders.filter(p => p.provider !== provider);
        await this.update(user.id, { socialProviders: updatedProviders });
      }
    } catch (error) {
      console.error(`Error removing social provider for user ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  static async getStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    usersByType: Record<string, number>;
  }> {
    try {
      const users = await firestoreService.query<UserDocument>(this.collection);
      
      const stats = {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.isActive).length,
        usersByType: users.reduce((acc, user) => {
          acc[user.type] = (acc[user.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      };
      
      return stats;
    } catch (error) {
      console.error('Error getting user statistics:', error);
      throw error;
    }
  }
}

export default UserModel;
