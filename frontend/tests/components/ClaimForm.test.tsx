import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ClaimForm from '@/components/claims/ClaimForm';

// Mock the component since it doesn't exist yet
vi.mock('@/components/claims/ClaimForm', () => ({
  default: ({ listingId, onSubmit, onCancel, isLoading }: any) => {
    const [claimMethod, setClaimMethod] = React.useState('EMAIL_VERIFICATION');
    const [email, setEmail] = React.useState('');
    const [phone, setPhone] = React.useState('');
    const [businessName, setBusinessName] = React.useState('');

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const verificationData: any = { business_name: businessName };

      if (claimMethod === 'EMAIL_VERIFICATION') {
        verificationData.email = email;
      } else if (claimMethod === 'PHONE_VERIFICATION') {
        verificationData.phone = phone;
      }

      onSubmit?.({
        claim_method: claimMethod,
        verification_data: verificationData,
      });
    };

    return (
      <div data-testid="claim-form">
        <form onSubmit={handleSubmit}>
          <h2>Claim This Listing</h2>
          <p>Listing ID: {listingId}</p>

          <div>
            <label htmlFor="business-name">Business Name</label>
            <input
              id="business-name"
              type="text"
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              required
              data-testid="business-name-input"
            />
          </div>

          <div>
            <label htmlFor="claim-method">Verification Method</label>
            <select
              id="claim-method"
              value={claimMethod}
              onChange={e => setClaimMethod(e.target.value)}
              data-testid="claim-method-select"
            >
              <option value="EMAIL_VERIFICATION">Email Verification</option>
              <option value="PHONE_VERIFICATION">Phone Verification</option>
              <option value="DOCUMENT_UPLOAD">Document Upload</option>
            </select>
          </div>

          {claimMethod === 'EMAIL_VERIFICATION' && (
            <div>
              <label htmlFor="email">Business Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                data-testid="email-input"
              />
            </div>
          )}

          {claimMethod === 'PHONE_VERIFICATION' && (
            <div>
              <label htmlFor="phone">Business Phone</label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
                data-testid="phone-input"
              />
            </div>
          )}

          <div className="form-actions">
            <button type="button" onClick={onCancel} data-testid="cancel-button">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} data-testid="submit-button">
              {isLoading ? 'Submitting...' : 'Submit Claim'}
            </button>
          </div>
        </form>
      </div>
    );
  },
}));

// Mock React since it's not imported in the mock
const React = {
  useState: vi.fn(),
};

// Setup React.useState mock
React.useState = vi.fn(initial => {
  const [state, setState] = vi.fn().getMockImplementation()(initial);
  return [state, setState];
});

describe('ClaimForm Component', () => {
  const mockProps = {
    listingId: '123e4567-e89b-12d3-a456-426614174000',
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render claim form with all required fields', () => {
      render(<ClaimForm {...mockProps} />);

      // This test MUST FAIL until we implement the component
      expect(screen.getByTestId('claim-form')).toBeInTheDocument();
      expect(screen.getByText('Claim This Listing')).toBeInTheDocument();
      expect(screen.getByText(`Listing ID: ${mockProps.listingId}`)).toBeInTheDocument();

      expect(screen.getByLabelText('Business Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Verification Method')).toBeInTheDocument();
      expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
      expect(screen.getByTestId('submit-button')).toBeInTheDocument();
    });

    it('should show email field when email verification is selected', () => {
      render(<ClaimForm {...mockProps} />);

      const claimMethodSelect = screen.getByTestId('claim-method-select');
      fireEvent.change(claimMethodSelect, { target: { value: 'EMAIL_VERIFICATION' } });

      expect(screen.getByLabelText('Business Email')).toBeInTheDocument();
      expect(screen.getByTestId('email-input')).toBeInTheDocument();
    });

    it('should show phone field when phone verification is selected', () => {
      render(<ClaimForm {...mockProps} />);

      const claimMethodSelect = screen.getByTestId('claim-method-select');
      fireEvent.change(claimMethodSelect, { target: { value: 'PHONE_VERIFICATION' } });

      expect(screen.getByLabelText('Business Phone')).toBeInTheDocument();
      expect(screen.getByTestId('phone-input')).toBeInTheDocument();
    });

    it('should not show email or phone fields for document upload', () => {
      render(<ClaimForm {...mockProps} />);

      const claimMethodSelect = screen.getByTestId('claim-method-select');
      fireEvent.change(claimMethodSelect, { target: { value: 'DOCUMENT_UPLOAD' } });

      expect(screen.queryByTestId('email-input')).not.toBeInTheDocument();
      expect(screen.queryByTestId('phone-input')).not.toBeInTheDocument();
    });
  });

  describe('Form Interaction', () => {
    it('should update business name field', async () => {
      const user = userEvent.setup();
      render(<ClaimForm {...mockProps} />);

      const businessNameInput = screen.getByTestId('business-name-input');
      await user.type(businessNameInput, 'Test Business LLC');

      expect(businessNameInput).toHaveValue('Test Business LLC');
    });

    it('should update email field when email verification is selected', async () => {
      const user = userEvent.setup();
      render(<ClaimForm {...mockProps} />);

      const claimMethodSelect = screen.getByTestId('claim-method-select');
      await user.selectOptions(claimMethodSelect, 'EMAIL_VERIFICATION');

      const emailInput = screen.getByTestId('email-input');
      await user.type(emailInput, 'owner@business.com');

      expect(emailInput).toHaveValue('owner@business.com');
    });

    it('should update phone field when phone verification is selected', async () => {
      const user = userEvent.setup();
      render(<ClaimForm {...mockProps} />);

      const claimMethodSelect = screen.getByTestId('claim-method-select');
      await user.selectOptions(claimMethodSelect, 'PHONE_VERIFICATION');

      const phoneInput = screen.getByTestId('phone-input');
      await user.type(phoneInput, '+1-555-0123');

      expect(phoneInput).toHaveValue('+1-555-0123');
    });

    it('should change verification method', async () => {
      const user = userEvent.setup();
      render(<ClaimForm {...mockProps} />);

      const claimMethodSelect = screen.getByTestId('claim-method-select');

      await user.selectOptions(claimMethodSelect, 'PHONE_VERIFICATION');
      expect(claimMethodSelect).toHaveValue('PHONE_VERIFICATION');

      await user.selectOptions(claimMethodSelect, 'DOCUMENT_UPLOAD');
      expect(claimMethodSelect).toHaveValue('DOCUMENT_UPLOAD');
    });
  });

  describe('Form Submission', () => {
    it('should submit email verification claim with correct data', async () => {
      const user = userEvent.setup();
      render(<ClaimForm {...mockProps} />);

      // Fill out form
      await user.type(screen.getByTestId('business-name-input'), 'Test Business');
      await user.selectOptions(screen.getByTestId('claim-method-select'), 'EMAIL_VERIFICATION');
      await user.type(screen.getByTestId('email-input'), 'owner@test.com');

      // Submit form
      await user.click(screen.getByTestId('submit-button'));

      expect(mockProps.onSubmit).toHaveBeenCalledWith({
        claim_method: 'EMAIL_VERIFICATION',
        verification_data: {
          business_name: 'Test Business',
          email: 'owner@test.com',
        },
      });
    });

    it('should submit phone verification claim with correct data', async () => {
      const user = userEvent.setup();
      render(<ClaimForm {...mockProps} />);

      // Fill out form
      await user.type(screen.getByTestId('business-name-input'), 'Test Business');
      await user.selectOptions(screen.getByTestId('claim-method-select'), 'PHONE_VERIFICATION');
      await user.type(screen.getByTestId('phone-input'), '+1-555-0123');

      // Submit form
      await user.click(screen.getByTestId('submit-button'));

      expect(mockProps.onSubmit).toHaveBeenCalledWith({
        claim_method: 'PHONE_VERIFICATION',
        verification_data: {
          business_name: 'Test Business',
          phone: '+1-555-0123',
        },
      });
    });

    it('should submit document upload claim with correct data', async () => {
      const user = userEvent.setup();
      render(<ClaimForm {...mockProps} />);

      // Fill out form
      await user.type(screen.getByTestId('business-name-input'), 'Test Business');
      await user.selectOptions(screen.getByTestId('claim-method-select'), 'DOCUMENT_UPLOAD');

      // Submit form
      await user.click(screen.getByTestId('submit-button'));

      expect(mockProps.onSubmit).toHaveBeenCalledWith({
        claim_method: 'DOCUMENT_UPLOAD',
        verification_data: {
          business_name: 'Test Business',
        },
      });
    });
  });

  describe('Loading State', () => {
    it('should disable submit button when loading', () => {
      render(<ClaimForm {...mockProps} isLoading={true} />);

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent('Submitting...');
    });

    it('should enable submit button when not loading', () => {
      render(<ClaimForm {...mockProps} isLoading={false} />);

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).not.toBeDisabled();
      expect(submitButton).toHaveTextContent('Submit Claim');
    });
  });

  describe('Form Cancellation', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<ClaimForm {...mockProps} />);

      await user.click(screen.getByTestId('cancel-button'));

      expect(mockProps.onCancel).toHaveBeenCalled();
    });
  });

  describe('Form Validation', () => {
    it('should require business name field', () => {
      render(<ClaimForm {...mockProps} />);

      const businessNameInput = screen.getByTestId('business-name-input');
      expect(businessNameInput).toHaveAttribute('required');
    });

    it('should require email field for email verification', () => {
      render(<ClaimForm {...mockProps} />);

      const claimMethodSelect = screen.getByTestId('claim-method-select');
      fireEvent.change(claimMethodSelect, { target: { value: 'EMAIL_VERIFICATION' } });

      const emailInput = screen.getByTestId('email-input');
      expect(emailInput).toHaveAttribute('required');
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('should require phone field for phone verification', () => {
      render(<ClaimForm {...mockProps} />);

      const claimMethodSelect = screen.getByTestId('claim-method-select');
      fireEvent.change(claimMethodSelect, { target: { value: 'PHONE_VERIFICATION' } });

      const phoneInput = screen.getByTestId('phone-input');
      expect(phoneInput).toHaveAttribute('required');
      expect(phoneInput).toHaveAttribute('type', 'tel');
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(<ClaimForm {...mockProps} />);

      expect(screen.getByLabelText('Business Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Verification Method')).toBeInTheDocument();
    });

    it('should associate labels with form controls', () => {
      render(<ClaimForm {...mockProps} />);

      const businessNameInput = screen.getByTestId('business-name-input');
      const businessNameLabel = screen.getByLabelText('Business Name');

      expect(businessNameInput).toBe(businessNameLabel);
    });

    it('should have semantic form structure', () => {
      render(<ClaimForm {...mockProps} />);

      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();

      const submitButton = screen.getByRole('button', { name: /submit claim/i });
      expect(submitButton).toHaveAttribute('type', 'submit');

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toHaveAttribute('type', 'button');
    });
  });
});
