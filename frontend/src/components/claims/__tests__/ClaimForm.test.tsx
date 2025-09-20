import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ClaimForm, { ClaimFormData, ClaimFormProps, Listing } from '../ClaimForm';

describe('ClaimForm', () => {
  const mockListing: Listing = {
    id: 'listing123',
    title: 'Test Business',
    description: 'A great test business',
    category: 'Restaurant',
    location: 'New York, NY',
  };

  const defaultProps: ClaimFormProps = {
    listing: mockListing,
    onSubmit: jest.fn(),
    onCancel: jest.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the claim form with all sections', () => {
      render(<ClaimForm {...defaultProps} />);

      expect(screen.getByTestId('claim-form')).toBeInTheDocument();
      expect(screen.getByText('Claim This Listing')).toBeInTheDocument();
      expect(screen.getByTestId('listing-title')).toHaveTextContent('Test Business');

      // Verification methods
      expect(screen.getByTestId('method-email_verification')).toBeInTheDocument();
      expect(screen.getByTestId('method-phone_verification')).toBeInTheDocument();
      expect(screen.getByTestId('method-document_upload')).toBeInTheDocument();

      // Form fields
      expect(screen.getByTestId('contact-person-input')).toBeInTheDocument();
      expect(screen.getByTestId('relationship-select')).toBeInTheDocument();
      expect(screen.getByTestId('additional-info-textarea')).toBeInTheDocument();

      // Buttons
      expect(screen.getByTestId('submit-button')).toBeInTheDocument();
      expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
    });

    it('should display listing information correctly', () => {
      render(<ClaimForm {...defaultProps} />);

      expect(screen.getByText('Test Business')).toBeInTheDocument();
      expect(screen.getByText('A great test business')).toBeInTheDocument();
      expect(screen.getByText('Category: Restaurant')).toBeInTheDocument();
      expect(screen.getByText('Location: New York, NY')).toBeInTheDocument();
    });

    it('should render with minimal listing information', () => {
      const minimalListing: Listing = {
        id: 'listing456',
        title: 'Minimal Business',
      };

      render(<ClaimForm {...defaultProps} listing={minimalListing} />);

      expect(screen.getByText('Minimal Business')).toBeInTheDocument();
      expect(screen.queryByText('Category:')).not.toBeInTheDocument();
      expect(screen.queryByText('Location:')).not.toBeInTheDocument();
    });

    it('should render without cancel button when onCancel is not provided', () => {
      render(<ClaimForm {...defaultProps} onCancel={undefined} />);

      expect(screen.queryByTestId('cancel-button')).not.toBeInTheDocument();
      expect(screen.getByTestId('submit-button')).toBeInTheDocument();
    });

    it('should render with initial data', () => {
      const initialData: Partial<ClaimFormData> = {
        claimMethod: 'PHONE_VERIFICATION',
        phoneNumber: '555-1234',
        contactPerson: 'John Doe',
        relationship: 'owner',
        additionalInfo: 'Initial info',
      };

      render(<ClaimForm {...defaultProps} initialData={initialData} />);

      expect(screen.getByTestId('method-phone_verification')).toBeChecked();
      expect(screen.getByTestId('phone-input')).toHaveValue('555-1234');
      expect(screen.getByTestId('contact-person-input')).toHaveValue('John Doe');
      expect(screen.getByTestId('relationship-select')).toHaveValue('owner');
      expect(screen.getByTestId('additional-info-textarea')).toHaveValue('Initial info');
    });
  });

  describe('Verification Method Selection', () => {
    it('should default to email verification', () => {
      render(<ClaimForm {...defaultProps} />);

      expect(screen.getByTestId('method-email_verification')).toBeChecked();
      expect(screen.getByTestId('email-input')).toBeInTheDocument();
    });

    it('should switch to phone verification and show phone field', async () => {
      const user = userEvent.setup();
      render(<ClaimForm {...defaultProps} />);

      await user.click(screen.getByTestId('method-phone_verification'));

      expect(screen.getByTestId('method-phone_verification')).toBeChecked();
      expect(screen.getByTestId('phone-input')).toBeInTheDocument();
      expect(screen.queryByTestId('email-input')).not.toBeInTheDocument();
    });

    it('should switch to document upload and show business name field', async () => {
      const user = userEvent.setup();
      render(<ClaimForm {...defaultProps} />);

      await user.click(screen.getByTestId('method-document_upload'));

      expect(screen.getByTestId('method-document_upload')).toBeChecked();
      expect(screen.getByTestId('business-name-input')).toBeInTheDocument();
      expect(screen.queryByTestId('email-input')).not.toBeInTheDocument();
    });

    it('should display appropriate descriptions for each method', () => {
      render(<ClaimForm {...defaultProps} />);

      expect(screen.getByText(/We'll send a verification email/)).toBeInTheDocument();
      expect(screen.getByText(/We'll call or text the provided phone number/)).toBeInTheDocument();
      expect(screen.getByText(/You'll need to upload documents/)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    describe('Email Verification', () => {
      it('should validate required email field', async () => {
        const user = userEvent.setup();
        render(<ClaimForm {...defaultProps} />);

        // Fill required fields except email
        await user.type(screen.getByTestId('contact-person-input'), 'John Doe');
        await user.selectOptions(screen.getByTestId('relationship-select'), 'owner');

        await user.click(screen.getByTestId('submit-button'));

        await waitFor(() => {
          expect(screen.getByTestId('email-error')).toHaveTextContent('Email address is required for email verification');
        });
      });

      it('should validate email format', async () => {
        const user = userEvent.setup();
        render(<ClaimForm {...defaultProps} />);

        await user.type(screen.getByTestId('email-input'), 'invalid-email');
        await user.type(screen.getByTestId('contact-person-input'), 'John Doe');
        await user.selectOptions(screen.getByTestId('relationship-select'), 'owner');

        await user.click(screen.getByTestId('submit-button'));

        await waitFor(() => {
          expect(screen.getByTestId('email-error')).toHaveTextContent('Please enter a valid email address');
        });
      });

      it('should clear email error when user starts typing', async () => {
        const user = userEvent.setup();
        render(<ClaimForm {...defaultProps} />);

        // Trigger validation error
        await user.click(screen.getByTestId('submit-button'));

        await waitFor(() => {
          expect(screen.getByTestId('email-error')).toBeInTheDocument();
        });

        // Start typing to clear error
        await user.type(screen.getByTestId('email-input'), 'test@example.com');

        await waitFor(() => {
          expect(screen.queryByTestId('email-error')).not.toBeInTheDocument();
        });
      });
    });

    describe('Phone Verification', () => {
      beforeEach(async () => {
        const user = userEvent.setup();
        render(<ClaimForm {...defaultProps} />);
        await user.click(screen.getByTestId('method-phone_verification'));
      });

      it('should validate required phone field', async () => {
        const user = userEvent.setup();

        await user.type(screen.getByTestId('contact-person-input'), 'John Doe');
        await user.selectOptions(screen.getByTestId('relationship-select'), 'owner');

        await user.click(screen.getByTestId('submit-button'));

        await waitFor(() => {
          expect(screen.getByTestId('phone-error')).toHaveTextContent('Phone number is required for phone verification');
        });
      });

      it('should validate phone format', async () => {
        const user = userEvent.setup();

        await user.type(screen.getByTestId('phone-input'), 'invalid-phone!@#');
        await user.type(screen.getByTestId('contact-person-input'), 'John Doe');
        await user.selectOptions(screen.getByTestId('relationship-select'), 'owner');

        await user.click(screen.getByTestId('submit-button'));

        await waitFor(() => {
          expect(screen.getByTestId('phone-error')).toHaveTextContent('Please enter a valid phone number');
        });
      });

      it('should accept valid phone formats', async () => {
        const user = userEvent.setup();

        const validPhones = [
          '555-1234',
          '(555) 123-4567',
          '+1 555 123 4567',
          '5551234567',
        ];

        for (const phone of validPhones) {
          await user.clear(screen.getByTestId('phone-input'));
          await user.type(screen.getByTestId('phone-input'), phone);

          // Clear and refill other required fields
          await user.clear(screen.getByTestId('contact-person-input'));
          await user.type(screen.getByTestId('contact-person-input'), 'John Doe');
          await user.selectOptions(screen.getByTestId('relationship-select'), 'owner');

          await user.click(screen.getByTestId('submit-button'));

          await waitFor(() => {
            expect(screen.queryByTestId('phone-error')).not.toBeInTheDocument();
          });
        }
      });
    });

    describe('Document Upload', () => {
      beforeEach(async () => {
        const user = userEvent.setup();
        render(<ClaimForm {...defaultProps} />);
        await user.click(screen.getByTestId('method-document_upload'));
      });

      it('should validate required business name field', async () => {
        const user = userEvent.setup();

        await user.type(screen.getByTestId('contact-person-input'), 'John Doe');
        await user.selectOptions(screen.getByTestId('relationship-select'), 'owner');

        await user.click(screen.getByTestId('submit-button'));

        await waitFor(() => {
          expect(screen.getByTestId('business-name-error')).toHaveTextContent('Business name is required for document verification');
        });
      });
    });

    describe('Common Fields', () => {
      it('should validate required contact person field', async () => {
        const user = userEvent.setup();
        render(<ClaimForm {...defaultProps} />);

        await user.type(screen.getByTestId('email-input'), 'test@example.com');
        await user.selectOptions(screen.getByTestId('relationship-select'), 'owner');

        await user.click(screen.getByTestId('submit-button'));

        await waitFor(() => {
          expect(screen.getByTestId('contact-person-error')).toHaveTextContent('Contact person name is required');
        });
      });

      it('should validate required relationship field', async () => {
        const user = userEvent.setup();
        render(<ClaimForm {...defaultProps} />);

        await user.type(screen.getByTestId('email-input'), 'test@example.com');
        await user.type(screen.getByTestId('contact-person-input'), 'John Doe');

        await user.click(screen.getByTestId('submit-button'));

        await waitFor(() => {
          expect(screen.getByTestId('relationship-error')).toHaveTextContent('Please specify your relationship to this business');
        });
      });

      it('should provide relationship options', () => {
        render(<ClaimForm {...defaultProps} />);

        const select = screen.getByTestId('relationship-select');
        expect(select).toBeInTheDocument();

        const options = screen.getAllByRole('option');
        const optionTexts = options.map(option => option.textContent);

        expect(optionTexts).toContain('Business Owner');
        expect(optionTexts).toContain('Manager');
        expect(optionTexts).toContain('Employee');
        expect(optionTexts).toContain('Authorized Representative');
        expect(optionTexts).toContain('Business Partner');
        expect(optionTexts).toContain('Other');
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit valid email verification form', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();

      render(<ClaimForm {...defaultProps} onSubmit={mockOnSubmit} />);

      // Fill valid form data
      await user.type(screen.getByTestId('email-input'), 'business@example.com');
      await user.type(screen.getByTestId('contact-person-input'), 'John Doe');
      await user.selectOptions(screen.getByTestId('relationship-select'), 'owner');
      await user.type(screen.getByTestId('additional-info-textarea'), 'Additional context');

      await user.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          claimMethod: 'EMAIL_VERIFICATION',
          email: 'business@example.com',
          contactPerson: 'John Doe',
          relationship: 'owner',
          additionalInfo: 'Additional context',
        });
      });
    });

    it('should submit valid phone verification form', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();

      render(<ClaimForm {...defaultProps} onSubmit={mockOnSubmit} />);

      await user.click(screen.getByTestId('method-phone_verification'));
      await user.type(screen.getByTestId('phone-input'), '555-123-4567');
      await user.type(screen.getByTestId('contact-person-input'), 'Jane Smith');
      await user.selectOptions(screen.getByTestId('relationship-select'), 'manager');

      await user.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          claimMethod: 'PHONE_VERIFICATION',
          phoneNumber: '555-123-4567',
          contactPerson: 'Jane Smith',
          relationship: 'manager',
          additionalInfo: '',
        });
      });
    });

    it('should submit valid document upload form', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();

      render(<ClaimForm {...defaultProps} onSubmit={mockOnSubmit} />);

      await user.click(screen.getByTestId('method-document_upload'));
      await user.type(screen.getByTestId('business-name-input'), 'Official Business Name LLC');
      await user.type(screen.getByTestId('contact-person-input'), 'Bob Wilson');
      await user.selectOptions(screen.getByTestId('relationship-select'), 'partner');

      await user.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          claimMethod: 'DOCUMENT_UPLOAD',
          businessName: 'Official Business Name LLC',
          contactPerson: 'Bob Wilson',
          relationship: 'partner',
          additionalInfo: '',
        });
      });
    });

    it('should not submit invalid form', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();

      render(<ClaimForm {...defaultProps} onSubmit={mockOnSubmit} />);

      // Submit without filling required fields
      await user.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(screen.getByTestId('email-error')).toBeInTheDocument();
        expect(screen.getByTestId('contact-person-error')).toBeInTheDocument();
        expect(screen.getByTestId('relationship-error')).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should handle cancel button click', async () => {
      const user = userEvent.setup();
      const mockOnCancel = jest.fn();

      render(<ClaimForm {...defaultProps} onCancel={mockOnCancel} />);

      await user.click(screen.getByTestId('cancel-button'));

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should disable form elements when loading', () => {
      render(<ClaimForm {...defaultProps} isLoading={true} />);

      expect(screen.getByTestId('method-email_verification')).toBeDisabled();
      expect(screen.getByTestId('method-phone_verification')).toBeDisabled();
      expect(screen.getByTestId('method-document_upload')).toBeDisabled();
      expect(screen.getByTestId('email-input')).toBeDisabled();
      expect(screen.getByTestId('contact-person-input')).toBeDisabled();
      expect(screen.getByTestId('relationship-select')).toBeDisabled();
      expect(screen.getByTestId('additional-info-textarea')).toBeDisabled();
      expect(screen.getByTestId('submit-button')).toBeDisabled();
      expect(screen.getByTestId('cancel-button')).toBeDisabled();
    });

    it('should show loading text on submit button', () => {
      render(<ClaimForm {...defaultProps} isLoading={true} />);

      expect(screen.getByTestId('submit-button')).toHaveTextContent('Submitting Claim...');
    });

    it('should show normal text on submit button when not loading', () => {
      render(<ClaimForm {...defaultProps} isLoading={false} />);

      expect(screen.getByTestId('submit-button')).toHaveTextContent('Submit Claim');
    });
  });

  describe('Form Interactions', () => {
    it('should handle form field changes', async () => {
      const user = userEvent.setup();
      render(<ClaimForm {...defaultProps} />);

      // Test email input
      await user.type(screen.getByTestId('email-input'), 'test@example.com');
      expect(screen.getByTestId('email-input')).toHaveValue('test@example.com');

      // Test contact person input
      await user.type(screen.getByTestId('contact-person-input'), 'John Doe');
      expect(screen.getByTestId('contact-person-input')).toHaveValue('John Doe');

      // Test relationship select
      await user.selectOptions(screen.getByTestId('relationship-select'), 'manager');
      expect(screen.getByTestId('relationship-select')).toHaveValue('manager');

      // Test additional info textarea
      await user.type(screen.getByTestId('additional-info-textarea'), 'Some info');
      expect(screen.getByTestId('additional-info-textarea')).toHaveValue('Some info');
    });

    it('should clear errors when user starts fixing them', async () => {
      const user = userEvent.setup();
      render(<ClaimForm {...defaultProps} />);

      // Trigger validation errors
      await user.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(screen.getByTestId('email-error')).toBeInTheDocument();
        expect(screen.getByTestId('contact-person-error')).toBeInTheDocument();
        expect(screen.getByTestId('relationship-error')).toBeInTheDocument();
      });

      // Fix email error
      await user.type(screen.getByTestId('email-input'), 'test@example.com');
      await waitFor(() => {
        expect(screen.queryByTestId('email-error')).not.toBeInTheDocument();
      });

      // Fix contact person error
      await user.type(screen.getByTestId('contact-person-input'), 'John Doe');
      await waitFor(() => {
        expect(screen.queryByTestId('contact-person-error')).not.toBeInTheDocument();
      });

      // Fix relationship error
      await user.selectOptions(screen.getByTestId('relationship-select'), 'owner');
      await waitFor(() => {
        expect(screen.queryByTestId('relationship-error')).not.toBeInTheDocument();
      });
    });

    it('should maintain form state across method changes', async () => {
      const user = userEvent.setup();
      render(<ClaimForm {...defaultProps} />);

      // Fill common fields
      await user.type(screen.getByTestId('contact-person-input'), 'John Doe');
      await user.selectOptions(screen.getByTestId('relationship-select'), 'owner');
      await user.type(screen.getByTestId('additional-info-textarea'), 'Some info');

      // Switch to phone verification
      await user.click(screen.getByTestId('method-phone_verification'));

      // Common fields should still be filled
      expect(screen.getByTestId('contact-person-input')).toHaveValue('John Doe');
      expect(screen.getByTestId('relationship-select')).toHaveValue('owner');
      expect(screen.getByTestId('additional-info-textarea')).toHaveValue('Some info');
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(<ClaimForm {...defaultProps} />);

      expect(screen.getByLabelText('Business Email Address *')).toBeInTheDocument();
      expect(screen.getByLabelText('Contact Person *')).toBeInTheDocument();
      expect(screen.getByLabelText('Your Relationship to This Business *')).toBeInTheDocument();
      expect(screen.getByLabelText('Additional Information')).toBeInTheDocument();
    });

    it('should associate error messages with form fields', async () => {
      const user = userEvent.setup();
      render(<ClaimForm {...defaultProps} />);

      await user.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        const emailInput = screen.getByTestId('email-input');
        const emailError = screen.getByTestId('email-error');

        expect(emailError).toHaveAttribute('id');
        // Error should be associated via aria-describedby or similar
      });
    });

    it('should have proper radio button groups', () => {
      render(<ClaimForm {...defaultProps} />);

      const radioButtons = screen.getAllByRole('radio');
      expect(radioButtons).toHaveLength(3);

      radioButtons.forEach(radio => {
        expect(radio).toHaveAttribute('name', 'claimMethod');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty additional info gracefully', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();

      render(<ClaimForm {...defaultProps} onSubmit={mockOnSubmit} />);

      await user.type(screen.getByTestId('email-input'), 'test@example.com');
      await user.type(screen.getByTestId('contact-person-input'), 'John Doe');
      await user.selectOptions(screen.getByTestId('relationship-select'), 'owner');

      // Don't fill additional info
      await user.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            additionalInfo: '',
          })
        );
      });
    });

    it('should handle very long input values', async () => {
      const user = userEvent.setup();
      render(<ClaimForm {...defaultProps} />);

      const longText = 'a'.repeat(1000);

      await user.type(screen.getByTestId('contact-person-input'), longText);
      await user.type(screen.getByTestId('additional-info-textarea'), longText);

      expect(screen.getByTestId('contact-person-input')).toHaveValue(longText);
      expect(screen.getByTestId('additional-info-textarea')).toHaveValue(longText);
    });

    it('should handle special characters in form fields', async () => {
      const user = userEvent.setup();
      render(<ClaimForm {...defaultProps} />);

      const specialText = 'José García-O\'Neil';
      await user.type(screen.getByTestId('contact-person-input'), specialText);

      expect(screen.getByTestId('contact-person-input')).toHaveValue(specialText);
    });

    it('should prevent form submission during loading', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();

      render(<ClaimForm {...defaultProps} onSubmit={mockOnSubmit} isLoading={true} />);

      // Try to submit while loading
      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toBeDisabled();

      await user.click(submitButton);
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Integration', () => {
    it('should work with complete claim submission flow', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();
      const mockOnCancel = jest.fn();

      render(<ClaimForm {...defaultProps} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      // Complete the entire form like a real user
      await user.type(screen.getByTestId('email-input'), 'owner@testbusiness.com');
      await user.type(screen.getByTestId('contact-person-input'), 'Jane Smith');
      await user.selectOptions(screen.getByTestId('relationship-select'), 'owner');
      await user.type(
        screen.getByTestId('additional-info-textarea'),
        'I am the owner of this business and have been operating it for 5 years. I have all necessary documentation to prove ownership.'
      );

      // Submit the form
      await user.click(screen.getByTestId('submit-button'));

      // Verify submission
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          claimMethod: 'EMAIL_VERIFICATION',
          email: 'owner@testbusiness.com',
          contactPerson: 'Jane Smith',
          relationship: 'owner',
          additionalInfo: 'I am the owner of this business and have been operating it for 5 years. I have all necessary documentation to prove ownership.',
        });
      });

      // Test cancel functionality
      await user.click(screen.getByTestId('cancel-button'));
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });
});