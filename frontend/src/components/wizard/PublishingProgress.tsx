'use client';

import React, { useState, useEffect } from 'react';

export interface PublishingStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface PublishingJob {
  jobId: string;
  tenantId: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress: number;
  currentStep: string;
  stepsTotal: number;
  stepsCompleted: number;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  result?: {
    tenantUrl: string;
    adminUrl: string;
  };
}

export interface PublishingProgressProps {
  job?: PublishingJob;
  onCancel?: () => void;
  onRetry?: () => void;
  onComplete?: (result: PublishingJob['result']) => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const PublishingProgress: React.FC<PublishingProgressProps> = ({
  job,
  onCancel,
  onRetry,
  onComplete,
  autoRefresh = true,
  refreshInterval = 2000,
}) => {
  const [localJob, setLocalJob] = useState<PublishingJob | undefined>(job);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Predefined steps based on the backend ProvisioningService
  const steps: PublishingStep[] = [
    {
      id: 'VALIDATE_TENANT',
      name: 'Validating Data',
      description: 'Checking tenant data and requirements',
      status: 'pending',
    },
    {
      id: 'GENERATE_STATIC_SITE',
      name: 'Generating Site',
      description: 'Creating static files and pages',
      status: 'pending',
    },
    {
      id: 'DEPLOY_TO_CDN',
      name: 'Deploying to CDN',
      description: 'Uploading files and configuring delivery',
      status: 'pending',
    },
    {
      id: 'SETUP_SEARCH_INDEX',
      name: 'Setting up Search',
      description: 'Indexing content for search functionality',
      status: 'pending',
    },
    {
      id: 'CONFIGURE_DOMAIN',
      name: 'Configuring Domain',
      description: 'Setting up custom domain and SSL',
      status: 'pending',
    },
    {
      id: 'COMPLETED',
      name: 'Publishing Complete',
      description: 'Your directory is now live!',
      status: 'pending',
    },
  ];

  // Update step statuses based on job progress
  const getStepsWithStatus = (currentJob?: PublishingJob): PublishingStep[] => {
    if (!currentJob) return steps;

    return steps.map((step, index) => {
      if (index < currentJob.stepsCompleted) {
        return { ...step, status: 'completed' as const };
      } else if (step.id === currentJob.currentStep) {
        return {
          ...step,
          status: currentJob.status === 'FAILED' ? 'failed' : 'running' as const,
          error: currentJob.status === 'FAILED' ? currentJob.errorMessage : undefined,
        };
      } else {
        return { ...step, status: 'pending' as const };
      }
    });
  };

  // Simulate job updates (in real app, this would poll the API)
  useEffect(() => {
    if (!autoRefresh || !localJob || localJob.status === 'COMPLETED' || localJob.status === 'FAILED') {
      return;
    }

    const interval = setInterval(async () => {
      setIsRefreshing(true);
      // In a real app, this would fetch from the API
      // For now, we'll simulate progress
      setLocalJob(prev => {
        if (!prev || prev.status === 'COMPLETED' || prev.status === 'FAILED') {
          return prev;
        }

        const newProgress = Math.min(prev.progress + 10, 100);
        const newStepsCompleted = Math.floor((newProgress / 100) * prev.stepsTotal);
        const newCurrentStep = steps[newStepsCompleted]?.id || prev.currentStep;

        const updated: PublishingJob = {
          ...prev,
          progress: newProgress,
          stepsCompleted: newStepsCompleted,
          currentStep: newCurrentStep,
          status: newProgress >= 100 ? 'COMPLETED' : 'RUNNING',
          completedAt: newProgress >= 100 ? new Date().toISOString() : undefined,
          result: newProgress >= 100 ? {
            tenantUrl: `https://example-domain.example.com`,
            adminUrl: `https://example-domain.example.com/admin`,
          } : undefined,
        };

        if (newProgress >= 100 && onComplete) {
          onComplete(updated.result!);
        }

        return updated;
      });
      setIsRefreshing(false);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [localJob, autoRefresh, refreshInterval, onComplete]);

  // Update local job when prop changes
  useEffect(() => {
    setLocalJob(job);
  }, [job]);

  const currentSteps = getStepsWithStatus(localJob);

  const getStepIcon = (step: PublishingStep) => {
    switch (step.status) {
      case 'completed':
        return (
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'running':
        return (
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        );
      case 'failed':
        return (
          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-gray-600">
              {currentSteps.findIndex(s => s.id === step.id) + 1}
            </span>
          </div>
        );
    }
  };

  const formatDuration = (startTime?: string, endTime?: string) => {
    if (!startTime) return null;
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const seconds = Math.floor((end.getTime() - start.getTime()) / 1000);
    return `${seconds}s`;
  };

  return (
    <div data-testid="publishing-progress" className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Publishing Your Directory
              </h2>
              {localJob && (
                <p className="text-sm text-gray-500 mt-1">
                  Job ID: {localJob.jobId}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-3">
              {isRefreshing && (
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              )}
              {localJob?.status === 'RUNNING' && onCancel && (
                <button
                  onClick={onCancel}
                  className="text-red-600 hover:text-red-500 text-sm font-medium"
                  data-testid="cancel-button"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Progress Overview */}
        {localJob && (
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Overall Progress
              </span>
              <span className="text-sm text-gray-500">
                {localJob.stepsCompleted} of {localJob.stepsTotal} steps completed
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  localJob.status === 'FAILED'
                    ? 'bg-red-500'
                    : localJob.status === 'COMPLETED'
                    ? 'bg-green-500'
                    : 'bg-blue-500'
                }`}
                style={{ width: `${localJob.progress}%` }}
                data-testid="progress-bar"
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
              <span>{localJob.progress}% complete</span>
              {localJob.startedAt && (
                <span>
                  Started {formatDuration(localJob.startedAt)} ago
                </span>
              )}
            </div>
          </div>
        )}

        {/* Steps List */}
        <div className="px-6 py-4">
          <div className="space-y-4" data-testid="steps-list">
            {currentSteps.map((step, index) => (
              <div key={step.id} className="flex items-start space-x-4">
                {/* Step Icon */}
                <div className="flex-shrink-0 mt-1">
                  {getStepIcon(step)}
                </div>

                {/* Step Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className={`text-sm font-medium ${
                      step.status === 'failed' ? 'text-red-700' : 'text-gray-900'
                    }`}>
                      {step.name}
                    </h3>
                    {step.status === 'completed' && step.completedAt && (
                      <span className="text-xs text-gray-500">
                        {formatDuration(step.startedAt, step.completedAt)}
                      </span>
                    )}
                  </div>
                  <p className={`text-sm mt-1 ${
                    step.status === 'failed' ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {step.error || step.description}
                  </p>

                  {/* Connector Line */}
                  {index < currentSteps.length - 1 && (
                    <div className="ml-4 mt-4">
                      <div className={`w-0.5 h-6 ${
                        step.status === 'completed' ? 'bg-green-500' : 'bg-gray-200'
                      }`} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status Messages */}
        {localJob?.status === 'COMPLETED' && localJob.result && (
          <div className="px-6 py-4 bg-green-50 border-t border-gray-200" data-testid="success-message">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-green-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-green-800">
                  Directory Published Successfully!
                </h3>
                <p className="text-sm text-green-700 mt-1">
                  Your directory is now live and accessible to users.
                </p>
                <div className="mt-3 space-x-4">
                  <a
                    href={localJob.result.tenantUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-green-800 hover:text-green-700"
                    data-testid="view-site-link"
                  >
                    View Live Site →
                  </a>
                  <a
                    href={localJob.result.adminUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-green-800 hover:text-green-700"
                    data-testid="manage-site-link"
                  >
                    Manage Site →
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {localJob?.status === 'FAILED' && (
          <div className="px-6 py-4 bg-red-50 border-t border-gray-200" data-testid="error-message">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-red-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">
                  Publishing Failed
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  {localJob.errorMessage || 'An error occurred during publishing.'}
                </p>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="mt-3 text-sm font-medium text-red-800 hover:text-red-700"
                    data-testid="retry-button"
                  >
                    Try Again
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {!localJob && (
          <div className="px-6 py-8 text-center" data-testid="no-job-message">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m0 0v2m0-2h2m-2 0h-2m3-7V6a3 3 0 00-3-3H8a3 3 0 00-3 3v4m8-8V4a1 1 0 00-1-1H8a1 1 0 00-1 1v1" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Ready to Publish
            </h3>
            <p className="text-gray-500">
              Start the publishing process to make your directory live.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublishingProgress;