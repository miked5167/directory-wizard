'use client';

import { Page } from '@playwright/test';

// Quickstart validation scenarios for critical application paths
export interface QuickstartScenario {
  id: string;
  name: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedTime: number; // in seconds
  steps: QuickstartStep[];
  expectedOutcome: string;
  rollbackSteps?: QuickstartStep[];
}

export interface QuickstartStep {
  action: string;
  selector?: string;
  value?: string;
  timeout?: number;
  validation?: {
    type: 'exists' | 'visible' | 'text' | 'value' | 'count' | 'url';
    target: string;
    expected: string | number;
  };
  screenshot?: boolean;
}

export interface QuickstartResult {
  scenarioId: string;
  success: boolean;
  duration: number;
  error?: string;
  screenshots: string[];
  stepResults: StepResult[];
}

export interface StepResult {
  stepIndex: number;
  action: string;
  success: boolean;
  duration: number;
  error?: string;
  screenshot?: string;
}

// Critical quickstart scenarios
export const QUICKSTART_SCENARIOS: QuickstartScenario[] = [
  {
    id: 'wizard-complete-flow',
    name: 'Complete Wizard Flow',
    description: 'Test the entire directory creation wizard from start to finish',
    priority: 'critical',
    estimatedTime: 120,
    expectedOutcome: 'Directory successfully created and published',
    steps: [
      {
        action: 'navigate',
        value: '/wizard',
        validation: {
          type: 'visible',
          target: '[data-testid="wizard-stepper"]',
          expected: 'true',
        },
      },
      {
        action: 'fill',
        selector: '[data-testid="name-input"]',
        value: 'Quickstart Test Directory',
      },
      {
        action: 'fill',
        selector: '[data-testid="domain-input"]',
        value: 'quickstart-test',
      },
      {
        action: 'select',
        selector: '[data-testid="category-select"]',
        value: 'business',
      },
      {
        action: 'fill',
        selector: '[data-testid="description-textarea"]',
        value: 'A test directory created during quickstart validation',
      },
      {
        action: 'fill',
        selector: '[data-testid="website-input"]',
        value: 'https://quickstart-test.example.com',
      },
      {
        action: 'fill',
        selector: '[data-testid="contact-email-input"]',
        value: 'contact@quickstart-test.com',
      },
      {
        action: 'fill',
        selector: '[data-testid="phone-input"]',
        value: '+1 (555) 123-4567',
      },
      {
        action: 'click',
        selector: '[data-testid="next-button"]',
        validation: {
          type: 'visible',
          target: '[data-testid="wizard-step-2"]',
          expected: 'true',
        },
      },
      {
        action: 'click',
        selector: '[data-testid="add-category-button"]',
      },
      {
        action: 'fill',
        selector: '[data-testid="category-name-input"]',
        value: 'Restaurants',
      },
      {
        action: 'fill',
        selector: '[data-testid="category-description-input"]',
        value: 'Local dining establishments',
      },
      {
        action: 'click',
        selector: '[data-testid="add-category-button"]',
      },
      {
        action: 'fill',
        selector: '[data-testid="category-name-input"]:last-of-type',
        value: 'Services',
      },
      {
        action: 'fill',
        selector: '[data-testid="category-description-input"]:last-of-type',
        value: 'Professional services',
      },
      {
        action: 'click',
        selector: '[data-testid="next-button"]',
        validation: {
          type: 'visible',
          target: '[data-testid="wizard-step-3"]',
          expected: 'true',
        },
      },
      {
        action: 'upload',
        selector: '[data-testid="file-input"]',
        value: 'test-data.csv',
        timeout: 30000,
      },
      {
        action: 'wait',
        validation: {
          type: 'visible',
          target: '[data-testid="upload-success"]',
          expected: 'true',
        },
        timeout: 30000,
      },
      {
        action: 'click',
        selector: '[data-testid="next-button"]',
        validation: {
          type: 'visible',
          target: '[data-testid="wizard-step-4"]',
          expected: 'true',
        },
      },
      {
        action: 'fill',
        selector: '[data-testid="primary-color-picker"]',
        value: '#3B82F6',
      },
      {
        action: 'fill',
        selector: '[data-testid="secondary-color-picker"]',
        value: '#1F2937',
      },
      {
        action: 'select',
        selector: '[data-testid="font-family-select"]',
        value: 'Inter',
      },
      {
        action: 'click',
        selector: '[data-testid="preview-button"]',
      },
      {
        action: 'wait',
        validation: {
          type: 'visible',
          target: '[data-testid="preview-modal"]',
          expected: 'true',
        },
      },
      {
        action: 'click',
        selector: '[data-testid="close-preview-button"]',
      },
      {
        action: 'click',
        selector: '[data-testid="next-button"]',
        validation: {
          type: 'visible',
          target: '[data-testid="wizard-step-5"]',
          expected: 'true',
        },
      },
      {
        action: 'click',
        selector: '[data-testid="publish-button"]',
        timeout: 60000,
      },
      {
        action: 'wait',
        validation: {
          type: 'visible',
          target: '[data-testid="success-message"]',
          expected: 'true',
        },
        timeout: 60000,
        screenshot: true,
      },
    ],
  },
  {
    id: 'claim-submission-flow',
    name: 'Business Claim Submission',
    description: 'Test submitting a business claim with email verification',
    priority: 'critical',
    estimatedTime: 60,
    expectedOutcome: 'Claim successfully submitted and appears in dashboard',
    steps: [
      {
        action: 'navigate',
        value: '/auth/register',
      },
      {
        action: 'fill',
        selector: '[data-testid="first-name-input"]',
        value: 'John',
      },
      {
        action: 'fill',
        selector: '[data-testid="last-name-input"]',
        value: 'Smith',
      },
      {
        action: 'fill',
        selector: '[data-testid="email-input"]',
        value: 'john.smith@quickstart.com',
      },
      {
        action: 'fill',
        selector: '[data-testid="password-input"]',
        value: 'TestPassword123!',
      },
      {
        action: 'fill',
        selector: '[data-testid="confirm-password-input"]',
        value: 'TestPassword123!',
      },
      {
        action: 'click',
        selector: '[data-testid="register-button"]',
      },
      {
        action: 'navigate',
        value: '/listings/test-listing-123/claim',
      },
      {
        action: 'wait',
        validation: {
          type: 'visible',
          target: '[data-testid="claim-form"]',
          expected: 'true',
        },
      },
      {
        action: 'click',
        selector: '[data-testid="method-email_verification"]',
      },
      {
        action: 'fill',
        selector: '[data-testid="email-input"]',
        value: 'contact@testbusiness.com',
      },
      {
        action: 'fill',
        selector: '[data-testid="contact-person-input"]',
        value: 'John Smith',
      },
      {
        action: 'select',
        selector: '[data-testid="relationship-select"]',
        value: 'owner',
      },
      {
        action: 'fill',
        selector: '[data-testid="additional-info-textarea"]',
        value: 'I am the owner of this business and need to update the listing information.',
      },
      {
        action: 'click',
        selector: '[data-testid="submit-button"]',
      },
      {
        action: 'wait',
        validation: {
          type: 'visible',
          target: '[data-testid="claim-success-page"]',
          expected: 'true',
        },
        screenshot: true,
      },
      {
        action: 'click',
        selector: '[data-testid="view-claim-button"]',
      },
      {
        action: 'wait',
        validation: {
          type: 'visible',
          target: '[data-testid="user-claims-dashboard"]',
          expected: 'true',
        },
      },
    ],
  },
  {
    id: 'error-handling-validation',
    name: 'Error Handling Validation',
    description: 'Test error boundaries and error handling across the application',
    priority: 'high',
    estimatedTime: 45,
    expectedOutcome: 'Errors are gracefully handled without breaking the application',
    steps: [
      {
        action: 'navigate',
        value: '/wizard',
      },
      {
        action: 'click',
        selector: '[data-testid="next-button"]',
        validation: {
          type: 'visible',
          target: '[data-testid="name-error"]',
          expected: 'true',
        },
      },
      {
        action: 'fill',
        selector: '[data-testid="domain-input"]',
        value: 'Invalid Domain!',
      },
      {
        action: 'click',
        selector: '[data-testid="next-button"]',
        validation: {
          type: 'visible',
          target: '[data-testid="domain-error"]',
          expected: 'true',
        },
      },
      {
        action: 'fill',
        selector: '[data-testid="contact-email-input"]',
        value: 'invalid-email',
      },
      {
        action: 'click',
        selector: '[data-testid="next-button"]',
        validation: {
          type: 'visible',
          target: '[data-testid="contact-email-error"]',
          expected: 'true',
        },
      },
      {
        action: 'navigate',
        value: '/listings/nonexistent/claim',
        validation: {
          type: 'visible',
          target: '[data-testid="error-message"]',
          expected: 'true',
        },
        screenshot: true,
      },
    ],
  },
  {
    id: 'performance-validation',
    name: 'Performance Validation',
    description: 'Test application performance under typical usage conditions',
    priority: 'high',
    estimatedTime: 30,
    expectedOutcome: 'Application meets performance benchmarks',
    steps: [
      {
        action: 'navigate',
        value: '/wizard',
        validation: {
          type: 'visible',
          target: '[data-testid="wizard-stepper"]',
          expected: 'true',
        },
        timeout: 3000, // Should load within 3 seconds
      },
      {
        action: 'fill',
        selector: '[data-testid="name-input"]',
        value: 'Performance Test Directory',
      },
      {
        action: 'click',
        selector: '[data-testid="next-button"]',
        timeout: 2000, // Step transition should be under 2 seconds
      },
      {
        action: 'navigate',
        value: '/dashboard/claims',
        validation: {
          type: 'visible',
          target: '[data-testid="user-claims-dashboard"]',
          expected: 'true',
        },
        timeout: 3000,
      },
    ],
  },
  {
    id: 'mobile-responsiveness',
    name: 'Mobile Responsiveness',
    description: 'Test application functionality on mobile devices',
    priority: 'medium',
    estimatedTime: 30,
    expectedOutcome: 'Application works correctly on mobile viewport',
    steps: [
      {
        action: 'setViewport',
        value: '375x667', // iPhone SE
      },
      {
        action: 'navigate',
        value: '/wizard',
      },
      {
        action: 'wait',
        validation: {
          type: 'visible',
          target: '[data-testid="wizard-stepper"]',
          expected: 'true',
        },
      },
      {
        action: 'fill',
        selector: '[data-testid="name-input"]',
        value: 'Mobile Test Directory',
      },
      {
        action: 'scroll',
        selector: '[data-testid="description-textarea"]',
      },
      {
        action: 'fill',
        selector: '[data-testid="description-textarea"]',
        value: 'Testing mobile interface',
      },
      {
        action: 'click',
        selector: '[data-testid="next-button"]',
        screenshot: true,
      },
    ],
  },
  {
    id: 'file-upload-validation',
    name: 'File Upload Security',
    description: 'Test file upload validation and security measures',
    priority: 'critical',
    estimatedTime: 45,
    expectedOutcome: 'File uploads are properly validated and secured',
    steps: [
      {
        action: 'navigate',
        value: '/wizard',
      },
      {
        action: 'fill',
        selector: '[data-testid="name-input"]',
        value: 'File Upload Test',
      },
      {
        action: 'click',
        selector: '[data-testid="next-button"]',
      },
      {
        action: 'click',
        selector: '[data-testid="next-button"]',
      },
      {
        action: 'upload',
        selector: '[data-testid="file-input"]',
        value: 'invalid.txt',
        validation: {
          type: 'visible',
          target: '[data-testid="upload-error"]',
          expected: 'true',
        },
      },
      {
        action: 'upload',
        selector: '[data-testid="file-input"]',
        value: 'valid-data.csv',
        validation: {
          type: 'visible',
          target: '[data-testid="upload-success"]',
          expected: 'true',
        },
        timeout: 30000,
        screenshot: true,
      },
    ],
  },
];

// Test data for scenarios
export const QUICKSTART_TEST_DATA = {
  'test-data.csv': `name,description,category,phone,email,website
Test Restaurant,Great food and service,Restaurants,555-0101,restaurant@test.com,https://restaurant.test
Test Store,Quality retail products,Retail,555-0102,store@test.com,https://store.test
Test Service,Professional services,Services,555-0103,service@test.com,https://service.test`,

  'valid-data.csv': `name,description,category,phone,email,website
Valid Business 1,Description 1,Services,555-1001,valid1@test.com,https://valid1.test
Valid Business 2,Description 2,Retail,555-1002,valid2@test.com,https://valid2.test`,

  'invalid.txt': `This is not a CSV file and should be rejected by the upload validation.`,
};

export default QUICKSTART_SCENARIOS;