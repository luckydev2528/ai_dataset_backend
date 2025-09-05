import { getFirestore } from '../auth/firebaseAdmin';
import { CollectionReference, DocumentReference, Query, WriteResult, Transaction } from 'firebase-admin/firestore';
import { logger } from '../../utils/logger';

export interface FirestoreCollection {
  users: 'users';
  sessions: 'sessions';
  devices: 'devices';
  analytics: 'analytics';
  analytics_events: 'analytics_events';
  analytics_aggregations: 'analytics_aggregations';
  logs: 'logs';
  config: 'config';
}

export type CollectionName = keyof FirestoreCollection;

export class FirestoreService {
  private static instance: FirestoreService;
  private db: FirebaseFirestore.Firestore | null = null;

  private constructor() {
    this.db = getFirestore();
  }

  public static getInstance(): FirestoreService {
    if (!FirestoreService.instance) {
      FirestoreService.instance = new FirestoreService();
    }
    return FirestoreService.instance;
  }

  /**
   * Get Firestore database instance
   */
  public getDB(): FirebaseFirestore.Firestore {
    if (!this.db) {
      throw new Error('Firestore not initialized. Please check your Firebase configuration.');
    }
    return this.db;
  }

  /**
   * Get a collection reference
   */
  public collection(collectionName: CollectionName): CollectionReference {
    return this.getDB().collection(collectionName);
  }

  /**
   * Get a document reference
   */
  public doc(collectionName: CollectionName, docId: string): DocumentReference {
    return this.collection(collectionName).doc(docId);
  }

  /**
   * Create a new document
   */
  public async create<T = any>(
    collectionName: CollectionName,
    docId: string,
    data: T
  ): Promise<WriteResult> {
    try {
      const docRef = this.doc(collectionName, docId);
      const result = await docRef.set({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      logger.info(`Document created in ${collectionName}/${docId}`);
      return result;
    } catch (error) {
      logger.error(`Error creating document in ${collectionName}/${docId}:`, error as Record<string, any>);
      throw error;
    }
  }

  /**
   * Create a document with auto-generated ID
   */
  public async add<T = any>(
    collectionName: CollectionName,
    data: T
  ): Promise<DocumentReference> {
    try {
      const docRef = await this.collection(collectionName).add({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      logger.info(`Document added to ${collectionName} with ID: ${docRef.id}`);
      return docRef;
    } catch (error) {
      logger.error(`Error adding document to ${collectionName}:`, error as Record<string, any>);
      throw error;
    }
  }

  /**
   * Get a document by ID
   */
  public async get<T = any>(
    collectionName: CollectionName,
    docId: string
  ): Promise<T | null> {
    try {
      const docRef = this.doc(collectionName, docId);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return null;
      }
      
      return { id: doc.id, ...doc.data() } as T;
    } catch (error) {
      logger.error(`Error getting document from ${collectionName}/${docId}:`, error as Record<string, any>);
      throw error;
    }
  }

  /**
   * Update a document
   */
  public async update<T = any>(
    collectionName: CollectionName,
    docId: string,
    data: Partial<T>
  ): Promise<WriteResult> {
    try {
      const docRef = this.doc(collectionName, docId);
      const result = await docRef.update({
        ...data,
        updatedAt: new Date(),
      });
      
      logger.info(`Document updated in ${collectionName}/${docId}`);
      return result;
    } catch (error) {
      logger.error(`Error updating document in ${collectionName}/${docId}:`, error as Record<string, any>);
      throw error;
    }
  }

  /**
   * Delete a document
   */
  public async delete(
    collectionName: CollectionName,
    docId: string
  ): Promise<WriteResult> {
    try {
      const docRef = this.doc(collectionName, docId);
      const result = await docRef.delete();
      
      logger.info(`Document deleted from ${collectionName}/${docId}`);
      return result;
    } catch (error) {
      logger.error(`Error deleting document from ${collectionName}/${docId}:`, error as Record<string, any>);
      throw error;
    }
  }

  /**
   * Query documents
   */
  public async query<T = any>(
    collectionName: CollectionName,
    queryFn?: (query: CollectionReference) => Query
  ): Promise<T[]> {
    try {
      let query: Query | CollectionReference = this.collection(collectionName);
      
      if (queryFn) {
        query = queryFn(this.collection(collectionName));
      }
      
      const snapshot = await query.get();
      const results: T[] = [];
      
      snapshot.forEach(doc => {
        results.push({ id: doc.id, ...doc.data() } as T);
      });
      
      return results;
    } catch (error) {
      logger.error(`Error querying collection ${collectionName}:`, error as Record<string, any>);
      throw error;
    }
  }

  /**
   * Get documents with pagination
   */
  public async queryWithPagination<T = any>(
    collectionName: CollectionName,
    limit: number = 10,
    startAfter?: any,
    queryFn?: (query: CollectionReference) => Query
  ): Promise<{ data: T[]; lastDoc: any; hasMore: boolean }> {
    try {
      let query: Query | CollectionReference = this.collection(collectionName);
      
      if (queryFn) {
        query = queryFn(this.collection(collectionName));
      }
      
      query = query.limit(limit);
      
      if (startAfter) {
        query = query.startAfter(startAfter);
      }
      
      const snapshot = await query.get();
      const data: T[] = [];
      let lastDoc: any = null;
      
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as T);
        lastDoc = doc;
      });
      
      const hasMore = snapshot.size === limit;
      
      return { data, lastDoc, hasMore };
    } catch (error) {
      logger.error(`Error querying collection ${collectionName} with pagination:`, error as Record<string, any>);
      throw error;
    }
  }

  /**
   * Batch write operations
   */
  public async batchWrite(operations: Array<{
    type: 'create' | 'update' | 'delete';
    collection: CollectionName;
    docId: string;
    data?: any;
  }>): Promise<WriteResult[]> {
    try {
      const batch = this.getDB().batch();
      
      operations.forEach(op => {
        const docRef = this.doc(op.collection, op.docId);
        
        switch (op.type) {
          case 'create':
            batch.set(docRef, {
              ...op.data,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            break;
          case 'update':
            batch.update(docRef, {
              ...op.data,
              updatedAt: new Date(),
            });
            break;
          case 'delete':
            batch.delete(docRef);
            break;
        }
      });
      
      const result = await batch.commit();
      logger.info(`Batch write completed: ${operations.length} operations`);
      return result;
    } catch (error) {
      logger.error('Error in batch write:', error as Record<string, any>);
      throw error;
    }
  }

  /**
   * Run a transaction
   */
  public async runTransaction<T>(
    transactionFn: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    try {
      return await this.getDB().runTransaction(transactionFn);
    } catch (error) {
      logger.error('Error in transaction:', error as Record<string, any>);
      throw error;
    }
  }

  /**
   * Check if a document exists
   */
  public async exists(
    collectionName: CollectionName,
    docId: string
  ): Promise<boolean> {
    try {
      const docRef = this.doc(collectionName, docId);
      const doc = await docRef.get();
      return doc.exists;
    } catch (error) {
      logger.error(`Error checking document existence in ${collectionName}/${docId}:`, error as Record<string, any>);
      throw error;
    }
  }

  /**
   * Get document count
   */
  public async count(collectionName: CollectionName): Promise<number> {
    try {
      const snapshot = await this.collection(collectionName).get();
      return snapshot.size;
    } catch (error) {
      logger.error(`Error counting documents in ${collectionName}:`, error as Record<string, any>);
      throw error;
    }
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<{ status: string; latency: number }> {
    const start = Date.now();
    try {
      // Simple read operation to test connection
      await this.collection('config').limit(1).get();
      const latency = Date.now() - start;
      return { status: 'healthy', latency };
    } catch (error) {
      const latency = Date.now() - start;
      logger.error('Firestore health check failed:', error as Record<string, any>);
      return { status: 'unhealthy', latency };
    }
  }
}

// Export singleton instance
export const firestoreService = FirestoreService.getInstance();
export default firestoreService;
