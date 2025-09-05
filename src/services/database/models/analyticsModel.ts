import { firestoreService } from '../firestoreService';

export interface AnalyticsEvent {
  id: string;
  userId?: string;
  sessionId?: string;
  deviceId?: string;
  eventType: 'page_view' | 'button_click' | 'api_call' | 'error' | 'login' | 'logout' | 'signup' | 'purchase' | 'custom';
  eventName: string;
  eventData?: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  location?: {
    country?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  metadata?: {
    appVersion?: string;
    osVersion?: string;
    deviceType?: string;
    platform?: string;
  };
}

export interface AnalyticsAggregation {
  id: string;
  date: string; // YYYY-MM-DD format
  eventType: string;
  totalCount: number;
  uniqueUsers: number;
  uniqueSessions: number;
  uniqueDevices: number;
  createdAt: Date;
  updatedAt: Date;
}

export class AnalyticsModel {
  private static eventsCollection = 'analytics_events' as const;
  private static aggregationsCollection = 'analytics_aggregations' as const;

  /**
   * Track an analytics event
   */
  static async trackEvent(eventData: Omit<AnalyticsEvent, 'id' | 'timestamp'>): Promise<AnalyticsEvent> {
    try {
      const docRef = await firestoreService.add<Omit<AnalyticsEvent, 'id'>>(this.eventsCollection, {
        ...eventData,
        timestamp: new Date(),
      });
      
      const event = await this.getEventById(docRef.id);
      if (!event) {
        throw new Error('Failed to track event');
      }
      
      // Update daily aggregation in background
      this.updateDailyAggregation(event).catch(error => {
        console.error('Error updating daily aggregation:', error);
      });
      
      return event;
    } catch (error) {
      console.error('Error tracking analytics event:', error);
      throw error;
    }
  }

  /**
   * Get event by ID
   */
  static async getEventById(id: string): Promise<AnalyticsEvent | null> {
    try {
      return await firestoreService.get<AnalyticsEvent>(this.eventsCollection, id);
    } catch (error) {
      console.error(`Error getting event by ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get events for a user
   */
  static async getEventsForUser(
    userId: string,
    limit: number = 100,
    startAfter?: any
  ): Promise<{ data: AnalyticsEvent[]; lastDoc: any; hasMore: boolean }> {
    try {
      return await firestoreService.queryWithPagination<AnalyticsEvent>(
        this.eventsCollection,
        limit,
        startAfter,
        (query) => query
          .where('userId', '==', userId)
          .orderBy('timestamp', 'desc')
      );
    } catch (error) {
      console.error(`Error getting events for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get events by type
   */
  static async getEventsByType(
    eventType: string,
    limit: number = 100,
    startAfter?: any
  ): Promise<{ data: AnalyticsEvent[]; lastDoc: any; hasMore: boolean }> {
    try {
      return await firestoreService.queryWithPagination<AnalyticsEvent>(
        this.eventsCollection,
        limit,
        startAfter,
        (query) => query
          .where('eventType', '==', eventType)
          .orderBy('timestamp', 'desc')
      );
    } catch (error) {
      console.error(`Error getting events by type ${eventType}:`, error);
      throw error;
    }
  }

  /**
   * Get events in date range
   */
  static async getEventsInDateRange(
    startDate: Date,
    endDate: Date,
    eventType?: string,
    limit: number = 1000
  ): Promise<AnalyticsEvent[]> {
    try {
      return await firestoreService.query<AnalyticsEvent>(
        this.eventsCollection,
        (query) => {
          let q = query
            .where('timestamp', '>=', startDate)
            .where('timestamp', '<=', endDate)
            .orderBy('timestamp', 'desc')
            .limit(limit);
          
          if (eventType) {
            q = q.where('eventType', '==', eventType);
          }
          
          return q;
        }
      );
    } catch (error) {
      console.error(`Error getting events in date range:`, error);
      throw error;
    }
  }

  /**
   * Get daily aggregations
   */
  static async getDailyAggregations(
    startDate: string,
    endDate: string,
    eventType?: string
  ): Promise<AnalyticsAggregation[]> {
    try {
      return await firestoreService.query<AnalyticsAggregation>(
        this.aggregationsCollection,
        (query) => {
          let q = query
            .where('date', '>=', startDate)
            .where('date', '<=', endDate)
            .orderBy('date', 'desc');
          
          if (eventType) {
            q = q.where('eventType', '==', eventType);
          }
          
          return q;
        }
      );
    } catch (error) {
      console.error(`Error getting daily aggregations:`, error);
      throw error;
    }
  }

  /**
   * Update daily aggregation
   */
  private static async updateDailyAggregation(event: AnalyticsEvent): Promise<void> {
    try {
      const date = event.timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
      const aggregationId = `${date}_${event.eventType}`;
      
      const existingAggregation = await firestoreService.get<AnalyticsAggregation>(
        this.aggregationsCollection,
        aggregationId
      );
      
      if (existingAggregation) {
        // Update existing aggregation
        const uniqueUsers = new Set([
          ...(existingAggregation.uniqueUsers ? [existingAggregation.uniqueUsers] : []),
          ...(event.userId ? [event.userId] : [])
        ]);
        
        const uniqueSessions = new Set([
          ...(existingAggregation.uniqueSessions ? [existingAggregation.uniqueSessions] : []),
          ...(event.sessionId ? [event.sessionId] : [])
        ]);
        
        const uniqueDevices = new Set([
          ...(existingAggregation.uniqueDevices ? [existingAggregation.uniqueDevices] : []),
          ...(event.deviceId ? [event.deviceId] : [])
        ]);
        
        await firestoreService.update(this.aggregationsCollection, aggregationId, {
          totalCount: existingAggregation.totalCount + 1,
          uniqueUsers: uniqueUsers.size,
          uniqueSessions: uniqueSessions.size,
          uniqueDevices: uniqueDevices.size,
          updatedAt: new Date(),
        });
      } else {
        // Create new aggregation
        await firestoreService.create(this.aggregationsCollection, aggregationId, {
          date,
          eventType: event.eventType,
          totalCount: 1,
          uniqueUsers: event.userId ? 1 : 0,
          uniqueSessions: event.sessionId ? 1 : 0,
          uniqueDevices: event.deviceId ? 1 : 0,
        });
      }
    } catch (error) {
      console.error('Error updating daily aggregation:', error);
      // Don't throw error to avoid breaking the main event tracking
    }
  }

  /**
   * Get analytics dashboard data
   */
  static async getDashboardData(
    startDate: string,
    endDate: string
  ): Promise<{
    totalEvents: number;
    uniqueUsers: number;
    uniqueSessions: number;
    uniqueDevices: number;
    eventsByType: Record<string, number>;
    eventsByDay: Array<{ date: string; count: number }>;
    topEvents: Array<{ eventName: string; count: number }>;
  }> {
    try {
      const events = await this.getEventsInDateRange(
        new Date(startDate),
        new Date(endDate)
      );
      
      const uniqueUsers = new Set(events.map(e => e.userId).filter(Boolean));
      const uniqueSessions = new Set(events.map(e => e.sessionId).filter(Boolean));
      const uniqueDevices = new Set(events.map(e => e.deviceId).filter(Boolean));
      
      const eventsByType = events.reduce((acc, event) => {
        acc[event.eventType] = (acc[event.eventType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const eventsByDay = events.reduce((acc, event) => {
        const date = event.timestamp.toISOString().split('T')[0];
        if (date) {
          acc[date] = (acc[date] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
      
      const eventsByDayArray = Object.entries(eventsByDay)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      const eventNameCounts = events.reduce((acc, event) => {
        acc[event.eventName] = (acc[event.eventName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const topEvents = Object.entries(eventNameCounts)
        .map(([eventName, count]) => ({ eventName, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      return {
        totalEvents: events.length,
        uniqueUsers: uniqueUsers.size,
        uniqueSessions: uniqueSessions.size,
        uniqueDevices: uniqueDevices.size,
        eventsByType,
        eventsByDay: eventsByDayArray,
        topEvents,
      };
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      throw error;
    }
  }

  /**
   * Get user activity timeline
   */
  static async getUserActivityTimeline(
    userId: string,
    days: number = 30
  ): Promise<Array<{ date: string; events: number; eventTypes: string[] }>> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const events = await this.getEventsInDateRange(startDate, endDate);
      const userEvents = events.filter(e => e.userId === userId);
      
      const timeline = userEvents.reduce((acc, event) => {
        const date = event.timestamp.toISOString().split('T')[0];
        if (date) {
          if (!acc[date]) {
            acc[date] = { date, events: 0, eventTypes: [] };
          }
          acc[date].events++;
          if (!acc[date].eventTypes.includes(event.eventType)) {
            acc[date].eventTypes.push(event.eventType);
          }
        }
        return acc;
      }, {} as Record<string, { date: string; events: number; eventTypes: string[] }>);
      
      return Object.values(timeline).sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error(`Error getting user activity timeline for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Clean up old events
   */
  static async cleanupOldEvents(daysToKeep: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const oldEvents = await firestoreService.query<AnalyticsEvent>(
        this.eventsCollection,
        (query) => query
          .where('timestamp', '<', cutoffDate)
          .limit(1000) // Process in batches
      );
      
      let deletedCount = 0;
      for (const event of oldEvents) {
        await firestoreService.delete(this.eventsCollection, event.id);
        deletedCount++;
      }
      
      console.log(`Cleaned up ${deletedCount} old analytics events`);
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old events:', error);
      throw error;
    }
  }

  /**
   * Get real-time metrics
   */
  static async getRealTimeMetrics(hours: number = 1): Promise<{
    eventsLastHour: number;
    activeUsers: number;
    topEventTypes: Array<{ eventType: string; count: number }>;
  }> {
    try {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() - hours);
      
      const events = await this.getEventsInDateRange(startTime, new Date());
      
      const activeUsers = new Set(events.map(e => e.userId).filter(Boolean));
      
      const eventTypeCounts = events.reduce((acc, event) => {
        acc[event.eventType] = (acc[event.eventType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const topEventTypes = Object.entries(eventTypeCounts)
        .map(([eventType, count]) => ({ eventType, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      return {
        eventsLastHour: events.length,
        activeUsers: activeUsers.size,
        topEventTypes,
      };
    } catch (error) {
      console.error('Error getting real-time metrics:', error);
      throw error;
    }
  }
}

export default AnalyticsModel;
