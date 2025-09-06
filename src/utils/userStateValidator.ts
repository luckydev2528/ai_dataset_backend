import { UserModel } from '../services/database/models/userModel';
import { FirebaseWrapper } from '../services/firebase/firebaseWrapper';
import { Logger } from './logger';
import { toDate, isOlderThanDays } from './dateUtils';

export interface UserStateValidationResult {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
  userData: {
    firebaseUid: string;
    databaseId?: string;
    email: string;
    providers: string[];
    lastLoginAt?: Date;
    isActive: boolean;
  };
}

/**
 * Validates user state consistency across Firebase and database
 */
export class UserStateValidator {
  /**
   * Validate user state for a given Firebase UID
   */
  static async validateUserState(firebaseUid: string): Promise<UserStateValidationResult> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    try {
      // Get Firebase user
      const firebaseUser = await FirebaseWrapper.getUserByUid(firebaseUid);
      if (!firebaseUser) {
        return {
          isValid: false,
          issues: ['Firebase user not found'],
          recommendations: ['User may need to re-authenticate'],
          userData: {
            firebaseUid,
            email: '',
            providers: [],
            isActive: false
          }
        };
      }

      // Get database user
      const databaseUser = await UserModel.getByUid(firebaseUid);
      
      const userData = {
        firebaseUid,
        ...(databaseUser?.id && { databaseId: databaseUser.id }),
        email: firebaseUser.email || '',
        providers: firebaseUser.providerData?.map(p => p.providerId) || [],
        ...(databaseUser?.lastLoginAt && { lastLoginAt: databaseUser.lastLoginAt }),
        isActive: !firebaseUser.disabled && (databaseUser?.isActive ?? true)
      };

      // Check for inconsistencies
      if (!databaseUser) {
        issues.push('User exists in Firebase but not in database');
        recommendations.push('Create database record for user');
      } else {
        // Check email consistency
        if (firebaseUser.email !== databaseUser.email) {
          issues.push('Email mismatch between Firebase and database');
          recommendations.push('Sync email between Firebase and database');
        }

        // Check display name consistency
        if (firebaseUser.displayName !== databaseUser.displayName) {
          issues.push('Display name mismatch between Firebase and database');
          recommendations.push('Sync display name between Firebase and database');
        }

        // Check if user is marked as inactive in database but active in Firebase
        if (firebaseUser.disabled && databaseUser.isActive) {
          issues.push('User is disabled in Firebase but marked as active in database');
          recommendations.push('Sync user status between Firebase and database');
        }

        // Check for stale last login
        if (databaseUser.lastLoginAt && isOlderThanDays(databaseUser.lastLoginAt, 90)) {
          issues.push('User has not logged in for over 90 days');
          recommendations.push('Consider marking user as inactive or sending re-engagement email');
        }
      }

      // Check for multiple active sessions (potential security issue)
      if (databaseUser) {
        const sessionCount = databaseUser.sessionCount || 0;
        const deviceCount = databaseUser.deviceCount || 0;
        
        if (sessionCount > 10) {
          issues.push('User has unusually high number of active sessions');
          recommendations.push('Review and potentially revoke old sessions');
        }

        if (deviceCount > 5) {
          issues.push('User has unusually high number of devices');
          recommendations.push('Review device access and consider security notification');
        }
      }

      return {
        isValid: issues.length === 0,
        issues,
        recommendations,
        userData
      };

    } catch (error: any) {
      Logger.error('Error validating user state', { 
        firebaseUid, 
        error: error.message 
      });
      
      return {
        isValid: false,
        issues: ['Validation error: ' + error.message],
        recommendations: ['Check system logs and retry validation'],
        userData: {
          firebaseUid,
          email: '',
          providers: [],
          isActive: false
        }
      };
    }
  }

  /**
   * Validate authentication flow consistency
   */
  static async validateAuthFlowConsistency(
    firebaseUid: string, 
    provider: string,
    expectedEmail?: string
  ): Promise<{
    isConsistent: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      const validationResult = await this.validateUserState(firebaseUid);
      
      if (!validationResult.isValid) {
        issues.push(...validationResult.issues);
        recommendations.push(...validationResult.recommendations);
      }

      // Check if provider is consistent with user's authentication history
      const databaseUser = await UserModel.getByUid(firebaseUid);
      if (databaseUser?.socialProviders) {
        const hasProvider = databaseUser.socialProviders.some(p => p.provider === provider);
        if (!hasProvider) {
          issues.push(`User is authenticating with ${provider} but this provider is not linked to their account`);
          recommendations.push(`Add ${provider} as a linked provider or use existing authentication method`);
        }
      }

      // Check email consistency if provided
      if (expectedEmail && validationResult.userData.email !== expectedEmail) {
        issues.push('Email mismatch in authentication flow');
        recommendations.push('Verify email consistency across authentication providers');
      }

      return {
        isConsistent: issues.length === 0,
        issues,
        recommendations
      };

    } catch (error: any) {
      Logger.error('Error validating auth flow consistency', { 
        firebaseUid, 
        provider, 
        error: error.message 
      });
      
      return {
        isConsistent: false,
        issues: ['Validation error: ' + error.message],
        recommendations: ['Check system logs and retry validation']
      };
    }
  }

  /**
   * Auto-fix common user state issues
   */
  static async autoFixUserState(firebaseUid: string): Promise<{
    fixed: boolean;
    fixesApplied: string[];
    errors: string[];
  }> {
    const fixesApplied: string[] = [];
    const errors: string[] = [];

    try {
      const validationResult = await this.validateUserState(firebaseUid);
      
      if (validationResult.isValid) {
        return { fixed: true, fixesApplied: [], errors: [] };
      }

      const firebaseUser = await FirebaseWrapper.getUserByUid(firebaseUid);
      const databaseUser = await UserModel.getByUid(firebaseUid);

      // Fix missing database record
      if (!databaseUser && firebaseUser) {
        try {
          const userData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'User',
            type: 'user' as const,
            isActive: !firebaseUser.disabled
          };
          await UserModel.create(userData);
          fixesApplied.push('Created missing database record');
        } catch (error: any) {
          errors.push('Failed to create database record: ' + error.message);
        }
      }

      // Fix email mismatch
      if (databaseUser && firebaseUser && firebaseUser.email && firebaseUser.email !== databaseUser.email) {
        try {
          await UserModel.update(databaseUser.id, { email: firebaseUser.email });
          fixesApplied.push('Fixed email mismatch');
        } catch (error: any) {
          errors.push('Failed to fix email mismatch: ' + error.message);
        }
      }

      // Fix display name mismatch
      if (databaseUser && firebaseUser && firebaseUser.displayName && firebaseUser.displayName !== databaseUser.displayName) {
        try {
          await UserModel.update(databaseUser.id, { displayName: firebaseUser.displayName });
          fixesApplied.push('Fixed display name mismatch');
        } catch (error: any) {
          errors.push('Failed to fix display name mismatch: ' + error.message);
        }
      }

      // Fix user status mismatch
      if (databaseUser && firebaseUser && firebaseUser.disabled !== !databaseUser.isActive) {
        try {
          await UserModel.update(databaseUser.id, { isActive: !firebaseUser.disabled });
          fixesApplied.push('Fixed user status mismatch');
        } catch (error: any) {
          errors.push('Failed to fix user status mismatch: ' + error.message);
        }
      }

      // Auto-cleanup excessive sessions and devices
      if (databaseUser) {
        const sessionCount = databaseUser.sessionCount || 0;
        const deviceCount = databaseUser.deviceCount || 0;
        
        if (sessionCount > 10 || deviceCount > 5) {
          try {
            // Reset counters to reasonable values
            await UserModel.update(databaseUser.id, {
              sessionCount: Math.min(sessionCount, 5),
              deviceCount: Math.min(deviceCount, 3)
            });
            fixesApplied.push(`Reset session count from ${sessionCount} to ${Math.min(sessionCount, 5)} and device count from ${deviceCount} to ${Math.min(deviceCount, 3)}`);
          } catch (error: any) {
            errors.push('Failed to reset session/device counts: ' + error.message);
          }
        }
      }

      return {
        fixed: errors.length === 0,
        fixesApplied,
        errors
      };

    } catch (error: any) {
      Logger.error('Error auto-fixing user state', { 
        firebaseUid, 
        error: error.message 
      });
      
      return {
        fixed: false,
        fixesApplied,
        errors: ['Auto-fix error: ' + error.message]
      };
    }
  }

  /**
   * Get user authentication summary
   */
  static async getUserAuthSummary(firebaseUid: string): Promise<{
    firebaseUser: any;
    databaseUser: any;
    validationResult: UserStateValidationResult;
    authHistory: {
      providers: string[];
      lastLoginAt?: Date;
      sessionCount: number;
      deviceCount: number;
    };
  }> {
    try {
      const firebaseUser = await FirebaseWrapper.getUserByUid(firebaseUid);
      const databaseUser = await UserModel.getByUid(firebaseUid);
      const validationResult = await this.validateUserState(firebaseUid);

      const authHistory = {
        providers: databaseUser?.socialProviders?.map(p => p.provider) || [],
        ...(databaseUser?.lastLoginAt && { lastLoginAt: databaseUser.lastLoginAt }),
        sessionCount: databaseUser?.sessionCount || 0,
        deviceCount: databaseUser?.deviceCount || 0
      };

      return {
        firebaseUser,
        databaseUser,
        validationResult,
        authHistory
      };

    } catch (error: any) {
      Logger.error('Error getting user auth summary', { 
        firebaseUid, 
        error: error.message 
      });
      
      throw error;
    }
  }
}

export default UserStateValidator;
