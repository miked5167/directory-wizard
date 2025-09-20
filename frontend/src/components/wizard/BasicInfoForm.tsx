'use client';

import React, { useState, useEffect } from 'react';

export interface BasicInfoData {
  name: string;
  domain: string;
  description?: string;
  category?: string;
  website?: string;
  contactEmail?: string;
  phone?: string;
}

export interface BasicInfoFormProps {
  initialData?: BasicInfoData;
  onUpdate?: (data: BasicInfoData) => void;
  onValidationChange?: (isValid: boolean) => void;
  isLoading?: boolean;
}

const BasicInfoForm: React.FC<BasicInfoFormProps> = ({
  initialData = {},
  onUpdate,
  onValidationChange,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<BasicInfoData>({
    name: '',
    domain: '',
    description: '',
    category: '',
    website: '',
    contactEmail: '',
    phone: '',
    ...initialData,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validate form data
  const validateForm = (data: BasicInfoData): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!data.name?.trim()) {
      newErrors.name = 'Directory name is required';
    } else if (data.name.trim().length < 3) {
      newErrors.name = 'Directory name must be at least 3 characters';
    } else if (data.name.trim().length > 100) {
      newErrors.name = 'Directory name must be less than 100 characters';
    }

    if (!data.domain?.trim()) {
      newErrors.domain = 'Domain is required';
    } else if (!/^[a-z0-9-]+$/i.test(data.domain.trim())) {
      newErrors.domain = 'Domain must contain only letters, numbers, and hyphens';
    } else if (data.domain.trim().length < 3) {
      newErrors.domain = 'Domain must be at least 3 characters';
    } else if (data.domain.trim().length > 50) {
      newErrors.domain = 'Domain must be less than 50 characters';
    }

    // Optional fields validation
    if (data.description && data.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    if (data.website && !/^https?:\/\/.+/i.test(data.website)) {
      newErrors.website = 'Website must be a valid URL (http:// or https://)';
    }

    if (data.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail)) {
      newErrors.contactEmail = 'Please enter a valid email address';
    }

    if (data.phone && !/^[\d\s\+\-\(\)]+$/.test(data.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    return newErrors;
  };

  const handleChange = (field: keyof BasicInfoData, value: string) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);

    // Validate and update errors
    const newErrors = validateForm(newData);
    setErrors(newErrors);

    // Notify parent components
    onUpdate?.(newData);
    onValidationChange?.(Object.keys(newErrors).length === 0);
  };

  // Validate on mount and when initialData changes
  useEffect(() => {
    const newErrors = validateForm(formData);
    setErrors(newErrors);
    onValidationChange?.(Object.keys(newErrors).length === 0);
  }, [initialData]);

  return (
    <div data-testid="basic-info-form" className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Basic Information
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Tell us about your directory. This information will be used to create your site.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Directory Name */}
        <div className="lg:col-span-2">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Directory Name *
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 ${
              errors.name
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            }`}
            placeholder="My Local Business Directory"
            disabled={isLoading}
            data-testid="name-input"
            aria-describedby={errors.name ? 'name-error' : undefined}
          />
          {errors.name && (
            <p id="name-error" className="mt-1 text-sm text-red-600" data-testid="name-error">
              {errors.name}
            </p>
          )}
        </div>

        {/* Domain */}
        <div>
          <label htmlFor="domain" className="block text-sm font-medium text-gray-700">
            Domain *
          </label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <input
              type="text"
              id="domain"
              value={formData.domain}
              onChange={(e) => handleChange('domain', e.target.value.toLowerCase())}
              className={`block w-full rounded-l-md border px-3 py-2 focus:outline-none focus:ring-1 ${
                errors.domain
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
              placeholder="my-directory"
              disabled={isLoading}
              data-testid="domain-input"
              aria-describedby={errors.domain ? 'domain-error' : undefined}
            />
            <span className="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
              .example.com
            </span>
          </div>
          {errors.domain && (
            <p id="domain-error" className="mt-1 text-sm text-red-600" data-testid="domain-error">
              {errors.domain}
            </p>
          )}
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">
            Directory Category
          </label>
          <select
            id="category"
            value={formData.category}
            onChange={(e) => handleChange('category', e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            disabled={isLoading}
            data-testid="category-select"
          >
            <option value="">Select a category</option>
            <option value="business">Business Directory</option>
            <option value="restaurant">Restaurant Directory</option>
            <option value="service">Service Directory</option>
            <option value="real-estate">Real Estate Directory</option>
            <option value="healthcare">Healthcare Directory</option>
            <option value="education">Education Directory</option>
            <option value="nonprofit">Nonprofit Directory</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Description */}
        <div className="lg:col-span-2">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            rows={3}
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 ${
              errors.description
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            }`}
            placeholder="A brief description of your directory and what it offers..."
            disabled={isLoading}
            data-testid="description-textarea"
            aria-describedby={errors.description ? 'description-error' : undefined}
          />
          {errors.description && (
            <p id="description-error" className="mt-1 text-sm text-red-600" data-testid="description-error">
              {errors.description}
            </p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            {formData.description?.length || 0}/500 characters
          </p>
        </div>

        {/* Website */}
        <div>
          <label htmlFor="website" className="block text-sm font-medium text-gray-700">
            Website
          </label>
          <input
            type="url"
            id="website"
            value={formData.website}
            onChange={(e) => handleChange('website', e.target.value)}
            className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 ${
              errors.website
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            }`}
            placeholder="https://example.com"
            disabled={isLoading}
            data-testid="website-input"
            aria-describedby={errors.website ? 'website-error' : undefined}
          />
          {errors.website && (
            <p id="website-error" className="mt-1 text-sm text-red-600" data-testid="website-error">
              {errors.website}
            </p>
          )}
        </div>

        {/* Contact Email */}
        <div>
          <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700">
            Contact Email
          </label>
          <input
            type="email"
            id="contactEmail"
            value={formData.contactEmail}
            onChange={(e) => handleChange('contactEmail', e.target.value)}
            className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 ${
              errors.contactEmail
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            }`}
            placeholder="contact@example.com"
            disabled={isLoading}
            data-testid="contact-email-input"
            aria-describedby={errors.contactEmail ? 'contact-email-error' : undefined}
          />
          {errors.contactEmail && (
            <p id="contact-email-error" className="mt-1 text-sm text-red-600" data-testid="contact-email-error">
              {errors.contactEmail}
            </p>
          )}
        </div>

        {/* Phone */}
        <div className="lg:col-span-2">
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Phone Number
          </label>
          <input
            type="tel"
            id="phone"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 ${
              errors.phone
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            }`}
            placeholder="+1 (555) 123-4567"
            disabled={isLoading}
            data-testid="phone-input"
            aria-describedby={errors.phone ? 'phone-error' : undefined}
          />
          {errors.phone && (
            <p id="phone-error" className="mt-1 text-sm text-red-600" data-testid="phone-error">
              {errors.phone}
            </p>
          )}
        </div>
      </div>

      {/* Validation Summary */}
      {Object.keys(errors).length > 0 && (
        <div className="rounded-md bg-red-50 p-4" data-testid="validation-summary">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Please fix the following errors:
              </h3>
              <ul className="mt-2 list-disc list-inside text-sm text-red-700">
                {Object.entries(errors).map(([field, error]) => (
                  <li key={field}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BasicInfoForm;