"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeInput = exports.validateOptional = exports.validateRequired = exports.validateString = exports.validateUserUpdate = exports.validatePasswordResetConfirm = exports.validatePasswordReset = exports.validateSocialAuth = exports.validateRegistration = exports.validateLogin = exports.validateName = exports.validatePassword = exports.validateEmail = exports.handleValidationErrors = void 0;
const express_validator_1 = require("express-validator");
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        const validationErrors = errors.array().map(error => ({
            field: error.type === 'field' ? error.path : 'unknown',
            message: error.msg,
            value: error.type === 'field' ? error.value : undefined,
        }));
        const response = {
            success: false,
            message: 'Validation failed',
            data: validationErrors,
            timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
    }
    next();
};
exports.handleValidationErrors = handleValidationErrors;
const validateEmail = () => {
    return (0, express_validator_1.body)('email')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail()
        .isLength({ min: 5, max: 255 })
        .withMessage('Email must be between 5 and 255 characters');
};
exports.validateEmail = validateEmail;
const validatePassword = () => {
    return (0, express_validator_1.body)('password')
        .isLength({ min: 6, max: 128 })
        .withMessage('Password must be between 6 and 128 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number');
};
exports.validatePassword = validatePassword;
const validateName = () => {
    return (0, express_validator_1.body)('name')
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s'-]+$/)
        .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes')
        .trim();
};
exports.validateName = validateName;
const validateLogin = () => {
    return [
        (0, exports.validateEmail)(),
        (0, express_validator_1.body)('password')
            .notEmpty()
            .withMessage('Password is required')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters'),
    ];
};
exports.validateLogin = validateLogin;
const validateRegistration = () => {
    return [
        (0, exports.validateEmail)(),
        (0, exports.validatePassword)(),
        (0, exports.validateName)(),
    ];
};
exports.validateRegistration = validateRegistration;
const validateSocialAuth = () => {
    return [
        (0, express_validator_1.body)('idToken')
            .notEmpty()
            .withMessage('ID token is required')
            .isString()
            .withMessage('ID token must be a string'),
        (0, express_validator_1.body)('provider')
            .isIn(['email', 'google', 'twitter', 'facebook'])
            .withMessage('Provider must be one of: email, google, twitter, facebook'),
    ];
};
exports.validateSocialAuth = validateSocialAuth;
const validatePasswordReset = () => {
    return (0, express_validator_1.body)('email')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail();
};
exports.validatePasswordReset = validatePasswordReset;
const validatePasswordResetConfirm = () => {
    return [
        (0, express_validator_1.body)('oobCode')
            .notEmpty()
            .withMessage('Reset code is required')
            .isString()
            .withMessage('Reset code must be a string'),
        (0, exports.validatePassword)(),
    ];
};
exports.validatePasswordResetConfirm = validatePasswordResetConfirm;
const validateUserUpdate = () => {
    return [
        (0, express_validator_1.body)('name')
            .optional()
            .isLength({ min: 2, max: 100 })
            .withMessage('Name must be between 2 and 100 characters')
            .matches(/^[a-zA-Z\s'-]+$/)
            .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes')
            .trim(),
        (0, express_validator_1.body)('photo')
            .optional()
            .isURL()
            .withMessage('Photo must be a valid URL')
            .isLength({ max: 500 })
            .withMessage('Photo URL must be less than 500 characters'),
    ];
};
exports.validateUserUpdate = validateUserUpdate;
const validateString = (field, minLength = 1, maxLength = 255) => {
    return (0, express_validator_1.body)(field)
        .isString()
        .withMessage(`${field} must be a string`)
        .isLength({ min: minLength, max: maxLength })
        .withMessage(`${field} must be between ${minLength} and ${maxLength} characters`)
        .trim();
};
exports.validateString = validateString;
const validateRequired = (field) => {
    return (0, express_validator_1.body)(field)
        .notEmpty()
        .withMessage(`${field} is required`);
};
exports.validateRequired = validateRequired;
const validateOptional = (field, type = 'string') => {
    const chain = (0, express_validator_1.body)(field).optional();
    switch (type) {
        case 'email':
            return chain.isEmail().withMessage(`${field} must be a valid email address`);
        case 'url':
            return chain.isURL().withMessage(`${field} must be a valid URL`);
        default:
            return chain.isString().withMessage(`${field} must be a string`);
    }
};
exports.validateOptional = validateOptional;
const sanitizeInput = (req, res, next) => {
    const sanitizeString = (str) => {
        return str
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<[^>]*>/g, '')
            .trim();
    };
    if (req.body) {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                req.body[key] = sanitizeString(req.body[key]);
            }
        });
    }
    if (req.query) {
        Object.keys(req.query).forEach(key => {
            if (typeof req.query[key] === 'string') {
                req.query[key] = sanitizeString(req.query[key]);
            }
        });
    }
    next();
};
exports.sanitizeInput = sanitizeInput;
//# sourceMappingURL=validation.js.map