'use client';

import React, { useRef } from 'react';
import { useFileUpload, UseFileUploadOptions } from '../../hooks/useFileUpload';
import ProgressBar from './ProgressBar';
import LoadingSpinner from './LoadingSpinner';

export interface FileUploadProgressProps extends UseFileUploadOptions {
  onUpload?: (result: any) => void;
  onError?: (error: string) => void;
  accept?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  endpoint?: string;
  showPreview?: boolean;
  dragAndDrop?: boolean;
}

const FileUploadProgress: React.FC<FileUploadProgressProps> = ({
  onUpload,
  onError,
  accept,
  className = '',
  disabled = false,
  placeholder = 'Choose a file or drag and drop',
  endpoint = '/api/upload',
  showPreview = true,
  dragAndDrop = true,
  ...uploadOptions
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);

  const {
    uploadState,
    selectFile,
    uploadFile,
    cancelUpload,
    clearFile,
    clearError,
    validateFile,
  } = useFileUpload({
    ...uploadOptions,
    generatePreview: showPreview,
    onUploadComplete: onUpload,
    onUploadError: onError,
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      selectFile(files[0]);
    }
  };

  const handleDragEnter = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;

    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const validationError = validateFile(file);
      if (validationError) {
        onError?.(validationError);
        return;
      }
      selectFile(file);
    }
  };

  const handleUploadClick = () => {
    if (uploadState.file && !uploadState.isUploading) {
      uploadFile(uploadState.file, endpoint);
    }
  };

  const handleChooseFileClick = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`w-full ${className}`} data-testid="file-upload-progress">
      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
        data-testid="file-input-hidden"
      />

      {/* Upload Area */}
      {!uploadState.file && (
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${isDragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          onClick={!disabled ? handleChooseFileClick : undefined}
          onDragEnter={dragAndDrop ? handleDragEnter : undefined}
          onDragLeave={dragAndDrop ? handleDragLeave : undefined}
          onDragOver={dragAndDrop ? handleDragOver : undefined}
          onDrop={dragAndDrop ? handleDrop : undefined}
          data-testid="upload-area"
        >
          {/* Upload Icon */}
          <div className="flex justify-center mb-4">
            <svg
              className="w-12 h-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              data-testid="upload-icon"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          {/* Upload Text */}
          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-900">
              {placeholder}
            </p>
            {dragAndDrop && (
              <p className="text-sm text-gray-500">
                or drag and drop your file here
              </p>
            )}
            {uploadOptions.maxSize && (
              <p className="text-xs text-gray-400">
                Maximum file size: {formatFileSize(uploadOptions.maxSize)}
              </p>
            )}
            {uploadOptions.allowedTypes && uploadOptions.allowedTypes.length > 0 && (
              <p className="text-xs text-gray-400">
                Allowed types: {uploadOptions.allowedTypes.join(', ')}
              </p>
            )}
          </div>

          {/* Choose File Button */}
          <button
            type="button"
            onClick={handleChooseFileClick}
            disabled={disabled}
            className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="choose-file-button"
          >
            Choose File
          </button>
        </div>
      )}

      {/* File Selected */}
      {uploadState.file && (
        <div className="bg-white border border-gray-200 rounded-lg p-6" data-testid="file-selected">
          <div className="flex items-start space-x-4">
            {/* File Preview */}
            {showPreview && uploadState.preview && (
              <div className="flex-shrink-0">
                <img
                  src={uploadState.preview}
                  alt="File preview"
                  className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                  data-testid="file-preview"
                />
              </div>
            )}

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 truncate" data-testid="file-name">
                    {uploadState.file.name}
                  </h4>
                  <p className="text-sm text-gray-500" data-testid="file-size">
                    {formatFileSize(uploadState.file.size)} • {uploadState.file.type || 'Unknown type'}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                  {!uploadState.isUploading && !uploadState.result && (
                    <>
                      <button
                        onClick={handleUploadClick}
                        disabled={disabled}
                        className="inline-flex items-center px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                        data-testid="upload-button"
                      >
                        Upload
                      </button>
                      <button
                        onClick={clearFile}
                        disabled={disabled}
                        className="inline-flex items-center px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                        data-testid="remove-file-button"
                      >
                        Remove
                      </button>
                    </>
                  )}

                  {uploadState.isUploading && (
                    <button
                      onClick={cancelUpload}
                      className="inline-flex items-center px-3 py-1 text-sm font-medium text-red-700 bg-red-100 rounded hover:bg-red-200"
                      data-testid="cancel-upload-button"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* Upload Progress */}
              {uploadState.isUploading && uploadState.progress && (
                <div className="mt-4" data-testid="upload-progress">
                  <div className="flex items-center space-x-3">
                    <LoadingSpinner size="sm" variant="primary" />
                    <div className="flex-1">
                      <ProgressBar
                        value={uploadState.progress.percentage}
                        size="sm"
                        variant="primary"
                        animated={true}
                        showPercentage={true}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatFileSize(uploadState.progress.loaded)} of {formatFileSize(uploadState.progress.total)} uploaded
                  </p>
                </div>
              )}

              {/* Upload Success */}
              {uploadState.result && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg" data-testid="upload-success">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-sm font-medium text-green-800">
                      File uploaded successfully!
                    </p>
                  </div>
                </div>
              )}

              {/* Upload Error */}
              {uploadState.error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg" data-testid="upload-error">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-red-600 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800">
                        Upload failed
                      </p>
                      <p className="text-sm text-red-700 mt-1">
                        {uploadState.error}
                      </p>
                      <button
                        onClick={clearError}
                        className="text-sm text-red-600 hover:text-red-500 mt-2 underline"
                        data-testid="clear-error-button"
                      >
                        Try again
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploadProgress;