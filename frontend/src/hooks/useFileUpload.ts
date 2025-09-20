'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useLoading } from './useLoading';
import { uploadFileSecurely, validateFileSecurely, FileValidationOptions } from '../utils/secureFileUpload';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface FileUploadState {
  file: File | null;
  isUploading: boolean;
  progress: UploadProgress | null;
  error: string | null;
  result: any | null;
  preview: string | null;
}

export interface UseFileUploadOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  multiple?: boolean;
  autoUpload?: boolean;
  generatePreview?: boolean;
  onUploadStart?: (file: File) => void;
  onUploadProgress?: (progress: UploadProgress) => void;
  onUploadComplete?: (result: any) => void;
  onUploadError?: (error: string) => void;
}

export interface UseFileUploadReturn {
  uploadState: FileUploadState;
  selectFile: (file: File) => void;
  selectFiles: (files: FileList) => void;
  uploadFile: (file?: File, endpoint?: string) => Promise<any>;
  cancelUpload: () => void;
  clearFile: () => void;
  clearError: () => void;
  validateFile: (file: File) => string | null;
}

export const useFileUpload = (options: UseFileUploadOptions = {}): UseFileUploadReturn => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = [],
    multiple = false,
    autoUpload = false,
    generatePreview = false,
    onUploadStart,
    onUploadProgress,
    onUploadComplete,
    onUploadError,
  } = options;

  const [uploadState, setUploadState] = useState<FileUploadState>({
    file: null,
    isUploading: false,
    progress: null,
    error: null,
    result: null,
    preview: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const { loading, startLoading, stopLoading, setProgress } = useLoading();

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      return `File size exceeds ${maxSizeMB}MB limit`;
    }

    // Check file type
    if (allowedTypes.length > 0) {
      const isTypeAllowed = allowedTypes.some(type => {
        if (type.startsWith('.')) {
          // Extension check
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        } else {
          // MIME type check
          return file.type.match(type);
        }
      });

      if (!isTypeAllowed) {
        return `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`;
      }
    }

    return null;
  }, [maxSize, allowedTypes]);

  const generateFilePreview = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        resolve('');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string || '');
      };
      reader.onerror = () => {
        reject(new Error('Failed to generate preview'));
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const selectFile = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setUploadState(prev => ({
        ...prev,
        error: validationError,
        file: null,
        preview: null,
      }));
      return;
    }

    let preview = null;
    if (generatePreview) {
      try {
        preview = await generateFilePreview(file);
      } catch (error) {
        console.warn('Failed to generate file preview:', error);
      }
    }

    setUploadState(prev => ({
      ...prev,
      file,
      error: null,
      preview,
      result: null,
    }));

    if (autoUpload) {
      uploadFile(file);
    }
  }, [validateFile, generatePreview, generateFilePreview, autoUpload]);

  const selectFiles = useCallback((files: FileList) => {
    if (!multiple && files.length > 1) {
      setUploadState(prev => ({
        ...prev,
        error: 'Multiple files not allowed',
      }));
      return;
    }

    // For now, handle only the first file
    // TODO: Extend to handle multiple files
    if (files.length > 0) {
      selectFile(files[0]);
    }
  }, [multiple, selectFile]);

  const uploadFile = useCallback(async (file?: File, endpoint: string = '/api/upload'): Promise<any> => {
    const fileToUpload = file || uploadState.file;
    if (!fileToUpload) {
      throw new Error('No file selected for upload');
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      setUploadState(prev => ({
        ...prev,
        isUploading: true,
        progress: { loaded: 0, total: fileToUpload.size, percentage: 0 },
        error: null,
        result: null,
      }));

      onUploadStart?.(fileToUpload);
      startLoading('Uploading file...');

      // Use secure upload with validation
      const validationOptions: FileValidationOptions = {
        maxSize,
        allowedTypes,
        allowedExtensions: allowedTypes.filter(type => type.startsWith('.')),
        checkContent: true,
      };

      const result = await uploadFileSecurely(fileToUpload, validationOptions, {
        endpoint,
        onProgress: (progress) => {
          setUploadState(prev => ({
            ...prev,
            progress,
          }));
          setProgress(progress.percentage);
          onUploadProgress?.(progress);
        },
        onComplete: (result) => {
          setUploadState(prev => ({
            ...prev,
            isUploading: false,
            result,
            progress: null,
          }));
          stopLoading();
          onUploadComplete?.(result);
        },
        onError: (error) => {
          setUploadState(prev => ({
            ...prev,
            isUploading: false,
            error,
            progress: null,
          }));
          stopLoading();
          onUploadError?.(error);
        },
        signal: abortControllerRef.current.signal,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        error: errorMessage,
        progress: null,
      }));

      stopLoading();
      onUploadError?.(errorMessage);
      throw error;
    }
  }, [uploadState.file, maxSize, allowedTypes, onUploadStart, onUploadProgress, onUploadComplete, onUploadError, startLoading, stopLoading, setProgress]);

  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setUploadState(prev => ({
      ...prev,
      isUploading: false,
      progress: null,
      error: 'Upload cancelled',
    }));

    stopLoading();
  }, [stopLoading]);

  const clearFile = useCallback(() => {
    // Clean up preview URL if it exists
    if (uploadState.preview && uploadState.preview.startsWith('blob:')) {
      URL.revokeObjectURL(uploadState.preview);
    }

    setUploadState({
      file: null,
      isUploading: false,
      progress: null,
      error: null,
      result: null,
      preview: null,
    });
  }, [uploadState.preview]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cancel ongoing uploads
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Clean up preview URL
      if (uploadState.preview && uploadState.preview.startsWith('blob:')) {
        URL.revokeObjectURL(uploadState.preview);
      }
    };
  }, [uploadState.preview]);

  const clearError = useCallback(() => {
    setUploadState(prev => ({
      ...prev,
      error: null,
    }));
  }, []);

  return {
    uploadState,
    selectFile,
    selectFiles,
    uploadFile,
    cancelUpload,
    clearFile,
    clearError,
    validateFile,
  };
};

export default useFileUpload;