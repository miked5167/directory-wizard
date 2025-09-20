'use client';

import React, { useState } from 'react';

export interface ClaimFormData {
  claimMethod: 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION' | 'DOCUMENT_UPLOAD';
  email?: string;
  phoneNumber?: string;
  businessName?: string;
  contactPerson?: string;
  relationship?: string;
  additionalInfo?: string;
}

export interface Listing {
  id: string;
  title: string;
  description?: string;
  category?: string;
  location?: string;
}

export interface ClaimFormProps {
  listing: Listing;
  onSubmit?: (data: ClaimFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  initialData?: Partial<ClaimFormData>;
}

const ClaimForm: React.FC<ClaimFormProps> = ({
  listing,
  onSubmit,
  onCancel,
  isLoading = false,
  initialData = {},
}) => {
  const [formData, setFormData] = useState<ClaimFormData>({
    claimMethod: 'EMAIL_VERIFICATION',
    email: '',
    phoneNumber: '',
    businessName: '',
    contactPerson: '',
    relationship: '',
    additionalInfo: '',
    ...initialData,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate based on claim method
    switch (formData.claimMethod) {
      case 'EMAIL_VERIFICATION':
        if (!formData.email?.trim()) {
          newErrors.email = 'Email address is required for email verification';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = 'Please enter a valid email address';
        }
        break;

      case 'PHONE_VERIFICATION':
        if (!formData.phoneNumber?.trim()) {
          newErrors.phoneNumber = 'Phone number is required for phone verification';
        } else if (!/^[\d\s\+\-\(\)]+$/.test(formData.phoneNumber)) {
          newErrors.phoneNumber = 'Please enter a valid phone number';
        }
        break;

      case 'DOCUMENT_UPLOAD':
        if (!formData.businessName?.trim()) {
          newErrors.businessName = 'Business name is required for document verification';
        }
        break;
    }

    // Common validations
    if (!formData.contactPerson?.trim()) {
      newErrors.contactPerson = 'Contact person name is required';
    }

    if (!formData.relationship?.trim()) {
      newErrors.relationship = 'Please specify your relationship to this business';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (field: keyof ClaimFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      // Prepare data based on claim method
      const submitData: ClaimFormData = {
        claimMethod: formData.claimMethod,
        contactPerson: formData.contactPerson,
        relationship: formData.relationship,
        additionalInfo: formData.additionalInfo,
      };

      // Add method-specific data
      switch (formData.claimMethod) {
        case 'EMAIL_VERIFICATION':
          submitData.email = formData.email;
          break;
        case 'PHONE_VERIFICATION':
          submitData.phoneNumber = formData.phoneNumber;
          break;
        case 'DOCUMENT_UPLOAD':
          submitData.businessName = formData.businessName;
          break;
      }

      onSubmit?.(submitData);
    }
  };

  const getMethodDescription = (method: ClaimFormData['claimMethod']): string => {
    switch (method) {
      case 'EMAIL_VERIFICATION':
        return 'We\'ll send a verification email to confirm your association with this business.';
      case 'PHONE_VERIFICATION':
        return 'We\'ll call or text the provided phone number to verify your identity.';
      case 'DOCUMENT_UPLOAD':
        return 'You\'ll need to upload documents that prove your relationship to this business.';
    }
  };

  return (
    <div data-testid="claim-form" className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-blue-50 px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Claim This Listing
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Submit a claim to become the verified owner of this business listing.
          </p>
        </div>

        {/* Listing Info */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="font-medium text-gray-900 mb-2" data-testid="listing-title">
            {listing.title}
          </h3>
          {listing.description && (
            <p className="text-sm text-gray-600 mb-2">
              {listing.description}
            </p>
          )}
          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
            {listing.category && (
              <span>Category: {listing.category}</span>
            )}
            {listing.location && (
              <span>Location: {listing.location}</span>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Verification Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Verification Method *
            </label>
            <div className="space-y-3">
              {(['EMAIL_VERIFICATION', 'PHONE_VERIFICATION', 'DOCUMENT_UPLOAD'] as const).map((method) => (
                <div key={method} className="relative">
                  <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="claimMethod"
                      value={method}
                      checked={formData.claimMethod === method}
                      onChange={(e) => handleFieldChange('claimMethod', e.target.value as ClaimFormData['claimMethod'])}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      disabled={isLoading}
                      data-testid={`method-${method.toLowerCase()}`}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {method === 'EMAIL_VERIFICATION' && 'Email Verification'}
                        {method === 'PHONE_VERIFICATION' && 'Phone Verification'}
                        {method === 'DOCUMENT_UPLOAD' && 'Document Upload'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {getMethodDescription(method)}
                      </div>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Method-specific fields */}
          {formData.claimMethod === 'EMAIL_VERIFICATION' && (
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Business Email Address *
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 ${
                  errors.email
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
                placeholder="business@company.com"
                disabled={isLoading}
                data-testid="email-input"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600" data-testid="email-error">
                  {errors.email}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                We'll send a verification email to this address
              </p>
            </div>
          )}

          {formData.claimMethod === 'PHONE_VERIFICATION' && (
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Business Phone Number *
              </label>
              <input
                type="tel"
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => handleFieldChange('phoneNumber', e.target.value)}
                className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 ${
                  errors.phoneNumber
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
                placeholder="+1 (555) 123-4567"
                disabled={isLoading}
                data-testid="phone-input"
              />
              {errors.phoneNumber && (
                <p className="mt-1 text-sm text-red-600" data-testid="phone-error">
                  {errors.phoneNumber}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                We'll call or text this number for verification
              </p>
            </div>
          )}

          {formData.claimMethod === 'DOCUMENT_UPLOAD' && (
            <div>
              <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-2">
                Official Business Name *
              </label>
              <input
                type="text"
                id="businessName"
                value={formData.businessName}
                onChange={(e) => handleFieldChange('businessName', e.target.value)}
                className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 ${
                  errors.businessName
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
                placeholder="Official registered business name"
                disabled={isLoading}
                data-testid="business-name-input"
              />
              {errors.businessName && (
                <p className="mt-1 text-sm text-red-600" data-testid="business-name-error">
                  {errors.businessName}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Enter the exact name as it appears on official documents
              </p>
            </div>
          )}

          {/* Contact Person */}
          <div>
            <label htmlFor="contactPerson" className="block text-sm font-medium text-gray-700 mb-2">
              Contact Person *
            </label>
            <input
              type="text"
              id="contactPerson"
              value={formData.contactPerson}
              onChange={(e) => handleFieldChange('contactPerson', e.target.value)}
              className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 ${
                errors.contactPerson
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
              placeholder="Your full name"
              disabled={isLoading}
              data-testid="contact-person-input"
            />
            {errors.contactPerson && (
              <p className="mt-1 text-sm text-red-600" data-testid="contact-person-error">
                {errors.contactPerson}
              </p>
            )}
          </div>

          {/* Relationship */}
          <div>
            <label htmlFor="relationship" className="block text-sm font-medium text-gray-700 mb-2">
              Your Relationship to This Business *
            </label>
            <select
              id="relationship"
              value={formData.relationship}
              onChange={(e) => handleFieldChange('relationship', e.target.value)}
              className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 ${
                errors.relationship
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
              disabled={isLoading}
              data-testid="relationship-select"
            >
              <option value="">Select your relationship</option>
              <option value="owner">Business Owner</option>
              <option value="manager">Manager</option>
              <option value="employee">Employee</option>
              <option value="representative">Authorized Representative</option>
              <option value="partner">Business Partner</option>
              <option value="other">Other</option>
            </select>
            {errors.relationship && (
              <p className="mt-1 text-sm text-red-600" data-testid="relationship-error">
                {errors.relationship}
              </p>
            )}
          </div>

          {/* Additional Information */}
          <div>
            <label htmlFor="additionalInfo" className="block text-sm font-medium text-gray-700 mb-2">
              Additional Information
            </label>
            <textarea
              id="additionalInfo"
              rows={3}
              value={formData.additionalInfo}
              onChange={(e) => handleFieldChange('additionalInfo', e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Any additional information that would help us verify your claim..."
              disabled={isLoading}
              data-testid="additional-info-textarea"
            />
            <p className="mt-1 text-xs text-gray-500">
              Optional: Provide any context that might help verify your claim
            </p>
          </div>

          {/* Terms */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>By submitting this claim:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>You confirm that you have the authority to manage this business listing</li>
                <li>You agree to provide accurate and up-to-date information</li>
                <li>You understand that false claims may result in account suspension</li>
                <li>You consent to verification procedures as outlined above</li>
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
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              data-testid="submit-button"
            >
              {isLoading ? 'Submitting Claim...' : 'Submit Claim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClaimForm;