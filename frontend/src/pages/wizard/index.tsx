'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import WizardStepper from '../../components/wizard/WizardStepper';

export interface WizardSession {
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
    };
    content?: {
      uploadedFiles: string[];
      processedCount: number;
      totalCount: number;
    };
    publishing?: {
      jobId?: string;
      status?: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
    };
  };
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface WizardMainPageProps {
  initialSession?: WizardSession;
  onCreateSession?: () => Promise<WizardSession>;
  onLoadSession?: (sessionId: string) => Promise<WizardSession>;
}

const WizardMainPage: React.FC<WizardMainPageProps> = ({
  initialSession,
  onCreateSession,
  onLoadSession,
}) => {
  const router = useRouter();
  const [session, setSession] = useState<WizardSession | null>(initialSession || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSessions, setRecentSessions] = useState<WizardSession[]>([]);

  const steps = [
    { id: 'basic-info', name: 'Basic Information', completed: false },
    { id: 'branding', name: 'Branding & Design', completed: false },
    { id: 'content', name: 'Content Upload', completed: false },
    { id: 'preview', name: 'Preview & Review', completed: false },
    { id: 'publish', name: 'Publish', completed: false },
  ];

  // Update steps completion based on session data
  const getStepsWithCompletion = (currentSession: WizardSession | null) => {
    if (!currentSession) return steps;

    return steps.map((step, index) => ({
      ...step,
      completed: currentSession.completedSteps.includes(index),
    }));
  };

  // Load recent sessions from localStorage
  useEffect(() => {
    const savedSessions = localStorage.getItem('wizard_recent_sessions');
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        setRecentSessions(parsed.slice(0, 3)); // Show last 3 sessions
      } catch (err) {
        console.error('Failed to parse recent sessions:', err);
      }
    }
  }, []);

  // Save session to recent sessions
  const saveToRecentSessions = (sessionData: WizardSession) => {
    const updated = [sessionData, ...recentSessions.filter(s => s.sessionId !== sessionData.sessionId)];
    const limited = updated.slice(0, 3);
    setRecentSessions(limited);
    localStorage.setItem('wizard_recent_sessions', JSON.stringify(limited));
  };

  const handleCreateNewDirectory = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (onCreateSession) {
        const newSession = await onCreateSession();
        setSession(newSession);
        saveToRecentSessions(newSession);
        router.push(`/wizard/basic-info?session=${newSession.sessionId}`);
      } else {
        // Fallback: create session locally
        const newSession: WizardSession = {
          sessionId: `session_${Date.now()}`,
          currentStep: 0,
          completedSteps: [],
          data: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        };
        setSession(newSession);
        saveToRecentSessions(newSession);
        router.push(`/wizard/basic-info?session=${newSession.sessionId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create new directory');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueSession = async (sessionId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      if (onLoadSession) {
        const loadedSession = await onLoadSession(sessionId);
        setSession(loadedSession);

        // Navigate to the appropriate step
        const nextStep = Math.max(0, loadedSession.currentStep);
        const stepRoute = steps[nextStep]?.id || 'basic-info';
        router.push(`/wizard/${stepRoute}?session=${sessionId}`);
      } else {
        // Fallback: load from recent sessions
        const sessionData = recentSessions.find(s => s.sessionId === sessionId);
        if (sessionData) {
          setSession(sessionData);
          const nextStep = Math.max(0, sessionData.currentStep);
          const stepRoute = steps[nextStep]?.id || 'basic-info';
          router.push(`/wizard/${stepRoute}?session=${sessionId}`);
        } else {
          throw new Error('Session not found');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) {
      return `${days} day${days === 1 ? '' : 's'} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else {
      return 'Just now';
    }
  };

  const getSessionProgress = (sessionData: WizardSession) => {
    return Math.round((sessionData.completedSteps.length / steps.length) * 100);
  };

  const getSessionStatusText = (sessionData: WizardSession) => {
    if (sessionData.data.publishing?.status === 'COMPLETED') {
      return 'Published';
    } else if (sessionData.data.publishing?.status === 'RUNNING') {
      return 'Publishing...';
    } else if (sessionData.completedSteps.length === 0) {
      return 'Not started';
    } else if (sessionData.completedSteps.length === steps.length) {
      return 'Ready to publish';
    } else {
      return `Step ${sessionData.currentStep + 1} of ${steps.length}`;
    }
  };

  return (
    <div data-testid="wizard-main-page" className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">
              Directory Creation Wizard
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Create and publish your professional directory in minutes
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-md p-4" data-testid="error-message">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Action */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-8 sm:px-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Create New Directory
                  </h2>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    Start building your professional directory website. Our step-by-step wizard will guide you through the entire process.
                  </p>
                  <button
                    onClick={handleCreateNewDirectory}
                    disabled={isLoading}
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    data-testid="create-new-button"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Start New Directory
                      </>
                    )}
                  </button>
                </div>

                {/* Process Overview */}
                <div className="mt-12 border-t border-gray-200 pt-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-6 text-center">
                    How It Works
                  </h3>
                  <WizardStepper
                    steps={steps}
                    currentStep={-1}
                    className="max-w-4xl mx-auto"
                  />
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {steps.map((step, index) => (
                      <div key={step.id} className="text-center">
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          {step.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {index === 0 && 'Set up basic details'}
                          {index === 1 && 'Customize appearance'}
                          {index === 2 && 'Upload your listings'}
                          {index === 3 && 'Review everything'}
                          {index === 4 && 'Go live instantly'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Sessions Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Recent Sessions
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Continue where you left off
                </p>
              </div>
              <div className="p-6">
                {recentSessions.length === 0 ? (
                  <div className="text-center py-8" data-testid="no-recent-sessions">
                    <div className="text-gray-400 mb-4">
                      <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500">
                      No recent sessions found
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Your progress will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4" data-testid="recent-sessions-list">
                    {recentSessions.map((sessionData) => (
                      <div
                        key={sessionData.sessionId}
                        className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors cursor-pointer"
                        onClick={() => handleContinueSession(sessionData.sessionId)}
                        data-testid={`session-${sessionData.sessionId}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-medium text-gray-900">
                            {sessionData.data.basicInfo?.name || 'Untitled Directory'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatTimeAgo(sessionData.updatedAt)}
                          </div>
                        </div>
                        {sessionData.data.basicInfo?.domain && (
                          <div className="text-xs text-blue-600 mb-2">
                            {sessionData.data.basicInfo.domain}
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-500">
                            {getSessionStatusText(sessionData)}
                          </div>
                          <div className="flex items-center">
                            <div className="text-xs text-gray-500 mr-2">
                              {getSessionProgress(sessionData)}%
                            </div>
                            <div className="w-16 bg-gray-200 rounded-full h-1">
                              <div
                                className="bg-blue-500 h-1 rounded-full transition-all"
                                style={{ width: `${getSessionProgress(sessionData)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Features Highlight */}
            <div className="mt-6 bg-blue-50 rounded-lg p-6">
              <h4 className="text-sm font-medium text-blue-900 mb-3">
                What You'll Get
              </h4>
              <ul className="text-xs text-blue-800 space-y-2">
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Professional, mobile-responsive design
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Powerful search and filtering
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Custom domain and branding
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Business claiming system
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Fast, reliable hosting
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WizardMainPage;