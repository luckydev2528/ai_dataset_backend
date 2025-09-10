import { getFirestore } from '../auth/firebaseAdmin';
import { CollectionReference, DocumentReference, Query, WriteResult, Transaction } from 'firebase-admin/firestore';
import { Logger } from '../../utils/logger';

export interface FirestoreCollection {
  users: 'users';
  sessions: 'sessions';
  devices: 'devices';
  analytics: 'analytics';
  analytics_events: 'analytics_events';
  analytics_aggregations: 'analytics_aggregations';
  logs: 'logs';
  config: 'config';
  tasks: 'tasks';
  user_points: 'user_points';
  points_history: 'points_history';
  challenges: 'challenges';
  task_submissions: 'task_submissions';
}

export type CollectionName = keyof FirestoreCollection;

export class FirestoreService {
  private static instance: FirestoreService;
  private db: FirebaseFirestore.Firestore | null = null;

  private constructor() {
    // Don't initialize db here - wait for explicit initialization
    this.db = null;
  }

  public static getInstance(): FirestoreService {
    if (!FirestoreService.instance) {
      FirestoreService.instance = new FirestoreService();
    }
    return FirestoreService.instance;
  }

  /**
   * Initialize Firestore database instance
   */
  public initialize(): void {
    if (!this.db) {
      this.db = getFirestore();
      if (!this.db) {
        throw new Error('Firestore not initialized. Please check your Firebase configuration.');
      }
    }
  }

  /**
   * Get Firestore database instance
   */
  public getDB(): FirebaseFirestore.Firestore {
    if (!this.db) {
      // Try to initialize if not already done
      this.initialize();
    }
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
      
      Logger.info(`Document created in ${collectionName}/${docId}`);
      return result;
    } catch (error) {
      Logger.error(`Error creating document in ${collectionName}/${docId}:`, error as Record<string, any>);
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
      
      Logger.info(`Document added to ${collectionName} with ID: ${docRef.id}`);
      return docRef;
    } catch (error) {
      Logger.error(`Error adding document to ${collectionName}:`, error as Record<string, any>);
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
      Logger.error(`Error getting document from ${collectionName}/${docId}:`, error as Record<string, any>);
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
      
      Logger.info(`Document updated in ${collectionName}/${docId}`);
      return result;
    } catch (error) {
      Logger.error(`Error updating document in ${collectionName}/${docId}:`, error as Record<string, any>);
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
      
      Logger.info(`Document deleted from ${collectionName}/${docId}`);
      return result;
    } catch (error) {
      Logger.error(`Error deleting document from ${collectionName}/${docId}:`, error as Record<string, any>);
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
      Logger.error(`Error querying collection ${collectionName}:`, error as Record<string, any>);
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
      
      Logger.info(`Query with pagination completed for ${collectionName}: ${data.length} documents`);
      
      return { data, lastDoc, hasMore };
    } catch (error) {
      Logger.error(`Error querying collection ${collectionName} with pagination:`, error as Record<string, any>);
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
            if (op.data) {
              batch.set(docRef, {
                ...op.data,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            }
            break;
          case 'update':
            if (op.data) {
              batch.update(docRef, {
                ...op.data,
                updatedAt: new Date(),
              });
            }
            break;
          case 'delete':
            batch.delete(docRef);
            break;
        }
      });
      
      const result = await batch.commit();
      
      Logger.info(`Batch write completed: ${operations.length} operations`);
      
      return result;
    } catch (error) {
      Logger.error('Error in batch write:', error as Record<string, any>);
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
      Logger.error('Error in transaction:', error as Record<string, any>);
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
      Logger.error(`Error checking document existence in ${collectionName}/${docId}:`, error as Record<string, any>);
      return false;
    }
  }

  /**
   * Count documents in a collection
   */
  public async count(collectionName: CollectionName): Promise<number> {
    try {
      const snapshot = await this.collection(collectionName).get();
      return snapshot.size;
    } catch (error) {
      Logger.error(`Error counting documents in ${collectionName}:`, error as Record<string, any>);
      return 0;
    }
  }

  /**
   * Health check for Firestore connection
   */
  public async healthCheck(): Promise<{ status: string; latency: number }> {
    const startTime = Date.now();
    
    try {
      await this.getDB().collection('health').limit(1).get();
      const latency = Date.now() - startTime;
      
      return { status: 'healthy', latency };
    } catch (error) {
      const latency = Date.now() - startTime;
      return { status: 'unhealthy', latency };
    }
  }
}

// Create and export a singleton instance
export const firestoreService = FirestoreService.getInstance();
export default firestoreService;