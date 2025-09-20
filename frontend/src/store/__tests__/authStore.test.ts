import { act, renderHook, waitFor } from '@testing-library/react';
import { apiClient } from '../../services/ApiClient';
import {
  useAuthStore,
  useAuth,
  useAuthUser,
  useAuthSession,
  useIsAuthenticated,
  useAuthLoading,
  useAuthError,
  useAuthActions,
  useAuthGuard,
  useTokenRefresh,
  User,
  AuthSession,
  LoginCredentials,
  RegisterData,
  UserPreferences,
} from '../authStore';

// Mock the API client
jest.mock('../../services/ApiClient', () => ({
  apiClient: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    verifyEmail: jest.fn(),
    setAuthToken: jest.fn(),
    clearAuthToken: jest.fn(),
  },
}));

// Mock Next.js router
const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
  pathname: '/',
  query: {},
  asPath: '/',
};

jest.mock('next/router', () => ({
  useRouter: jest.fn(() => mockRouter),
}));

// Mock storage
const createStorageMock = () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
});

const localStorageMock = createStorageMock();
const sessionStorageMock = createStorageMock();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock console methods to avoid noise in tests
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeAll(() => {
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

describe('AuthStore', () => {
  const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

  const mockAuthResponse = {
    data: {
      user: {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        businessName: 'Test Business',
        businessRole: 'Owner',
        createdAt: '2024-01-01T00:00:00Z',
      },
      token: 'mock-jwt-token',
      refreshToken: 'mock-refresh-token',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    sessionStorageMock.getItem.mockReturnValue(null);

    // Reset auth store state
    useAuthStore.getState().clearAuth();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const store = useAuthStore.getState();

      expect(store.user).toBeNull();
      expect(store.session).toBeNull();
      expect(store.isAuthenticated).toBe(false);
      expect(store.isLoading).toBe(false);
      expect(store.error).toBeNull();
      expect(store.isRegistering).toBe(false);
      expect(store.isLoggingIn).toBe(false);
      expect(store.isLoggingOut).toBe(false);
      expect(store.isRefreshing).toBe(false);
      expect(store.emailVerificationSent).toBe(false);
      expect(store.emailVerificationPending).toBe(false);
      expect(store.passwordResetSent).toBe(false);
      expect(store.passwordResetPending).toBe(false);
    });
  });

  describe('Login', () => {
    const loginCredentials: LoginCredentials = {
      email: 'test@example.com',
      password: 'password123',
      rememberMe: false,
    };

    it('should login successfully', async () => {
      mockApiClient.login.mockResolvedValue(mockAuthResponse);

      const store = useAuthStore.getState();

      await act(async () => {
        await store.login(loginCredentials);
      });

      const state = useAuthStore.getState();

      expect(mockApiClient.login).toHaveBeenCalledWith({
        email: loginCredentials.email,
        password: loginCredentials.password,
      });
      expect(mockApiClient.setAuthToken).toHaveBeenCalledWith(mockAuthResponse.data.token);

      expect(state.user).toBeDefined();
      expect(state.user?.email).toBe('test@example.com');
      expect(state.session).toBeDefined();
      expect(state.session?.token).toBe(mockAuthResponse.data.token);
      expect(state.isAuthenticated).toBe(true);
      expect(state.error).toBeNull();
      expect(state.isLoggingIn).toBe(false);

      expect(sessionStorageMock.setItem).toHaveBeenCalled();
    });

    it('should store session in localStorage when rememberMe is true', async () => {
      mockApiClient.login.mockResolvedValue(mockAuthResponse);

      const store = useAuthStore.getState();

      await act(async () => {
        await store.login({ ...loginCredentials, rememberMe: true });
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'user_session',
        expect.stringContaining('"rememberMe":true')
      );
    });

    it('should set loading state during login', async () => {
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise(resolve => {
        resolveLogin = resolve;
      });
      mockApiClient.login.mockReturnValue(loginPromise as any);

      const store = useAuthStore.getState();

      act(() => {
        store.login(loginCredentials);
      });

      // Check loading state
      expect(useAuthStore.getState().isLoggingIn).toBe(true);

      // Resolve the promise
      act(() => {
        resolveLogin(mockAuthResponse);
      });

      await waitFor(() => {
        expect(useAuthStore.getState().isLoggingIn).toBe(false);
      });
    });

    it('should handle login failure', async () => {
      const errorMessage = 'Invalid credentials';
      mockApiClient.login.mockRejectedValue(new Error(errorMessage));

      const store = useAuthStore.getState();

      await act(async () => {
        try {
          await store.login(loginCredentials);
        } catch (error) {
          // Expected to throw
        }
      });

      const state = useAuthStore.getState();

      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe(errorMessage);
      expect(state.isLoggingIn).toBe(false);
    });
  });

  describe('Register', () => {
    const registerData: RegisterData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'test@example.com',
      password: 'password123',
      businessName: 'Test Business',
      businessRole: 'Owner',
      agreeToTerms: true,
      subscribeToNewsletter: false,
    };

    it('should register successfully', async () => {
      mockApiClient.register.mockResolvedValue(mockAuthResponse);

      const store = useAuthStore.getState();

      await act(async () => {
        await store.register(registerData);
      });

      const state = useAuthStore.getState();

      expect(mockApiClient.register).toHaveBeenCalledWith({
        firstName: registerData.firstName,
        lastName: registerData.lastName,
        email: registerData.email,
        password: registerData.password,
        businessName: registerData.businessName,
        businessRole: registerData.businessRole,
      });

      expect(state.user).toBeDefined();
      expect(state.session).toBeDefined();
      expect(state.isAuthenticated).toBe(true);
      expect(state.error).toBeNull();
      expect(state.isRegistering).toBe(false);

      expect(sessionStorageMock.setItem).toHaveBeenCalled();
    });

    it('should handle registration failure', async () => {
      const errorMessage = 'Email already exists';
      mockApiClient.register.mockRejectedValue(new Error(errorMessage));

      const store = useAuthStore.getState();

      await act(async () => {
        try {
          await store.register(registerData);
        } catch (error) {
          // Expected to throw
        }
      });

      const state = useAuthStore.getState();

      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe(errorMessage);
      expect(state.isRegistering).toBe(false);
    });

    it('should set loading state during registration', async () => {
      let resolveRegister: (value: any) => void;
      const registerPromise = new Promise(resolve => {
        resolveRegister = resolve;
      });
      mockApiClient.register.mockReturnValue(registerPromise as any);

      const store = useAuthStore.getState();

      act(() => {
        store.register(registerData);
      });

      // Check loading state
      expect(useAuthStore.getState().isRegistering).toBe(true);

      // Resolve the promise
      act(() => {
        resolveRegister(mockAuthResponse);
      });

      await waitFor(() => {
        expect(useAuthStore.getState().isRegistering).toBe(false);
      });
    });
  });

  describe('Logout', () => {
    beforeEach(async () => {
      // Set up authenticated state
      mockApiClient.login.mockResolvedValue(mockAuthResponse);
      const store = useAuthStore.getState();
      await store.login({ email: 'test@example.com', password: 'password123' });
    });

    it('should logout successfully', async () => {
      mockApiClient.logout.mockResolvedValue(undefined);

      const store = useAuthStore.getState();

      await act(async () => {
        await store.logout();
      });

      const state = useAuthStore.getState();

      expect(mockApiClient.logout).toHaveBeenCalled();
      expect(mockApiClient.clearAuthToken).toHaveBeenCalled();

      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeNull();
      expect(state.isLoggingOut).toBe(false);

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user_session');
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('user_session');
    });

    it('should continue logout even if API call fails', async () => {
      mockApiClient.logout.mockRejectedValue(new Error('Network error'));

      const store = useAuthStore.getState();

      await act(async () => {
        await store.logout();
      });

      const state = useAuthStore.getState();

      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('Token Management', () => {
    it('should check if token is expired', () => {
      const store = useAuthStore.getState();

      // No session - should be expired
      expect(store.isTokenExpired()).toBe(true);

      // Set session with expired token
      const expiredSession: AuthSession = {
        token: 'token',
        refreshToken: 'refresh',
        expiresAt: new Date(Date.now() - 1000).toISOString(), // Expired 1 second ago
        issuedAt: new Date().toISOString(),
        rememberMe: false,
      };

      act(() => {
        useAuthStore.setState({ session: expiredSession });
      });

      expect(store.isTokenExpired()).toBe(true);

      // Set session with valid token
      const validSession: AuthSession = {
        token: 'token',
        refreshToken: 'refresh',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // Expires in 1 hour
        issuedAt: new Date().toISOString(),
        rememberMe: false,
      };

      act(() => {
        useAuthStore.setState({ session: validSession });
      });

      expect(store.isTokenExpired()).toBe(false);
    });

    it('should calculate time until expiry', () => {
      const store = useAuthStore.getState();

      // No session
      expect(store.getTimeUntilExpiry()).toBe(0);

      // Set session with 1 hour until expiry
      const oneHourFromNow = Date.now() + 60 * 60 * 1000;
      const session: AuthSession = {
        token: 'token',
        refreshToken: 'refresh',
        expiresAt: new Date(oneHourFromNow).toISOString(),
        issuedAt: new Date().toISOString(),
        rememberMe: false,
      };

      act(() => {
        useAuthStore.setState({ session });
      });

      const timeUntilExpiry = store.getTimeUntilExpiry();
      expect(timeUntilExpiry).toBeGreaterThan(3500000); // Should be close to 1 hour (3,600,000 ms)
      expect(timeUntilExpiry).toBeLessThanOrEqual(3600000);
    });

    it('should refresh token successfully', async () => {
      // Set up session with refresh token
      const session: AuthSession = {
        token: 'old-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(Date.now() + 1000).toISOString(),
        issuedAt: new Date().toISOString(),
        rememberMe: false,
      };

      act(() => {
        useAuthStore.setState({ session });
      });

      const store = useAuthStore.getState();

      await act(async () => {
        await store.refreshToken();
      });

      const state = useAuthStore.getState();

      expect(state.session?.expiresAt).not.toBe(session.expiresAt);
      expect(state.error).toBeNull();
      expect(state.isRefreshing).toBe(false);
    });

    it('should logout if refresh token fails', async () => {
      // Set up session
      const session: AuthSession = {
        token: 'token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(Date.now() + 1000).toISOString(),
        issuedAt: new Date().toISOString(),
        rememberMe: false,
      };

      act(() => {
        useAuthStore.setState({
          session,
          user: mockAuthResponse.data.user as any,
          isAuthenticated: true
        });
      });

      // Mock refresh token to fail
      const store = useAuthStore.getState();
      const originalRefreshToken = store.refreshToken;

      act(() => {
        useAuthStore.setState({
          refreshToken: jest.fn().mockRejectedValue(new Error('Refresh failed'))
        });
      });

      await act(async () => {
        try {
          await useAuthStore.getState().refreshToken();
        } catch (error) {
          // Expected to throw
        }
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('Email Verification', () => {
    beforeEach(async () => {
      // Set up authenticated state
      mockApiClient.login.mockResolvedValue(mockAuthResponse);
      const store = useAuthStore.getState();
      await store.login({ email: 'test@example.com', password: 'password123' });
    });

    it('should send email verification', async () => {
      const store = useAuthStore.getState();

      await act(async () => {
        await store.sendEmailVerification();
      });

      const state = useAuthStore.getState();

      expect(state.emailVerificationSent).toBe(true);
      expect(state.emailVerificationPending).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should verify email with token', async () => {
      mockApiClient.verifyEmail.mockResolvedValue({ data: { message: 'Email verified' } } as any);

      const store = useAuthStore.getState();

      await act(async () => {
        await store.verifyEmail('verification-token');
      });

      const state = useAuthStore.getState();

      expect(mockApiClient.verifyEmail).toHaveBeenCalledWith('verification-token');
      expect(state.user?.emailVerified).toBe(true);
      expect(state.emailVerificationPending).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle email verification failure', async () => {
      mockApiClient.verifyEmail.mockRejectedValue(new Error('Invalid token'));

      const store = useAuthStore.getState();

      await act(async () => {
        try {
          await store.verifyEmail('invalid-token');
        } catch (error) {
          // Expected to throw
        }
      });

      const state = useAuthStore.getState();

      expect(state.error).toBe('Invalid token');
      expect(state.emailVerificationPending).toBe(false);
    });
  });

  describe('Password Reset', () => {
    it('should request password reset', async () => {
      const store = useAuthStore.getState();

      await act(async () => {
        await store.requestPasswordReset('test@example.com');
      });

      const state = useAuthStore.getState();

      expect(state.passwordResetSent).toBe(true);
      expect(state.passwordResetPending).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should reset password with token', async () => {
      const store = useAuthStore.getState();

      await act(async () => {
        await store.resetPassword('reset-token', 'newpassword123');
      });

      const state = useAuthStore.getState();

      expect(state.passwordResetPending).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('Profile Management', () => {
    beforeEach(async () => {
      // Set up authenticated state
      mockApiClient.login.mockResolvedValue(mockAuthResponse);
      const store = useAuthStore.getState();
      await store.login({ email: 'test@example.com', password: 'password123' });
    });

    it('should update profile', async () => {
      const profileUpdate = {
        firstName: 'Jane',
        businessName: 'New Business Name',
      };

      const store = useAuthStore.getState();

      await act(async () => {
        await store.updateProfile(profileUpdate);
      });

      const state = useAuthStore.getState();

      expect(state.user?.firstName).toBe('Jane');
      expect(state.user?.businessName).toBe('New Business Name');
      expect(state.user?.updatedAt).toBeDefined();
      expect(state.error).toBeNull();
      expect(state.isLoading).toBe(false);
    });

    it('should update preferences', async () => {
      const preferencesUpdate: Partial<UserPreferences> = {
        theme: 'dark',
        dashboardLayout: 'list',
        emailNotifications: {
          claimUpdates: false,
          marketingEmails: true,
          securityAlerts: true,
          weeklyDigest: false,
        },
      };

      const store = useAuthStore.getState();

      await act(async () => {
        await store.updatePreferences(preferencesUpdate);
      });

      const state = useAuthStore.getState();

      expect(state.user?.preferences?.theme).toBe('dark');
      expect(state.user?.preferences?.dashboardLayout).toBe('list');
      expect(state.user?.preferences?.emailNotifications?.claimUpdates).toBe(false);
      expect(state.error).toBeNull();
      expect(state.isLoading).toBe(false);
    });

    it('should change password', async () => {
      const store = useAuthStore.getState();

      await act(async () => {
        await store.changePassword('oldpassword', 'newpassword');
      });

      const state = useAuthStore.getState();

      expect(state.error).toBeNull();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('Storage Management', () => {
    it('should load auth from localStorage', () => {
      const storedSession = {
        userId: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        token: 'stored-token',
        rememberMe: true,
        loggedInAt: new Date().toISOString(),
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedSession));

      const store = useAuthStore.getState();
      store.loadFromStorage();

      const state = useAuthStore.getState();

      expect(state.user?.email).toBe('test@example.com');
      expect(state.session?.token).toBe('stored-token');
      expect(state.isAuthenticated).toBe(true);
      expect(mockApiClient.setAuthToken).toHaveBeenCalledWith('stored-token');
    });

    it('should load auth from sessionStorage when localStorage is empty', () => {
      const storedSession = {
        userId: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        token: 'stored-token',
        rememberMe: false,
        loggedInAt: new Date().toISOString(),
      };

      localStorageMock.getItem.mockReturnValue(null);
      sessionStorageMock.getItem.mockReturnValue(JSON.stringify(storedSession));

      const store = useAuthStore.getState();
      store.loadFromStorage();

      const state = useAuthStore.getState();

      expect(state.user?.email).toBe('test@example.com');
      expect(state.session?.token).toBe('stored-token');
      expect(state.isAuthenticated).toBe(true);
    });

    it('should handle corrupted storage data gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json');

      const store = useAuthStore.getState();
      store.loadFromStorage();

      const state = useAuthStore.getState();

      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(mockApiClient.clearAuthToken).toHaveBeenCalled();
    });

    it('should clear auth storage', () => {
      const store = useAuthStore.getState();
      store.clearAuth();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user_session');
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('user_session');
      expect(mockApiClient.clearAuthToken).toHaveBeenCalled();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('Error Management', () => {
    it('should set and clear errors', () => {
      const store = useAuthStore.getState();

      act(() => {
        store.setError('Test error message');
      });

      expect(useAuthStore.getState().error).toBe('Test error message');

      act(() => {
        store.clearError();
      });

      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  describe('Selectors', () => {
    beforeEach(async () => {
      // Set up authenticated state
      mockApiClient.login.mockResolvedValue(mockAuthResponse);
      const store = useAuthStore.getState();
      await store.login({ email: 'test@example.com', password: 'password123' });
    });

    it('should provide auth selector', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toBeDefined();
      expect(result.current.session).toBeDefined();
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should provide user selector', () => {
      const { result } = renderHook(() => useAuthUser());

      expect(result.current?.email).toBe('test@example.com');
    });

    it('should provide session selector', () => {
      const { result } = renderHook(() => useAuthSession());

      expect(result.current?.token).toBe(mockAuthResponse.data.token);
    });

    it('should provide authentication status selector', () => {
      const { result } = renderHook(() => useIsAuthenticated());

      expect(result.current).toBe(true);
    });

    it('should provide loading status selector', () => {
      const { result } = renderHook(() => useAuthLoading());

      expect(result.current).toBe(false);
    });

    it('should provide error selector', () => {
      const { result } = renderHook(() => useAuthError());

      expect(result.current).toBeNull();
    });

    it('should provide actions selector', () => {
      const { result } = renderHook(() => useAuthActions());

      expect(typeof result.current.login).toBe('function');
      expect(typeof result.current.register).toBe('function');
      expect(typeof result.current.logout).toBe('function');
      expect(typeof result.current.updateProfile).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
    });
  });

  describe('Auth Guard Hook', () => {
    it('should redirect unauthenticated users', () => {
      // Start with unauthenticated state
      act(() => {
        useAuthStore.setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      });

      const { result } = renderHook(() => useAuthGuard('/auth/login'));

      expect(mockPush).toHaveBeenCalledWith('/auth/login');
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('should not redirect authenticated users', async () => {
      // Set up authenticated state
      mockApiClient.login.mockResolvedValue(mockAuthResponse);
      const store = useAuthStore.getState();
      await store.login({ email: 'test@example.com', password: 'password123' });

      const { result } = renderHook(() => useAuthGuard('/auth/login'));

      expect(mockPush).not.toHaveBeenCalled();
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should not redirect during loading', () => {
      act(() => {
        useAuthStore.setState({
          user: null,
          isAuthenticated: false,
          isLoading: true,
        });
      });

      const { result } = renderHook(() => useAuthGuard('/auth/login'));

      expect(mockPush).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('Token Refresh Hook', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should set up token refresh intervals', () => {
      // Set up session that will expire soon
      const session: AuthSession = {
        token: 'token',
        refreshToken: 'refresh',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
        issuedAt: new Date().toISOString(),
        rememberMe: false,
      };

      act(() => {
        useAuthStore.setState({ session });
      });

      const { unmount } = renderHook(() => useTokenRefresh(true));

      // Fast-forward time
      jest.advanceTimersByTime(60000); // 1 minute

      unmount();
    });

    it('should not set up refresh when disabled', () => {
      const session: AuthSession = {
        token: 'token',
        refreshToken: 'refresh',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        issuedAt: new Date().toISOString(),
        rememberMe: false,
      };

      act(() => {
        useAuthStore.setState({ session });
      });

      const { unmount } = renderHook(() => useTokenRefresh(false));

      // Should not set up any intervals
      unmount();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete login flow with storage', async () => {
      const loginCredentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123',
        rememberMe: true,
      };

      mockApiClient.login.mockResolvedValue(mockAuthResponse);

      const store = useAuthStore.getState();

      // Login
      await act(async () => {
        await store.login(loginCredentials);
      });

      let state = useAuthStore.getState();

      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.email).toBe('test@example.com');
      expect(localStorageMock.setItem).toHaveBeenCalled();

      // Simulate page refresh by loading from storage
      const storedData = localStorageMock.setItem.mock.calls[0][1];
      localStorageMock.getItem.mockReturnValue(storedData);

      // Clear current state
      act(() => {
        useAuthStore.setState({
          user: null,
          session: null,
          isAuthenticated: false,
        });
      });

      // Load from storage
      store.loadFromStorage();

      state = useAuthStore.getState();

      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.email).toBe('test@example.com');

      // Logout
      mockApiClient.logout.mockResolvedValue(undefined);

      await act(async () => {
        await store.logout();
      });

      state = useAuthStore.getState();

      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user_session');
    });

    it('should handle registration to profile update flow', async () => {
      const registerData: RegisterData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'test@example.com',
        password: 'password123',
        agreeToTerms: true,
      };

      mockApiClient.register.mockResolvedValue(mockAuthResponse);

      const store = useAuthStore.getState();

      // Register
      await act(async () => {
        await store.register(registerData);
      });

      let state = useAuthStore.getState();

      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.firstName).toBe('John');

      // Update profile
      const profileUpdate = {
        firstName: 'Jane',
        businessName: 'Updated Business',
      };

      await act(async () => {
        await store.updateProfile(profileUpdate);
      });

      state = useAuthStore.getState();

      expect(state.user?.firstName).toBe('Jane');
      expect(state.user?.businessName).toBe('Updated Business');
      expect(state.user?.updatedAt).toBeDefined();
    });
  });
});