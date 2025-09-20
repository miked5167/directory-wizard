import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import BasicInfoForm, { BasicInfoData, BasicInfoFormProps } from '../BasicInfoForm';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  })),
}));

describe('BasicInfoForm', () => {
  const defaultProps: BasicInfoFormProps = {
    onUpdate: jest.fn(),
    onValidationChange: jest.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the form with all required fields', () => {
      render(<BasicInfoForm {...defaultProps} />);

      expect(screen.getByTestId('basic-info-form')).toBeInTheDocument();
      expect(screen.getByText('Basic Information')).toBeInTheDocument();

      // Required fields
      expect(screen.getByTestId('name-input')).toBeInTheDocument();
      expect(screen.getByTestId('domain-input')).toBeInTheDocument();

      // Optional fields
      expect(screen.getByTestId('category-select')).toBeInTheDocument();
      expect(screen.getByTestId('description-textarea')).toBeInTheDocument();
      expect(screen.getByTestId('website-input')).toBeInTheDocument();
      expect(screen.getByTestId('contact-email-input')).toBeInTheDocument();
      expect(screen.getByTestId('phone-input')).toBeInTheDocument();
    });

    it('should render with initial data', () => {
      const initialData: BasicInfoData = {
        name: 'Test Directory',
        domain: 'test-domain',
        description: 'Test description',
        category: 'business',
        website: 'https://example.com',
        contactEmail: 'test@example.com',
        phone: '555-1234',
      };

      render(<BasicInfoForm {...defaultProps} initialData={initialData} />);

      expect(screen.getByDisplayValue('Test Directory')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test-domain')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
      expect(screen.getByDisplayValue('business')).toBeInTheDocument();
      expect(screen.getByDisplayValue('https://example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('555-1234')).toBeInTheDocument();
    });

    it('should show loading state correctly', () => {
      render(<BasicInfoForm {...defaultProps} isLoading={true} />);

      const nameInput = screen.getByTestId('name-input');
      const domainInput = screen.getByTestId('domain-input');
      const categorySelect = screen.getByTestId('category-select');

      expect(nameInput).toBeDisabled();
      expect(domainInput).toBeDisabled();
      expect(categorySelect).toBeDisabled();
    });
  });

  describe('Form Validation', () => {
    it('should validate required fields', async () => {
      const user = userEvent.setup();
      const onValidationChange = jest.fn();

      render(<BasicInfoForm {...defaultProps} onValidationChange={onValidationChange} />);

      const nameInput = screen.getByTestId('name-input');
      const domainInput = screen.getByTestId('domain-input');

      // Initially should be invalid (empty required fields)
      expect(onValidationChange).toHaveBeenCalledWith(false);

      // Fill in valid data
      await user.type(nameInput, 'Valid Directory Name');
      await user.type(domainInput, 'valid-domain');

      await waitFor(() => {
        expect(onValidationChange).toHaveBeenCalledWith(true);
      });
    });

    it('should show validation errors for empty required fields', async () => {
      const user = userEvent.setup();
      render(<BasicInfoForm {...defaultProps} />);

      const nameInput = screen.getByTestId('name-input');
      const domainInput = screen.getByTestId('domain-input');

      // Focus and blur to trigger validation
      await user.click(nameInput);
      await user.click(domainInput);
      await user.tab(); // Blur the domain input

      await waitFor(() => {
        expect(screen.getByTestId('validation-summary')).toBeInTheDocument();
        expect(screen.getByText('Directory name is required')).toBeInTheDocument();
        expect(screen.getByText('Domain is required')).toBeInTheDocument();
      });
    });

    it('should validate directory name length constraints', async () => {
      const user = userEvent.setup();
      render(<BasicInfoForm {...defaultProps} />);

      const nameInput = screen.getByTestId('name-input');

      // Test minimum length
      await user.type(nameInput, 'AB');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByTestId('name-error')).toHaveTextContent(
          'Directory name must be at least 3 characters'
        );
      });

      // Clear and test maximum length
      await user.clear(nameInput);
      await user.type(nameInput, 'A'.repeat(101));

      await waitFor(() => {
        expect(screen.getByTestId('name-error')).toHaveTextContent(
          'Directory name must be less than 100 characters'
        );
      });
    });

    it('should validate domain format', async () => {
      const user = userEvent.setup();
      render(<BasicInfoForm {...defaultProps} />);

      const domainInput = screen.getByTestId('domain-input');

      // Test invalid characters
      await user.type(domainInput, 'invalid domain!');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByTestId('domain-error')).toHaveTextContent(
          'Domain must contain only letters, numbers, and hyphens'
        );
      });

      // Test minimum length
      await user.clear(domainInput);
      await user.type(domainInput, 'AB');

      await waitFor(() => {
        expect(screen.getByTestId('domain-error')).toHaveTextContent(
          'Domain must be at least 3 characters'
        );
      });

      // Test maximum length
      await user.clear(domainInput);
      await user.type(domainInput, 'A'.repeat(51));

      await waitFor(() => {
        expect(screen.getByTestId('domain-error')).toHaveTextContent(
          'Domain must be less than 50 characters'
        );
      });
    });

    it('should validate optional field formats', async () => {
      const user = userEvent.setup();
      render(<BasicInfoForm {...defaultProps} />);

      const websiteInput = screen.getByTestId('website-input');
      const emailInput = screen.getByTestId('contact-email-input');
      const phoneInput = screen.getByTestId('phone-input');

      // Test invalid website URL
      await user.type(websiteInput, 'invalid-url');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByTestId('website-error')).toHaveTextContent(
          'Website must be a valid URL (http:// or https://)'
        );
      });

      // Test invalid email
      await user.type(emailInput, 'invalid-email');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByTestId('contact-email-error')).toHaveTextContent(
          'Please enter a valid email address'
        );
      });

      // Test invalid phone
      await user.type(phoneInput, 'invalid-phone!@#');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByTestId('phone-error')).toHaveTextContent(
          'Please enter a valid phone number'
        );
      });
    });

    it('should validate description length', async () => {
      const user = userEvent.setup();
      render(<BasicInfoForm {...defaultProps} />);

      const descriptionTextarea = screen.getByTestId('description-textarea');

      // Test maximum length
      await user.type(descriptionTextarea, 'A'.repeat(501));

      await waitFor(() => {
        expect(screen.getByTestId('description-error')).toHaveTextContent(
          'Description must be less than 500 characters'
        );
      });
    });

    it('should show character count for description', async () => {
      const user = userEvent.setup();
      render(<BasicInfoForm {...defaultProps} />);

      const descriptionTextarea = screen.getByTestId('description-textarea');

      await user.type(descriptionTextarea, 'Test description');

      expect(screen.getByText('16/500 characters')).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('should call onUpdate when form data changes', async () => {
      const user = userEvent.setup();
      const onUpdate = jest.fn();

      render(<BasicInfoForm {...defaultProps} onUpdate={onUpdate} />);

      const nameInput = screen.getByTestId('name-input');
      await user.type(nameInput, 'Test Name');

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith({
          name: 'Test Name',
          domain: '',
          description: '',
          category: '',
          website: '',
          contactEmail: '',
          phone: '',
        });
      });
    });

    it('should automatically lowercase domain input', async () => {
      const user = userEvent.setup();
      const onUpdate = jest.fn();

      render(<BasicInfoForm {...defaultProps} onUpdate={onUpdate} />);

      const domainInput = screen.getByTestId('domain-input');
      await user.type(domainInput, 'MyDomain');

      expect(domainInput).toHaveValue('mydomain');
    });

    it('should clear field errors when user starts typing', async () => {
      const user = userEvent.setup();
      render(<BasicInfoForm {...defaultProps} />);

      const nameInput = screen.getByTestId('name-input');

      // Trigger validation error
      await user.click(nameInput);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByTestId('name-error')).toBeInTheDocument();
      });

      // Start typing to clear error
      await user.type(nameInput, 'Valid Name');

      await waitFor(() => {
        expect(screen.queryByTestId('name-error')).not.toBeInTheDocument();
      });
    });

    it('should handle category selection', async () => {
      const user = userEvent.setup();
      const onUpdate = jest.fn();

      render(<BasicInfoForm {...defaultProps} onUpdate={onUpdate} />);

      const categorySelect = screen.getByTestId('category-select');
      await user.selectOptions(categorySelect, 'business');

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith(
          expect.objectContaining({ category: 'business' })
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and descriptions', () => {
      render(<BasicInfoForm {...defaultProps} />);

      const nameInput = screen.getByTestId('name-input');
      const domainInput = screen.getByTestId('domain-input');

      expect(nameInput).toHaveAttribute('id', 'name');
      expect(domainInput).toHaveAttribute('id', 'domain');

      // Labels should be associated with inputs
      expect(screen.getByLabelText('Directory Name *')).toBe(nameInput);
      expect(screen.getByLabelText('Domain *')).toBe(domainInput);
    });

    it('should use aria-describedby for error messages', async () => {
      const user = userEvent.setup();
      render(<BasicInfoForm {...defaultProps} />);

      const nameInput = screen.getByTestId('name-input');

      // Trigger validation error
      await user.click(nameInput);
      await user.tab();

      await waitFor(() => {
        expect(nameInput).toHaveAttribute('aria-describedby', 'name-error');
        expect(screen.getByTestId('name-error')).toHaveAttribute('id', 'name-error');
      });
    });

    it('should provide proper focus management', () => {
      render(<BasicInfoForm {...defaultProps} />);

      const nameInput = screen.getByTestId('name-input');
      nameInput.focus();

      expect(nameInput).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined initial data gracefully', () => {
      render(<BasicInfoForm {...defaultProps} initialData={undefined} />);

      expect(screen.getByTestId('name-input')).toHaveValue('');
      expect(screen.getByTestId('domain-input')).toHaveValue('');
    });

    it('should handle partial initial data', () => {
      const partialData: Partial<BasicInfoData> = {
        name: 'Test Name',
        domain: 'test-domain',
      };

      render(<BasicInfoForm {...defaultProps} initialData={partialData} />);

      expect(screen.getByDisplayValue('Test Name')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test-domain')).toBeInTheDocument();
      expect(screen.getByTestId('description-textarea')).toHaveValue('');
    });

    it('should handle very long input gracefully', async () => {
      const user = userEvent.setup();
      render(<BasicInfoForm {...defaultProps} />);

      const nameInput = screen.getByTestId('name-input');
      const veryLongString = 'A'.repeat(1000);

      await user.type(nameInput, veryLongString);

      // Should show validation error for length
      await waitFor(() => {
        expect(screen.getByTestId('name-error')).toBeInTheDocument();
      });
    });

    it('should validate valid website URLs', async () => {
      const user = userEvent.setup();
      render(<BasicInfoForm {...defaultProps} />);

      const websiteInput = screen.getByTestId('website-input');

      // Test valid HTTP URL
      await user.type(websiteInput, 'http://example.com');
      await user.tab();

      await waitFor(() => {
        expect(screen.queryByTestId('website-error')).not.toBeInTheDocument();
      });

      // Clear and test valid HTTPS URL
      await user.clear(websiteInput);
      await user.type(websiteInput, 'https://secure.example.com');

      await waitFor(() => {
        expect(screen.queryByTestId('website-error')).not.toBeInTheDocument();
      });
    });

    it('should accept valid phone number formats', async () => {
      const user = userEvent.setup();
      render(<BasicInfoForm {...defaultProps} />);

      const phoneInput = screen.getByTestId('phone-input');

      const validPhoneFormats = [
        '555-1234',
        '(555) 123-4567',
        '+1 555 123 4567',
        '555.123.4567',
        '5551234567',
      ];

      for (const phoneFormat of validPhoneFormats) {
        await user.clear(phoneInput);
        await user.type(phoneInput, phoneFormat);
        await user.tab();

        await waitFor(() => {
          expect(screen.queryByTestId('phone-error')).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Integration', () => {
    it('should work with real user interactions', async () => {
      const user = userEvent.setup();
      const onUpdate = jest.fn();
      const onValidationChange = jest.fn();

      render(
        <BasicInfoForm
          onUpdate={onUpdate}
          onValidationChange={onValidationChange}
        />
      );

      // Fill out the form like a real user
      await user.type(screen.getByTestId('name-input'), 'My Business Directory');
      await user.type(screen.getByTestId('domain-input'), 'my-business');
      await user.selectOptions(screen.getByTestId('category-select'), 'business');
      await user.type(
        screen.getByTestId('description-textarea'),
        'A comprehensive directory of local businesses'
      );
      await user.type(screen.getByTestId('website-input'), 'https://mybusiness.com');
      await user.type(screen.getByTestId('contact-email-input'), 'contact@mybusiness.com');
      await user.type(screen.getByTestId('phone-input'), '+1 (555) 123-4567');

      // Verify final state
      await waitFor(() => {
        expect(onValidationChange).toHaveBeenCalledWith(true);
      });

      expect(onUpdate).toHaveBeenLastCalledWith({
        name: 'My Business Directory',
        domain: 'my-business',
        category: 'business',
        description: 'A comprehensive directory of local businesses',
        website: 'https://mybusiness.com',
        contactEmail: 'contact@mybusiness.com',
        phone: '+1 (555) 123-4567',
      });
    });

    it('should maintain form state across multiple interactions', async () => {
      const user = userEvent.setup();
      render(<BasicInfoForm {...defaultProps} />);

      // Fill some fields
      await user.type(screen.getByTestId('name-input'), 'Test Directory');
      await user.type(screen.getByTestId('domain-input'), 'test');

      // Navigate around the form
      await user.click(screen.getByTestId('description-textarea'));
      await user.type(screen.getByTestId('description-textarea'), 'Test description');

      // Go back to name field
      await user.click(screen.getByTestId('name-input'));
      await user.type(screen.getByTestId('name-input'), ' Extended');

      // Verify all values are maintained
      expect(screen.getByTestId('name-input')).toHaveValue('Test Directory Extended');
      expect(screen.getByTestId('domain-input')).toHaveValue('test');
      expect(screen.getByTestId('description-textarea')).toHaveValue('Test description');
    });
  });
});