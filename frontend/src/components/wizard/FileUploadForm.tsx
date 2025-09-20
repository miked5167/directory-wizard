'use client';

import React, { useState, useRef } from 'react';

export interface FileUploadFormProps {
  onFileUpload?: (files: File | File[]) => void;
  onValidationError?: (error: string) => void;
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  title?: string;
}

const FileUploadForm: React.FC<FileUploadFormProps> = ({
  onFileUpload,
  onValidationError,
  accept = '.csv,.json',
  maxSize = 10 * 1024 * 1024, // 10MB default
  multiple = false,
  title,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    // Check file size
    if (maxSize && file.size > maxSize) {
      onValidationError?.('File size exceeds maximum limit');
      return false;
    }

    // Check file type
    if (accept) {
      const acceptedTypes = accept.split(',').map(type => type.trim());
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const isTypeAccepted = acceptedTypes.some(type =>
        type === file.type || type === fileExtension
      );

      if (!isTypeAccepted) {
        onValidationError?.('Invalid file type');
        return false;
      }
    }

    return true;
  };

  const processFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(validateFile);

    if (validFiles.length > 0) {
      onFileUpload?.(multiple ? validFiles : validFiles[0]);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(event.target.files);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    processFiles(event.dataTransfer.files);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    return Math.round(bytes / 1024 / 1024) + 'MB';
  };

  return (
    <div data-testid="file-upload-form" className="w-full">
      {title && (
        <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      )}

      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        data-testid="drop-zone"
      >
        <div className="space-y-4">
          {/* Upload Icon */}
          <div className="mx-auto h-12 w-12 text-gray-400">
            <svg
              className="h-12 w-12"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Upload Instructions */}
          <div className="space-y-2">
            <div className="flex text-sm text-gray-600 justify-center">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2"
                onClick={handleClick}
              >
                <span>Upload files</span>
                <input
                  ref={fileInputRef}
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  multiple={multiple}
                  accept={accept}
                  onChange={handleFileChange}
                  data-testid="file-input"
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>

            {/* File Type Information */}
            {accept && (
              <p className="text-xs text-gray-500">
                Accepted formats: {accept}
              </p>
            )}

            {/* File Size Information */}
            {maxSize && (
              <p className="text-xs text-gray-500">
                Maximum size: {formatFileSize(maxSize)}
              </p>
            )}

            {/* Multiple Files Info */}
            {multiple && (
              <p className="text-xs text-gray-500">
                You can select multiple files
              </p>
            )}
          </div>

          {/* Additional Instructions */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>Click the upload area or drag files here to get started</p>
            {accept.includes('.csv') && (
              <p>• CSV files should include headers in the first row</p>
            )}
            {accept.includes('.json') && (
              <p>• JSON files should contain an array of objects</p>
            )}
          </div>
        </div>

        {/* Drag Overlay */}
        {isDragOver && (
          <div className="absolute inset-0 bg-blue-50 bg-opacity-75 flex items-center justify-center rounded-lg">
            <div className="text-blue-600 font-medium">
              Drop files here to upload
            </div>
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-4 text-sm text-gray-500">
        <details className="group">
          <summary className="cursor-pointer text-blue-600 hover:text-blue-500">
            Need help preparing your files?
          </summary>
          <div className="mt-2 pl-4 space-y-2">
            <p><strong>CSV Format:</strong> Each row should represent one entry with consistent columns.</p>
            <p><strong>JSON Format:</strong> Should be an array of objects with consistent property names.</p>
            <p><strong>Encoding:</strong> Files should be saved in UTF-8 encoding for proper character support.</p>
            <p><strong>Size Limit:</strong> Keep files under {formatFileSize(maxSize || 10485760)} for optimal processing speed.</p>
          </div>
        </details>
      </div>
    </div>
  );
};

export default FileUploadForm;