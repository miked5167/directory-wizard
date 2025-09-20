'use client';

import React from 'react';

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'current' | 'completed' | 'error';
  optional?: boolean;
}

export interface WizardProgressProps {
  steps: WizardStep[];
  currentStepId: string;
  className?: string;
  showDescription?: boolean;
  variant?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
}

const WizardProgress: React.FC<WizardProgressProps> = ({
  steps,
  currentStepId,
  className = '',
  showDescription = true,
  variant = 'horizontal',
  size = 'md',
}) => {
  const currentStepIndex = steps.findIndex(step => step.id === currentStepId);
  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const totalSteps = steps.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          stepSize: 'w-6 h-6',
          fontSize: 'text-xs',
          spacing: variant === 'horizontal' ? 'space-x-2' : 'space-y-2',
        };
      case 'md':
        return {
          stepSize: 'w-8 h-8',
          fontSize: 'text-sm',
          spacing: variant === 'horizontal' ? 'space-x-4' : 'space-y-4',
        };
      case 'lg':
        return {
          stepSize: 'w-10 h-10',
          fontSize: 'text-base',
          spacing: variant === 'horizontal' ? 'space-x-6' : 'space-y-6',
        };
      default:
        return {
          stepSize: 'w-8 h-8',
          fontSize: 'text-sm',
          spacing: variant === 'horizontal' ? 'space-x-4' : 'space-y-4',
        };
    }
  };

  const getStepClasses = (step: WizardStep, index: number) => {
    const baseClasses = `
      flex items-center justify-center rounded-full border-2 font-medium
      ${getSizeClasses().stepSize}
      ${getSizeClasses().fontSize}
    `;

    switch (step.status) {
      case 'completed':
        return `${baseClasses} bg-green-600 border-green-600 text-white`;
      case 'current':
        return `${baseClasses} bg-blue-600 border-blue-600 text-white ring-4 ring-blue-200`;
      case 'error':
        return `${baseClasses} bg-red-600 border-red-600 text-white`;
      case 'pending':
      default:
        return `${baseClasses} bg-white border-gray-300 text-gray-500`;
    }
  };

  const getConnectorClasses = (fromStep: WizardStep, toStep: WizardStep) => {
    const isCompleted = fromStep.status === 'completed';
    const baseClasses = variant === 'horizontal'
      ? 'flex-1 h-0.5 mx-2'
      : 'w-0.5 h-8 my-1 mx-auto';

    return `${baseClasses} ${isCompleted ? 'bg-green-600' : 'bg-gray-300'}`;
  };

  const renderStepIcon = (step: WizardStep, index: number) => {
    if (step.status === 'completed') {
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    }

    if (step.status === 'error') {
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    }

    return index + 1;
  };

  const renderHorizontalLayout = () => (
    <div className={`flex items-center w-full ${className}`} data-testid="wizard-progress-horizontal">
      {/* Overall Progress Bar */}
      <div className="w-full mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Step {currentStepIndex + 1} of {totalSteps}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round(progressPercentage)}% complete
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-between w-full">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <div
                className={getStepClasses(step, index)}
                data-testid={`step-${step.id}`}
                role="progressbar"
                aria-valuenow={step.status === 'completed' ? 100 : step.status === 'current' ? 50 : 0}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Step ${index + 1}: ${step.title}`}
              >
                {renderStepIcon(step, index)}
              </div>

              {/* Step Label */}
              <div className="mt-2 text-center">
                <div className={`
                  font-medium
                  ${step.status === 'current' ? 'text-blue-600' :
                    step.status === 'completed' ? 'text-green-600' :
                    step.status === 'error' ? 'text-red-600' :
                    'text-gray-500'}
                  ${getSizeClasses().fontSize}
                `}>
                  {step.title}
                  {step.optional && (
                    <span className="text-xs text-gray-400 ml-1">(Optional)</span>
                  )}
                </div>
                {showDescription && step.description && (
                  <div className="text-xs text-gray-400 mt-1 max-w-24">
                    {step.description}
                  </div>
                )}
              </div>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className={getConnectorClasses(step, steps[index + 1])} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  const renderVerticalLayout = () => (
    <div className={`flex flex-col ${getSizeClasses().spacing} ${className}`} data-testid="wizard-progress-vertical">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          {/* Step Row */}
          <div className="flex items-start">
            {/* Step Circle */}
            <div
              className={getStepClasses(step, index)}
              data-testid={`step-${step.id}`}
              role="progressbar"
              aria-valuenow={step.status === 'completed' ? 100 : step.status === 'current' ? 50 : 0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Step ${index + 1}: ${step.title}`}
            >
              {renderStepIcon(step, index)}
            </div>

            {/* Step Content */}
            <div className="ml-4 flex-1">
              <div className={`
                font-medium
                ${step.status === 'current' ? 'text-blue-600' :
                  step.status === 'completed' ? 'text-green-600' :
                  step.status === 'error' ? 'text-red-600' :
                  'text-gray-500'}
                ${getSizeClasses().fontSize}
              `}>
                {step.title}
                {step.optional && (
                  <span className="text-xs text-gray-400 ml-1">(Optional)</span>
                )}
              </div>
              {showDescription && step.description && (
                <div className="text-sm text-gray-400 mt-1">
                  {step.description}
                </div>
              )}
            </div>
          </div>

          {/* Connector Line */}
          {index < steps.length - 1 && (
            <div className="flex justify-start ml-4">
              <div className={getConnectorClasses(step, steps[index + 1])} />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );

  return variant === 'horizontal' ? renderHorizontalLayout() : renderVerticalLayout();
};

export default WizardProgress;