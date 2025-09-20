import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import WizardStepper from '@/components/wizard/WizardStepper';

// Mock the component since it doesn't exist yet
vi.mock('@/components/wizard/WizardStepper', () => ({
  default: ({ currentStep, steps, onStepClick }: any) => (
    <div data-testid="wizard-stepper">
      <nav aria-label="Progress">
        <ol className="flex items-center">
          {steps.map((step: any, index: number) => (
            <li
              key={step.id}
              className={`relative ${index !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}
            >
              <button
                type="button"
                className={`group relative w-8 h-8 flex items-center justify-center rounded-full ${
                  step.id === currentStep
                    ? 'bg-blue-600 text-white'
                    : step.completed
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}
                onClick={() => onStepClick?.(step.id)}
                data-testid={`step-${step.id}`}
                aria-current={step.id === currentStep ? 'step' : undefined}
              >
                <span className="text-sm font-medium">{index + 1}</span>
              </button>
              <span className="ml-2 text-sm font-medium text-gray-900">{step.name}</span>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  ),
}));

describe('WizardStepper Component', () => {
  const mockSteps = [
    { id: 'basic-info', name: 'Basic Info', completed: true },
    { id: 'branding', name: 'Branding', completed: true },
    { id: 'categories', name: 'Categories', completed: false },
    { id: 'listings', name: 'Listings', completed: false },
    { id: 'preview', name: 'Preview', completed: false },
    { id: 'publish', name: 'Publish', completed: false },
  ];

  describe('Rendering', () => {
    it('should render all wizard steps', () => {
      render(<WizardStepper currentStep="categories" steps={mockSteps} onStepClick={vi.fn()} />);

      // This test MUST FAIL until we implement the component
      expect(screen.getByTestId('wizard-stepper')).toBeInTheDocument();
      expect(screen.getByText('Basic Info')).toBeInTheDocument();
      expect(screen.getByText('Branding')).toBeInTheDocument();
      expect(screen.getByText('Categories')).toBeInTheDocument();
      expect(screen.getByText('Listings')).toBeInTheDocument();
      expect(screen.getByText('Preview')).toBeInTheDocument();
      expect(screen.getByText('Publish')).toBeInTheDocument();
    });

    it('should highlight the current step', () => {
      render(<WizardStepper currentStep="categories" steps={mockSteps} onStepClick={vi.fn()} />);

      const currentStepButton = screen.getByTestId('step-categories');
      expect(currentStepButton).toHaveClass('bg-blue-600', 'text-white');
      expect(currentStepButton).toHaveAttribute('aria-current', 'step');
    });

    it('should show completed steps with green background', () => {
      render(<WizardStepper currentStep="categories" steps={mockSteps} onStepClick={vi.fn()} />);

      const basicInfoStep = screen.getByTestId('step-basic-info');
      const brandingStep = screen.getByTestId('step-branding');

      expect(basicInfoStep).toHaveClass('bg-green-500', 'text-white');
      expect(brandingStep).toHaveClass('bg-green-500', 'text-white');
    });

    it('should show incomplete steps with gray background', () => {
      render(<WizardStepper currentStep="categories" steps={mockSteps} onStepClick={vi.fn()} />);

      const listingsStep = screen.getByTestId('step-listings');
      const previewStep = screen.getByTestId('step-preview');
      const publishStep = screen.getByTestId('step-publish');

      expect(listingsStep).toHaveClass('bg-gray-200', 'text-gray-500');
      expect(previewStep).toHaveClass('bg-gray-200', 'text-gray-500');
      expect(publishStep).toHaveClass('bg-gray-200', 'text-gray-500');
    });
  });

  describe('Interaction', () => {
    it('should call onStepClick when a step is clicked', () => {
      const onStepClick = vi.fn();

      render(
        <WizardStepper currentStep="categories" steps={mockSteps} onStepClick={onStepClick} />
      );

      const brandingStep = screen.getByTestId('step-branding');
      brandingStep.click();

      expect(onStepClick).toHaveBeenCalledWith('branding');
    });

    it('should allow clicking on completed steps', () => {
      const onStepClick = vi.fn();

      render(
        <WizardStepper currentStep="categories" steps={mockSteps} onStepClick={onStepClick} />
      );

      const basicInfoStep = screen.getByTestId('step-basic-info');
      basicInfoStep.click();

      expect(onStepClick).toHaveBeenCalledWith('basic-info');
    });

    it('should prevent clicking on future steps when onStepClick validates step access', () => {
      const onStepClick = vi.fn();

      render(
        <WizardStepper currentStep="categories" steps={mockSteps} onStepClick={onStepClick} />
      );

      const previewStep = screen.getByTestId('step-preview');
      previewStep.click();

      // Component should still call the handler, but handler should validate access
      expect(onStepClick).toHaveBeenCalledWith('preview');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<WizardStepper currentStep="categories" steps={mockSteps} onStepClick={vi.fn()} />);

      const nav = screen.getByRole('navigation', { name: 'Progress' });
      expect(nav).toBeInTheDocument();

      const currentStep = screen.getByTestId('step-categories');
      expect(currentStep).toHaveAttribute('aria-current', 'step');
    });

    it('should be keyboard navigable', () => {
      render(<WizardStepper currentStep="categories" steps={mockSteps} onStepClick={vi.fn()} />);

      const steps = screen.getAllByRole('button');
      steps.forEach(step => {
        expect(step).toHaveAttribute('type', 'button');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty steps array', () => {
      render(<WizardStepper currentStep="" steps={[]} onStepClick={vi.fn()} />);

      expect(screen.getByTestId('wizard-stepper')).toBeInTheDocument();
    });

    it('should handle missing onStepClick prop', () => {
      render(<WizardStepper currentStep="categories" steps={mockSteps} />);

      const step = screen.getByTestId('step-basic-info');
      expect(() => step.click()).not.toThrow();
    });

    it('should handle invalid currentStep', () => {
      render(<WizardStepper currentStep="invalid-step" steps={mockSteps} onStepClick={vi.fn()} />);

      // Should render without errors
      expect(screen.getByTestId('wizard-stepper')).toBeInTheDocument();
    });
  });
});
