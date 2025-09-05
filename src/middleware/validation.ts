import { Request, Response, NextFunction } from 'express';
import { body, validationResult, ValidationChain } from 'express-validator';
import { ApiResponse, ValidationError } from '../types';

/**
 * Validation Error Handler
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const validationErrors: ValidationError[] = errors.array().map(error => ({
      field: error.type === 'field' ? (error as any).path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? (error as any).value : undefined,
    }));

    const response: ApiResponse = {
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

/**
 * Email validation rules
 */
export const validateEmail = (): ValidationChain => {
  return body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ min: 5, max: 255 })
    .withMessage('Email must be between 5 and 255 characters');
};

/**
 * Password validation rules
 */
export const validatePassword = (): ValidationChain => {
  return body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number');
};

/**
 * Name validation rules
 */
export const validateName = (): ValidationChain => {
  return body('name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes')
    .trim();
};

/**
 * Login validation rules
 */
export const validateLogin = (): ValidationChain[] => {
  return [
    validateEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ];
};

/**
 * Registration validation rules
 */
export const validateRegistration = (): ValidationChain[] => {
  return [
    validateEmail(),
    validatePassword(),
    validateName(),
  ];
};

/**
 * Social auth validation rules
 */
export const validateSocialAuth = (): ValidationChain[] => {
  return [
    body('idToken')
      .notEmpty()
      .withMessage('ID token is required')
      .isString()
      .withMessage('ID token must be a string'),
    body('provider')
      .isIn(['email', 'google', 'twitter', 'facebook'])
      .withMessage('Provider must be one of: email, google, twitter, facebook'),
  ];
};

/**
 * Password reset validation rules
 */
export const validatePasswordReset = (): ValidationChain => {
  return body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail();
};

/**
 * Password reset confirm validation rules
 */
export const validatePasswordResetConfirm = (): ValidationChain[] => {
  return [
    body('oobCode')
      .notEmpty()
      .withMessage('Reset code is required')
      .isString()
      .withMessage('Reset code must be a string'),
    validatePassword(),
  ];
};

/**
 * User update validation rules
 */
export const validateUserUpdate = (): ValidationChain[] => {
  return [
    body('name')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters')
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes')
      .trim(),
    body('photo')
      .optional()
      .isURL()
      .withMessage('Photo must be a valid URL')
      .isLength({ max: 500 })
      .withMessage('Photo URL must be less than 500 characters'),
  ];
};

/**
 * Generic string validation
 */
export const validateString = (field: string, minLength: number = 1, maxLength: number = 255): ValidationChain => {
  return body(field)
    .isString()
    .withMessage(`${field} must be a string`)
    .isLength({ min: minLength, max: maxLength })
    .withMessage(`${field} must be between ${minLength} and ${maxLength} characters`)
    .trim();
};

/**
 * Generic required field validation
 */
export const validateRequired = (field: string): ValidationChain => {
  return body(field)
    .notEmpty()
    .withMessage(`${field} is required`);
};

/**
 * Generic optional field validation
 */
export const validateOptional = (field: string, type: 'string' | 'email' | 'url' = 'string'): ValidationChain => {
  const chain = body(field).optional();
  
  switch (type) {
    case 'email':
      return chain.isEmail().withMessage(`${field} must be a valid email address`);
    case 'url':
      return chain.isURL().withMessage(`${field} must be a valid URL`);
    default:
      return chain.isString().withMessage(`${field} must be a string`);
  }
};

/**
 * Sanitize input data
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  // Remove any potential XSS attempts
  const sanitizeString = (str: string): string => {
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  };

  // Sanitize string fields in body
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeString(req.body[key]);
      }
    });
  }

  // Sanitize string fields in query
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeString(req.query[key] as string);
      }
    });
  }

  next();
};
