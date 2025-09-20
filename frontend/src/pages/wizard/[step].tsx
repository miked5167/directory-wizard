'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import WizardStepper from '../../components/wizard/WizardStepper';
import BasicInfoForm from '../../components/wizard/BasicInfoForm';
import BrandingConfigurator from '../../components/wizard/BrandingConfigurator';
import FileUploadForm from '../../components/wizard/FileUploadForm';
import PreviewModal from '../../components/wizard/PreviewModal';
import PublishingProgress from '../../components/wizard/PublishingProgress';

export interface WizardStepPageProps {
  step: string;
  sessionId?: string;
}

interface WizardSession {
  sessionId: string;
  tenantId?: string;
  currentStep: number;
  completedSteps: number[];
  data: {
    basicInfo?: {
      name: string;
      domain: string;
      description: string;
      category: string;
      location: string;
    };
    branding?: {
      primaryColor: string;
      secondaryColor: string;
      logoUrl?: string;
      fontFamily: string;
      customFontUrl?: string;
    };
    content?: {
      uploadedFiles: string[];
      processedCount: number;
      totalCount: number;
      categories?: Array<{
        id: string;
        name: string;
        count: number;
      }>;
    };
    publishing?: {
      jobId?: string;
      status?: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
      progress?: number;
    };
  };
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

const WizardStepPage: React.FC<WizardStepPageProps> = ({ step, sessionId }) => {
  const router = useRouter();
  const [session, setSession] = useState<WizardSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const steps = [
    { id: 'basic-info', name: 'Basic Information', completed: false },
    { id: 'branding', name: 'Branding & Design', completed: false },
    { id: 'content', name: 'Content Upload', completed: false },
    { id: 'preview', name: 'Preview & Review', completed: false },
    { id: 'publish', name: 'Publish', completed: false },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === step);
  const isValidStep = currentStepIndex !== -1;

  // Load session data
  useEffect(() => {
    if (!sessionId || !isValidStep) {
      if (!sessionId) {
        setError('No session ID provided');
      } else if (!isValidStep) {
        setError('Invalid step');
      }
      setIsLoading(false);
      return;
    }

    loadSession(sessionId);
  }, [sessionId, step]);

  const loadSession = async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // In a real app, this would fetch from the API
      // For now, try to load from localStorage
      const recentSessions = localStorage.getItem('wizard_recent_sessions');
      if (recentSessions) {
        const sessions = JSON.parse(recentSessions);
        const foundSession = sessions.find((s: WizardSession) => s.sessionId === id);

        if (foundSession) {
          setSession(foundSession);
        } else {
          // Create a new session if not found
          const newSession: WizardSession = {
            sessionId: id,
            currentStep: currentStepIndex,
            completedSteps: [],
            data: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          };
          setSession(newSession);
          saveSession(newSession);
        }
      } else {
        // Create first session
        const newSession: WizardSession = {
          sessionId: id,
          currentStep: currentStepIndex,
          completedSteps: [],
          data: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        };
        setSession(newSession);
        saveSession(newSession);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSession = (sessionData: WizardSession) => {
    // Update recent sessions in localStorage
    const recentSessions = localStorage.getItem('wizard_recent_sessions');
    let sessions: WizardSession[] = [];

    if (recentSessions) {
      sessions = JSON.parse(recentSessions);
    }

    const existingIndex = sessions.findIndex(s => s.sessionId === sessionData.sessionId);
    if (existingIndex !== -1) {
      sessions[existingIndex] = sessionData;
    } else {
      sessions.unshift(sessionData);
    }

    // Keep only last 5 sessions
    sessions = sessions.slice(0, 5);
    localStorage.setItem('wizard_recent_sessions', JSON.stringify(sessions));
  };

  const updateSession = (updates: Partial<WizardSession>) => {
    if (!session) return;

    const updatedSession = {
      ...session,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    setSession(updatedSession);
    saveSession(updatedSession);
  };

  const handleStepComplete = (stepData: any) => {
    if (!session) return;

    const updatedData = { ...session.data };

    // Update step-specific data
    switch (step) {
      case 'basic-info':
        updatedData.basicInfo = stepData;
        break;
      case 'branding':
        updatedData.branding = stepData;
        break;
      case 'content':
        updatedData.content = stepData;
        break;
    }

    // Mark step as completed
    const completedSteps = [...session.completedSteps];
    if (!completedSteps.includes(currentStepIndex)) {
      completedSteps.push(currentStepIndex);
    }

    // Update current step to next step
    const nextStepIndex = Math.min(currentStepIndex + 1, steps.length - 1);

    updateSession({
      data: updatedData,
      completedSteps,
      currentStep: nextStepIndex,
    });

    // Navigate to next step
    if (nextStepIndex < steps.length) {
      const nextStep = steps[nextStepIndex];
      router.push(`/wizard/${nextStep.id}?session=${session.sessionId}`);
    }
  };

  const handleStepBack = () => {
    const previousStepIndex = Math.max(currentStepIndex - 1, 0);
    const previousStep = steps[previousStepIndex];
    router.push(`/wizard/${previousStep.id}?session=${sessionId}`);
  };

  const handlePublish = async () => {
    if (!session) return;

    try {
      // In a real app, this would call the publish API
      const publishingJob = {
        jobId: `job_${Date.now()}`,
        status: 'RUNNING' as const,
        progress: 0,
      };

      updateSession({
        data: {
          ...session.data,
          publishing: publishingJob,
        },
      });

      // Navigate to publish step
      router.push(`/wizard/publish?session=${sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start publishing');
    }
  };

  const getStepsWithCompletion = () => {
    if (!session) return steps;

    return steps.map((stepItem, index) => ({
      ...stepItem,
      completed: session.completedSteps.includes(index),
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading wizard...</p>
        </div>
      </div>
    );
  }

  if (error || !isValidStep || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Unable to Load Wizard
          </h2>
          <p className="text-gray-600 mb-6">
            {error || 'Invalid step or session'}
          </p>
          <button
            onClick={() => router.push('/wizard')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Start
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="wizard-step-page" className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/wizard')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
                data-testid="home-button"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {session.data.basicInfo?.name || 'Directory Wizard'}
                </h1>
                <p className="text-sm text-gray-500">
                  Session: {sessionId}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {step === 'preview' && (
                <button
                  onClick={() => setShowPreview(true)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  data-testid="preview-button"
                >
                  Preview Site
                </button>
              )}
              <div className="text-sm text-gray-500">
                Step {currentStepIndex + 1} of {steps.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Stepper */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <WizardStepper
            steps={getStepsWithCompletion()}
            currentStep={currentStepIndex}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {step === 'basic-info' && (
          <BasicInfoForm
            initialData={session.data.basicInfo}
            onSubmit={handleStepComplete}
            onCancel={() => router.push('/wizard')}
            isLoading={false}
          />
        )}

        {step === 'branding' && (
          <BrandingConfigurator
            initialData={session.data.branding}
            onSubmit={handleStepComplete}
            onBack={handleStepBack}
            isLoading={false}
          />
        )}

        {step === 'content' && (
          <FileUploadForm
            onUpload={handleStepComplete}
            onBack={handleStepBack}
            uploadedFiles={session.data.content?.uploadedFiles || []}
            isLoading={false}
          />
        )}

        {step === 'preview' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Preview Your Directory
                </h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Review your directory configuration before publishing. You can make changes by going back to previous steps.
                </p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="font-medium text-gray-900 mb-2">Basic Information</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div><strong>Name:</strong> {session.data.basicInfo?.name || 'Not set'}</div>
                    <div><strong>Domain:</strong> {session.data.basicInfo?.domain || 'Not set'}</div>
                    <div><strong>Category:</strong> {session.data.basicInfo?.category || 'Not set'}</div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="font-medium text-gray-900 mb-2">Branding</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex items-center">
                      <strong className="mr-2">Colors:</strong>
                      <div className="flex space-x-1">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: session.data.branding?.primaryColor || '#3B82F6' }}
                        />
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: session.data.branding?.secondaryColor || '#64748B' }}
                        />
                      </div>
                    </div>
                    <div><strong>Font:</strong> {session.data.branding?.fontFamily || 'Default'}</div>
                    <div><strong>Logo:</strong> {session.data.branding?.logoUrl ? 'Uploaded' : 'None'}</div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="font-medium text-gray-900 mb-2">Content</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div><strong>Files:</strong> {session.data.content?.uploadedFiles?.length || 0}</div>
                    <div><strong>Processed:</strong> {session.data.content?.processedCount || 0}</div>
                    <div><strong>Categories:</strong> {session.data.content?.categories?.length || 0}</div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <button
                  onClick={handleStepBack}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
                  data-testid="back-button"
                >
                  ← Back to Content
                </button>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setShowPreview(true)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                    data-testid="full-preview-button"
                  >
                    Full Preview
                  </button>
                  <button
                    onClick={handlePublish}
                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    data-testid="publish-button"
                  >
                    Publish Directory
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'publish' && (
          <PublishingProgress
            job={session.data.publishing ? {
              jobId: session.data.publishing.jobId || '',
              tenantId: session.tenantId || '',
              status: session.data.publishing.status || 'QUEUED',
              progress: session.data.publishing.progress || 0,
              currentStep: 'VALIDATE_TENANT',
              stepsTotal: 6,
              stepsCompleted: 0,
            } : undefined}
            onComplete={(result) => {
              console.log('Publishing completed:', result);
              updateSession({
                data: {
                  ...session.data,
                  publishing: {
                    ...session.data.publishing,
                    status: 'COMPLETED',
                    progress: 100,
                  },
                },
              });
            }}
            onRetry={() => handlePublish()}
          />
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <PreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          tenantData={{
            id: session.tenantId || 'preview',
            name: session.data.basicInfo?.name || 'Preview Directory',
            domain: session.data.basicInfo?.domain || 'preview.example.com',
            branding: session.data.branding,
            stats: {
              totalListings: session.data.content?.processedCount || 0,
              totalCategories: session.data.content?.categories?.length || 0,
              lastUpdated: session.updatedAt,
            },
          }}
          onPublish={handlePublish}
        />
      )}
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { step } = context.params as { step: string };
  const { session } = context.query;

  return {
    props: {
      step,
      sessionId: session as string || null,
    },
  };
};

export default WizardStepPage;