/**
 * Standardized logging utility to eliminate duplicate console patterns
 */

export enum LogLevel {
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  INFO = 'info'
}

export class Logger {
  private static formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const emoji = this.getEmoji(level);
    const prefix = this.getPrefix(level);
    
    let formattedMessage = `${emoji} ${prefix}: ${message}`;
    
    if (data) {
      formattedMessage += ` ${JSON.stringify(data)}`;
    }
    
    return formattedMessage;
  }

  private static getEmoji(level: LogLevel): string {
    switch (level) {
      case LogLevel.SUCCESS:
        return '✅';
      case LogLevel.WARNING:
        return '⚠️';
      case LogLevel.ERROR:
        return '❌';
      case LogLevel.INFO:
        return 'ℹ️';
      default:
        return '📝';
    }
  }

  private static getPrefix(level: LogLevel): string {
    switch (level) {
      case LogLevel.SUCCESS:
        return 'SUCCESS';
      case LogLevel.WARNING:
        return 'WARNING';
      case LogLevel.ERROR:
        return 'ERROR';
      case LogLevel.INFO:
        return 'INFO';
      default:
        return 'LOG';
    }
  }

  static success(message: string, data?: any): void {
    console.log(this.formatMessage(LogLevel.SUCCESS, message, data));
  }

  static warning(message: string, data?: any): void {
    console.warn(this.formatMessage(LogLevel.WARNING, message, data));
  }

  static error(message: string, data?: any): void {
    console.error(this.formatMessage(LogLevel.ERROR, message, data));
  }

  static info(message: string, data?: any): void {
    console.log(this.formatMessage(LogLevel.INFO, message, data));
  }

  // Convenience methods for common patterns
  static authSuccess(message: string, data?: any): void {
    this.success(`AUTH: ${message}`, data);
  }

  static authError(message: string, data?: any): void {
    this.error(`AUTH: ${message}`, data);
  }

  static dbSuccess(message: string, data?: any): void {
    this.success(`DB: ${message}`, data);
  }

  static dbError(message: string, data?: any): void {
    this.error(`DB: ${message}`, data);
  }

  static dbWarning(message: string, data?: any): void {
    this.warning(`DB: ${message}`, data);
  }

  static firebaseSuccess(message: string, data?: any): void {
    this.success(`FIREBASE: ${message}`, data);
  }

  static firebaseError(message: string, data?: any): void {
    this.error(`FIREBASE: ${message}`, data);
  }

  static firebaseWarning(message: string, data?: any): void {
    this.warning(`FIREBASE: ${message}`, data);
  }
}