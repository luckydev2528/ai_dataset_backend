/**
 * BaseModel - Abstract base class for all database models
 * Eliminates duplicate code patterns across models
 */

import { firestoreService } from './firestoreService';
import { Logger } from '../../utils/logger';

export interface BaseDocument {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BaseCreateData {
  [key: string]: any;
}

export interface BaseUpdateData {
  [key: string]: any;
}

export interface BaseFilters {
  [key: string]: any;
}

export abstract class BaseModel<
  TDocument extends BaseDocument,
  TCreateData extends BaseCreateData,
  TUpdateData extends BaseUpdateData,
  TFilters extends BaseFilters = BaseFilters
> {
  protected static collection: string;

  /**
   * Create a new document with common patterns
   */
  protected static async createDocument<T extends BaseDocument>(
    collection: string,
    data: any,
    transformToDocument: (data: any, timestamps: { createdAt: Date; updatedAt: Date }) => Omit<T, 'id'>
  ): Promise<T> {
    try {
      const now = new Date();
      const documentData = transformToDocument(data, { createdAt: now, updatedAt: now });
      
      const docRef = await firestoreService.add<Omit<T, 'id'>>(collection as any, documentData);
      const result = await this.getDocumentById<T>(collection, docRef.id);
      
      if (!result) {
        throw new Error(`Failed to create ${collection}`);
      }
      
      Logger.dbSuccess(`${collection} created successfully`, { id: result.id });
      return result;
    } catch (error) {
      Logger.dbError(`Error creating ${collection}:`, error);
      throw error;
    }
  }

  /**
   * Get document by ID with common error handling
   */
  protected static async getDocumentById<T extends BaseDocument>(
    collection: string,
    id: string
  ): Promise<T | null> {
    try {
      const docs = await firestoreService.get<T[]>(collection as any, id);
      return docs && docs.length > 0 ? (docs[0] as T) : null;
    } catch (error) {
      Logger.dbError(`Error getting ${collection} by ID:`, error);
      return null;
    }
  }

  /**
   * Update document with common patterns
   */
  protected static async updateDocument<T extends BaseDocument>(
    collection: string,
    id: string,
    data: any,
    transformToDocument: (data: any, timestamps: { updatedAt: Date }) => Partial<T>
  ): Promise<T | null> {
    try {
      const now = new Date();
      const updateData = transformToDocument(data, { updatedAt: now });
      
      await firestoreService.update(collection as any, id, updateData);
      const result = await this.getDocumentById<T>(collection, id);
      
      if (result) {
        Logger.dbSuccess(`${collection} updated successfully`, { id });
      }
      
      return result;
    } catch (error) {
      Logger.dbError(`Error updating ${collection}:`, error);
      return null;
    }
  }

  /**
   * Delete document with common error handling
   */
  protected static async deleteDocument(
    collection: string,
    id: string
  ): Promise<boolean> {
    try {
      await firestoreService.delete(collection as any, id);
      Logger.dbSuccess(`${collection} deleted successfully`, { id });
      return true;
    } catch (error) {
      Logger.dbError(`Error deleting ${collection}:`, error);
      return false;
    }
  }

  /**
   * Get documents with common filtering patterns
   */
  protected static async getDocuments<T extends BaseDocument>(
    collection: string,
    filters: any = {}
  ): Promise<T[]> {
    try {
      const queryFn = (query: any) => {
        let firestoreQuery = query;
        
        // Debug logging
        Logger.info(`Querying ${collection} with filters:`, filters);
        
        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (key.endsWith('After') || key.endsWith('Before')) {
              // Handle date range filters
              const fieldName = key.replace(/After|Before$/, '');
              const operator = key.endsWith('After') ? '>=' : '<=';
              Logger.info(`Applying date filter: ${fieldName} ${operator} ${value}`);
              firestoreQuery = firestoreQuery.where(fieldName, operator, value);
            } else if (key === 'search') {
              // Production-ready text search using searchable arrays
              // Documents should maintain a 'searchTerms' array field for this to work
              const searchTerms = this.generateSearchTerms(value as string);
              
              if (searchTerms.length > 0) {
                // Use array-contains for each search term
                searchTerms.forEach(term => {
                  firestoreQuery = firestoreQuery.where('searchTerms', 'array-contains', term);
                });
              }
            } else {
              Logger.info(`Applying equality filter: ${key} == ${value}`);
              firestoreQuery = firestoreQuery.where(key, '==', value);
            }
          }
        });
        
        return firestoreQuery;
      };
      
      const docs = await firestoreService.query<T>(collection as any, queryFn);
      const count = docs ? docs.length : 0;
      Logger.dbSuccess(`${collection} documents retrieved`, { count });
      return docs || [];
    } catch (error) {
      Logger.dbError(`Error getting ${collection} documents:`, error);
      return [];
    }
  }

  /**
   * Build query filters from common patterns
   */
  protected static buildQueryFilters(filters: any): any {
    const queryFilters: any = {};
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key.endsWith('After') || key.endsWith('Before')) {
          // Handle date range filters
          queryFilters[key.replace(/After|Before$/, '')] = {
            [key.endsWith('After') ? '>=' : '<=']: value
          };
        } else if (key === 'search') {
          // Handle search filters
          queryFilters[key] = {
            '>=': value,
            '<=': value + '\uf8ff'
          };
        } else {
          queryFilters[key] = value;
        }
      }
    });
    
    return queryFilters;
  }

  /**
   * Validate required fields
   */
  protected static validateRequiredFields(data: any, requiredFields: string[]): string[] {
    const missing: string[] = [];
    requiredFields.forEach(field => {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        missing.push(field);
      }
    });
    return missing;
  }

  /**
   * Transform document for API response
   */
  protected static transformDocument<T extends BaseDocument>(doc: T): T {
    return {
      ...doc,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  /**
   * Generate searchable terms from text content
   * Production-ready method for creating searchable arrays
   */
  protected static generateSearchTerms(text: string): string[] {
    if (!text) return [];
    
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove special characters
      .split(/\s+/) // Split on whitespace
      .filter(term => term.length >= 2) // Filter short terms
      .filter((term, index, array) => array.indexOf(term) === index) // Remove duplicates
      .slice(0, 50); // Limit to 50 terms for performance
  }

  /**
   * Generate searchable terms from multiple text fields
   */
  protected static generateSearchTermsFromFields(fields: string[]): string[] {
    const allTerms = fields
      .map(field => this.generateSearchTerms(field))
      .flat();
    
    // Remove duplicates and limit
    return [...new Set(allTerms)].slice(0, 100);
  }
}
