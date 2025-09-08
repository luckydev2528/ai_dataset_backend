"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.LogLevel = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel["SUCCESS"] = "success";
    LogLevel["WARNING"] = "warning";
    LogLevel["ERROR"] = "error";
    LogLevel["INFO"] = "info";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    static formatMessage(level, message, data) {
        const timestamp = new Date().toISOString();
        const emoji = this.getEmoji(level);
        const prefix = this.getPrefix(level);
        let formattedMessage = `${emoji} ${prefix}: ${message}`;
        if (data) {
            formattedMessage += ` ${JSON.stringify(data)}`;
        }
        return formattedMessage;
    }
    static getEmoji(level) {
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
    static getPrefix(level) {
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
    static success(message, data) {
        console.log(this.formatMessage(LogLevel.SUCCESS, message, data));
    }
    static warning(message, data) {
        console.warn(this.formatMessage(LogLevel.WARNING, message, data));
    }
    static error(message, data) {
        console.error(this.formatMessage(LogLevel.ERROR, message, data));
    }
    static info(message, data) {
        console.log(this.formatMessage(LogLevel.INFO, message, data));
    }
    static authSuccess(message, data) {
        this.success(`AUTH: ${message}`, data);
    }
    static authError(message, data) {
        this.error(`AUTH: ${message}`, data);
    }
    static dbSuccess(message, data) {
        this.success(`DB: ${message}`, data);
    }
    static dbError(message, data) {
        this.error(`DB: ${message}`, data);
    }
    static dbWarning(message, data) {
        this.warning(`DB: ${message}`, data);
    }
    static firebaseSuccess(message, data) {
        this.success(`FIREBASE: ${message}`, data);
    }
    static firebaseError(message, data) {
        this.error(`FIREBASE: ${message}`, data);
    }
    static firebaseWarning(message, data) {
        this.warning(`FIREBASE: ${message}`, data);
    }
}
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map