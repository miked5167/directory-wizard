'use client';

import React from 'react';

export interface WizardStep {
  id: string;
  name: string;
  completed: boolean;
}

export interface WizardStepperProps {
  currentStep: string;
  steps: WizardStep[];
  onStepClick?: (stepId: string) => void;
}

const WizardStepper: React.FC<WizardStepperProps> = ({
  currentStep,
  steps,
  onStepClick,
}) => {
  return (
    <div data-testid="wizard-stepper">
      <nav aria-label="Progress">
        <ol className="flex items-center">
          {steps.map((step, index) => (
            <li
              key={step.id}
              className={`relative ${index !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}
            >
              <button
                type="button"
                className={`group relative w-8 h-8 flex items-center justify-center rounded-full transition-colors duration-200 ${
                  step.id === currentStep
                    ? 'bg-blue-600 text-white'
                    : step.completed
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                }`}
                onClick={() => onStepClick?.(step.id)}
                data-testid={`step-${step.id}`}
                aria-current={step.id === currentStep ? 'step' : undefined}
              >
                <span className="text-sm font-medium">{index + 1}</span>
              </button>

              <span className="ml-2 text-sm font-medium text-gray-900">
                {step.name}
              </span>

              {/* Connector line */}
              {index !== steps.length - 1 && (
                <div className="absolute top-4 left-8 hidden w-8 sm:w-20 h-0.5 bg-gray-200 sm:block">
                  <div
                    className={`h-full transition-all duration-300 ${
                      step.completed ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                </div>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
};

export default WizardStepper;