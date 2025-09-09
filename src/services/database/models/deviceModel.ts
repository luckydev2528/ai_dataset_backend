import { firestoreService } from '../firestoreService';

export interface DeviceDocument {
  id: string;
  userId: string;
  deviceId: string; // Unique device identifier
  deviceName?: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'web' | 'unknown';
  platform: 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'web' | 'unknown';
  osVersion?: string;
  appVersion?: string;
  browserInfo?: {
    name?: string;
    version?: string;
    userAgent?: string;
  };
  hardwareInfo?: {
    model?: string;
    brand?: string;
    manufacturer?: string;
    memory?: string;
    storage?: string;
  };
  networkInfo?: {
    connectionType?: string;
    carrier?: string;
    ipAddress?: string;
    country?: string;
    city?: string;
  };
  isActive: boolean;
  isTrusted: boolean;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
  permissions?: {
    notifications: boolean;
    location: boolean;
    camera: boolean;
    microphone: boolean;
    storage: boolean;
  };
  securityInfo?: {
    isJailbroken?: boolean;
    isRooted?: boolean;
    hasSecurityPatch?: boolean;
    biometricEnabled?: boolean;
    screenLockEnabled?: boolean;
  };
}

export class DeviceModel {
  private static collection = 'devices' as const;

  /**
   * Register a new device
   */
  static async register(deviceData: Omit<DeviceDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<DeviceDocument> {
    try {
      const docRef = await firestoreService.add<Omit<DeviceDocument, 'id' | 'createdAt' | 'updatedAt'>>(this.collection, {
        ...deviceData,
        isActive: true,
        isTrusted: false, // New devices are not trusted by default
        lastSeenAt: new Date(),
      });
      
      const device = await this.getById(docRef.id);
      if (!device) {
        throw new Error('Failed to register device');
      }
      
      console.log(`Device registered: ${device.deviceId} for user ${device.userId}`);
      return device;
    } catch (error) {
      console.error('Error registering device:', error);
      throw error;
    }
  }

  /**
   * Get device by ID
   */
  static async getById(id: string): Promise<DeviceDocument | null> {
    try {
      return await firestoreService.get<DeviceDocument>(this.collection, id);
    } catch (error) {
      console.error(`Error getting device by ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get device by device ID and user ID
   */
  static async getByDeviceId(deviceId: string, userId: string): Promise<DeviceDocument | null> {
    try {
      const devices = await firestoreService.query<DeviceDocument>(
        this.collection,
        (query) => query
          .where('deviceId', '==', deviceId)
          .where('userId', '==', userId)
          .limit(1)
      );
      
      return devices.length > 0 ? devices[0]! : null;
    } catch (error) {
      console.error(`Error getting device by device ID ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Get all devices for a user
   */
  static async getByUserId(
    userId: string,
    includeInactive: boolean = false
  ): Promise<DeviceDocument[]> {
    try {
      return await firestoreService.query<DeviceDocument>(
        this.collection,
        (query) => {
          let q = query.where('userId', '==', userId);
          if (!includeInactive) {
            q = q.where('isActive', '==', true);
          }
          return q.orderBy('lastSeenAt', 'desc');
        }
      );
    } catch (error) {
      console.error(`Error getting devices for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update device
   */
  static async update(id: string, updates: Partial<DeviceDocument>): Promise<DeviceDocument | null> {
    try {
      await firestoreService.update(this.collection, id, updates);
      
      const updatedDevice = await this.getById(id);
      if (updatedDevice) {
        console.log(`Device updated: ${updatedDevice.deviceId} (${id})`);
      }
      
      return updatedDevice;
    } catch (error) {
      console.error(`Error updating device ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update device by device ID
   */
  static async updateByDeviceId(
    deviceId: string,
    userId: string,
    updates: Partial<DeviceDocument>
  ): Promise<DeviceDocument | null> {
    try {
      const device = await this.getByDeviceId(deviceId, userId);
      if (!device) {
        return null;
      }
      
      return await this.update(device.id, updates);
    } catch (error) {
      console.error(`Error updating device by device ID ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Update device last seen
   */
  static async updateLastSeen(deviceId: string, userId: string): Promise<void> {
    try {
      await this.updateByDeviceId(deviceId, userId, {
        lastSeenAt: new Date(),
      });
    } catch (error) {
      console.error(`Error updating last seen for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Deactivate device
   */
  static async deactivate(id: string): Promise<boolean> {
    try {
      await this.update(id, { isActive: false });
      console.log(`Device deactivated: ${id}`);
      return true;
    } catch (error) {
      console.error(`Error deactivating device ${id}:`, error);
      throw error;
    }
  }

  /**
   * Deactivate device by device ID
   */
  static async deactivateByDeviceId(deviceId: string, userId: string): Promise<boolean> {
    try {
      const device = await this.getByDeviceId(deviceId, userId);
      if (!device) {
        return false;
      }
      
      return await this.deactivate(device.id);
    } catch (error) {
      console.error(`Error deactivating device by device ID ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Trust device
   */
  static async trustDevice(id: string): Promise<boolean> {
    try {
      await this.update(id, { isTrusted: true });
      console.log(`Device trusted: ${id}`);
      return true;
    } catch (error) {
      console.error(`Error trusting device ${id}:`, error);
      throw error;
    }
  }

  /**
   * Untrust device
   */
  static async untrustDevice(id: string): Promise<boolean> {
    try {
      await this.update(id, { isTrusted: false });
      console.log(`Device untrusted: ${id}`);
      return true;
    } catch (error) {
      console.error(`Error untrusting device ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete device
   */
  static async delete(id: string): Promise<boolean> {
    try {
      await firestoreService.delete(this.collection, id);
      console.log(`Device deleted: ${id}`);
      return true;
    } catch (error) {
      console.error(`Error deleting device ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete device by device ID
   */
  static async deleteByDeviceId(deviceId: string, userId: string): Promise<boolean> {
    try {
      const device = await this.getByDeviceId(deviceId, userId);
      if (!device) {
        return false;
      }
      
      return await this.delete(device.id);
    } catch (error) {
      console.error(`Error deleting device by device ID ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Delete all devices for a user
   */
  static async deleteAllForUser(userId: string): Promise<number> {
    try {
      const devices = await this.getByUserId(userId, true);
      let deletedCount = 0;
      
      for (const device of devices) {
        await this.delete(device.id);
        deletedCount++;
      }
      
      console.log(`Deleted ${deletedCount} devices for user ${userId}`);
      return deletedCount;
    } catch (error) {
      console.error(`Error deleting all devices for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get device statistics
   */
  static async getStats(): Promise<{
    totalDevices: number;
    activeDevices: number;
    trustedDevices: number;
    devicesByType: Record<string, number>;
    devicesByPlatform: Record<string, number>;
  }> {
    try {
      const devices = await firestoreService.query<DeviceDocument>(this.collection);
      
      const stats = {
        totalDevices: devices.length,
        activeDevices: devices.filter(d => d.isActive).length,
        trustedDevices: devices.filter(d => d.isTrusted).length,
        devicesByType: devices.reduce((acc, device) => {
          acc[device.deviceType] = (acc[device.deviceType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        devicesByPlatform: devices.reduce((acc, device) => {
          acc[device.platform] = (acc[device.platform] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      };
      
      return stats;
    } catch (error) {
      console.error('Error getting device statistics:', error);
      throw error;
    }
  }

  /**
   * Get devices that haven't been seen recently
   */
  static async getInactiveDevices(hoursThreshold: number = 24): Promise<DeviceDocument[]> {
    try {
      const thresholdDate = new Date();
      thresholdDate.setHours(thresholdDate.getHours() - hoursThreshold);
      
      const devices = await firestoreService.query<DeviceDocument>(
        this.collection,
        (query) => query
          .where('isActive', '==', true)
          .where('lastSeenAt', '<', thresholdDate)
          .orderBy('lastSeenAt', 'asc')
      );
      
      return devices;
    } catch (error) {
      console.error(`Error getting inactive devices:`, error);
      throw error;
    }
  }

  /**
   * Clean up old inactive devices
   */
  static async cleanupOldDevices(daysThreshold: number = 30): Promise<number> {
    try {
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);
      
      const oldDevices = await firestoreService.query<DeviceDocument>(
        this.collection,
        (query) => query
          .where('isActive', '==', false)
          .where('lastSeenAt', '<', thresholdDate)
      );
      
      let deletedCount = 0;
      for (const device of oldDevices) {
        await this.delete(device.id);
        deletedCount++;
      }
      
      console.log(`Cleaned up ${deletedCount} old inactive devices`);
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old devices:', error);
      throw error;
    }
  }
}

export default DeviceModel;
