/**
 * ValidationUtils - Centralized validation utilities
 * Eliminates duplicate validation patterns across the application
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export class ValidationUtils {
  /**
   * Validate required fields
   */
  static validateRequiredFields(
    data: any,
    requiredFields: string[]
  ): ValidationResult {
    const errors: string[] = [];
    
    requiredFields.forEach(field => {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        errors.push(`Field '${field}' is required`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): ValidationResult {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);
    
    return {
      isValid,
      errors: isValid ? [] : ['Invalid email format'],
    };
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      warnings.push('Password should contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      warnings.push('Password should contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      warnings.push('Password should contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      warnings.push('Password should contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    } as ValidationResult;
  }

  /**
   * Validate phone number format
   */
  static validatePhoneNumber(phone: string): ValidationResult {
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    const isValid = phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
    
    return {
      isValid,
      errors: isValid ? [] : ['Invalid phone number format'],
    };
  }

  /**
   * Validate URL format
   */
  static validateUrl(url: string): ValidationResult {
    try {
      new URL(url);
      return {
        isValid: true,
        errors: [],
      };
    } catch {
      return {
        isValid: false,
        errors: ['Invalid URL format'],
      };
    }
  }

  /**
   * Validate date format and range
   */
  static validateDate(
    date: string | Date,
    minDate?: Date,
    maxDate?: Date
  ): ValidationResult {
    const errors: string[] = [];
    
    let parsedDate: Date;
    
    if (typeof date === 'string') {
      parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        errors.push('Invalid date format');
        return { isValid: false, errors };
      }
    } else {
      parsedDate = date;
    }
    
    if (minDate && parsedDate < minDate) {
      errors.push(`Date must be after ${minDate.toISOString()}`);
    }
    
    if (maxDate && parsedDate > maxDate) {
      errors.push(`Date must be before ${maxDate.toISOString()}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate numeric range
   */
  static validateNumericRange(
    value: number,
    min?: number,
    max?: number
  ): ValidationResult {
    const errors: string[] = [];
    
    if (min !== undefined && value < min) {
      errors.push(`Value must be at least ${min}`);
    }
    
    if (max !== undefined && value > max) {
      errors.push(`Value must be at most ${max}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate string length
   */
  static validateStringLength(
    value: string,
    minLength?: number,
    maxLength?: number
  ): ValidationResult {
    const errors: string[] = [];
    
    if (minLength !== undefined && value.length < minLength) {
      errors.push(`String must be at least ${minLength} characters long`);
    }
    
    if (maxLength !== undefined && value.length > maxLength) {
      errors.push(`String must be at most ${maxLength} characters long`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate enum value
   */
  static validateEnum<T>(
    value: any,
    enumValues: T[]
  ): ValidationResult {
    const isValid = enumValues.includes(value);
    
    return {
      isValid,
      errors: isValid ? [] : [`Value must be one of: ${enumValues.join(', ')}`],
    };
  }

  /**
   * Validate array length
   */
  static validateArrayLength(
    array: any[],
    minLength?: number,
    maxLength?: number
  ): ValidationResult {
    const errors: string[] = [];
    
    if (minLength !== undefined && array.length < minLength) {
      errors.push(`Array must have at least ${minLength} items`);
    }
    
    if (maxLength !== undefined && array.length > maxLength) {
      errors.push(`Array must have at most ${maxLength} items`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate object structure
   */
  static validateObjectStructure(
    obj: any,
    requiredKeys: string[]
  ): ValidationResult {
    const errors: string[] = [];
    
    requiredKeys.forEach(key => {
      if (!(key in obj)) {
        errors.push(`Object must contain key '${key}'`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Combine multiple validation results
   */
  static combineValidationResults(
    ...results: ValidationResult[]
  ): ValidationResult {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    
    results.forEach(result => {
      allErrors.push(...result.errors);
      if (result.warnings) {
        allWarnings.push(...result.warnings);
      }
    });
    
    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings.length > 0 ? allWarnings : undefined,
    } as ValidationResult;
  }

  /**
   * Validate task data
   */
  static validateTaskData(data: any): ValidationResult {
    const results = [
      this.validateRequiredFields(data, [
        'title',
        'description',
        'bountyPoints',
        'expiryDate',
        'category',
        'difficulty',
      ]),
      this.validateStringLength(data.title, 1, 200),
      this.validateStringLength(data.description, 1, 1000),
      this.validateNumericRange(data.bountyPoints, 1, 10000),
      this.validateDate(data.expiryDate, new Date()),
      this.validateEnum(data.difficulty, ['easy', 'medium', 'hard']),
    ];
    
    return this.combineValidationResults(...results);
  }

  /**
   * Validate challenge data
   */
  static validateChallengeData(data: any): ValidationResult {
    const results = [
      this.validateRequiredFields(data, [
        'text',
        'category',
        'difficulty',
      ]),
      this.validateStringLength(data.text, 1, 500),
      this.validateEnum(data.difficulty, ['easy', 'medium', 'hard']),
    ];
    
    return this.combineValidationResults(...results);
  }

  /**
   * Validate user data
   */
  static validateUserData(data: any): ValidationResult {
    const results = [
      this.validateRequiredFields(data, ['email', 'displayName']),
      this.validateEmail(data.email),
      this.validateStringLength(data.displayName, 1, 100),
    ];
    
    if (data.password) {
      results.push(this.validatePassword(data.password));
    }
    
    return this.combineValidationResults(...results);
  }
}
