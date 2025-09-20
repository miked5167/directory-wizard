import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { useRouter } from 'next/router';
import UserLoginPage, { LoginFormData, LoginPageProps } from '../login';

// Mock Next.js router
const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
  pathname: '/auth/login',
  query: {},
  asPath: '/auth/login',
};

jest.mock('next/router', () => ({
  useRouter: jest.fn(() => mockRouter),
}));

// Mock localStorage and sessionStorage
const createStorageMock = () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
});

const localStorageMock = createStorageMock();
const sessionStorageMock = createStorageMock();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

describe('UserLoginPage', () => {
  const defaultProps: LoginPageProps = {
    onLogin: jest.fn(),
    redirectTo: '/dashboard/claims',
    forgotPasswordUrl: '/auth/forgot-password',
    registerUrl: '/auth/register',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.setItem.mockClear();
    sessionStorageMock.setItem.mockClear();
    mockRouter.query = {};
  });

  describe('Rendering', () => {
    it('should render the login form with all elements', () => {
      render(<UserLoginPage {...defaultProps} />);

      expect(screen.getByTestId('user-login-page')).toBeInTheDocument();
      expect(screen.getByText('Sign in to your account')).toBeInTheDocument();

      // Form fields
      expect(screen.getByTestId('email-input')).toBeInTheDocument();
      expect(screen.getByTestId('password-input')).toBeInTheDocument();
      expect(screen.getByTestId('remember-me-checkbox')).toBeInTheDocument();

      // Buttons
      expect(screen.getByTestId('login-button')).toBeInTheDocument();
      expect(screen.getByTestId('toggle-password-visibility')).toBeInTheDocument();

      // Links
      expect(screen.getByTestId('forgot-password-link')).toBeInTheDocument();
      expect(screen.getByTestId('register-link')).toBeInTheDocument();

      // Social login buttons
      expect(screen.getByTestId('google-login-button')).toBeInTheDocument();
      expect(screen.getByTestId('microsoft-login-button')).toBeInTheDocument();
    });

    it('should display demo credentials information', () => {
      render(<UserLoginPage {...defaultProps} />);

      expect(screen.getByText('Demo Accounts')).toBeInTheDocument();
      expect(screen.getByText(/demo@example.com/)).toBeInTheDocument();
      expect(screen.getByText(/admin@example.com/)).toBeInTheDocument();
      expect(screen.getByText(/business@example.com/)).toBeInTheDocument();
    });

    it('should render with custom URLs', () => {
      render(<UserLoginPage
        {...defaultProps}
        forgotPasswordUrl="/custom/forgot"
        registerUrl="/custom/register"
      />);

      expect(screen.getByTestId('forgot-password-link')).toHaveAttribute('href', '/custom/forgot');
      expect(screen.getByTestId('register-link')).toHaveAttribute('href', '/custom/register');
    });
  });

  describe('Form Validation', () => {
    it('should validate required fields', async () => {
      const user = userEvent.setup();
      render(<UserLoginPage {...defaultProps} />);

      const loginButton = screen.getByTestId('login-button');
      await user.click(loginButton);

      await waitFor(() => {
        expect(screen.getByTestId('email-error')).toHaveTextContent('Email address is required');
        expect(screen.getByTestId('password-error')).toHaveTextContent('Password is required');
      });
    });

    it('should validate email format', async () => {
      const user = userEvent.setup();
      render(<UserLoginPage {...defaultProps} />);

      const emailInput = screen.getByTestId('email-input');
      await user.type(emailInput, 'invalid-email');
      await user.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(screen.getByTestId('email-error')).toHaveTextContent('Please enter a valid email address');
      });
    });

    it('should clear field errors when user starts typing', async () => {
      const user = userEvent.setup();
      render(<UserLoginPage {...defaultProps} />);

      const emailInput = screen.getByTestId('email-input');

      // Trigger validation error
      await user.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(screen.getByTestId('email-error')).toBeInTheDocument();
      });

      // Start typing to clear error
      await user.type(emailInput, 'test@example.com');

      await waitFor(() => {
        expect(screen.queryByTestId('email-error')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Interactions', () => {
    it('should toggle password visibility', async () => {
      const user = userEvent.setup();
      render(<UserLoginPage {...defaultProps} />);

      const passwordInput = screen.getByTestId('password-input');
      const toggleButton = screen.getByTestId('toggle-password-visibility');

      // Initially password should be hidden
      expect(passwordInput).toHaveAttribute('type', 'password');

      // Click toggle to show password
      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');

      // Click toggle to hide password again
      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should handle remember me checkbox', async () => {
      const user = userEvent.setup();
      render(<UserLoginPage {...defaultProps} />);

      const rememberMeCheckbox = screen.getByTestId('remember-me-checkbox');

      // Initially unchecked
      expect(rememberMeCheckbox).not.toBeChecked();

      // Check the box
      await user.click(rememberMeCheckbox);
      expect(rememberMeCheckbox).toBeChecked();

      // Uncheck the box
      await user.click(rememberMeCheckbox);
      expect(rememberMeCheckbox).not.toBeChecked();
    });

    it('should handle form input changes', async () => {
      const user = userEvent.setup();
      render(<UserLoginPage {...defaultProps} />);

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      expect(emailInput).toHaveValue('test@example.com');
      expect(passwordInput).toHaveValue('password123');
    });
  });

  describe('Form Submission with Custom Handler', () => {
    const validFormData = {
      email: 'test@example.com',
      password: 'password123',
      rememberMe: false,
    };

    const fillValidForm = async (user: any, rememberMe = false) => {
      await user.type(screen.getByTestId('email-input'), validFormData.email);
      await user.type(screen.getByTestId('password-input'), validFormData.password);
      if (rememberMe) {
        await user.click(screen.getByTestId('remember-me-checkbox'));
      }
    };

    it('should submit form with valid data using custom handler', async () => {
      const user = userEvent.setup();
      const mockOnLogin = jest.fn().mockResolvedValue({
        success: true,
        user: { userId: 'user123', email: 'test@example.com', name: 'Test User' }
      });

      render(<UserLoginPage {...defaultProps} onLogin={mockOnLogin} />);

      await fillValidForm(user);
      await user.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(mockOnLogin).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
          rememberMe: false,
        });
      });

      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        'user_session',
        expect.stringContaining('"userId":"user123"')
      );
      expect(mockPush).toHaveBeenCalledWith('/dashboard/claims');
    });

    it('should store session in localStorage when remember me is checked', async () => {
      const user = userEvent.setup();
      const mockOnLogin = jest.fn().mockResolvedValue({
        success: true,
        user: { userId: 'user123', email: 'test@example.com' }
      });

      render(<UserLoginPage {...defaultProps} onLogin={mockOnLogin} />);

      await fillValidForm(user, true); // Remember me = true
      await user.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'user_session',
          expect.stringContaining('"rememberMe":true')
        );
      });
    });

    it('should handle login failure', async () => {
      const user = userEvent.setup();
      const mockOnLogin = jest.fn().mockResolvedValue({
        success: false,
        message: 'Invalid credentials'
      });

      render(<UserLoginPage {...defaultProps} onLogin={mockOnLogin} />);

      await fillValidForm(user);
      await user.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(screen.getByTestId('general-error')).toHaveTextContent('Invalid credentials');
      });

      expect(mockPush).not.toHaveBeenCalled();
      expect(sessionStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('should handle login exception', async () => {
      const user = userEvent.setup();
      const mockOnLogin = jest.fn().mockRejectedValue(new Error('Network error'));

      render(<UserLoginPage {...defaultProps} onLogin={mockOnLogin} />);

      await fillValidForm(user);
      await user.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(screen.getByTestId('general-error')).toHaveTextContent('Network error');
      });
    });

    it('should redirect to custom URL from query params', async () => {
      const user = userEvent.setup();
      const mockOnLogin = jest.fn().mockResolvedValue({
        success: true,
        user: { userId: 'user123' }
      });

      // Mock query parameter
      mockRouter.query = { redirect: '/custom/dashboard' };

      render(<UserLoginPage {...defaultProps} onLogin={mockOnLogin} />);

      await fillValidForm(user);
      await user.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/custom/dashboard');
      });
    });
  });

  describe('Demo Login Flow', () => {
    it('should login with demo credentials when no custom handler provided', async () => {
      const user = userEvent.setup();
      render(<UserLoginPage {...defaultProps} onLogin={undefined} />);

      // Use demo credentials
      await user.type(screen.getByTestId('email-input'), 'demo@example.com');
      await user.type(screen.getByTestId('password-input'), 'Demo123!');
      await user.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
          'user_session',
          expect.stringContaining('"email":"demo@example.com"')
        );
        expect(mockPush).toHaveBeenCalledWith('/dashboard/claims');
      });
    });

    it('should login with admin demo credentials', async () => {
      const user = userEvent.setup();
      render(<UserLoginPage {...defaultProps} onLogin={undefined} />);

      await user.type(screen.getByTestId('email-input'), 'admin@example.com');
      await user.type(screen.getByTestId('password-input'), 'Admin123!');
      await user.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
          'user_session',
          expect.stringContaining('"firstName":"Admin"')
        );
      });
    });

    it('should login with business demo credentials', async () => {
      const user = userEvent.setup();
      render(<UserLoginPage {...defaultProps} onLogin={undefined} />);

      await user.type(screen.getByTestId('email-input'), 'business@example.com');
      await user.type(screen.getByTestId('password-input'), 'Business123!');
      await user.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
          'user_session',
          expect.stringContaining('"firstName":"Business"')
        );
      });
    });

    it('should reject invalid demo credentials', async () => {
      const user = userEvent.setup();
      render(<UserLoginPage {...defaultProps} onLogin={undefined} />);

      await user.type(screen.getByTestId('email-input'), 'invalid@example.com');
      await user.type(screen.getByTestId('password-input'), 'wrongpassword');
      await user.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(screen.getByTestId('general-error')).toHaveTextContent('Invalid email or password');
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should handle remember me with demo login', async () => {
      const user = userEvent.setup();
      render(<UserLoginPage {...defaultProps} onLogin={undefined} />);

      await user.type(screen.getByTestId('email-input'), 'demo@example.com');
      await user.type(screen.getByTestId('password-input'), 'Demo123!');
      await user.click(screen.getByTestId('remember-me-checkbox'));
      await user.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'user_session',
          expect.stringContaining('"rememberMe":true')
        );
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      const mockOnLogin = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      render(<UserLoginPage {...defaultProps} onLogin={mockOnLogin} />);

      await user.type(screen.getByTestId('email-input'), 'test@example.com');
      await user.type(screen.getByTestId('password-input'), 'password123');

      const loginButton = screen.getByTestId('login-button');
      await user.click(loginButton);

      // Check loading state
      expect(loginButton).toBeDisabled();
      expect(screen.getByText('Signing in...')).toBeInTheDocument();

      // Wait for completion
      await waitFor(() => {
        expect(screen.queryByText('Signing in...')).not.toBeInTheDocument();
      });
    });

    it('should disable form fields during loading', async () => {
      const user = userEvent.setup();
      const mockOnLogin = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      render(<UserLoginPage {...defaultProps} onLogin={mockOnLogin} />);

      await user.type(screen.getByTestId('email-input'), 'test@example.com');
      await user.type(screen.getByTestId('password-input'), 'password123');
      await user.click(screen.getByTestId('login-button'));

      // Check that form fields are disabled during loading
      expect(screen.getByTestId('email-input')).toBeDisabled();
      expect(screen.getByTestId('password-input')).toBeDisabled();
      expect(screen.getByTestId('remember-me-checkbox')).toBeDisabled();
      expect(screen.getByTestId('google-login-button')).toBeDisabled();
      expect(screen.getByTestId('microsoft-login-button')).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and descriptions', () => {
      render(<UserLoginPage {...defaultProps} />);

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');

      expect(emailInput).toHaveAttribute('id', 'email');
      expect(passwordInput).toHaveAttribute('id', 'password');

      // Labels should be associated with inputs
      expect(screen.getByLabelText('Email Address')).toBe(emailInput);
      expect(screen.getByLabelText('Password')).toBe(passwordInput);
    });

    it('should have proper autocomplete attributes', () => {
      render(<UserLoginPage {...defaultProps} />);

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');

      expect(emailInput).toHaveAttribute('autoComplete', 'email');
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
    });

    it('should provide proper focus management', () => {
      render(<UserLoginPage {...defaultProps} />);

      const emailInput = screen.getByTestId('email-input');
      emailInput.focus();

      expect(emailInput).toHaveFocus();
    });
  });

  describe('Social Login Buttons', () => {
    it('should render social login buttons but not implement functionality', async () => {
      const user = userEvent.setup();
      render(<UserLoginPage {...defaultProps} />);

      const googleButton = screen.getByTestId('google-login-button');
      const microsoftButton = screen.getByTestId('microsoft-login-button');

      expect(googleButton).toBeInTheDocument();
      expect(microsoftButton).toBeInTheDocument();

      // Buttons should be clickable but don't implement functionality
      await user.click(googleButton);
      await user.click(microsoftButton);

      // No errors should occur
      expect(screen.queryByTestId('general-error')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long input values', async () => {
      const user = userEvent.setup();
      render(<UserLoginPage {...defaultProps} />);

      const longEmail = 'a'.repeat(100) + '@example.com';
      const longPassword = 'a'.repeat(1000);

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');

      await user.type(emailInput, longEmail);
      await user.type(passwordInput, longPassword);

      expect(emailInput).toHaveValue(longEmail);
      expect(passwordInput).toHaveValue(longPassword);
    });

    it('should handle special characters in form fields', async () => {
      const user = userEvent.setup();
      render(<UserLoginPage {...defaultProps} />);

      const specialEmail = 'user+test@example.com';
      const specialPassword = 'P@ssw0rd!#$';

      await user.type(screen.getByTestId('email-input'), specialEmail);
      await user.type(screen.getByTestId('password-input'), specialPassword);

      expect(screen.getByTestId('email-input')).toHaveValue(specialEmail);
      expect(screen.getByTestId('password-input')).toHaveValue(specialPassword);
    });

    it('should handle rapid form interactions', async () => {
      const user = userEvent.setup();
      render(<UserLoginPage {...defaultProps} />);

      const emailInput = screen.getByTestId('email-input');

      // Rapid typing and clearing
      await user.type(emailInput, 'test1@example.com');
      await user.clear(emailInput);
      await user.type(emailInput, 'test2@example.com');
      await user.clear(emailInput);
      await user.type(emailInput, 'final@example.com');

      expect(emailInput).toHaveValue('final@example.com');
    });
  });

  describe('Integration', () => {
    it('should work with complete login flow', async () => {
      const user = userEvent.setup();
      const mockOnLogin = jest.fn().mockResolvedValue({
        success: true,
        user: {
          userId: 'user123',
          email: 'john.doe@example.com',
          firstName: 'John',
          lastName: 'Doe'
        }
      });

      // Mock redirect from query
      mockRouter.query = { redirect: '/admin/dashboard' };

      render(<UserLoginPage {...defaultProps} onLogin={mockOnLogin} />);

      // Complete login flow like a real user
      await user.type(screen.getByTestId('email-input'), 'john.doe@example.com');
      await user.type(screen.getByTestId('password-input'), 'SecurePassword123');
      await user.click(screen.getByTestId('remember-me-checkbox'));
      await user.click(screen.getByTestId('login-button'));

      // Verify complete flow
      await waitFor(() => {
        expect(mockOnLogin).toHaveBeenCalledWith({
          email: 'john.doe@example.com',
          password: 'SecurePassword123',
          rememberMe: true,
        });
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'user_session',
        expect.stringContaining('"userId":"user123"')
      );
      expect(mockPush).toHaveBeenCalledWith('/admin/dashboard');
    });
  });
});