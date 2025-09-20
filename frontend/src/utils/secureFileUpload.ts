'use client';

import { sanitizeFileName, validateFileContent } from './validation';

// CSRF token management
let csrfToken: string | null = null;

export const getCsrfToken = async (): Promise<string> => {
  if (csrfToken) return csrfToken;

  try {
    const response = await fetch('/api/csrf-token', {
      method: 'GET',
      credentials: 'same-origin',
    });

    if (!response.ok) {
      throw new Error('Failed to get CSRF token');
    }

    const data = await response.json();
    csrfToken = data.token;
    return csrfToken;
  } catch (error) {
    console.error('Error getting CSRF token:', error);
    throw new Error('Failed to get security token');
  }
};

// Secure file validation
export interface FileValidationOptions {
  maxSize: number;
  allowedTypes: string[];
  allowedExtensions: string[];
  checkContent: boolean;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedName: string;
}

export const validateFileSecurely = async (
  file: File,
  options: FileValidationOptions
): Promise<FileValidationResult> => {
  const errors: string[] = [];
  const sanitizedName = sanitizeFileName(file.name);

  // Size validation
  if (file.size > options.maxSize) {
    const maxSizeMB = Math.round(options.maxSize / (1024 * 1024));
    errors.push(`File size exceeds ${maxSizeMB}MB limit`);
  }

  // MIME type validation
  if (options.allowedTypes.length > 0) {
    const isTypeAllowed = options.allowedTypes.some(type => {
      if (type.includes('*')) {
        const baseType = type.split('/')[0];
        return file.type.startsWith(baseType + '/');
      }
      return file.type === type;
    });

    if (!isTypeAllowed) {
      errors.push(`File type ${file.type} is not allowed`);
    }
  }

  // Extension validation
  if (options.allowedExtensions.length > 0) {
    const fileExtension = '.' + sanitizedName.split('.').pop()?.toLowerCase();
    if (!options.allowedExtensions.includes(fileExtension)) {
      errors.push(`File extension ${fileExtension} is not allowed`);
    }
  }

  // Content validation
  if (options.checkContent) {
    try {
      const isContentValid = await validateFileContent(file);
      if (!isContentValid) {
        errors.push('File content appears to be invalid or potentially malicious');
      }
    } catch (error) {
      errors.push('Failed to validate file content');
    }
  }

  // Additional security checks
  if (sanitizedName !== file.name) {
    console.warn(`File name was sanitized from "${file.name}" to "${sanitizedName}"`);
  }

  if (sanitizedName.length === 0) {
    errors.push('Invalid file name');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedName,
  };
};

// Secure upload function
export interface SecureUploadOptions {
  endpoint: string;
  onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
  signal?: AbortSignal;
  additionalData?: Record<string, string>;
}

export const uploadFileSecurely = async (
  file: File,
  validationOptions: FileValidationOptions,
  uploadOptions: SecureUploadOptions
): Promise<any> => {
  const {
    endpoint,
    onProgress,
    onComplete,
    onError,
    signal,
    additionalData = {},
  } = uploadOptions;

  try {
    // Step 1: Validate file
    const validation = await validateFileSecurely(file, validationOptions);
    if (!validation.isValid) {
      const errorMessage = validation.errors.join(', ');
      onError?.(errorMessage);
      throw new Error(errorMessage);
    }

    // Step 2: Get CSRF token
    const token = await getCsrfToken();

    // Step 3: Prepare form data
    const formData = new FormData();

    // Use sanitized filename
    const sanitizedFile = new File([file], validation.sanitizedName, {
      type: file.type,
      lastModified: file.lastModified,
    });

    formData.append('file', sanitizedFile);
    formData.append('csrf_token', token);
    formData.append('original_filename', file.name);
    formData.append('file_size', file.size.toString());
    formData.append('upload_timestamp', Date.now().toString());

    // Add additional data
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });

    // Step 4: Upload with progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Handle upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = {
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
          };
          onProgress(progress);
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          let result;
          try {
            result = JSON.parse(xhr.responseText);
          } catch {
            result = { message: 'Upload completed successfully' };
          }

          // Verify server response includes expected security headers
          const securityHeaders = [
            'x-content-type-options',
            'x-frame-options',
            'x-xss-protection',
          ];

          const missingHeaders = securityHeaders.filter(
            header => !xhr.getResponseHeader(header)
          );

          if (missingHeaders.length > 0) {
            console.warn('Missing security headers:', missingHeaders);
          }

          onComplete?.(result);
          resolve(result);
        } else {
          let errorMessage = `Upload failed with status ${xhr.status}`;
          try {
            const errorData = JSON.parse(xhr.responseText);
            errorMessage = errorData.message || errorMessage;
          } catch {
            // Use default error message
          }

          onError?.(errorMessage);
          reject(new Error(errorMessage));
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        const errorMessage = 'Upload failed due to network error';
        onError?.(errorMessage);
        reject(new Error(errorMessage));
      });

      // Handle abort
      xhr.addEventListener('abort', () => {
        const errorMessage = 'Upload was cancelled';
        onError?.(errorMessage);
        reject(new Error(errorMessage));
      });

      // Set up abort signal
      if (signal) {
        signal.addEventListener('abort', () => {
          xhr.abort();
        });
      }

      // Set security headers
      xhr.open('POST', endpoint);
      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

      // Don't set Content-Type header manually - let browser set it with boundary
      // for multipart/form-data

      xhr.withCredentials = true; // Include cookies for CSRF protection

      // Send request
      xhr.send(formData);
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Upload failed';
    onError?.(errorMessage);
    throw error;
  }
};

// Secure storage utilities
export const secureStorage = {
  setItem: (key: string, value: string): void => {
    try {
      // In a real implementation, you would encrypt the value here
      // For now, we'll just add a timestamp for cache invalidation
      const secureData = {
        value,
        timestamp: Date.now(),
        checksum: btoa(value).slice(0, 8), // Simple checksum
      };

      localStorage.setItem(key, JSON.stringify(secureData));
    } catch (error) {
      console.error('Failed to store data securely:', error);
    }
  },

  getItem: (key: string, maxAge?: number): string | null => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const secureData = JSON.parse(stored);

      // Check if data is expired
      if (maxAge && Date.now() - secureData.timestamp > maxAge) {
        localStorage.removeItem(key);
        return null;
      }

      // Verify checksum
      const expectedChecksum = btoa(secureData.value).slice(0, 8);
      if (secureData.checksum !== expectedChecksum) {
        console.warn('Data integrity check failed for key:', key);
        localStorage.removeItem(key);
        return null;
      }

      return secureData.value;
    } catch (error) {
      console.error('Failed to retrieve data securely:', error);
      return null;
    }
  },

  removeItem: (key: string): void => {
    localStorage.removeItem(key);
  },

  clear: (): void => {
    localStorage.clear();
  },
};

// File type detection utilities
export const detectFileType = async (file: File): Promise<string> => {
  try {
    const buffer = await file.slice(0, 16).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Common file signatures
    const signatures: Record<string, number[]> = {
      'image/jpeg': [0xFF, 0xD8, 0xFF],
      'image/png': [0x89, 0x50, 0x4E, 0x47],
      'image/gif': [0x47, 0x49, 0x46],
      'image/webp': [0x52, 0x49, 0x46, 0x46],
      'application/pdf': [0x25, 0x50, 0x44, 0x46],
      'text/csv': [], // CSV doesn't have a fixed signature
      'application/json': [], // JSON doesn't have a fixed signature
    };

    for (const [mimeType, signature] of Object.entries(signatures)) {
      if (signature.length === 0) continue; // Skip types without signatures

      let matches = true;
      for (let i = 0; i < signature.length; i++) {
        if (bytes[i] !== signature[i]) {
          matches = false;
          break;
        }
      }

      if (matches) {
        return mimeType;
      }
    }

    // Fall back to browser-detected type
    return file.type;
  } catch {
    return file.type;
  }
};

export default {
  getCsrfToken,
  validateFileSecurely,
  uploadFileSecurely,
  secureStorage,
  detectFileType,
};