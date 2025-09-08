export declare enum LogLevel {
    SUCCESS = "success",
    WARNING = "warning",
    ERROR = "error",
    INFO = "info"
}
export declare class Logger {
    private static formatMessage;
    private static getEmoji;
    private static getPrefix;
    static success(message: string, data?: any): void;
    static warning(message: string, data?: any): void;
    static error(message: string, data?: any): void;
    static info(message: string, data?: any): void;
    static authSuccess(message: string, data?: any): void;
    static authError(message: string, data?: any): void;
    static dbSuccess(message: string, data?: any): void;
    static dbError(message: string, data?: any): void;
    static dbWarning(message: string, data?: any): void;
    static firebaseSuccess(message: string, data?: any): void;
    static firebaseError(message: string, data?: any): void;
    static firebaseWarning(message: string, data?: any): void;
}
//# sourceMappingURL=logger.d.ts.map