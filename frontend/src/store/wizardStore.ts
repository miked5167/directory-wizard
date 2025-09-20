import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { apiClient } from '../services/ApiClient';

export interface WizardStep {
  id: string;
  name: string;
  completed: boolean;
  data?: any;
  errors?: string[];
  lastSaved?: string;
}

export interface TenantData {
  id?: string;
  name?: string;
  domain?: string;
  description?: string;
  category?: string;
  location?: string;
}

export interface BrandingData {
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  fontFamily?: string;
  customFontUrl?: string;
}

export interface ContentData {
  uploadedFiles?: string[];
  processedCount?: number;
  totalCount?: number;
  categories?: Array<{
    id: string;
    name: string;
    count: number;
  }>;
  lastUploadId?: string;
}

export interface PreviewData {
  previewUrl?: string;
  stats?: {
    totalListings: number;
    totalCategories: number;
    lastUpdated: string;
  };
  isReady?: boolean;
}

export interface PublishingData {
  jobId?: string;
  status?: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress?: number;
  currentStep?: string;
  stepsTotal?: number;
  stepsCompleted?: number;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  result?: {
    tenantUrl: string;
    adminUrl: string;
  };
}

export interface WizardSession {
  sessionId: string;
  tenantId?: string;
  currentStep: number;
  completedSteps: number[];
  tenant: TenantData;
  branding: BrandingData;
  content: ContentData;
  preview: PreviewData;
  publishing: PublishingData;
  metadata: {
    createdAt: string;
    updatedAt: string;
    expiresAt: string;
    lastSavedStep?: string;
    autoSaveEnabled: boolean;
  };
}

export interface WizardState {
  // Current session
  session: WizardSession | null;

  // UI state
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  currentStepIndex: number;

  // Steps configuration
  steps: WizardStep[];

  // Actions
  initializeSession: (sessionId?: string) => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  saveSession: (autoSave?: boolean) => Promise<void>;
  clearSession: () => void;

  // Step navigation
  setCurrentStep: (stepIndex: number) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  markStepCompleted: (stepIndex: number) => void;
  markStepIncomplete: (stepIndex: number) => void;

  // Data updates
  updateTenantData: (data: Partial<TenantData>) => void;
  updateBrandingData: (data: Partial<BrandingData>) => void;
  updateContentData: (data: Partial<ContentData>) => void;
  updatePreviewData: (data: Partial<PreviewData>) => void;
  updatePublishingData: (data: Partial<PublishingData>) => void;

  // API actions
  submitBasicInfo: (data: TenantData) => Promise<void>;
  submitBranding: (data: BrandingData) => Promise<void>;
  uploadFiles: (files: FileList, type: 'CSV' | 'JSON') => Promise<void>;
  generatePreview: () => Promise<void>;
  startPublishing: () => Promise<void>;
  pollPublishingStatus: () => Promise<void>;

  // Utility actions
  resetToStep: (stepIndex: number) => void;
  exportSession: () => string;
  importSession: (sessionData: string) => void;
  validateCurrentStep: () => Promise<boolean>;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
}

const STEPS: WizardStep[] = [
  {
    id: 'basic-info',
    name: 'Basic Information',
    completed: false,
  },
  {
    id: 'branding',
    name: 'Branding & Design',
    completed: false,
  },
  {
    id: 'content',
    name: 'Content Upload',
    completed: false,
  },
  {
    id: 'preview',
    name: 'Preview & Review',
    completed: false,
  },
  {
    id: 'publish',
    name: 'Publish',
    completed: false,
  },
];

const createInitialSession = (sessionId?: string): WizardSession => {
  const now = new Date().toISOString();
  const expirationDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

  return {
    sessionId: sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    currentStep: 0,
    completedSteps: [],
    tenant: {},
    branding: {
      primaryColor: '#3B82F6',
      secondaryColor: '#64748B',
      fontFamily: 'Inter',
    },
    content: {
      uploadedFiles: [],
      processedCount: 0,
      totalCount: 0,
      categories: [],
    },
    preview: {
      isReady: false,
    },
    publishing: {},
    metadata: {
      createdAt: now,
      updatedAt: now,
      expiresAt: expirationDate,
      autoSaveEnabled: true,
    },
  };
};

export const useWizardStore = create<WizardState>()(
  devtools(
    persist(
      subscribeWithSelector((set, get) => ({
        // Initial state
        session: null,
        isLoading: false,
        isSaving: false,
        error: null,
        currentStepIndex: 0,
        steps: STEPS,

        // Session management
        initializeSession: async (sessionId?: string) => {
          set({ isLoading: true, error: null });

          try {
            const newSession = createInitialSession(sessionId);
            set({
              session: newSession,
              currentStepIndex: 0,
              steps: STEPS.map(step => ({ ...step, completed: false })),
            });

            // Save to API if available
            await get().saveSession(false);
          } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to initialize session' });
          } finally {
            set({ isLoading: false });
          }
        },

        loadSession: async (sessionId: string) => {
          set({ isLoading: true, error: null });

          try {
            // Try to load from localStorage first
            const persistedState = localStorage.getItem('wizard-session');
            if (persistedState) {
              const parsedState = JSON.parse(persistedState);
              if (parsedState.state?.session?.sessionId === sessionId) {
                const session = parsedState.state.session;

                // Update steps based on completed steps
                const updatedSteps = STEPS.map((step, index) => ({
                  ...step,
                  completed: session.completedSteps.includes(index),
                }));

                set({
                  session,
                  currentStepIndex: session.currentStep || 0,
                  steps: updatedSteps,
                });

                return;
              }
            }

            // If not found locally, try to fetch from API
            // For now, create a new session
            await get().initializeSession(sessionId);
          } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to load session' });
          } finally {
            set({ isLoading: false });
          }
        },

        saveSession: async (autoSave = false) => {
          const { session } = get();
          if (!session) return;

          set({ isSaving: true });

          try {
            const updatedSession = {
              ...session,
              metadata: {
                ...session.metadata,
                updatedAt: new Date().toISOString(),
                lastSavedStep: autoSave ? 'auto' : 'manual',
              },
            };

            set({ session: updatedSession });

            // In a real app, save to API here
            // await apiClient.saveWizardSession(updatedSession);
          } catch (error) {
            if (!autoSave) {
              set({ error: error instanceof Error ? error.message : 'Failed to save session' });
            }
          } finally {
            set({ isSaving: false });
          }
        },

        clearSession: () => {
          set({
            session: null,
            currentStepIndex: 0,
            steps: STEPS.map(step => ({ ...step, completed: false })),
            error: null,
          });
        },

        // Step navigation
        setCurrentStep: (stepIndex: number) => {
          const { session, steps } = get();
          if (!session || stepIndex < 0 || stepIndex >= steps.length) return;

          const updatedSession = {
            ...session,
            currentStep: stepIndex,
            metadata: {
              ...session.metadata,
              updatedAt: new Date().toISOString(),
            },
          };

          set({
            session: updatedSession,
            currentStepIndex: stepIndex,
          });

          // Auto-save
          if (session.metadata.autoSaveEnabled) {
            get().saveSession(true);
          }
        },

        goToNextStep: () => {
          const { currentStepIndex, steps } = get();
          if (currentStepIndex < steps.length - 1) {
            get().setCurrentStep(currentStepIndex + 1);
          }
        },

        goToPreviousStep: () => {
          const { currentStepIndex } = get();
          if (currentStepIndex > 0) {
            get().setCurrentStep(currentStepIndex - 1);
          }
        },

        markStepCompleted: (stepIndex: number) => {
          const { session, steps } = get();
          if (!session) return;

          const completedSteps = [...session.completedSteps];
          if (!completedSteps.includes(stepIndex)) {
            completedSteps.push(stepIndex);
          }

          const updatedSteps = steps.map((step, index) => ({
            ...step,
            completed: completedSteps.includes(index),
          }));

          const updatedSession = {
            ...session,
            completedSteps,
            metadata: {
              ...session.metadata,
              updatedAt: new Date().toISOString(),
            },
          };

          set({
            session: updatedSession,
            steps: updatedSteps,
          });

          // Auto-save
          if (session.metadata.autoSaveEnabled) {
            get().saveSession(true);
          }
        },

        markStepIncomplete: (stepIndex: number) => {
          const { session, steps } = get();
          if (!session) return;

          const completedSteps = session.completedSteps.filter(index => index !== stepIndex);

          const updatedSteps = steps.map((step, index) => ({
            ...step,
            completed: completedSteps.includes(index),
          }));

          const updatedSession = {
            ...session,
            completedSteps,
            metadata: {
              ...session.metadata,
              updatedAt: new Date().toISOString(),
            },
          };

          set({
            session: updatedSession,
            steps: updatedSteps,
          });

          // Auto-save
          if (session.metadata.autoSaveEnabled) {
            get().saveSession(true);
          }
        },

        // Data updates
        updateTenantData: (data: Partial<TenantData>) => {
          const { session } = get();
          if (!session) return;

          const updatedSession = {
            ...session,
            tenant: { ...session.tenant, ...data },
            metadata: {
              ...session.metadata,
              updatedAt: new Date().toISOString(),
            },
          };

          set({ session: updatedSession });

          // Auto-save
          if (session.metadata.autoSaveEnabled) {
            get().saveSession(true);
          }
        },

        updateBrandingData: (data: Partial<BrandingData>) => {
          const { session } = get();
          if (!session) return;

          const updatedSession = {
            ...session,
            branding: { ...session.branding, ...data },
            metadata: {
              ...session.metadata,
              updatedAt: new Date().toISOString(),
            },
          };

          set({ session: updatedSession });

          // Auto-save
          if (session.metadata.autoSaveEnabled) {
            get().saveSession(true);
          }
        },

        updateContentData: (data: Partial<ContentData>) => {
          const { session } = get();
          if (!session) return;

          const updatedSession = {
            ...session,
            content: { ...session.content, ...data },
            metadata: {
              ...session.metadata,
              updatedAt: new Date().toISOString(),
            },
          };

          set({ session: updatedSession });

          // Auto-save
          if (session.metadata.autoSaveEnabled) {
            get().saveSession(true);
          }
        },

        updatePreviewData: (data: Partial<PreviewData>) => {
          const { session } = get();
          if (!session) return;

          const updatedSession = {
            ...session,
            preview: { ...session.preview, ...data },
            metadata: {
              ...session.metadata,
              updatedAt: new Date().toISOString(),
            },
          };

          set({ session: updatedSession });
        },

        updatePublishingData: (data: Partial<PublishingData>) => {
          const { session } = get();
          if (!session) return;

          const updatedSession = {
            ...session,
            publishing: { ...session.publishing, ...data },
            metadata: {
              ...session.metadata,
              updatedAt: new Date().toISOString(),
            },
          };

          set({ session: updatedSession });
        },

        // API actions
        submitBasicInfo: async (data: TenantData) => {
          const { session } = get();
          if (!session) throw new Error('No active session');

          set({ isLoading: true, error: null });

          try {
            // Submit to API
            const response = await apiClient.createTenant({
              name: data.name!,
              domain: data.domain!,
              description: data.description,
              category: data.category,
              location: data.location,
            });

            // Update session with tenant ID
            get().updateTenantData({
              ...data,
              id: response.data.id,
            });

            get().markStepCompleted(0);
            get().goToNextStep();

          } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to submit basic info' });
            throw error;
          } finally {
            set({ isLoading: false });
          }
        },

        submitBranding: async (data: BrandingData) => {
          const { session } = get();
          if (!session || !session.tenantId) throw new Error('No active session or tenant ID');

          set({ isLoading: true, error: null });

          try {
            await apiClient.updateTenantBranding(session.tenantId, {
              primaryColor: data.primaryColor!,
              secondaryColor: data.secondaryColor!,
              logoUrl: data.logoUrl,
              fontFamily: data.fontFamily!,
              customFontUrl: data.customFontUrl,
            });

            get().updateBrandingData(data);
            get().markStepCompleted(1);
            get().goToNextStep();

          } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to submit branding' });
            throw error;
          } finally {
            set({ isLoading: false });
          }
        },

        uploadFiles: async (files: FileList, type: 'CSV' | 'JSON') => {
          const { session } = get();
          if (!session || !session.tenantId) throw new Error('No active session or tenant ID');

          set({ isLoading: true, error: null });

          try {
            const formData = apiClient.createFileUploadFormData(files, type);
            const response = await apiClient.uploadTenantFiles(session.tenantId, formData);

            get().updateContentData({
              uploadedFiles: [...(session.content.uploadedFiles || []), ...Array.from(files).map(f => f.name)],
              processedCount: response.data.processedFiles,
              totalCount: response.data.totalFiles,
              lastUploadId: response.data.uploadId,
            });

            get().markStepCompleted(2);
            get().goToNextStep();

          } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to upload files' });
            throw error;
          } finally {
            set({ isLoading: false });
          }
        },

        generatePreview: async () => {
          const { session } = get();
          if (!session || !session.tenantId) throw new Error('No active session or tenant ID');

          set({ isLoading: true, error: null });

          try {
            const response = await apiClient.getTenantPreview(session.tenantId);

            get().updatePreviewData({
              previewUrl: response.data.previewUrl,
              stats: response.data.stats,
              isReady: true,
            });

            get().markStepCompleted(3);

          } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to generate preview' });
            throw error;
          } finally {
            set({ isLoading: false });
          }
        },

        startPublishing: async () => {
          const { session } = get();
          if (!session || !session.tenantId) throw new Error('No active session or tenant ID');

          set({ isLoading: true, error: null });

          try {
            const response = await apiClient.publishTenant(session.tenantId);

            get().updatePublishingData({
              jobId: response.data.jobId,
              status: 'RUNNING',
              progress: 0,
              startedAt: new Date().toISOString(),
            });

            get().markStepCompleted(4);
            get().goToNextStep();

            // Start polling for status
            get().pollPublishingStatus();

          } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to start publishing' });
            throw error;
          } finally {
            set({ isLoading: false });
          }
        },

        pollPublishingStatus: async () => {
          const { session } = get();
          if (!session || !session.tenantId || !session.publishing.jobId) return;

          try {
            const response = await apiClient.getProvisioningJob(
              session.tenantId,
              session.publishing.jobId
            );

            get().updatePublishingData({
              status: response.data.status,
              progress: response.data.progress,
              currentStep: response.data.currentStep,
              stepsTotal: response.data.stepsTotal,
              stepsCompleted: response.data.stepsCompleted,
              completedAt: response.data.completedAt,
              errorMessage: response.data.errorMessage,
              result: response.data.result,
            });

            // Continue polling if still running
            if (response.data.status === 'RUNNING' || response.data.status === 'QUEUED') {
              setTimeout(() => get().pollPublishingStatus(), 2000);
            }

          } catch (error) {
            console.error('Failed to poll publishing status:', error);
          }
        },

        // Utility actions
        resetToStep: (stepIndex: number) => {
          const { session } = get();
          if (!session) return;

          // Mark all steps after the target step as incomplete
          const completedSteps = session.completedSteps.filter(index => index < stepIndex);

          const updatedSteps = STEPS.map((step, index) => ({
            ...step,
            completed: completedSteps.includes(index),
          }));

          const updatedSession = {
            ...session,
            currentStep: stepIndex,
            completedSteps,
            metadata: {
              ...session.metadata,
              updatedAt: new Date().toISOString(),
            },
          };

          set({
            session: updatedSession,
            currentStepIndex: stepIndex,
            steps: updatedSteps,
          });
        },

        exportSession: () => {
          const { session } = get();
          if (!session) return '';

          return JSON.stringify(session, null, 2);
        },

        importSession: (sessionData: string) => {
          try {
            const session = JSON.parse(sessionData) as WizardSession;

            const updatedSteps = STEPS.map((step, index) => ({
              ...step,
              completed: session.completedSteps.includes(index),
            }));

            set({
              session,
              currentStepIndex: session.currentStep || 0,
              steps: updatedSteps,
              error: null,
            });
          } catch (error) {
            set({ error: 'Failed to import session data' });
          }
        },

        validateCurrentStep: async () => {
          const { session, currentStepIndex } = get();
          if (!session) return false;

          switch (currentStepIndex) {
            case 0: // Basic Info
              return !!(session.tenant.name && session.tenant.domain);
            case 1: // Branding
              return !!(session.branding.primaryColor && session.branding.secondaryColor);
            case 2: // Content
              return (session.content.uploadedFiles?.length || 0) > 0;
            case 3: // Preview
              return session.preview.isReady === true;
            case 4: // Publish
              return session.publishing.status === 'COMPLETED';
            default:
              return false;
          }
        },

        // Error handling
        setError: (error: string | null) => {
          set({ error });
        },

        clearError: () => {
          set({ error: null });
        },
      })),
      {
        name: 'wizard-session',
        partialize: (state) => ({
          session: state.session,
          currentStepIndex: state.currentStepIndex,
        }),
      }
    ),
    {
      name: 'wizard-store',
    }
  )
);

// Selectors for convenient access
export const useWizardSession = () => useWizardStore((state) => state.session);
export const useWizardSteps = () => useWizardStore((state) => state.steps);
export const useWizardCurrentStep = () => useWizardStore((state) => state.currentStepIndex);
export const useWizardLoading = () => useWizardStore((state) => state.isLoading);
export const useWizardError = () => useWizardStore((state) => state.error);

// Actions selectors
export const useWizardActions = () => useWizardStore((state) => ({
  initializeSession: state.initializeSession,
  loadSession: state.loadSession,
  saveSession: state.saveSession,
  clearSession: state.clearSession,
  setCurrentStep: state.setCurrentStep,
  goToNextStep: state.goToNextStep,
  goToPreviousStep: state.goToPreviousStep,
  updateTenantData: state.updateTenantData,
  updateBrandingData: state.updateBrandingData,
  updateContentData: state.updateContentData,
  submitBasicInfo: state.submitBasicInfo,
  submitBranding: state.submitBranding,
  uploadFiles: state.uploadFiles,
  generatePreview: state.generatePreview,
  startPublishing: state.startPublishing,
}));

// Auto-save hook
export const useAutoSave = (enabled = true, interval = 30000) => {
  const { saveSession, session } = useWizardStore();

  React.useEffect(() => {
    if (!enabled || !session?.metadata.autoSaveEnabled) return;

    const autoSaveInterval = setInterval(() => {
      saveSession(true);
    }, interval);

    return () => clearInterval(autoSaveInterval);
  }, [enabled, interval, session?.metadata.autoSaveEnabled, saveSession]);
};