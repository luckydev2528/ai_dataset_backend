import { UserPointsDocument } from '../services/database/models/userPointsModel';

export interface UserPointsResponse {
  totalPoints: number;
  availablePoints: number;
  spentPoints: number;
  lastUpdated: string; // ISO date string
}

/**
 * Transform UserPointsDocument to UserPointsResponse for API responses
 */
export function transformUserPointsDocument(userPoints: UserPointsDocument): UserPointsResponse {
  console.log('🔄 Transforming user points:', userPoints);
  console.log('📅 Last updated type:', typeof userPoints.lastUpdated);
  console.log('📅 Last updated value:', userPoints.lastUpdated);
  
  const result = {
    totalPoints: userPoints.totalPoints,
    availablePoints: userPoints.availablePoints,
    spentPoints: userPoints.spentPoints,
    lastUpdated: convertToISOString(userPoints.lastUpdated),
  };
  
  console.log('✅ Transformed result:', result);
  return result;
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
