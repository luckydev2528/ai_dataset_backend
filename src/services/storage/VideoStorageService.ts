import admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { firestoreService } from '../database/firestoreService';
import { videoProcessingService, VideoProcessingResult } from '../processing/VideoProcessingService';
import { Logger } from '../../utils/logger';
import { initializeFirebaseAdmin } from '../auth/firebaseAdmin';

export interface VideoUploadOptions {
  userId: string;
  taskId: string;
  challengePrompt: string;
  videoMetadata: {
    duration: number;
    width: number;
    height: number;
    fileSize: number;
    resolution: string;
    frameRate: number;
    quality: string;
  };
  originalFileName: string;
}

export interface VideoUploadResult {
  success: boolean;
  videoId: string;
  downloadUrl: string;
  thumbnailUrl?: string | undefined;
  metadata: {
    bucket: string;
    fileName: string;
    path: string;
    size: number;
    contentType: string;
    uploadedAt: string;
  };
  error?: string;
}

export interface VideoValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata: {
    duration: number;
    width: number;
    height: number;
    fileSize: number;
    bitrate?: number;
    codec?: string;
  };
}

export class VideoStorageService {
  private static instance: VideoStorageService;
  private bucketName: string;

  private constructor() {
    if (!process.env.FIREBASE_PROJECT_ID) {
      throw new Error('FIREBASE_PROJECT_ID environment variable is required');
    }

    // Ensure Firebase Admin is initialized (reuses existing app if already done)
    initializeFirebaseAdmin();

    const rawBucket = process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`;
    this.bucketName = rawBucket.startsWith('gs://') ? rawBucket.slice(5) : rawBucket;
  }

  public static getInstance(): VideoStorageService {
    if (!VideoStorageService.instance) {
      VideoStorageService.instance = new VideoStorageService();
    }
    return VideoStorageService.instance;
  }

  /**
   * Upload video to Firebase Storage with validation and metadata
   */
  async uploadVideo(
    videoBuffer: Buffer,
    options: VideoUploadOptions
  ): Promise<VideoUploadResult> {
    try {
      Logger.info(`Starting video upload for task ${options.taskId} by user ${options.userId}`);

      // Validate video before upload
      const validation = await this.validateVideo(videoBuffer, options.videoMetadata);
      if (!validation.isValid) {
        Logger.warning(`Video validation failed: ${validation.errors.join(', ')}`);
        return {
          success: false,
          videoId: '',
          downloadUrl: '',
          metadata: {} as any,
          error: `Video validation failed: ${validation.errors.join(', ')}`
        };
      }

      // Process and compress video if needed
      let processedBuffer = videoBuffer;
      let processingResult = null;
      
      try {
        const compressionSettings = videoProcessingService.getOptimalCompressionSettings(videoBuffer.length);
        processingResult = await videoProcessingService.processVideo(videoBuffer, {
          quality: compressionSettings.quality,
          resolution: compressionSettings.resolution as any,
          maxFileSize: compressionSettings.maxFileSize
        });

        if (processingResult.success && processingResult.outputBuffer) {
          processedBuffer = processingResult.outputBuffer;
          Logger.info(`Video processed: ${Math.round(processingResult.compressionRatio * 100)}% of original size`);
        }
      } catch (processingError) {
        Logger.warning('Video processing failed, using original video:', processingError);
        // Continue with original video if processing fails
      }

      // Generate unique video ID and file path
      const videoId = uuidv4();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `videos/${options.userId}/${options.taskId}/${videoId}_${timestamp}.mp4`;
      
      // Get bucket reference via Firebase Admin SDK
      const bucket = admin.storage().bucket(this.bucketName);
      const file = bucket.file(fileName);

      // Set up upload options
      const smallFileFastPath = processedBuffer.length <= (parseInt(process.env.SMALL_UPLOAD_FAST_PATH_BYTES || '5242880', 10));
      const uploadOptions = {
        metadata: {
          contentType: 'video/mp4',
          metadata: {
            userId: options.userId,
            taskId: options.taskId,
            videoId: videoId,
            challengePrompt: options.challengePrompt,
            originalFileName: options.originalFileName,
            uploadedAt: new Date().toISOString(),
            duration: options.videoMetadata.duration.toString(),
            resolution: options.videoMetadata.resolution,
            quality: options.videoMetadata.quality,
            frameRate: options.videoMetadata.frameRate.toString(),
          },
        },
        resumable: !smallFileFastPath && (process.env.FORCE_RESUMABLE_UPLOAD === 'true'),
        validation: process.env.DISABLE_CRC_VALIDATION === 'true' ? false : 'crc32c',
      };

      // Upload the processed video
      Logger.info(`Uploading video to ${fileName}`);
      await file.save(processedBuffer, uploadOptions as any);

      // Make the file publicly accessible
      await file.makePublic();

      // Get download URL
      const downloadUrl = `https://storage.googleapis.com/${this.bucketName}/${fileName}`;

      // Generate thumbnail using processing service and upload
      let thumbnailUrl: string | undefined = undefined;
      if ((process.env.ENABLE_THUMBNAILS || 'true').toLowerCase() === 'true') {
        try {
          const thumbBuffer = await videoProcessingService.generateThumbnailFromBuffer(processedBuffer, 5);
          if (thumbBuffer) {
            const thumbName = `thumbnails/${options.userId}/${options.taskId}/${videoId}.jpg`;
            const thumbFile = bucket.file(thumbName);
            await thumbFile.save(thumbBuffer, {
              metadata: {
                contentType: 'image/jpeg',
                metadata: {
                  userId: options.userId,
                  taskId: options.taskId,
                  videoId: videoId,
                },
              },
              resumable: false,
            } as any);
            await thumbFile.makePublic();
            thumbnailUrl = `https://storage.googleapis.com/${this.bucketName}/${thumbName}`;
          }
        } catch (thumbError) {
          Logger.warning(`Thumbnail generation failed for video ${videoId}:`, thumbError);
        }
      }

      // Store metadata in Firestore (sanitize processingResult to avoid non-serializable fields like Buffers)
      const processingResultForStore = processingResult
        ? {
            success: processingResult.success,
            originalSize: processingResult.originalSize,
            compressedSize: processingResult.compressedSize,
            compressionRatio: processingResult.compressionRatio,
            duration: processingResult.duration,
            resolution: processingResult.resolution,
            bitrate: processingResult.bitrate,
            ...(processingResult.error ? { error: processingResult.error } : {}),
          }
        : null;

      await this.storeVideoMetadata(videoId, {
        ...options,
        videoId,
        fileName,
        downloadUrl,
        thumbnailUrl: thumbnailUrl,
        uploadedAt: new Date().toISOString(),
        validationResult: validation,
        processingResult: processingResultForStore,
      });

      Logger.info(`Video upload completed successfully: ${videoId}`);

      return {
        success: true,
        videoId,
        downloadUrl,
        thumbnailUrl,
        metadata: {
          bucket: this.bucketName,
          fileName,
          path: fileName,
          size: processedBuffer.length,
          contentType: 'video/mp4',
          uploadedAt: new Date().toISOString(),
        },
      };

    } catch (error) {
      Logger.error('Video upload failed:', error);
      return {
        success: false,
        videoId: '',
        downloadUrl: '',
        metadata: {} as any,
        error: error instanceof Error ? error.message : 'Unknown upload error'
      };
    }
  }

  /**
   * Validate video file before upload
   */
  private async validateVideo(
    videoBuffer: Buffer,
    metadata: VideoUploadOptions['videoMetadata']
  ): Promise<VideoValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check file size (max 100MB)
    const maxFileSize = 100 * 1024 * 1024; // 100MB
    if (videoBuffer.length > maxFileSize) {
      errors.push(`Video file too large (${Math.round(videoBuffer.length / 1024 / 1024)}MB). Maximum allowed: 100MB`);
    }

    // Check minimum file size (at least 1MB)
    const minFileSize = 1024 * 1024; // 1MB
    if (videoBuffer.length < minFileSize) {
      errors.push('Video file too small. Please record a longer video.');
    }

    // Check duration (minimum 10 seconds, maximum 5 minutes)
    if (metadata.duration < 10) {
      errors.push('Video must be at least 10 seconds long');
    }
    if (metadata.duration > 300) {
      errors.push('Video must be no longer than 5 minutes');
    }

    // Check resolution requirements
    const minWidth = 640;
    const minHeight = 480;
    if (metadata.width < minWidth || metadata.height < minHeight) {
      errors.push(`Video resolution too low. Minimum required: ${minWidth}x${minHeight}`);
    }

    // Check if resolution matches the specified quality
    const expectedResolutions = {
      '720p': { width: 1280, height: 720 },
      '1080p': { width: 1920, height: 1080 },
      '4k': { width: 3840, height: 2160 },
    };

    const expectedRes = expectedResolutions[metadata.resolution as keyof typeof expectedResolutions];
    if (expectedRes && (metadata.width !== expectedRes.width || metadata.height !== expectedRes.height)) {
      warnings.push(`Video resolution (${metadata.width}x${metadata.height}) doesn't match expected ${metadata.resolution} (${expectedRes.width}x${expectedRes.height})`);
    }

    // Check frame rate
    if (metadata.frameRate < 15) {
      warnings.push('Low frame rate detected. Video quality may be poor.');
    }

    // Basic file format validation (check for MP4 header)
    const mp4Header = videoBuffer.subarray(0, 8);
    const isMP4 = mp4Header[4] === 0x66 && mp4Header[5] === 0x74 && mp4Header[6] === 0x79 && mp4Header[7] === 0x70; // 'ftyp'
    if (!isMP4) {
      errors.push('Invalid video format. Only MP4 files are supported.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height,
        fileSize: videoBuffer.length,
      },
    };
  }

  /**
   * Generate thumbnail for video (placeholder implementation)
   */
  private async generateThumbnail(file: any, videoId: string): Promise<string | undefined> {
    try {
      // In a real implementation, you would use FFmpeg or similar to extract a frame
      // For now, we'll return undefined and implement this later
      Logger.info(`Thumbnail generation for video ${videoId} - placeholder implementation`);
      return undefined;
    } catch (error) {
      Logger.warning(`Thumbnail generation failed for video ${videoId}:`, error);
      return undefined;
    }
  }

  /**
   * Store video metadata in Firestore
   */
  private async storeVideoMetadata(
    videoId: string,
    data: {
      userId: string;
      taskId: string;
      videoId: string;
      fileName: string;
      downloadUrl: string;
      thumbnailUrl?: string | undefined;
      uploadedAt: string;
      challengePrompt: string;
      videoMetadata: VideoUploadOptions['videoMetadata'];
      validationResult: VideoValidationResult;
      processingResult?: VideoProcessingResult | null;
    }
  ): Promise<void> {
    try {
      const videoDoc = {
        videoId: data.videoId,
        userId: data.userId,
        taskId: data.taskId,
        fileName: data.fileName,
        downloadUrl: data.downloadUrl,
        ...(data.thumbnailUrl ? { thumbnailUrl: data.thumbnailUrl } : {}),
        uploadedAt: data.uploadedAt,
        challengePrompt: data.challengePrompt,
        metadata: data.videoMetadata,
        validation: data.validationResult,
        processing: data.processingResult,
        status: 'uploaded',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await firestoreService.create('videos' as any, videoId, videoDoc);
      Logger.info(`Video metadata stored in Firestore: ${videoId}`);
    } catch (error) {
      Logger.error(`Failed to store video metadata for ${videoId}:`, error);
      throw error;
    }
  }

  /**
   * Get video metadata by ID
   */
  async getVideoMetadata(videoId: string): Promise<any> {
    try {
      const videoDoc = await firestoreService.get('videos' as any, videoId);
      return videoDoc;
    } catch (error) {
      Logger.error(`Failed to get video metadata for ${videoId}:`, error);
      throw error;
    }
  }

  /**
   * Get videos by user ID
   */
  async getVideosByUser(userId: string, limit: number = 50): Promise<any[]> {
    try {
      const videos = await firestoreService.query('videos' as any, (query) => 
        query.where('userId', '==', userId).where('status', '==', 'uploaded').limit(limit)
      );
      return videos;
    } catch (error) {
      Logger.error(`Failed to get videos for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get videos by task ID
   */
  async getVideosByTask(taskId: string, limit: number = 50): Promise<any[]> {
    try {
      const videos = await firestoreService.query('videos' as any, (query) => 
        query.where('taskId', '==', taskId).where('status', '==', 'uploaded').limit(limit)
      );
      return videos;
    } catch (error) {
      Logger.error(`Failed to get videos for task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Delete video and its metadata
   */
  async deleteVideo(videoId: string, userId: string): Promise<boolean> {
    try {
      // Get video metadata first
      const videoDoc = await this.getVideoMetadata(videoId);
      if (!videoDoc || videoDoc.userId !== userId) {
        throw new Error('Video not found or access denied');
      }

      // Delete from Firebase Storage
      const bucket = admin.storage().bucket(this.bucketName);
      const file = bucket.file(videoDoc.fileName);
      await file.delete();

      // Delete metadata from Firestore
      await firestoreService.delete('videos' as any, videoId);

      Logger.info(`Video deleted successfully: ${videoId}`);
      return true;
    } catch (error) {
      Logger.error(`Failed to delete video ${videoId}:`, error);
      throw error;
    }
  }

  /**
   * Get storage usage statistics for a user
   */
  async getUserStorageStats(userId: string): Promise<{
    totalVideos: number;
    totalSize: number;
    averageFileSize: number;
    lastUpload: string | null;
  }> {
    try {
      const videos = await this.getVideosByUser(userId, 1000); // Get up to 1000 videos
      
      const totalVideos = videos.length;
      const totalSize = videos.reduce((sum, video) => sum + (video.metadata?.fileSize || 0), 0);
      const averageFileSize = totalVideos > 0 ? totalSize / totalVideos : 0;
      const lastUpload = videos.length > 0 ? videos.sort((a, b) => 
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      )[0].uploadedAt : null;

      return {
        totalVideos,
        totalSize,
        averageFileSize,
        lastUpload,
      };
    } catch (error) {
      Logger.error(`Failed to get storage stats for user ${userId}:`, error);
      throw error;
    }
  }
}

export const videoStorageService = VideoStorageService.getInstance();
