import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { useRouter } from 'next/router';
import UserRegistrationPage, { RegisterFormData, RegisterPageProps } from '../register';

// Mock Next.js router
const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
  pathname: '/auth/register',
  query: {},
  asPath: '/auth/register',
};

jest.mock('next/router', () => ({
  useRouter: jest.fn(() => mockRouter),
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('UserRegistrationPage', () => {
  const defaultProps: RegisterPageProps = {
    onRegister: jest.fn(),
    redirectTo: '/dashboard/claims',
    showBusinessFields: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.setItem.mockClear();
  });

  describe('Rendering', () => {
    it('should render the registration form with all fields', () => {
      render(<UserRegistrationPage {...defaultProps} />);

      expect(screen.getByTestId('user-registration-page')).toBeInTheDocument();
      expect(screen.getByText('Create Your Account')).toBeInTheDocument();

      // Required fields
      expect(screen.getByTestId('first-name-input')).toBeInTheDocument();
      expect(screen.getByTestId('last-name-input')).toBeInTheDocument();
      expect(screen.getByTestId('email-input')).toBeInTheDocument();
      expect(screen.getByTestId('password-input')).toBeInTheDocument();
      expect(screen.getByTestId('confirm-password-input')).toBeInTheDocument();

      // Business fields
      expect(screen.getByTestId('business-name-input')).toBeInTheDocument();

      // Checkboxes
      expect(screen.getByTestId('agree-terms-checkbox')).toBeInTheDocument();
      expect(screen.getByTestId('subscribe-newsletter-checkbox')).toBeInTheDocument();

      // Submit button
      expect(screen.getByTestId('register-button')).toBeInTheDocument();
    });

    it('should hide business fields when showBusinessFields is false', () => {
      render(<UserRegistrationPage {...defaultProps} showBusinessFields={false} />);

      expect(screen.queryByText('Business Information (Optional)')).not.toBeInTheDocument();
      expect(screen.queryByTestId('business-name-input')).not.toBeInTheDocument();
    });

    it('should show business role field when business name is entered', async () => {
      const user = userEvent.setup();
      render(<UserRegistrationPage {...defaultProps} />);

      const businessNameInput = screen.getByTestId('business-name-input');

      // Initially business role should not be visible
      expect(screen.queryByTestId('business-role-select')).not.toBeInTheDocument();

      // Enter business name
      await user.type(businessNameInput, 'My Business');

      // Business role should now be visible
      expect(screen.getByTestId('business-role-select')).toBeInTheDocument();
    });

    it('should render navigation links correctly', () => {
      render(<UserRegistrationPage {...defaultProps} />);

      expect(screen.getByTestId('sign-in-link')).toBeInTheDocument();
      expect(screen.getByTestId('sign-in-link')).toHaveAttribute('href', '/auth/login');
    });
  });

  describe('Form Validation', () => {
    it('should validate required fields', async () => {
      const user = userEvent.setup();
      render(<UserRegistrationPage {...defaultProps} />);

      const submitButton = screen.getByTestId('register-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('first-name-error')).toHaveTextContent('First name is required');
        expect(screen.getByTestId('last-name-error')).toHaveTextContent('Last name is required');
        expect(screen.getByTestId('email-error')).toHaveTextContent('Email address is required');
        expect(screen.getByTestId('password-error')).toHaveTextContent('Password is required');
        expect(screen.getByTestId('confirm-password-error')).toHaveTextContent('Please confirm your password');
        expect(screen.getByTestId('agree-terms-error')).toHaveTextContent('You must agree to the Terms of Service and Privacy Policy');
      });
    });

    it('should validate name field minimum length', async () => {
      const user = userEvent.setup();
      render(<UserRegistrationPage {...defaultProps} />);

      const firstNameInput = screen.getByTestId('first-name-input');
      const lastNameInput = screen.getByTestId('last-name-input');

      await user.type(firstNameInput, 'A');
      await user.type(lastNameInput, 'B');
      await user.click(screen.getByTestId('register-button'));

      await waitFor(() => {
        expect(screen.getByTestId('first-name-error')).toHaveTextContent('First name must be at least 2 characters');
        expect(screen.getByTestId('last-name-error')).toHaveTextContent('Last name must be at least 2 characters');
      });
    });

    it('should validate email format', async () => {
      const user = userEvent.setup();
      render(<UserRegistrationPage {...defaultProps} />);

      const emailInput = screen.getByTestId('email-input');
      await user.type(emailInput, 'invalid-email');
      await user.click(screen.getByTestId('register-button'));

      await waitFor(() => {
        expect(screen.getByTestId('email-error')).toHaveTextContent('Please enter a valid email address');
      });
    });

    it('should validate password requirements', async () => {
      const user = userEvent.setup();
      render(<UserRegistrationPage {...defaultProps} />);

      const passwordInput = screen.getByTestId('password-input');

      // Test minimum length
      await user.type(passwordInput, 'short');
      await user.click(screen.getByTestId('register-button'));

      await waitFor(() => {
        expect(screen.getByTestId('password-error')).toHaveTextContent('Password must be at least 8 characters');
      });

      // Test complexity requirements
      await user.clear(passwordInput);
      await user.type(passwordInput, 'password123'); // Missing uppercase

      await waitFor(() => {
        expect(screen.getByTestId('password-error')).toHaveTextContent(
          'Password must contain at least one uppercase letter, one lowercase letter, and one number'
        );
      });
    });

    it('should validate password confirmation match', async () => {
      const user = userEvent.setup();
      render(<UserRegistrationPage {...defaultProps} />);

      const passwordInput = screen.getByTestId('password-input');
      const confirmPasswordInput = screen.getByTestId('confirm-password-input');

      await user.type(passwordInput, 'ValidPassword123');
      await user.type(confirmPasswordInput, 'DifferentPassword123');
      await user.click(screen.getByTestId('register-button'));

      await waitFor(() => {
        expect(screen.getByTestId('confirm-password-error')).toHaveTextContent('Passwords do not match');
      });
    });

    it('should validate business role when business name is provided', async () => {
      const user = userEvent.setup();
      render(<UserRegistrationPage {...defaultProps} />);

      const businessNameInput = screen.getByTestId('business-name-input');
      await user.type(businessNameInput, 'My Business');

      // Now try to submit without selecting role
      await user.click(screen.getByTestId('register-button'));

      await waitFor(() => {
        expect(screen.getByTestId('business-role-error')).toHaveTextContent(
          'Please specify your role in the business'
        );
      });
    });

    it('should clear field errors when user starts typing', async () => {
      const user = userEvent.setup();
      render(<UserRegistrationPage {...defaultProps} />);

      const firstNameInput = screen.getByTestId('first-name-input');

      // Trigger validation error
      await user.click(screen.getByTestId('register-button'));

      await waitFor(() => {
        expect(screen.getByTestId('first-name-error')).toBeInTheDocument();
      });

      // Start typing to clear error
      await user.type(firstNameInput, 'John');

      await waitFor(() => {
        expect(screen.queryByTestId('first-name-error')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Interactions', () => {
    it('should toggle password visibility', async () => {
      const user = userEvent.setup();
      render(<UserRegistrationPage {...defaultProps} />);

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

    it('should toggle confirm password visibility', async () => {
      const user = userEvent.setup();
      render(<UserRegistrationPage {...defaultProps} />);

      const confirmPasswordInput = screen.getByTestId('confirm-password-input');
      const toggleButton = screen.getByTestId('toggle-confirm-password-visibility');

      // Initially password should be hidden
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');

      // Click toggle to show password
      await user.click(toggleButton);
      expect(confirmPasswordInput).toHaveAttribute('type', 'text');
    });

    it('should handle business role selection', async () => {
      const user = userEvent.setup();
      render(<UserRegistrationPage {...defaultProps} />);

      const businessNameInput = screen.getByTestId('business-name-input');
      await user.type(businessNameInput, 'My Business');

      const businessRoleSelect = screen.getByTestId('business-role-select');
      await user.selectOptions(businessRoleSelect, 'Business Owner');

      expect(businessRoleSelect).toHaveValue('Business Owner');
    });

    it('should handle checkbox interactions', async () => {
      const user = userEvent.setup();
      render(<UserRegistrationPage {...defaultProps} />);

      const agreeTermsCheckbox = screen.getByTestId('agree-terms-checkbox');
      const subscribeNewsletterCheckbox = screen.getByTestId('subscribe-newsletter-checkbox');

      // Initially unchecked
      expect(agreeTermsCheckbox).not.toBeChecked();
      expect(subscribeNewsletterCheckbox).not.toBeChecked();

      // Check boxes
      await user.click(agreeTermsCheckbox);
      await user.click(subscribeNewsletterCheckbox);

      expect(agreeTermsCheckbox).toBeChecked();
      expect(subscribeNewsletterCheckbox).toBeChecked();
    });
  });

  describe('Form Submission', () => {
    const validFormData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'ValidPassword123',
      confirmPassword: 'ValidPassword123',
      agreeToTerms: true,
    };

    const fillValidForm = async (user: any) => {
      await user.type(screen.getByTestId('first-name-input'), validFormData.firstName);
      await user.type(screen.getByTestId('last-name-input'), validFormData.lastName);
      await user.type(screen.getByTestId('email-input'), validFormData.email);
      await user.type(screen.getByTestId('password-input'), validFormData.password);
      await user.type(screen.getByTestId('confirm-password-input'), validFormData.confirmPassword);
      await user.click(screen.getByTestId('agree-terms-checkbox'));
    };

    it('should submit form with valid data using custom handler', async () => {
      const user = userEvent.setup();
      const mockOnRegister = jest.fn().mockResolvedValue({ success: true, userId: 'user123' });

      render(<UserRegistrationPage {...defaultProps} onRegister={mockOnRegister} />);

      await fillValidForm(user);
      await user.click(screen.getByTestId('register-button'));

      await waitFor(() => {
        expect(mockOnRegister).toHaveBeenCalledWith({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          password: 'ValidPassword123',
          confirmPassword: 'ValidPassword123',
          businessName: '',
          businessRole: '',
          agreeToTerms: true,
          subscribeToNewsletter: false,
        });
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'user_session',
        expect.stringContaining('"userId":"user123"')
      );
      expect(mockPush).toHaveBeenCalledWith('/dashboard/claims');
    });

    it('should handle registration failure', async () => {
      const user = userEvent.setup();
      const mockOnRegister = jest.fn().mockResolvedValue({
        success: false,
        message: 'Email already exists'
      });

      render(<UserRegistrationPage {...defaultProps} onRegister={mockOnRegister} />);

      await fillValidForm(user);
      await user.click(screen.getByTestId('register-button'));

      await waitFor(() => {
        expect(screen.getByTestId('general-error')).toHaveTextContent('Email already exists');
      });

      expect(mockPush).not.toHaveBeenCalled();
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('should handle registration exception', async () => {
      const user = userEvent.setup();
      const mockOnRegister = jest.fn().mockRejectedValue(new Error('Network error'));

      render(<UserRegistrationPage {...defaultProps} onRegister={mockOnRegister} />);

      await fillValidForm(user);
      await user.click(screen.getByTestId('register-button'));

      await waitFor(() => {
        expect(screen.getByTestId('general-error')).toHaveTextContent('Network error');
      });
    });

    it('should submit with mock registration when no handler provided', async () => {
      const user = userEvent.setup();
      render(<UserRegistrationPage {...defaultProps} onRegister={undefined} />);

      await fillValidForm(user);
      await user.click(screen.getByTestId('register-button'));

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'user_session',
          expect.stringContaining('"email":"john@example.com"')
        );
        expect(mockPush).toHaveBeenCalledWith('/dashboard/claims');
      });
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      const mockOnRegister = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      render(<UserRegistrationPage {...defaultProps} onRegister={mockOnRegister} />);

      await fillValidForm(user);

      const submitButton = screen.getByTestId('register-button');
      await user.click(submitButton);

      // Check loading state
      expect(submitButton).toBeDisabled();
      expect(screen.getByText('Creating Account...')).toBeInTheDocument();

      // Wait for completion
      await waitFor(() => {
        expect(screen.queryByText('Creating Account...')).not.toBeInTheDocument();
      });
    });

    it('should disable form fields during loading', async () => {
      const user = userEvent.setup();
      const mockOnRegister = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      render(<UserRegistrationPage {...defaultProps} onRegister={mockOnRegister} />);

      await fillValidForm(user);
      await user.click(screen.getByTestId('register-button'));

      // Check that form fields are disabled during loading
      expect(screen.getByTestId('first-name-input')).toBeDisabled();
      expect(screen.getByTestId('email-input')).toBeDisabled();
      expect(screen.getByTestId('password-input')).toBeDisabled();
    });

    it('should include business information in submission', async () => {
      const user = userEvent.setup();
      const mockOnRegister = jest.fn().mockResolvedValue({ success: true });

      render(<UserRegistrationPage {...defaultProps} />);

      await fillValidForm(user);

      // Add business information
      await user.type(screen.getByTestId('business-name-input'), 'My Business');
      await user.selectOptions(screen.getByTestId('business-role-select'), 'Business Owner');
      await user.click(screen.getByTestId('subscribe-newsletter-checkbox'));

      await user.click(screen.getByTestId('register-button'));

      await waitFor(() => {
        expect(mockOnRegister).toHaveBeenCalledWith({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          password: 'ValidPassword123',
          confirmPassword: 'ValidPassword123',
          businessName: 'My Business',
          businessRole: 'Business Owner',
          agreeToTerms: true,
          subscribeToNewsletter: true,
        });
      });
    });

    it('should use custom redirect URL', async () => {
      const user = userEvent.setup();
      const mockOnRegister = jest.fn().mockResolvedValue({ success: true });

      render(<UserRegistrationPage
        {...defaultProps}
        onRegister={mockOnRegister}
        redirectTo="/custom/redirect"
      />);

      await fillValidForm(user);
      await user.click(screen.getByTestId('register-button'));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/custom/redirect');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and descriptions', () => {
      render(<UserRegistrationPage {...defaultProps} />);

      const firstNameInput = screen.getByTestId('first-name-input');
      const emailInput = screen.getByTestId('email-input');

      expect(firstNameInput).toHaveAttribute('id', 'firstName');
      expect(emailInput).toHaveAttribute('id', 'email');

      // Labels should be associated with inputs
      expect(screen.getByLabelText('First Name *')).toBe(firstNameInput);
      expect(screen.getByLabelText('Email Address *')).toBe(emailInput);
    });

    it('should provide password strength guidance', () => {
      render(<UserRegistrationPage {...defaultProps} />);

      expect(screen.getByText(
        'Must be at least 8 characters with uppercase, lowercase, and number'
      )).toBeInTheDocument();
    });

    it('should have proper focus management', () => {
      render(<UserRegistrationPage {...defaultProps} />);

      const firstNameInput = screen.getByTestId('first-name-input');
      firstNameInput.focus();

      expect(firstNameInput).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long input values', async () => {
      const user = userEvent.setup();
      render(<UserRegistrationPage {...defaultProps} />);

      const longString = 'a'.repeat(1000);
      const firstNameInput = screen.getByTestId('first-name-input');

      await user.type(firstNameInput, longString);

      expect(firstNameInput).toHaveValue(longString);
    });

    it('should handle special characters in form fields', async () => {
      const user = userEvent.setup();
      render(<UserRegistrationPage {...defaultProps} />);

      await user.type(screen.getByTestId('first-name-input'), 'José');
      await user.type(screen.getByTestId('last-name-input'), 'García');
      await user.type(screen.getByTestId('business-name-input'), 'Café & Restaurant');

      expect(screen.getByTestId('first-name-input')).toHaveValue('José');
      expect(screen.getByTestId('last-name-input')).toHaveValue('García');
      expect(screen.getByTestId('business-name-input')).toHaveValue('Café & Restaurant');
    });

    it('should handle rapid form interactions', async () => {
      const user = userEvent.setup();
      render(<UserRegistrationPage {...defaultProps} />);

      const firstNameInput = screen.getByTestId('first-name-input');

      // Rapid typing and clearing
      await user.type(firstNameInput, 'John');
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Bob');

      expect(firstNameInput).toHaveValue('Bob');
    });
  });

  describe('Integration', () => {
    it('should work with complete user registration flow', async () => {
      const user = userEvent.setup();
      const mockOnRegister = jest.fn().mockResolvedValue({
        success: true,
        userId: 'user123',
        message: 'Registration successful'
      });

      render(<UserRegistrationPage {...defaultProps} onRegister={mockOnRegister} />);

      // Complete the entire form like a real user
      await user.type(screen.getByTestId('first-name-input'), 'John');
      await user.type(screen.getByTestId('last-name-input'), 'Doe');
      await user.type(screen.getByTestId('email-input'), 'john.doe@example.com');
      await user.type(screen.getByTestId('password-input'), 'SecurePassword123');
      await user.type(screen.getByTestId('confirm-password-input'), 'SecurePassword123');

      // Add business information
      await user.type(screen.getByTestId('business-name-input'), 'Doe Enterprises');
      await user.selectOptions(screen.getByTestId('business-role-select'), 'Business Owner');

      // Accept terms and subscribe to newsletter
      await user.click(screen.getByTestId('agree-terms-checkbox'));
      await user.click(screen.getByTestId('subscribe-newsletter-checkbox'));

      // Submit the form
      await user.click(screen.getByTestId('register-button'));

      // Verify complete flow
      await waitFor(() => {
        expect(mockOnRegister).toHaveBeenCalledWith({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          password: 'SecurePassword123',
          confirmPassword: 'SecurePassword123',
          businessName: 'Doe Enterprises',
          businessRole: 'Business Owner',
          agreeToTerms: true,
          subscribeToNewsletter: true,
        });
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'user_session',
        expect.stringContaining('"userId":"user123"')
      );
      expect(mockPush).toHaveBeenCalledWith('/dashboard/claims');
    });
  });
});