/**
 * Input validation and sanitization utilities for WinCloud Builder
 * Provides security-focused validation for user inputs
 */

import DOMPurify from 'dompurify';

// Input validation patterns
export const ValidationPatterns = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  password: /^.{6,}$/, // At least 6 characters
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  username: /^[a-zA-Z0-9_-]{3,20}$/,
  dropletName: /^[a-zA-Z0-9-_\.]{1,63}$/,
  ipAddress: /^(\d{1,3}\.){3}\d{1,3}$/,
  port: /^([1-9]\d{0,3}|[1-5]\d{4}|6[0-4]\d{3}|65[0-4]\d{2}|655[0-2]\d|6553[0-5])$/,
  slug: /^[a-z0-9-]+$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  phoneNumber: /^\+?[\d\s\-\(\)]{10,15}$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
};

// SQL Injection patterns to block
const sqlInjectionPatterns = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
  /('|(\\x27)|(\\x2D\\x2D)|(%27)|(%2D%2D))/i,
  /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
  /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
];

// XSS patterns to block
const xssPatterns = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<img[^>]+src[^>]+onerror[^>]*>/gi,
];

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedValue?: string;
}

export class InputValidator {
  /**
   * Validate email address
   */
  static validateEmail(email: string): ValidationResult {
    const errors: string[] = [];
    
    if (!email) {
      errors.push('Email is required');
    } else if (!ValidationPatterns.email.test(email)) {
      errors.push('Invalid email format');
    } else if (email.length > 254) {
      errors.push('Email is too long');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: email.toLowerCase().trim()
    };
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string, requireStrong = false): ValidationResult {
    const errors: string[] = [];
    
    if (!password) {
      errors.push('Password is required');
    } else if (password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    } else if (requireStrong && !ValidationPatterns.strongPassword.test(password)) {
      errors.push('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
    }
    
    // Check for common weak patterns
    if (password && password.length >= 6) {
      const commonPasswords = ['123456', 'password', 'admin', 'qwerty', '123456789'];
      if (commonPasswords.includes(password.toLowerCase())) {
        errors.push('Password is too common, please choose a stronger password');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate and sanitize text input
   */
  static validateText(text: string, options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    allowHtml?: boolean;
    pattern?: RegExp;
    patternMessage?: string;
  } = {}): ValidationResult {
    const errors: string[] = [];
    let sanitizedValue = text;

    // Required check
    if (options.required && (!text || text.trim().length === 0)) {
      errors.push('This field is required');
      return { isValid: false, errors };
    }

    if (text) {
      // Length checks
      if (options.minLength && text.length < options.minLength) {
        errors.push(`Must be at least ${options.minLength} characters long`);
      }
      if (options.maxLength && text.length > options.maxLength) {
        errors.push(`Must be no more than ${options.maxLength} characters long`);
      }

      // Pattern validation
      if (options.pattern && !options.pattern.test(text)) {
        errors.push(options.patternMessage || 'Invalid format');
      }

      // Security checks
      if (this.containsSqlInjection(text)) {
        errors.push('Input contains potentially harmful content');
      }

      if (this.containsXss(text)) {
        errors.push('Input contains potentially harmful scripts');
      }

      // Sanitization
      if (options.allowHtml) {
        sanitizedValue = DOMPurify.sanitize(text);
      } else {
        sanitizedValue = this.sanitizeText(text);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue
    };
  }

  /**
   * Validate droplet name
   */
  static validateDropletName(name: string): ValidationResult {
    return this.validateText(name, {
      required: true,
      minLength: 1,
      maxLength: 63,
      pattern: ValidationPatterns.dropletName,
      patternMessage: 'Droplet name can only contain letters, numbers, hyphens, underscores, and dots'
    });
  }

  /**
   * Validate IP address
   */
  static validateIpAddress(ip: string): ValidationResult {
    const errors: string[] = [];
    
    if (!ip) {
      errors.push('IP address is required');
    } else if (!ValidationPatterns.ipAddress.test(ip)) {
      errors.push('Invalid IP address format');
    } else {
      // Additional IP validation
      const octets = ip.split('.');
      for (const octet of octets) {
        const num = parseInt(octet, 10);
        if (num < 0 || num > 255) {
          errors.push('Invalid IP address range');
          break;
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: ip.trim()
    };
  }

  /**
   * Validate port number
   */
  static validatePort(port: string | number): ValidationResult {
    const errors: string[] = [];
    const portStr = port.toString();
    
    if (!portStr) {
      errors.push('Port is required');
    } else if (!ValidationPatterns.port.test(portStr)) {
      errors.push('Invalid port number (1-65535)');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: portStr
    };
  }

  /**
   * Check for SQL injection patterns
   */
  private static containsSqlInjection(input: string): boolean {
    return sqlInjectionPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Check for XSS patterns
   */
  private static containsXss(input: string): boolean {
    return xssPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Sanitize text by removing/escaping dangerous characters
   */
  private static sanitizeText(input: string): string {
    return input
      .trim()
      .replace(/[<>'"&]/g, (char) => {
        switch (char) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '"': return '&quot;';
          case "'": return '&#x27;';
          case '&': return '&amp;';
          default: return char;
        }
      });
  }
}

/**
 * React hook for form validation
 */
export const useFormValidation = () => {
  const validateField = (fieldName: string, value: any, rules: any = {}): ValidationResult => {
    switch (fieldName) {
      case 'email':
        return InputValidator.validateEmail(value);
      case 'password':
        return InputValidator.validatePassword(value, rules.requireStrong);
      case 'confirmPassword':
        if (value !== rules.originalPassword) {
          return { isValid: false, errors: ['Passwords do not match'] };
        }
        return { isValid: true, errors: [] };
      case 'dropletName':
        return InputValidator.validateDropletName(value);
      case 'ipAddress':
        return InputValidator.validateIpAddress(value);
      case 'port':
        return InputValidator.validatePort(value);
      default:
        return InputValidator.validateText(value, rules);
    }
  };

  const validateForm = (formData: Record<string, any>, validationRules: Record<string, any>): {
    isValid: boolean;
    errors: Record<string, string[]>;
    sanitizedData: Record<string, any>;
  } => {
    const errors: Record<string, string[]> = {};
    const sanitizedData: Record<string, any> = {};
    
    Object.keys(validationRules).forEach(fieldName => {
      const value = formData[fieldName];
      const rules = validationRules[fieldName];
      const result = validateField(fieldName, value, rules);
      
      if (!result.isValid) {
        errors[fieldName] = result.errors;
      }
      
      if (result.sanitizedValue !== undefined) {
        sanitizedData[fieldName] = result.sanitizedValue;
      } else {
        sanitizedData[fieldName] = value;
      }
    });
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      sanitizedData
    };
  };

  return {
    validateField,
    validateForm,
    ValidationPatterns,
    InputValidator
  };
};

/**
 * Security utilities for API calls
 */
export class SecurityUtils {
  /**
   * Generate CSRF token
   */
  static generateCsrfToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * Validate CSRF token format
   */
  static isValidCsrfToken(token: string): boolean {
    return /^[a-z0-9]{10,}$/.test(token);
  }

  /**
   * Sanitize API parameters
   */
  static sanitizeApiParams(params: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    Object.keys(params).forEach(key => {
      const value = params[key];
      
      if (typeof value === 'string') {
        sanitized[key] = InputValidator.validateText(value, {}).sanitizedValue || value;
      } else if (typeof value === 'number') {
        sanitized[key] = value;
      } else if (typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'string' 
            ? InputValidator.validateText(item, {}).sanitizedValue || item
            : item
        );
      } else {
        sanitized[key] = value;
      }
    });
    
    return sanitized;
  }

  /**
   * Check if request is potentially malicious
   */
  static isSuspiciousRequest(data: any): boolean {
    const dataStr = JSON.stringify(data);
    
    // Check for common attack patterns
    const suspiciousPatterns = [
      /\.\.\//g, // Directory traversal
      /\bexec\b/gi,
      /\beval\b/gi,
      /\bSystem\./gi,
      /\bRuntime\./gi,
      /\bProcess\./gi,
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(dataStr));
  }
}
