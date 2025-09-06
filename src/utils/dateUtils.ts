/**
 * Utility functions for handling date conversions and comparisons
 * Firestore returns dates as strings, so we need to handle both Date objects and date strings
 */

/**
 * Convert a value to a Date object, handling both Date objects and date strings
 */
export const toDate = (value: any): Date | null => {
  if (!value) return null;
  
  if (value instanceof Date) {
    return value;
  }
  
  if (typeof value === 'string') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  
  if (typeof value === 'number') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  
  return null;
};

/**
 * Compare two date values (handles both Date objects and date strings)
 */
export const compareDates = (date1: any, date2: any): number => {
  const d1 = toDate(date1);
  const d2 = toDate(date2);
  
  if (!d1 && !d2) return 0;
  if (!d1) return -1;
  if (!d2) return 1;
  
  return d1.getTime() - d2.getTime();
};

/**
 * Check if two date values are equal (handles both Date objects and date strings)
 */
export const areDatesEqual = (date1: any, date2: any): boolean => {
  const d1 = toDate(date1);
  const d2 = toDate(date2);
  
  if (!d1 && !d2) return true;
  if (!d1 || !d2) return false;
  
  return d1.getTime() === d2.getTime();
};

/**
 * Get the time difference between two dates in milliseconds
 */
export const getTimeDifference = (date1: any, date2: any): number => {
  const d1 = toDate(date1);
  const d2 = toDate(date2);
  
  if (!d1 || !d2) return 0;
  
  return d1.getTime() - d2.getTime();
};

/**
 * Check if a date is older than a certain number of days
 */
export const isOlderThanDays = (date: any, days: number): boolean => {
  const d = toDate(date);
  if (!d) return false;
  
  const daysSince = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince > days;
};

/**
 * Format a date for logging (handles both Date objects and date strings)
 */
export const formatDateForLogging = (date: any): string => {
  const d = toDate(date);
  return d ? d.toISOString() : 'null';
};

export default {
  toDate,
  compareDates,
  areDatesEqual,
  getTimeDifference,
  isOlderThanDays,
  formatDateForLogging
};
