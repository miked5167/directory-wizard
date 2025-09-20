import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { apiClient, AuthLoginRequest, AuthRegisterRequest, AuthResponse } from '../services/ApiClient';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  businessName?: string;
  businessRole?: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  emailNotifications: {
    claimUpdates: boolean;
    marketingEmails: boolean;
    securityAlerts: boolean;
    weeklyDigest: boolean;
  };
  dashboardLayout: 'grid' | 'list';
  autoSave: boolean;
}

export interface AuthSession {
  token: string;
  refreshToken: string;
  expiresAt: string;
  issuedAt: string;
  rememberMe: boolean;
}

export interface LoginCredentials extends AuthLoginRequest {
  rememberMe?: boolean;
}

export interface RegisterData extends AuthRegisterRequest {
  agreeToTerms: boolean;
  subscribeToNewsletter?: boolean;
}

export interface AuthState {
  // Current state
  user: User | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Registration/login state
  isRegistering: boolean;
  isLoggingIn: boolean;
  isLoggingOut: boolean;
  isRefreshing: boolean;

  // Email verification
  emailVerificationSent: boolean;
  emailVerificationPending: boolean;

  // Password reset
  passwordResetSent: boolean;
  passwordResetPending: boolean;

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;

  // Email verification
  sendEmailVerification: () => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;

  // Password reset
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;

  // Profile management
  updateProfile: (data: Partial<User>) => Promise<void>;
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;

  // Session management
  checkAuthStatus: () => Promise<void>;
  clearAuth: () => void;
  loadFromStorage: () => void;

  // Utility actions
  setError: (error: string | null) => void;
  clearError: () => void;
  isTokenExpired: () => boolean;
  getTimeUntilExpiry: () => number;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  language: 'en',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  emailNotifications: {
    claimUpdates: true,
    marketingEmails: false,
    securityAlerts: true,
    weeklyDigest: true,
  },
  dashboardLayout: 'grid',
  autoSave: true,
};

const createSessionFromAuthResponse = (authResponse: AuthResponse, rememberMe = false): AuthSession => ({
  token: authResponse.token,
  refreshToken: authResponse.refreshToken,
  expiresAt: authResponse.expiresAt,
  issuedAt: new Date().toISOString(),
  rememberMe,
});

const createUserFromAuthResponse = (authResponse: AuthResponse): User => ({
  id: authResponse.user.id,
  email: authResponse.user.email,
  firstName: authResponse.user.firstName,
  lastName: authResponse.user.lastName,
  businessName: authResponse.user.businessName,
  businessRole: authResponse.user.businessRole,
  emailVerified: true, // Assume verified for demo
  createdAt: authResponse.user.createdAt,
  lastLoginAt: new Date().toISOString(),
  preferences: DEFAULT_PREFERENCES,
});

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      subscribeWithSelector((set, get) => ({
        // Initial state
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        isRegistering: false,
        isLoggingIn: false,
        isLoggingOut: false,
        isRefreshing: false,
        emailVerificationSent: false,
        emailVerificationPending: false,
        passwordResetSent: false,
        passwordResetPending: false,

        // Authentication actions
        login: async (credentials: LoginCredentials) => {
          set({ isLoggingIn: true, error: null });

          try {
            const response = await apiClient.login({
              email: credentials.email,
              password: credentials.password,
            });

            const session = createSessionFromAuthResponse(response.data, credentials.rememberMe);
            const user = createUserFromAuthResponse(response.data);

            // Set token in API client
            apiClient.setAuthToken(response.data.token);

            set({
              user,
              session,
              isAuthenticated: true,
              error: null,
            });

            // Store session based on rememberMe preference
            const storageMethod = credentials.rememberMe ? localStorage : sessionStorage;
            const storageKey = credentials.rememberMe ? 'user_session' : 'user_session';

            storageMethod.setItem(storageKey, JSON.stringify({
              ...user,
              token: session.token,
              rememberMe: credentials.rememberMe,
              loggedInAt: new Date().toISOString(),
            }));

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Login failed';
            set({ error: errorMessage });
            throw error;
          } finally {
            set({ isLoggingIn: false });
          }
        },

        register: async (data: RegisterData) => {
          set({ isRegistering: true, error: null });

          try {
            const response = await apiClient.register({
              firstName: data.firstName,
              lastName: data.lastName,
              email: data.email,
              password: data.password,
              businessName: data.businessName,
              businessRole: data.businessRole,
            });

            const session = createSessionFromAuthResponse(response.data, false);
            const user = createUserFromAuthResponse(response.data);

            // Set token in API client
            apiClient.setAuthToken(response.data.token);

            set({
              user,
              session,
              isAuthenticated: true,
              error: null,
            });

            // Store session (default to session storage for new registrations)
            sessionStorage.setItem('user_session', JSON.stringify({
              ...user,
              token: session.token,
              rememberMe: false,
              loggedInAt: new Date().toISOString(),
            }));

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Registration failed';
            set({ error: errorMessage });
            throw error;
          } finally {
            set({ isRegistering: false });
          }
        },

        logout: async () => {
          set({ isLoggingOut: true });

          try {
            // Call logout API
            await apiClient.logout();
          } catch (error) {
            // Continue with logout even if API call fails
            console.warn('Logout API call failed:', error);
          }

          // Clear API client token
          apiClient.clearAuthToken();

          // Clear storage
          localStorage.removeItem('user_session');
          sessionStorage.removeItem('user_session');

          // Reset state
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            error: null,
            isLoggingOut: false,
          });
        },

        refreshToken: async () => {
          const { session } = get();
          if (!session?.refreshToken) {
            throw new Error('No refresh token available');
          }

          set({ isRefreshing: true, error: null });

          try {
            // In a real app, this would call a refresh token endpoint
            // For demo purposes, we'll simulate token refresh
            const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

            const updatedSession = {
              ...session,
              expiresAt: newExpiresAt,
              issuedAt: new Date().toISOString(),
            };

            set({ session: updatedSession });

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Token refresh failed';
            set({ error: errorMessage });

            // If refresh fails, logout user
            get().logout();
            throw error;
          } finally {
            set({ isRefreshing: false });
          }
        },

        // Email verification
        sendEmailVerification: async () => {
          const { user } = get();
          if (!user) throw new Error('User not authenticated');

          set({ emailVerificationPending: true, error: null });

          try {
            // In a real app, this would send verification email
            // For demo, we'll simulate success
            await new Promise(resolve => setTimeout(resolve, 1000));

            set({
              emailVerificationSent: true,
              emailVerificationPending: false,
            });

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to send verification email';
            set({ error: errorMessage, emailVerificationPending: false });
            throw error;
          }
        },

        verifyEmail: async (token: string) => {
          set({ emailVerificationPending: true, error: null });

          try {
            await apiClient.verifyEmail(token);

            // Update user's email verification status
            const { user } = get();
            if (user) {
              set({
                user: { ...user, emailVerified: true },
                emailVerificationPending: false,
              });
            }

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Email verification failed';
            set({ error: errorMessage, emailVerificationPending: false });
            throw error;
          }
        },

        // Password reset
        requestPasswordReset: async (email: string) => {
          set({ passwordResetPending: true, error: null });

          try {
            // In a real app, this would call password reset API
            await new Promise(resolve => setTimeout(resolve, 1000));

            set({
              passwordResetSent: true,
              passwordResetPending: false,
            });

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to send password reset email';
            set({ error: errorMessage, passwordResetPending: false });
            throw error;
          }
        },

        resetPassword: async (token: string, newPassword: string) => {
          set({ passwordResetPending: true, error: null });

          try {
            // In a real app, this would call password reset API
            await new Promise(resolve => setTimeout(resolve, 1000));

            set({ passwordResetPending: false });

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
            set({ error: errorMessage, passwordResetPending: false });
            throw error;
          }
        },

        // Profile management
        updateProfile: async (data: Partial<User>) => {
          const { user } = get();
          if (!user) throw new Error('User not authenticated');

          set({ isLoading: true, error: null });

          try {
            // In a real app, this would call update profile API
            await new Promise(resolve => setTimeout(resolve, 1000));

            const updatedUser = {
              ...user,
              ...data,
              updatedAt: new Date().toISOString(),
            };

            set({ user: updatedUser, isLoading: false });

            // Update storage
            const sessionData = localStorage.getItem('user_session') || sessionStorage.getItem('user_session');
            if (sessionData) {
              const parsed = JSON.parse(sessionData);
              const storageMethod = localStorage.getItem('user_session') ? localStorage : sessionStorage;
              storageMethod.setItem('user_session', JSON.stringify({
                ...parsed,
                ...data,
                updatedAt: updatedUser.updatedAt,
              }));
            }

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Profile update failed';
            set({ error: errorMessage, isLoading: false });
            throw error;
          }
        },

        updatePreferences: async (preferences: Partial<UserPreferences>) => {
          const { user } = get();
          if (!user) throw new Error('User not authenticated');

          set({ isLoading: true, error: null });

          try {
            const updatedPreferences = {
              ...user.preferences,
              ...preferences,
            };

            const updatedUser = {
              ...user,
              preferences: updatedPreferences,
              updatedAt: new Date().toISOString(),
            };

            set({ user: updatedUser, isLoading: false });

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Preferences update failed';
            set({ error: errorMessage, isLoading: false });
            throw error;
          }
        },

        changePassword: async (currentPassword: string, newPassword: string) => {
          set({ isLoading: true, error: null });

          try {
            // In a real app, this would call change password API
            await new Promise(resolve => setTimeout(resolve, 1000));

            set({ isLoading: false });

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Password change failed';
            set({ error: errorMessage, isLoading: false });
            throw error;
          }
        },

        // Session management
        checkAuthStatus: async () => {
          const { session } = get();
          if (!session) return;

          // Check if token is expired
          if (get().isTokenExpired()) {
            try {
              await get().refreshToken();
            } catch {
              // If refresh fails, logout
              get().logout();
            }
          }
        },

        clearAuth: () => {
          apiClient.clearAuthToken();
          localStorage.removeItem('user_session');
          sessionStorage.removeItem('user_session');

          set({
            user: null,
            session: null,
            isAuthenticated: false,
            error: null,
          });
        },

        loadFromStorage: () => {
          try {
            const sessionData = localStorage.getItem('user_session') || sessionStorage.getItem('user_session');
            if (!sessionData) return;

            const parsed = JSON.parse(sessionData);

            // Create user object from stored data
            const user: User = {
              id: parsed.userId || parsed.id,
              email: parsed.email,
              firstName: parsed.firstName,
              lastName: parsed.lastName,
              businessName: parsed.businessName,
              businessRole: parsed.businessRole,
              emailVerified: parsed.emailVerified ?? true,
              createdAt: parsed.createdAt || new Date().toISOString(),
              updatedAt: parsed.updatedAt,
              lastLoginAt: parsed.loggedInAt || parsed.lastLoginAt,
              preferences: { ...DEFAULT_PREFERENCES, ...parsed.preferences },
            };

            // Create session object
            const session: AuthSession = {
              token: parsed.token || '',
              refreshToken: parsed.refreshToken || '',
              expiresAt: parsed.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              issuedAt: parsed.loggedInAt || new Date().toISOString(),
              rememberMe: parsed.rememberMe || false,
            };

            // Set token in API client
            if (session.token) {
              apiClient.setAuthToken(session.token);
            }

            set({
              user,
              session,
              isAuthenticated: true,
            });

            // Check if token is expired and refresh if needed
            if (get().isTokenExpired()) {
              get().refreshToken().catch(() => {
                // If refresh fails, logout
                get().logout();
              });
            }

          } catch (error) {
            console.error('Failed to load auth from storage:', error);
            get().clearAuth();
          }
        },

        // Utility actions
        setError: (error: string | null) => {
          set({ error });
        },

        clearError: () => {
          set({ error: null });
        },

        isTokenExpired: () => {
          const { session } = get();
          if (!session?.expiresAt) return true;

          const expiryTime = new Date(session.expiresAt).getTime();
          const currentTime = Date.now();
          const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

          return currentTime >= (expiryTime - bufferTime);
        },

        getTimeUntilExpiry: () => {
          const { session } = get();
          if (!session?.expiresAt) return 0;

          const expiryTime = new Date(session.expiresAt).getTime();
          const currentTime = Date.now();

          return Math.max(0, expiryTime - currentTime);
        },
      })),
      {
        name: 'auth-state',
        partialize: (state) => ({
          user: state.user,
          session: state.session,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    {
      name: 'auth-store',
    }
  )
);

// Selectors for convenient access
export const useAuth = () => useAuthStore((state) => ({
  user: state.user,
  session: state.session,
  isAuthenticated: state.isAuthenticated,
  isLoading: state.isLoading,
  error: state.error,
}));

export const useAuthUser = () => useAuthStore((state) => state.user);
export const useAuthSession = () => useAuthStore((state) => state.session);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
export const useAuthError = () => useAuthStore((state) => state.error);

// Actions selectors
export const useAuthActions = () => useAuthStore((state) => ({
  login: state.login,
  register: state.register,
  logout: state.logout,
  updateProfile: state.updateProfile,
  updatePreferences: state.updatePreferences,
  changePassword: state.changePassword,
  sendEmailVerification: state.sendEmailVerification,
  verifyEmail: state.verifyEmail,
  requestPasswordReset: state.requestPasswordReset,
  resetPassword: state.resetPassword,
  clearError: state.clearError,
}));

// Auth guard hook for protecting routes
export const useAuthGuard = (redirectTo = '/auth/login') => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = typeof window !== 'undefined' ? require('next/router').useRouter() : null;

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated && router) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, isLoading, redirectTo, router]);

  return { isAuthenticated, isLoading };
};

// Auto token refresh hook
export const useTokenRefresh = (enabled = true) => {
  const { session, refreshToken, logout, isTokenExpired, getTimeUntilExpiry } = useAuthStore();

  React.useEffect(() => {
    if (!enabled || !session) return;

    const checkAndRefresh = () => {
      if (isTokenExpired()) {
        refreshToken().catch(() => {
          logout();
        });
      }
    };

    // Check immediately
    checkAndRefresh();

    // Set up interval to check periodically
    const interval = setInterval(checkAndRefresh, 60000); // Check every minute

    // Set up timeout to refresh before expiry
    const timeUntilExpiry = getTimeUntilExpiry();
    const refreshTime = Math.max(0, timeUntilExpiry - 5 * 60 * 1000); // Refresh 5 minutes before expiry

    const timeout = setTimeout(() => {
      if (!isTokenExpired()) {
        refreshToken().catch(() => {
          logout();
        });
      }
    }, refreshTime);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [enabled, session, refreshToken, logout, isTokenExpired, getTimeUntilExpiry]);
};

// Initialize auth store from storage on app start
if (typeof window !== 'undefined') {
  useAuthStore.getState().loadFromStorage();
}