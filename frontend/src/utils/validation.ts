'use client';

import { useCallback, useState, useMemo } from 'react';

// Common validation rules
export const ValidationRules = {
  required: (value: any, fieldName: string) => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return `${fieldName} is required`;
    }
    return null;
  },

  email: (value: string) => {
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  },

  domain: (value: string) => {
    if (value && !/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(value)) {
      return 'Domain can only contain lowercase letters, numbers, and hyphens';
    }
    return null;
  },

  phone: (value: string) => {
    if (value && !/^[\d\s\+\-\(\)]+$/.test(value)) {
      return 'Please enter a valid phone number';
    }
    return null;
  },

  url: (value: string) => {
    if (value) {
      try {
        new URL(value);
      } catch {
        return 'Please enter a valid URL';
      }
    }
    return null;
  },

  minLength: (value: string, min: number) => {
    if (value && value.length < min) {
      return `Must be at least ${min} characters long`;
    }
    return null;
  },

  maxLength: (value: string, max: number) => {
    if (value && value.length > max) {
      return `Must be no more than ${max} characters long`;
    }
    return null;
  },

  fileSize: (file: File, maxSizeBytes: number) => {
    if (file && file.size > maxSizeBytes) {
      const maxSizeMB = Math.round(maxSizeBytes / (1024 * 1024));
      return `File size must be less than ${maxSizeMB}MB`;
    }
    return null;
  },

  fileType: (file: File, allowedTypes: string[]) => {
    if (file && allowedTypes.length > 0) {
      const isTypeAllowed = allowedTypes.some(type => {
        if (type.startsWith('.')) {
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        } else {
          return file.type.match(type);
        }
      });

      if (!isTypeAllowed) {
        return `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`;
      }
    }
    return null;
  },
};

// Validation schema type
export interface ValidationRule<T = any> {
  rule: (value: T, ...args: any[]) => string | null;
  args?: any[];
  message?: string;
}

export interface ValidationSchema<T extends Record<string, any>> {
  [K in keyof T]?: ValidationRule<T[K]>[];
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Generic form validation hook
export interface UseFormValidationOptions<T> {
  schema: ValidationSchema<T>;
  debounceMs?: number;
  validateOnChange?: boolean;
}

export interface UseFormValidationReturn<T> {
  data: T;
  errors: Record<string, string>;
  isValid: boolean;
  isDirty: boolean;
  setData: React.Dispatch<React.SetStateAction<T>>;
  setFieldValue: (field: keyof T, value: T[keyof T]) => void;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  validate: (fieldName?: keyof T) => boolean;
  validateField: (fieldName: keyof T, value: T[keyof T]) => string | null;
  reset: () => void;
  clearErrors: () => void;
}

export function useFormValidation<T extends Record<string, any>>(
  initialData: T,
  options: UseFormValidationOptions<T>
): UseFormValidationReturn<T> {
  const { schema, debounceMs = 300, validateOnChange = true } = options;

  const [data, setData] = useState<T>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);

  const validateField = useCallback((fieldName: keyof T, value: T[keyof T]): string | null => {
    const fieldRules = schema[fieldName];
    if (!fieldRules) return null;

    for (const { rule, args = [], message } of fieldRules) {
      const error = rule(value, ...args);
      if (error) {
        return message || error;
      }
    }
    return null;
  }, [schema]);

  const validate = useCallback((fieldName?: keyof T): boolean => {
    if (fieldName) {
      // Validate single field
      const error = validateField(fieldName, data[fieldName]);
      setErrors(prev => ({
        ...prev,
        [fieldName]: error || '',
      }));
      return !error;
    } else {
      // Validate all fields
      const newErrors: Record<string, string> = {};
      let hasErrors = false;

      for (const field in schema) {
        const error = validateField(field, data[field]);
        if (error) {
          newErrors[field] = error;
          hasErrors = true;
        }
      }

      setErrors(newErrors);
      return !hasErrors;
    }
  }, [data, schema, validateField]);

  const debouncedValidate = useMemo(() =>
    debounce((fieldName?: keyof T) => validate(fieldName), debounceMs),
    [validate, debounceMs]
  );

  const setFieldValue = useCallback((field: keyof T, value: T[keyof T]) => {
    setData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);

    if (validateOnChange) {
      debouncedValidate(field);
    }
  }, [validateOnChange, debouncedValidate]);

  const reset = useCallback(() => {
    setData(initialData);
    setErrors({});
    setIsDirty(false);
  }, [initialData]);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const isValid = useMemo(() =>
    Object.keys(errors).length === 0 || Object.values(errors).every(error => !error),
    [errors]
  );

  return {
    data,
    errors,
    isValid,
    isDirty,
    setData,
    setFieldValue,
    setErrors,
    validate,
    validateField,
    reset,
    clearErrors,
  };
}

// Sanitization utilities
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

export const sanitizeFileName = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special characters with underscore
    .replace(/\.{2,}/g, '.') // Replace multiple dots with single dot
    .substring(0, 255); // Limit length
};

// File validation utilities
export const validateFileContent = async (file: File): Promise<boolean> => {
  try {
    // Basic file header validation
    const buffer = await file.slice(0, 16).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Check for common malicious patterns
    const maliciousPatterns = [
      [0x4D, 0x5A], // PE executable
      [0x7F, 0x45, 0x4C, 0x46], // ELF executable
    ];

    for (const pattern of maliciousPatterns) {
      let matches = true;
      for (let i = 0; i < pattern.length; i++) {
        if (bytes[i] !== pattern[i]) {
          matches = false;
          break;
        }
      }
      if (matches) return false;
    }

    return true;
  } catch {
    return false;
  }
};

// Common validation schemas
export const CommonSchemas = {
  email: [
    { rule: ValidationRules.required, args: ['Email'] },
    { rule: ValidationRules.email },
  ],

  domain: [
    { rule: ValidationRules.required, args: ['Domain'] },
    { rule: ValidationRules.domain },
  ],

  phone: [
    { rule: ValidationRules.phone },
  ],

  url: [
    { rule: ValidationRules.url },
  ],

  requiredText: (fieldName: string) => [
    { rule: ValidationRules.required, args: [fieldName] },
  ],

  textWithLength: (fieldName: string, min?: number, max?: number) => [
    { rule: ValidationRules.required, args: [fieldName] },
    ...(min ? [{ rule: ValidationRules.minLength, args: [min] }] : []),
    ...(max ? [{ rule: ValidationRules.maxLength, args: [max] }] : []),
  ],
};