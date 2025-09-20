'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  businessName?: string;
  businessRole?: string;
  agreeToTerms: boolean;
  subscribeToNewsletter: boolean;
}

export interface RegisterPageProps {
  onRegister?: (data: RegisterFormData) => Promise<{ success: boolean; message?: string; userId?: string }>;
  redirectTo?: string;
  showBusinessFields?: boolean;
}

const UserRegistrationPage: React.FC<RegisterPageProps> = ({
  onRegister,
  redirectTo = '/dashboard/claims',
  showBusinessFields = true,
}) => {
  const router = useRouter();
  const [formData, setFormData] = useState<RegisterFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    businessRole: '',
    agreeToTerms: false,
    subscribeToNewsletter: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // First name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }

    // Last name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Business role validation (if business name is provided)
    if (showBusinessFields && formData.businessName && !formData.businessRole) {
      newErrors.businessRole = 'Please specify your role in the business';
    }

    // Terms agreement validation
    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the Terms of Service and Privacy Policy';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (field: keyof RegisterFormData, value: string | boolean) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      if (onRegister) {
        const result = await onRegister(formData);
        if (result.success) {
          // Store user info in localStorage for demo purposes
          localStorage.setItem('user_session', JSON.stringify({
            userId: result.userId,
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            createdAt: new Date().toISOString(),
          }));

          // Redirect to success page or dashboard
          router.push(redirectTo);
        } else {
          setErrors({ general: result.message || 'Registration failed' });
        }
      } else {
        // Mock registration success
        localStorage.setItem('user_session', JSON.stringify({
          userId: `user_${Date.now()}`,
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          createdAt: new Date().toISOString(),
        }));

        router.push(redirectTo);
      }
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : 'Registration failed' });
    } finally {
      setIsLoading(false);
    }
  };

  const businessRoles = [
    'Business Owner',
    'Manager',
    'Marketing Director',
    'Operations Manager',
    'Assistant Manager',
    'Employee',
    'Other',
  ];

  return (
    <div data-testid="user-registration-page" className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Create Your Account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Join our directory platform to claim and manage business listings
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm rounded-lg sm:px-10 border border-gray-200">
          {errors.general && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4" data-testid="general-error">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{errors.general}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  First Name *
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleFieldChange('firstName', e.target.value)}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 sm:text-sm ${
                    errors.firstName
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                  placeholder="John"
                  disabled={isLoading}
                  data-testid="first-name-input"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600" data-testid="first-name-error">
                    {errors.firstName}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Last Name *
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleFieldChange('lastName', e.target.value)}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 sm:text-sm ${
                    errors.lastName
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                  placeholder="Doe"
                  disabled={isLoading}
                  data-testid="last-name-input"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600" data-testid="last-name-error">
                    {errors.lastName}
                  </p>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address *
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 sm:text-sm ${
                  errors.email
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
                placeholder="john@example.com"
                disabled={isLoading}
                data-testid="email-input"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600" data-testid="email-error">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password *
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleFieldChange('password', e.target.value)}
                  className={`block w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-1 sm:text-sm ${
                    errors.password
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                  placeholder="••••••••"
                  disabled={isLoading}
                  data-testid="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  data-testid="toggle-password-visibility"
                >
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    {showPassword ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    )}
                  </svg>
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600" data-testid="password-error">
                  {errors.password}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Must be at least 8 characters with uppercase, lowercase, and number
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password *
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                  className={`block w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-1 sm:text-sm ${
                    errors.confirmPassword
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                  placeholder="••••••••"
                  disabled={isLoading}
                  data-testid="confirm-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  data-testid="toggle-confirm-password-visibility"
                >
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    {showConfirmPassword ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    )}
                  </svg>
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600" data-testid="confirm-password-error">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Business Information (Optional) */}
            {showBusinessFields && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-sm font-medium text-gray-900 mb-4">
                  Business Information (Optional)
                </h3>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="businessName" className="block text-sm font-medium text-gray-700">
                      Business Name
                    </label>
                    <input
                      id="businessName"
                      type="text"
                      value={formData.businessName}
                      onChange={(e) => handleFieldChange('businessName', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Your business name"
                      disabled={isLoading}
                      data-testid="business-name-input"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      If you plan to claim or manage business listings
                    </p>
                  </div>

                  {formData.businessName && (
                    <div>
                      <label htmlFor="businessRole" className="block text-sm font-medium text-gray-700">
                        Your Role *
                      </label>
                      <select
                        id="businessRole"
                        value={formData.businessRole}
                        onChange={(e) => handleFieldChange('businessRole', e.target.value)}
                        className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 sm:text-sm ${
                          errors.businessRole
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                        }`}
                        disabled={isLoading}
                        data-testid="business-role-select"
                      >
                        <option value="">Select your role</option>
                        {businessRoles.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                      {errors.businessRole && (
                        <p className="mt-1 text-sm text-red-600" data-testid="business-role-error">
                          {errors.businessRole}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Terms and Newsletter */}
            <div className="space-y-4">
              <div className="flex items-start">
                <input
                  id="agreeToTerms"
                  type="checkbox"
                  checked={formData.agreeToTerms}
                  onChange={(e) => handleFieldChange('agreeToTerms', e.target.checked)}
                  className={`mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${
                    errors.agreeToTerms ? 'border-red-300' : ''
                  }`}
                  disabled={isLoading}
                  data-testid="agree-terms-checkbox"
                />
                <div className="ml-3">
                  <label htmlFor="agreeToTerms" className="text-sm text-gray-700">
                    I agree to the{' '}
                    <Link href="/terms" className="text-blue-600 hover:text-blue-500">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" className="text-blue-600 hover:text-blue-500">
                      Privacy Policy
                    </Link>{' '}
                    *
                  </label>
                  {errors.agreeToTerms && (
                    <p className="mt-1 text-sm text-red-600" data-testid="agree-terms-error">
                      {errors.agreeToTerms}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start">
                <input
                  id="subscribeToNewsletter"
                  type="checkbox"
                  checked={formData.subscribeToNewsletter}
                  onChange={(e) => handleFieldChange('subscribeToNewsletter', e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={isLoading}
                  data-testid="subscribe-newsletter-checkbox"
                />
                <div className="ml-3">
                  <label htmlFor="subscribeToNewsletter" className="text-sm text-gray-700">
                    Subscribe to our newsletter for updates and tips
                  </label>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              data-testid="register-button"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Sign In Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                href="/auth/login"
                className="font-medium text-blue-600 hover:text-blue-500"
                data-testid="sign-in-link"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserRegistrationPage;