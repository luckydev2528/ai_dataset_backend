import { Logger } from '../../utils/logger';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

import ffmpegStatic from 'ffmpeg-static';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';

export interface VideoProcessingOptions {
  inputPath: string;
  outputPath: string;
  quality: 'low' | 'medium' | 'high';
  resolution: '720p' | '1080p' | '4k';
  frameRate: number;
  maxFileSize: number; // in bytes
}

export interface VideoProcessingResult {
  success: boolean;
  outputPath?: string;
  outputBuffer?: Buffer;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  duration: number;
  resolution: {
    width: number;
    height: number;
  };
  bitrate: number;
  error?: string;
}

export class VideoProcessingService {
  private static instance: VideoProcessingService;
  private tempDir: string;
  private readonly ffmpegCmd: string;
  private readonly ffprobeCmd: string;

  private constructor() {
    this.tempDir = path.join(os.tmpdir(), 'drr-video-processing');
    this.ensureTempDir();
    // Resolve binary paths: env overrides > vendored > system PATH
    const envFfmpeg = process.env.FFMPEG_PATH;
    const envFfprobe = process.env.FFPROBE_PATH;
    this.ffmpegCmd = envFfmpeg && envFfmpeg.trim().length > 0
      ? envFfmpeg
      : (typeof ffmpegStatic === 'string' && ffmpegStatic.length > 0 ? ffmpegStatic : 'ffmpeg');
    this.ffprobeCmd = envFfprobe && envFfprobe.trim().length > 0
      ? envFfprobe
      : ((ffprobeInstaller as any)?.path ? (ffprobeInstaller as any).path : 'ffprobe');
  }

  public static getInstance(): VideoProcessingService {
    if (!VideoProcessingService.instance) {
      VideoProcessingService.instance = new VideoProcessingService();
    }
    return VideoProcessingService.instance;
  }

  private async ensureTempDir(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      Logger.error('Failed to create temp directory:', error);
    }
  }

  /**
   * Process and compress video
   */
  async processVideo(
    videoBuffer: Buffer,
    options: Partial<VideoProcessingOptions> = {}
  ): Promise<VideoProcessingResult> {
    const tempInputPath = path.join(this.tempDir, `input_${Date.now()}.mp4`);
    const tempOutputPath = path.join(this.tempDir, `output_${Date.now()}.mp4`);

    try {
      // Write input buffer to temporary file
      await fs.writeFile(tempInputPath, videoBuffer);

      // Get video metadata first
      const metadata = await this.getVideoMetadata(tempInputPath);
      
      // Set default options
      const processingOptions: VideoProcessingOptions = {
        inputPath: tempInputPath,
        outputPath: tempOutputPath,
        quality: options.quality || 'medium',
        resolution: options.resolution || '720p',
        frameRate: options.frameRate || 30,
        maxFileSize: options.maxFileSize || 50 * 1024 * 1024, // 50MB default
        ...options
      };

      // Check if compression is needed (allow override via env)
      const originalSize = videoBuffer.length;
      const forceCompression = (process.env.FORCE_VIDEO_COMPRESSION || '').toLowerCase() === 'true';
      const needsCompression = forceCompression || (originalSize > processingOptions.maxFileSize);

      if (!needsCompression) {
        Logger.info('Video does not need compression');
        const passthroughBuffer = await fs.readFile(tempInputPath);
        return {
          success: true,
          outputBuffer: passthroughBuffer,
          originalSize,
          compressedSize: originalSize,
          compressionRatio: 1.0,
          duration: metadata.duration,
          resolution: metadata.resolution,
          bitrate: metadata.bitrate
        };
      }

      // Compress video using FFmpeg
      const result = await this.compressVideo(processingOptions);
      
      if (result.success) {
        // Read compressed video as buffer for safe return
        const compressedBuffer = await fs.readFile(tempOutputPath);
        return {
          success: true,
          outputBuffer: compressedBuffer,
          originalSize,
          compressedSize: compressedBuffer.length,
          compressionRatio: compressedBuffer.length / originalSize,
          duration: result.duration || metadata.duration,
          resolution: result.resolution || metadata.resolution,
          bitrate: result.bitrate || metadata.bitrate
        };
      } else {
        throw new Error(result.error || 'Video compression failed');
      }

    } catch (error) {
      Logger.error('Video processing error:', error);
      return {
        success: false,
        originalSize: videoBuffer.length,
        compressedSize: 0,
        compressionRatio: 0,
        duration: 0,
        resolution: { width: 0, height: 0 },
        bitrate: 0,
        error: error instanceof Error ? error.message : 'Unknown processing error'
      };
    } finally {
      // Clean up temporary files
      await this.cleanupTempFiles([tempInputPath, tempOutputPath]);
    }
  }

  /**
   * Get video metadata using FFprobe
   */
  private async getVideoMetadata(filePath: string): Promise<{
    duration: number;
    resolution: { width: number; height: number };
    bitrate: number;
  }> {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn(this.ffprobeCmd, [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath
      ]);

      let output = '';
      let error = '';

      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.stderr.on('data', (data) => {
        error += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code !== 0) {
          Logger.warning('FFprobe not available, using fallback metadata');
          resolve({
            duration: 30, // Default duration
            resolution: { width: 1280, height: 720 },
            bitrate: 1000000 // 1Mbps default
          });
          return;
        }

        try {
          const metadata = JSON.parse(output);
          const videoStream = metadata.streams.find((stream: any) => stream.codec_type === 'video');
          const format = metadata.format;

          resolve({
            duration: parseFloat(format.duration) || 30,
            resolution: {
              width: parseInt(videoStream?.width) || 1280,
              height: parseInt(videoStream?.height) || 720
            },
            bitrate: parseInt(format.bit_rate) || 1000000
          });
        } catch (parseError) {
          Logger.warning('Failed to parse FFprobe output, using fallback metadata');
          resolve({
            duration: 30,
            resolution: { width: 1280, height: 720 },
            bitrate: 1000000
          });
        }
      });

      // Handle spawn errors (e.g., ENOENT when ffprobe is not installed)
      ffprobe.on('error', (err) => {
        Logger.warning('FFprobe not available (spawn error), using fallback metadata');
        resolve({
          duration: 30,
          resolution: { width: 1280, height: 720 },
          bitrate: 1000000
        });
      });
    });
  }

  /**
   * Compress video using FFmpeg
   */
  private async compressVideo(options: VideoProcessingOptions): Promise<{
    success: boolean;
    duration?: number;
    resolution?: { width: number; height: number };
    bitrate?: number;
    error?: string;
  }> {
    return new Promise((resolve) => {
      const resolutionMap = {
        '720p': '1280x720',
        '1080p': '1920x1080',
        '4k': '3840x2160'
      };

      const qualityMap = {
        'low': '23',
        'medium': '20',
        'high': '18'
      };

      const targetResolution = resolutionMap[options.resolution];
      const crf = qualityMap[options.quality];

      const ffmpegArgs = [
        '-i', options.inputPath,
        '-c:v', 'libx264',
        '-crf', crf,
        '-preset', 'medium',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-r', options.frameRate.toString(),
        '-s', targetResolution,
        '-movflags', '+faststart',
        '-y', // Overwrite output file
        options.outputPath
      ];

      const ffmpeg = spawn(this.ffmpegCmd, ffmpegArgs);

      let errorOutput = '';

      ffmpeg.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          Logger.warning('FFmpeg not available or failed, using original video');
          resolve({ 
            success: false, 
            error: 'FFmpeg not available or compression failed' 
          });
        }
      });

      ffmpeg.on('error', (error) => {
        Logger.warning('FFmpeg not available:', error.message);
        resolve({ 
          success: false, 
          error: 'FFmpeg not available' 
        });
      });
    });
  }

  /**
   * Generate thumbnail from video
   */
  async generateThumbnail(
    videoPath: string,
    outputPath: string,
    timeOffset: number = 5
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const ffmpeg = spawn(this.ffmpegCmd, [
        '-i', videoPath,
        '-ss', timeOffset.toString(),
        '-vframes', '1',
        '-q:v', '2',
        '-y',
        outputPath
      ]);

      ffmpeg.on('close', (code) => {
        resolve(code === 0);
      });

      ffmpeg.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Generate a thumbnail image from a video buffer and return it as Buffer
   */
  async generateThumbnailFromBuffer(
    videoBuffer: Buffer,
    timeOffset: number = 5
  ): Promise<Buffer | null> {
    const tempInputPath = path.join(this.tempDir, `thumb_input_${Date.now()}.mp4`);
    const tempThumbPath = path.join(this.tempDir, `thumb_output_${Date.now()}.jpg`);
    try {
      await fs.writeFile(tempInputPath, videoBuffer);

      const ok = await this.generateThumbnail(tempInputPath, tempThumbPath, timeOffset);
      if (!ok) return null;

      const thumbBuffer = await fs.readFile(tempThumbPath);
      return thumbBuffer;
    } catch (error) {
      Logger.warning('Thumbnail generation from buffer failed');
      return null;
    } finally {
      await this.cleanupTempFiles([tempInputPath, tempThumbPath]);
    }
  }

  /**
   * Clean up temporary files
   */
  private async cleanupTempFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        // Ignore errors when cleaning up
      }
    }
  }

  /**
   * Get optimal compression settings based on file size
   */
  getOptimalCompressionSettings(fileSize: number): {
    quality: 'low' | 'medium' | 'high';
    resolution: '720p' | '1080p' | '4k';
    maxFileSize: number;
  } {
    const sizeInMB = fileSize / (1024 * 1024);

    if (sizeInMB > 80) {
      return {
        quality: 'low',
        resolution: '720p',
        maxFileSize: 20 * 1024 * 1024 // 20MB
      };
    } else if (sizeInMB > 40) {
      return {
        quality: 'medium',
        resolution: '720p',
        maxFileSize: 30 * 1024 * 1024 // 30MB
      };
    } else {
      return {
        quality: 'high',
        resolution: '1080p',
        maxFileSize: 50 * 1024 * 1024 // 50MB
      };
    }
  }

  /**
   * Check if FFmpeg is available
   */
  async isFFmpegAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const ffmpeg = spawn(this.ffmpegCmd, ['-version']);
      
      ffmpeg.on('close', (code) => {
        resolve(code === 0);
      });

      ffmpeg.on('error', () => {
        resolve(false);
      });
    });
  }
}

export const videoProcessingService = VideoProcessingService.getInstance();
