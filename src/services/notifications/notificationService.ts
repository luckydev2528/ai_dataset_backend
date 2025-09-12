import admin from 'firebase-admin';
import { getFirebaseAdmin } from '../auth/firebaseAdmin';

export interface NotificationMessage {
  title: string;
  body: string;
  data?: { [key: string]: string };
  imageUrl?: string;
}

export interface NotificationPayload {
  token: string;
  message: NotificationMessage;
}

export interface TopicNotificationPayload {
  topic: string;
  message: NotificationMessage;
}

export class NotificationService {
  private static instance: NotificationService;
  private messaging: admin.messaging.Messaging | null = null;

  private constructor() {
    this.initializeMessaging();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private initializeMessaging(): void {
    try {
      const firebaseApp = getFirebaseAdmin();
      if (!firebaseApp) {
        console.error('❌ Firebase Admin not initialized. Cannot initialize messaging.');
        return;
      }

      this.messaging = admin.messaging(firebaseApp);
      console.log('✅ Firebase Messaging initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Messaging:', error);
    }
  }

  /**
   * Send notification to a specific device using FCM token
   */
  public async sendToDevice(payload: NotificationPayload): Promise<string> {
    if (!this.messaging) {
      throw new Error('Firebase Messaging not initialized');
    }

    try {
      const message: admin.messaging.Message = {
        notification: {
          title: payload.message.title,
          body: payload.message.body,
          ...(payload.message.imageUrl && { imageUrl: payload.message.imageUrl }),
        },
        data: payload.message.data || {},
        token: payload.token,
      };

      console.log('📤 Sending notification to device:', {
        token: payload.token.substring(0, 20) + '...',
        title: payload.message.title,
        body: payload.message.body,
      });

      const response = await this.messaging.send(message);
      console.log('✅ Notification sent successfully:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to send notification to device:', error);
      throw error;
    }
  }

  /**
   * Send notification to a topic
   */
  public async sendToTopic(payload: TopicNotificationPayload): Promise<string> {
    if (!this.messaging) {
      throw new Error('Firebase Messaging not initialized');
    }

    try {
      const message: admin.messaging.Message = {
        notification: {
          title: payload.message.title,
          body: payload.message.body,
          ...(payload.message.imageUrl && { imageUrl: payload.message.imageUrl }),
        },
        data: payload.message.data || {},
        topic: payload.topic,
      };

      console.log('📤 Sending notification to topic:', {
        topic: payload.topic,
        title: payload.message.title,
        body: payload.message.body,
      });

      const response = await this.messaging.send(message);
      console.log('✅ Notification sent to topic successfully:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to send notification to topic:', error);
      throw error;
    }
  }

  /**
   * Send notification to multiple devices
   */
  public async sendToMultipleDevices(
    tokens: string[],
    message: NotificationMessage
  ): Promise<admin.messaging.BatchResponse> {
    if (!this.messaging) {
      throw new Error('Firebase Messaging not initialized');
    }

    try {
      const messages: admin.messaging.Message[] = tokens.map(token => ({
        notification: {
          title: message.title,
          body: message.body,
          ...(message.imageUrl && { imageUrl: message.imageUrl }),
        },
        data: message.data || {},
        token,
      }));

      console.log('📤 Sending notification to multiple devices:', {
        deviceCount: tokens.length,
        title: message.title,
        body: message.body,
      });

      const response = await this.messaging.sendAll(messages);
      console.log('✅ Batch notification sent successfully:', {
        successCount: response.successCount,
        failureCount: response.failureCount,
      });
      return response;
    } catch (error) {
      console.error('❌ Failed to send batch notification:', error);
      throw error;
    }
  }

  /**
   * Send notification when a new task is added
   */
  public async sendNewTaskNotification(
    taskTitle: string,
    taskId: string,
    bountyPoints: number,
    tokens: string[]
  ): Promise<void> {
    const message: NotificationMessage = {
      title: '🎯 New Task Available!',
      body: `${taskTitle} - Earn ${bountyPoints} points`,
      data: {
        type: 'new_task',
        taskId,
        bountyPoints: bountyPoints.toString(),
      },
    };

    try {
      await this.sendToMultipleDevices(tokens, message);
      console.log('✅ New task notification sent successfully');
    } catch (error) {
      console.error('❌ Failed to send new task notification:', error);
      throw error;
    }
  }

  /**
   * Send notification when task is completed and approved
   */
  public async sendTaskApprovedNotification(
    taskTitle: string,
    pointsEarned: number,
    token: string
  ): Promise<void> {
    const message: NotificationMessage = {
      title: '🎉 Task Approved!',
      body: `You earned ${pointsEarned} points for "${taskTitle}"`,
      data: {
        type: 'task_approved',
        pointsEarned: pointsEarned.toString(),
      },
    };

    try {
      await this.sendToDevice({ token, message });
      console.log('✅ Task approved notification sent successfully');
    } catch (error) {
      console.error('❌ Failed to send task approved notification:', error);
      throw error;
    }
  }

  /**
   * Send notification when task is rejected
   */
  public async sendTaskRejectedNotification(
    taskTitle: string,
    reason: string,
    token: string
  ): Promise<void> {
    const message: NotificationMessage = {
      title: '❌ Task Rejected',
      body: `"${taskTitle}" was rejected. Reason: ${reason}`,
      data: {
        type: 'task_rejected',
        reason,
      },
    };

    try {
      await this.sendToDevice({ token, message });
      console.log('✅ Task rejected notification sent successfully');
    } catch (error) {
      console.error('❌ Failed to send task rejected notification:', error);
      throw error;
    }
  }

  /**
   * Send notification for points milestone
   */
  public async sendPointsMilestoneNotification(
    milestone: string,
    totalPoints: number,
    token: string
  ): Promise<void> {
    const message: NotificationMessage = {
      title: '🏆 Points Milestone!',
      body: `Congratulations! You've reached ${milestone} with ${totalPoints} points`,
      data: {
        type: 'points_milestone',
        totalPoints: totalPoints.toString(),
        milestone,
      },
    };

    try {
      await this.sendToDevice({ token, message });
      console.log('✅ Points milestone notification sent successfully');
    } catch (error) {
      console.error('❌ Failed to send points milestone notification:', error);
      throw error;
    }
  }

  /**
   * Send test notification
   */
  public async sendTestNotification(token: string): Promise<void> {
    const message: NotificationMessage = {
      title: '🧪 Test Notification',
      body: 'This is a test notification from DRR backend',
      data: {
        type: 'test',
        timestamp: new Date().toISOString(),
      },
    };

    try {
      await this.sendToDevice({ token, message });
      console.log('✅ Test notification sent successfully');
    } catch (error) {
      console.error('❌ Failed to send test notification:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();
