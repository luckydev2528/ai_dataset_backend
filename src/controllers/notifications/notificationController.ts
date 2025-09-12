import { Request, Response } from 'express';
import { notificationService } from '../../services/notifications/notificationService';
import { firestoreService } from '../../services/database/firestoreService';

export class NotificationController {
  /**
   * Send test notification to a specific device
   */
  public static async sendTestNotification(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({
          success: false,
          message: 'FCM token is required',
        });
        return;
      }

      await notificationService.sendTestNotification(token);

      res.json({
        success: true,
        message: 'Test notification sent successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send test notification',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Send notification to all users
   */
  public static async sendToAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const { title, body, data } = req.body;

      if (!title || !body) {
        res.status(400).json({
          success: false,
          message: 'Title and body are required',
        });
        return;
      }

      // Get all user FCM tokens from the database
      const users = await firestoreService.getCollection<{ fcmToken?: string }>('users');
      const tokens: string[] = [];

      for (const user of users) {
        if (user.fcmToken) {
          tokens.push(user.fcmToken);
        }
      }

      if (tokens.length === 0) {
        res.status(404).json({
          success: false,
          message: 'No users with FCM tokens found',
        });
        return;
      }

      await notificationService.sendToMultipleDevices(tokens, {
        title,
        body,
        data,
      });

      res.json({
        success: true,
        message: `Notification sent to ${tokens.length} users`,
        userCount: tokens.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error sending notification to all users:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send notification to all users',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Send notification to a specific user
   */
  public static async sendToUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId, title, body, data } = req.body;

      if (!userId || !title || !body) {
        res.status(400).json({
          success: false,
          message: 'User ID, title, and body are required',
        });
        return;
      }

      // Get user's FCM token
      const user = await firestoreService.get('users', userId);
      if (!user || !user.fcmToken) {
        res.status(404).json({
          success: false,
          message: 'User not found or no FCM token available',
        });
        return;
      }

      await notificationService.sendToDevice({
        token: user.fcmToken,
        message: { title, body, data },
      });

      res.json({
        success: true,
        message: 'Notification sent to user successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error sending notification to user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send notification to user',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Send new task notification to all users
   */
  public static async sendNewTaskNotification(req: Request, res: Response): Promise<void> {
    try {
      const { taskId, taskTitle, bountyPoints } = req.body;

      if (!taskId || !taskTitle || !bountyPoints) {
        res.status(400).json({
          success: false,
          message: 'Task ID, title, and bounty points are required',
        });
        return;
      }

      // Get all user FCM tokens
      const users = await firestoreService.getCollection<{ fcmToken?: string }>('users');
      const tokens: string[] = [];

      for (const user of users) {
        if (user.fcmToken) {
          tokens.push(user.fcmToken);
        }
      }

      if (tokens.length === 0) {
        res.status(404).json({
          success: false,
          message: 'No users with FCM tokens found',
        });
        return;
      }

      await notificationService.sendNewTaskNotification(
        taskTitle,
        taskId,
        bountyPoints,
        tokens
      );

      res.json({
        success: true,
        message: `New task notification sent to ${tokens.length} users`,
        userCount: tokens.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error sending new task notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send new task notification',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Send task approval notification to specific user
   */
  public static async sendTaskApprovedNotification(req: Request, res: Response): Promise<void> {
    try {
      const { userId, taskTitle, pointsEarned } = req.body;

      if (!userId || !taskTitle || !pointsEarned) {
        res.status(400).json({
          success: false,
          message: 'User ID, task title, and points earned are required',
        });
        return;
      }

      // Get user's FCM token
      const user = await firestoreService.get('users', userId);
      if (!user || !user.fcmToken) {
        res.status(404).json({
          success: false,
          message: 'User not found or no FCM token available',
        });
        return;
      }

      await notificationService.sendTaskApprovedNotification(
        taskTitle,
        pointsEarned,
        user.fcmToken
      );

      res.json({
        success: true,
        message: 'Task approved notification sent successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error sending task approved notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send task approved notification',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Send task rejection notification to specific user
   */
  public static async sendTaskRejectedNotification(req: Request, res: Response): Promise<void> {
    try {
      const { userId, taskTitle, reason } = req.body;

      if (!userId || !taskTitle || !reason) {
        res.status(400).json({
          success: false,
          message: 'User ID, task title, and reason are required',
        });
        return;
      }

      // Get user's FCM token
      const user = await firestoreService.get('users', userId);
      if (!user || !user.fcmToken) {
        res.status(404).json({
          success: false,
          message: 'User not found or no FCM token available',
        });
        return;
      }

      await notificationService.sendTaskRejectedNotification(
        taskTitle,
        reason,
        user.fcmToken
      );

      res.json({
        success: true,
        message: 'Task rejected notification sent successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error sending task rejected notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send task rejected notification',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get notification statistics
   */
  public static async getNotificationStats(req: Request, res: Response): Promise<void> {
    try {
      // Get all users and count those with FCM tokens
      const users = await firestoreService.getCollection<{ fcmToken?: string }>('users');
      const usersWithTokens = users.filter((user: { fcmToken?: string }) => user.fcmToken);
      const usersWithoutTokens = users.filter((user: { fcmToken?: string }) => !user.fcmToken);

      res.json({
        success: true,
        data: {
          totalUsers: users.length,
          usersWithTokens: usersWithTokens.length,
          usersWithoutTokens: usersWithoutTokens.length,
          tokenCoverage: users.length > 0 ? (usersWithTokens.length / users.length) * 100 : 0,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting notification stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get notification statistics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
