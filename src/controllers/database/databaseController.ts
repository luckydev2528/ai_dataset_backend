import { Request, Response } from 'express';
import { UserModel } from '../../services/database/models/userModel';
import { DeviceModel } from '../../services/database/models/deviceModel';
import { AnalyticsModel } from '../../services/database/models/analyticsModel';
import { firestoreService } from '../../services/database/firestoreService';
import { ApiResponse } from '../../types';
import { logger } from '../../utils/logger';

export class DatabaseController {
  /**
   * Get database health status
   */
  static async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const firestoreHealth = await firestoreService.healthCheck();
      
      const response: ApiResponse = {
        success: true,
        message: 'Database health check completed',
        data: {
          firestore: firestoreHealth,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };
      
      res.status(200).json(response);
    } catch (error) {
      logger.error('Database health check failed:', { error: error instanceof Error ? error.message : String(error) });
      
      const response: ApiResponse = {
        success: false,
        message: 'Database health check failed',
        error: 'DATABASE_HEALTH_CHECK_FAILED',
        timestamp: new Date().toISOString(),
      };
      
      res.status(500).json(response);
    }
  }

  /**
   * Get user statistics
   */
  static async getUserStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await UserModel.getStats();
      
      const response: ApiResponse = {
        success: true,
        message: 'User statistics retrieved successfully',
        data: stats,
        timestamp: new Date().toISOString(),
      };
      
      res.status(200).json(response);
    } catch (error) {
      logger.error('Error getting user statistics:', { error: error instanceof Error ? error.message : String(error) });
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve user statistics',
        error: 'USER_STATS_ERROR',
        timestamp: new Date().toISOString(),
      };
      
      res.status(500).json(response);
    }
  }

  /**
   * Get device statistics
   */
  static async getDeviceStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await DeviceModel.getStats();
      
      const response: ApiResponse = {
        success: true,
        message: 'Device statistics retrieved successfully',
        data: stats,
        timestamp: new Date().toISOString(),
      };
      
      res.status(200).json(response);
    } catch (error) {
      logger.error('Error getting device statistics:', { error: error instanceof Error ? error.message : String(error) });
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve device statistics',
        error: 'DEVICE_STATS_ERROR',
        timestamp: new Date().toISOString(),
      };
      
      res.status(500).json(response);
    }
  }

  /**
   * Get analytics dashboard data
   */
  static async getAnalyticsDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        const response: ApiResponse = {
          success: false,
          message: 'Start date and end date are required',
          error: 'MISSING_DATE_PARAMETERS',
          timestamp: new Date().toISOString(),
        };
        
        res.status(400).json(response);
        return;
      }
      
      const dashboardData = await AnalyticsModel.getDashboardData(
        startDate as string,
        endDate as string
      );
      
      const response: ApiResponse = {
        success: true,
        message: 'Analytics dashboard data retrieved successfully',
        data: dashboardData,
        timestamp: new Date().toISOString(),
      };
      
      res.status(200).json(response);
    } catch (error) {
      logger.error('Error getting analytics dashboard data:', { error: error instanceof Error ? error.message : String(error) });
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve analytics dashboard data',
        error: 'ANALYTICS_DASHBOARD_ERROR',
        timestamp: new Date().toISOString(),
      };
      
      res.status(500).json(response);
    }
  }

  /**
   * Get real-time analytics metrics
   */
  static async getRealTimeMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { hours = '1' } = req.query;
      const hoursNumber = parseInt(hours as string, 10);
      
      if (isNaN(hoursNumber) || hoursNumber < 1 || hoursNumber > 24) {
        const response: ApiResponse = {
          success: false,
          message: 'Hours parameter must be a number between 1 and 24',
          error: 'INVALID_HOURS_PARAMETER',
          timestamp: new Date().toISOString(),
        };
        
        res.status(400).json(response);
        return;
      }
      
      const metrics = await AnalyticsModel.getRealTimeMetrics(hoursNumber);
      
      const response: ApiResponse = {
        success: true,
        message: 'Real-time metrics retrieved successfully',
        data: metrics,
        timestamp: new Date().toISOString(),
      };
      
      res.status(200).json(response);
    } catch (error) {
      logger.error('Error getting real-time metrics:', { error: error instanceof Error ? error.message : String(error) });
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve real-time metrics',
        error: 'REAL_TIME_METRICS_ERROR',
        timestamp: new Date().toISOString(),
      };
      
      res.status(500).json(response);
    }
  }

  /**
   * Track analytics event
   */
  static async trackEvent(req: Request, res: Response): Promise<void> {
    try {
      const {
        eventType,
        eventName,
        eventData,
        sessionId,
        deviceId,
        ipAddress,
        userAgent,
        location,
        metadata,
      } = req.body;
      
      if (!eventType || !eventName) {
        const response: ApiResponse = {
          success: false,
          message: 'Event type and event name are required',
          error: 'MISSING_REQUIRED_FIELDS',
          timestamp: new Date().toISOString(),
        };
        
        res.status(400).json(response);
        return;
      }
      
      const userId = (req as any).user?.id;
      
      const event = await AnalyticsModel.trackEvent({
        userId,
        sessionId,
        deviceId,
        eventType,
        eventName,
        eventData,
        ipAddress: ipAddress || req.ip,
        userAgent: userAgent || req.get('User-Agent'),
        location,
        metadata,
      });
      
      const response: ApiResponse = {
        success: true,
        message: 'Event tracked successfully',
        data: { eventId: event.id },
        timestamp: new Date().toISOString(),
      };
      
      res.status(201).json(response);
    } catch (error) {
      logger.error('Error tracking event:', { error: error instanceof Error ? error.message : String(error) });
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to track event',
        error: 'EVENT_TRACKING_ERROR',
        timestamp: new Date().toISOString(),
      };
      
      res.status(500).json(response);
    }
  }

  /**
   * Get user activity timeline
   */
  static async getUserActivityTimeline(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { days = '30' } = req.query;
      
      const daysNumber = parseInt(days as string, 10);
      
      if (isNaN(daysNumber) || daysNumber < 1 || daysNumber > 365) {
        const response: ApiResponse = {
          success: false,
          message: 'Days parameter must be a number between 1 and 365',
          error: 'INVALID_DAYS_PARAMETER',
          timestamp: new Date().toISOString(),
        };
        
        res.status(400).json(response);
        return;
      }
      
      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User ID is required',
          error: 'MISSING_USER_ID',
          timestamp: new Date().toISOString(),
        };
        
        res.status(400).json(response);
        return;
      }
      
      const timeline = await AnalyticsModel.getUserActivityTimeline(userId, daysNumber);
      
      const response: ApiResponse = {
        success: true,
        message: 'User activity timeline retrieved successfully',
        data: timeline,
        timestamp: new Date().toISOString(),
      };
      
      res.status(200).json(response);
    } catch (error) {
      logger.error('Error getting user activity timeline:', { error: error instanceof Error ? error.message : String(error) });
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve user activity timeline',
        error: 'USER_ACTIVITY_TIMELINE_ERROR',
        timestamp: new Date().toISOString(),
      };
      
      res.status(500).json(response);
    }
  }

  /**
   * Clean up old data
   */
  static async cleanupOldData(req: Request, res: Response): Promise<void> {
    try {
      const { type, days = '90' } = req.body;
      
      if (!type) {
        const response: ApiResponse = {
          success: false,
          message: 'Cleanup type is required',
          error: 'MISSING_CLEANUP_TYPE',
          timestamp: new Date().toISOString(),
        };
        
        res.status(400).json(response);
        return;
      }
      
      const daysNumber = parseInt(days as string, 10);
      let cleanedCount = 0;
      
      switch (type) {
        case 'analytics_events':
          cleanedCount = await AnalyticsModel.cleanupOldEvents(daysNumber);
          break;
        case 'inactive_devices':
          cleanedCount = await DeviceModel.cleanupOldDevices(daysNumber);
          break;
        default:
          const response: ApiResponse = {
            success: false,
            message: 'Invalid cleanup type. Supported types: analytics_events, inactive_devices',
            error: 'INVALID_CLEANUP_TYPE',
            timestamp: new Date().toISOString(),
          };
          
          res.status(400).json(response);
          return;
      }
      
      const response: ApiResponse = {
        success: true,
        message: `Cleanup completed successfully`,
        data: { cleanedCount, type, days: daysNumber },
        timestamp: new Date().toISOString(),
      };
      
      res.status(200).json(response);
    } catch (error) {
      logger.error('Error cleaning up old data:', { error: error instanceof Error ? error.message : String(error) });
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to clean up old data',
        error: 'CLEANUP_ERROR',
        timestamp: new Date().toISOString(),
      };
      
      res.status(500).json(response);
    }
  }
}

export default DatabaseController;
