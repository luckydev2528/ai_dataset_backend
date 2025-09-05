"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendAccepted = exports.sendNoContent = exports.sendCreated = exports.sendPaginated = exports.sendRateLimit = exports.sendConflict = exports.sendForbidden = exports.sendUnauthorized = exports.sendNotFound = exports.sendValidationError = exports.sendError = exports.sendSuccess = void 0;
const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
    const response = {
        success: true,
        message,
        data,
        timestamp: new Date().toISOString(),
    };
    res.status(statusCode).json(response);
};
exports.sendSuccess = sendSuccess;
const sendError = (res, message = 'Error', statusCode = 500, error) => {
    const response = {
        success: false,
        message,
        error,
        timestamp: new Date().toISOString(),
    };
    res.status(statusCode).json(response);
};
exports.sendError = sendError;
const sendValidationError = (res, errors, message = 'Validation failed') => {
    const response = {
        success: false,
        message,
        data: errors,
        timestamp: new Date().toISOString(),
    };
    res.status(400).json(response);
};
exports.sendValidationError = sendValidationError;
const sendNotFound = (res, message = 'Resource not found') => {
    const response = {
        success: false,
        message,
        timestamp: new Date().toISOString(),
    };
    res.status(404).json(response);
};
exports.sendNotFound = sendNotFound;
const sendUnauthorized = (res, message = 'Unauthorized') => {
    const response = {
        success: false,
        message,
        timestamp: new Date().toISOString(),
    };
    res.status(401).json(response);
};
exports.sendUnauthorized = sendUnauthorized;
const sendForbidden = (res, message = 'Forbidden') => {
    const response = {
        success: false,
        message,
        timestamp: new Date().toISOString(),
    };
    res.status(403).json(response);
};
exports.sendForbidden = sendForbidden;
const sendConflict = (res, message = 'Conflict') => {
    const response = {
        success: false,
        message,
        timestamp: new Date().toISOString(),
    };
    res.status(409).json(response);
};
exports.sendConflict = sendConflict;
const sendRateLimit = (res, message = 'Too many requests') => {
    const response = {
        success: false,
        message,
        timestamp: new Date().toISOString(),
    };
    res.status(429).json(response);
};
exports.sendRateLimit = sendRateLimit;
const sendPaginated = (res, data, total, page, limit, message = 'Data retrieved successfully') => {
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    const response = {
        success: true,
        message,
        data: {
            items: data,
            pagination: {
                total,
                page,
                limit,
                totalPages,
                hasNextPage,
                hasPrevPage,
            },
        },
        timestamp: new Date().toISOString(),
    };
    res.json(response);
};
exports.sendPaginated = sendPaginated;
const sendCreated = (res, data = null, message = 'Resource created successfully') => {
    (0, exports.sendSuccess)(res, data, message, 201);
};
exports.sendCreated = sendCreated;
const sendNoContent = (res) => {
    res.status(204).send();
};
exports.sendNoContent = sendNoContent;
const sendAccepted = (res, data = null, message = 'Request accepted') => {
    (0, exports.sendSuccess)(res, data, message, 202);
};
exports.sendAccepted = sendAccepted;
//# sourceMappingURL=response.js.map