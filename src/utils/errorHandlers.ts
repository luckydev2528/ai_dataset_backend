import { Logger } from './logger';

/**
 * Standardized error handling utilities to eliminate duplicate error handling patterns
 */

export class DatabaseErrorHandler {
  /**
   * Handle database operations with consistent error handling
   */
  static async handleDatabaseOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    continueOnError: boolean = true
  ): Promise<T | null> {
    try {
      const result = await operation();
      Logger.dbSuccess(`${operationName} completed successfully`);
      return result;
    } catch (error: any) {
      const errorMessage = `${operationName} failed: ${error.message}`;
      
      if (continueOnError) {
        Logger.dbWarning(errorMessage);
        return null;
      } else {
        Logger.dbError(errorMessage);
        throw error;
      }
    }
  }

  /**
   * Handle user creation/update operations
   */
  static async handleUserOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    continueOnError: boolean = true
  ): Promise<T | null> {
    return this.handleDatabaseOperation(operation, `User ${operationName}`, continueOnError);
  }
}

export class FirebaseErrorHandler {
  /**
   * Handle Firebase operations with consistent error handling
   */
  static async handleFirebaseOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    continueOnError: boolean = false
  ): Promise<T | null> {
    try {
      const result = await operation();
      Logger.firebaseSuccess(`${operationName} completed successfully`);
      return result;
    } catch (error: any) {
      const errorMessage = `${operationName} failed: ${error.message}`;
      
      if (continueOnError) {
        Logger.firebaseWarning(errorMessage);
        return null;
      } else {
        Logger.firebaseError(errorMessage);
        throw error;
      }
    }
  }

  /**
   * Handle Firebase Auth operations
   */
  static async handleAuthOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    continueOnError: boolean = false
  ): Promise<T | null> {
    return this.handleFirebaseOperation(operation, `Auth ${operationName}`, continueOnError);
  }
}

export class AuthErrorHandler {
  /**
   * Handle authentication operations with consistent error handling
   */
  static async handleAuthOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    continueOnError: boolean = false
  ): Promise<T | null> {
    try {
      const result = await operation();
      Logger.authSuccess(`${operationName} completed successfully`);
      return result;
    } catch (error: any) {
      const errorMessage = `${operationName} failed: ${error.message}`;
      
      if (continueOnError) {
        Logger.authError(errorMessage);
        return null;
      } else {
        Logger.authError(errorMessage);
        throw error;
      }
    }
  }
}
