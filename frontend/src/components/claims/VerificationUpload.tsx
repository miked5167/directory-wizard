'use client';

import React, { useState, useRef } from 'react';

export interface VerificationUploadData {
  verificationType: 'EMAIL_DOMAIN' | 'PHONE_NUMBER' | 'BUSINESS_DOCUMENT' | 'UTILITY_BILL';
  evidenceFile?: File;
  evidenceData?: Record<string, any>;
}

export interface ClaimInfo {
  id: string;
  listingTitle: string;
  claimMethod: string;
  status: string;
  submittedAt: string;
  expiresAt: string;
}

export interface VerificationUploadProps {
  claim: ClaimInfo;
  onSubmit?: (data: VerificationUploadData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  allowedTypes?: string[];
  maxFileSize?: number;
}

const VerificationUpload: React.FC<VerificationUploadProps> = ({
  claim,
  onSubmit,
  onCancel,
  isLoading = false,
  allowedTypes = ['PDF', 'JPG', 'PNG'],
  maxFileSize = 5 * 1024 * 1024, // 5MB
}) => {
  const [formData, setFormData] = useState<VerificationUploadData>({
    verificationType: 'BUSINESS_DOCUMENT',
    evidenceData: {},
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize) {
      return `File size must be less than ${Math.round(maxFileSize / 1024 / 1024)}MB`;
    }

    // Check file type
    const fileExtension = file.name.split('.').pop()?.toUpperCase();
    if (!fileExtension || !allowedTypes.includes(fileExtension)) {
      return `File type must be: ${allowedTypes.join(', ')}`;
    }

    return null;
  };

  const handleFileSelect = (file: File) => {
    const error = validateFile(file);
    if (error) {
      setErrors({ file: error });
      return;
    }

    setSelectedFile(file);
    setErrors({});

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }

    setFormData(prev => ({ ...prev, evidenceFile: file }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleVerificationTypeChange = (type: VerificationUploadData['verificationType']) => {
    setFormData(prev => ({ ...prev, verificationType: type }));
    setErrors({});
  };

  const handleEvidenceDataChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      evidenceData: { ...prev.evidenceData, [field]: value }
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.evidenceFile) {
      newErrors.file = 'Please upload a verification document';
    }

    // Validation based on verification type
    switch (formData.verificationType) {
      case 'EMAIL_DOMAIN':
        if (!formData.evidenceData?.emailDomain) {
          newErrors.emailDomain = 'Email domain is required';
        }
        break;
      case 'PHONE_NUMBER':
        if (!formData.evidenceData?.phoneNumber) {
          newErrors.phoneNumber = 'Phone number is required';
        }
        break;
      case 'BUSINESS_DOCUMENT':
        if (!formData.evidenceData?.documentType) {
          newErrors.documentType = 'Document type is required';
        }
        break;
      case 'UTILITY_BILL':
        if (!formData.evidenceData?.billType) {
          newErrors.billType = 'Utility bill type is required';
        }
        if (!formData.evidenceData?.serviceAddress) {
          newErrors.serviceAddress = 'Service address is required';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit?.(formData);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setFormData(prev => ({ ...prev, evidenceFile: undefined }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getVerificationDescription = (type: VerificationUploadData['verificationType']): string => {
    switch (type) {
      case 'EMAIL_DOMAIN':
        return 'Upload documentation showing your association with the business email domain.';
      case 'PHONE_NUMBER':
        return 'Upload documentation that verifies the business phone number belongs to your organization.';
      case 'BUSINESS_DOCUMENT':
        return 'Upload official business documents such as business license, registration, or incorporation papers.';
      case 'UTILITY_BILL':
        return 'Upload a recent utility bill that shows the business name and address.';
    }
  };

  const formatFileSize = (bytes: number): string => {
    return Math.round(bytes / 1024 / 1024) + 'MB';
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div data-testid="verification-upload" className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-blue-50 px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Submit Verification Evidence
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Upload documents to verify your claim for this business listing.
          </p>
        </div>

        {/* Claim Info */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Listing:</span>
              <span className="ml-2 text-gray-900" data-testid="listing-title">
                {claim.listingTitle}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Claim ID:</span>
              <span className="ml-2 font-mono text-gray-600" data-testid="claim-id">
                {claim.id}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Status:</span>
              <span className={`ml-2 inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                claim.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {claim.status}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Expires:</span>
              <span className="ml-2 text-gray-900">
                {formatDate(claim.expiresAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Verification Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Verification Type *
            </label>
            <div className="space-y-3">
              {(['BUSINESS_DOCUMENT', 'UTILITY_BILL', 'EMAIL_DOMAIN', 'PHONE_NUMBER'] as const).map((type) => (
                <div key={type} className="relative">
                  <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="verificationType"
                      value={type}
                      checked={formData.verificationType === type}
                      onChange={(e) => handleVerificationTypeChange(e.target.value as VerificationUploadData['verificationType'])}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      disabled={isLoading}
                      data-testid={`type-${type.toLowerCase().replace('_', '-')}`}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {type === 'BUSINESS_DOCUMENT' && 'Business Documents'}
                        {type === 'UTILITY_BILL' && 'Utility Bill'}
                        {type === 'EMAIL_DOMAIN' && 'Email Domain Verification'}
                        {type === 'PHONE_NUMBER' && 'Phone Number Verification'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {getVerificationDescription(type)}
                      </div>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Type-specific fields */}
          {formData.verificationType === 'EMAIL_DOMAIN' && (
            <div>
              <label htmlFor="emailDomain" className="block text-sm font-medium text-gray-700 mb-2">
                Business Email Domain *
              </label>
              <input
                type="text"
                id="emailDomain"
                value={formData.evidenceData?.emailDomain || ''}
                onChange={(e) => handleEvidenceDataChange('emailDomain', e.target.value)}
                className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 ${
                  errors.emailDomain
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
                placeholder="@company.com"
                disabled={isLoading}
                data-testid="email-domain-input"
              />
              {errors.emailDomain && (
                <p className="mt-1 text-sm text-red-600" data-testid="email-domain-error">
                  {errors.emailDomain}
                </p>
              )}
            </div>
          )}

          {formData.verificationType === 'PHONE_NUMBER' && (
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Business Phone Number *
              </label>
              <input
                type="tel"
                id="phoneNumber"
                value={formData.evidenceData?.phoneNumber || ''}
                onChange={(e) => handleEvidenceDataChange('phoneNumber', e.target.value)}
                className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 ${
                  errors.phoneNumber
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
                placeholder="+1 (555) 123-4567"
                disabled={isLoading}
                data-testid="phone-number-input"
              />
              {errors.phoneNumber && (
                <p className="mt-1 text-sm text-red-600" data-testid="phone-number-error">
                  {errors.phoneNumber}
                </p>
              )}
            </div>
          )}

          {formData.verificationType === 'BUSINESS_DOCUMENT' && (
            <div>
              <label htmlFor="documentType" className="block text-sm font-medium text-gray-700 mb-2">
                Document Type *
              </label>
              <select
                id="documentType"
                value={formData.evidenceData?.documentType || ''}
                onChange={(e) => handleEvidenceDataChange('documentType', e.target.value)}
                className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 ${
                  errors.documentType
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
                disabled={isLoading}
                data-testid="document-type-select"
              >
                <option value="">Select document type</option>
                <option value="business_license">Business License</option>
                <option value="incorporation">Certificate of Incorporation</option>
                <option value="registration">Business Registration</option>
                <option value="tax_certificate">Tax Certificate</option>
                <option value="other">Other Official Document</option>
              </select>
              {errors.documentType && (
                <p className="mt-1 text-sm text-red-600" data-testid="document-type-error">
                  {errors.documentType}
                </p>
              )}
            </div>
          )}

          {formData.verificationType === 'UTILITY_BILL' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="billType" className="block text-sm font-medium text-gray-700 mb-2">
                  Utility Type *
                </label>
                <select
                  id="billType"
                  value={formData.evidenceData?.billType || ''}
                  onChange={(e) => handleEvidenceDataChange('billType', e.target.value)}
                  className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 ${
                    errors.billType
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                  disabled={isLoading}
                  data-testid="bill-type-select"
                >
                  <option value="">Select utility type</option>
                  <option value="electricity">Electricity</option>
                  <option value="gas">Gas</option>
                  <option value="water">Water</option>
                  <option value="internet">Internet/Cable</option>
                  <option value="phone">Phone</option>
                </select>
                {errors.billType && (
                  <p className="mt-1 text-sm text-red-600" data-testid="bill-type-error">
                    {errors.billType}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="serviceAddress" className="block text-sm font-medium text-gray-700 mb-2">
                  Service Address *
                </label>
                <textarea
                  id="serviceAddress"
                  rows={2}
                  value={formData.evidenceData?.serviceAddress || ''}
                  onChange={(e) => handleEvidenceDataChange('serviceAddress', e.target.value)}
                  className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 ${
                    errors.serviceAddress
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                  placeholder="Business address as shown on the utility bill..."
                  disabled={isLoading}
                  data-testid="service-address-textarea"
                />
                {errors.serviceAddress && (
                  <p className="mt-1 text-sm text-red-600" data-testid="service-address-error">
                    {errors.serviceAddress}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Upload Evidence Document *
            </label>

            {!selectedFile ? (
              <div
                className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isDragOver
                    ? 'border-blue-400 bg-blue-50'
                    : errors.file
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                data-testid="file-upload-zone"
              >
                <div className="space-y-2">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="text-sm text-gray-600">
                    <label htmlFor="file-upload" className="cursor-pointer font-medium text-blue-600 hover:text-blue-500">
                      Upload a file
                    </label>
                    <span> or drag and drop</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {allowedTypes.join(', ')} up to {formatFileSize(maxFileSize)}
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  accept={allowedTypes.map(type => `.${type.toLowerCase()}`).join(',')}
                  onChange={handleFileChange}
                  disabled={isLoading}
                  data-testid="file-input"
                />
              </div>
            ) : (
              <div className="border border-gray-300 rounded-lg p-4" data-testid="file-preview">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="File preview"
                        className="h-12 w-12 object-cover rounded"
                        data-testid="image-preview"
                      />
                    ) : (
                      <div className="h-12 w-12 bg-gray-100 rounded flex items-center justify-center">
                        <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900" data-testid="file-name">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="text-red-600 hover:text-red-500"
                    disabled={isLoading}
                    data-testid="remove-file-button"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {errors.file && (
              <p className="mt-1 text-sm text-red-600" data-testid="file-error">
                {errors.file}
              </p>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-2">Document Requirements:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Documents must be clear and legible</li>
                <li>Personal information may be redacted for privacy</li>
                <li>Documents should be recent (within the last 12 months for bills)</li>
                <li>File formats: {allowedTypes.join(', ')}</li>
                <li>Maximum file size: {formatFileSize(maxFileSize)}</li>
              </ul>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={isLoading}
                data-testid="cancel-button"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading || !selectedFile}
              className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              data-testid="submit-button"
            >
              {isLoading ? 'Uploading...' : 'Submit Evidence'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VerificationUpload;