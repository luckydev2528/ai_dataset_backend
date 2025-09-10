import { TaskDocument } from '../services/database/models/taskModel';

export interface TaskResponse {
  id: string;
  title: string;
  description: string;
  bountyPoints: number;
  expiryDate: string; // ISO date string
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  status: 'active' | 'pending' | 'completed' | 'expired';
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

/**
 * Transform TaskDocument to TaskResponse for API responses
 */
export function transformTaskDocument(task: TaskDocument): TaskResponse {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    bountyPoints: task.bountyPoints,
    expiryDate: convertToISOString(task.expiryDate),
    category: task.category,
    difficulty: task.difficulty,
    status: task.status,
    createdAt: convertToISOString(task.createdAt),
    updatedAt: convertToISOString(task.updatedAt),
  };
}

/**
 * Transform array of TaskDocument to TaskResponse array
 */
export function transformTaskDocuments(tasks: TaskDocument[]): TaskResponse[] {
  return tasks.map(transformTaskDocument);
}

/**
 * Convert various date formats to ISO string
 */
function convertToISOString(date: any): string {
  if (!date) {
    return new Date().toISOString();
  }
  
  if (typeof date === 'string') {
    return date;
  }
  
  if (date.toDate && typeof date.toDate === 'function') {
    // Firestore Timestamp
    return date.toDate().toISOString();
  }
  
  if (date.toISOString && typeof date.toISOString === 'function') {
    // Date object
    return date.toISOString();
  }
  
  // Fallback
  return new Date().toISOString();
}
