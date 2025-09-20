'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface LoginPageProps {
  onLogin?: (data: LoginFormData) => Promise<{ success: boolean; message?: string; user?: any }>;
  redirectTo?: string;
  forgotPasswordUrl?: string;
  registerUrl?: string;
}

const UserLoginPage: React.FC<LoginPageProps> = ({
  onLogin,
  redirectTo = '/dashboard/claims',
  forgotPasswordUrl = '/auth/forgot-password',
  registerUrl = '/auth/register',
}) => {
  const router = useRouter();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (field: keyof LoginFormData, value: string | boolean) => {
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
      if (onLogin) {
        const result = await onLogin(formData);
        if (result.success) {
          // Store user session
          const sessionData = {
            ...result.user,
            loggedInAt: new Date().toISOString(),
            rememberMe: formData.rememberMe,
          };

          if (formData.rememberMe) {
            localStorage.setItem('user_session', JSON.stringify(sessionData));
          } else {
            sessionStorage.setItem('user_session', JSON.stringify(sessionData));
          }

          // Get redirect URL from query params or use default
          const redirectUrl = (router.query.redirect as string) || redirectTo;
          router.push(redirectUrl);
        } else {
          setErrors({ general: result.message || 'Login failed' });
        }
      } else {
        // Mock login - check against demo users
        const demoUsers = [
          { email: 'demo@example.com', password: 'Demo123!', name: 'Demo User' },
          { email: 'admin@example.com', password: 'Admin123!', name: 'Admin User' },
          { email: 'business@example.com', password: 'Business123!', name: 'Business Owner' },
        ];

        const user = demoUsers.find(u => u.email === formData.email && u.password === formData.password);

        if (user) {
          const sessionData = {
            userId: `user_${Date.now()}`,
            email: user.email,
            firstName: user.name.split(' ')[0],
            lastName: user.name.split(' ')[1] || '',
            loggedInAt: new Date().toISOString(),
            rememberMe: formData.rememberMe,
          };

          if (formData.rememberMe) {
            localStorage.setItem('user_session', JSON.stringify(sessionData));
          } else {
            sessionStorage.setItem('user_session', JSON.stringify(sessionData));
          }

          const redirectUrl = (router.query.redirect as string) || redirectTo;
          router.push(redirectUrl);
        } else {
          setErrors({ general: 'Invalid email or password' });
        }
      }
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : 'Login failed' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div data-testid="user-login-page" className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Access your directory dashboard and manage your business listings
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

          {/* Demo Credentials Info */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Demo Accounts</h3>
                <div className="mt-2 text-xs text-blue-700">
                  <p><strong>Demo User:</strong> demo@example.com / Demo123!</p>
                  <p><strong>Admin:</strong> admin@example.com / Admin123!</p>
                  <p><strong>Business:</strong> business@example.com / Business123!</p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 sm:text-sm ${
                  errors.email
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
                placeholder="Enter your email"
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
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={(e) => handleFieldChange('password', e.target.value)}
                  className={`block w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-1 sm:text-sm ${
                    errors.password
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                  placeholder="Enter your password"
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
            </div>

            {/* Remember Me and Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={(e) => handleFieldChange('rememberMe', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={isLoading}
                  data-testid="remember-me-checkbox"
                />
                <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link
                  href={forgotPasswordUrl}
                  className="font-medium text-blue-600 hover:text-blue-500"
                  data-testid="forgot-password-link"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              data-testid="login-button"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>

            {/* Social Login Options (placeholder) */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                  disabled={isLoading}
                  data-testid="google-login-button"
                >
                  <svg className="w-5 h-5" viewBox="0 0 20 20">
                    <path fill="#4285F4" d="M19.6 10.23c0-.82-.1-1.42-.25-2.05H10v3.72h5.5c-.15.96-.74 2.31-2.04 3.22v2.45h3.16c1.89-1.73 2.98-4.3 2.98-7.34z" />
                    <path fill="#34A853" d="M13.46 15.13c-.83.59-1.96 1-3.46 1-2.64 0-4.88-1.74-5.68-4.15H1.07v2.52C2.72 17.75 6.09 20 10 20c2.7 0 4.96-.89 6.62-2.42l-3.16-2.45z" />
                    <path fill="#FBBC05" d="M4.32 11.98c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V5.28H1.07C.39 6.61 0 8.25 0 10s.39 3.39 1.07 4.72l3.25-2.74z" />
                    <path fill="#EA4335" d="M10 3.88c1.88 0 3.13.81 3.85 1.48l2.84-2.76C14.96.99 12.7 0 10 0 6.09 0 2.72 2.25 1.07 5.52l3.25 2.52C5.12 5.62 7.36 3.88 10 3.88z" />
                  </svg>
                  <span className="ml-2">Google</span>
                </button>

                <button
                  type="button"
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                  disabled={isLoading}
                  data-testid="microsoft-login-button"
                >
                  <svg className="w-5 h-5" viewBox="0 0 20 20">
                    <path fill="#f25022" d="M0 0h9.5v9.5H0V0z" />
                    <path fill="#00a4ef" d="M10.5 0H20v9.5h-9.5V0z" />
                    <path fill="#7fba00" d="M0 10.5h9.5V20H0v-9.5z" />
                    <path fill="#ffb900" d="M10.5 10.5H20V20h-9.5v-9.5z" />
                  </svg>
                  <span className="ml-2">Microsoft</span>
                </button>
              </div>
            </div>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link
                href={registerUrl}
                className="font-medium text-blue-600 hover:text-blue-500"
                data-testid="register-link"
              >
                Create one here
              </Link>
            </p>
          </div>
        </div>

        {/* Support Information */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Need help?{' '}
            <Link href="/support" className="text-blue-600 hover:text-blue-500">
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserLoginPage;