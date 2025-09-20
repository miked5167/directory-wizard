import { ClaimFormData } from '../components/claims/ClaimForm';

export interface ApiConfig {
  baseUrl: string;
  timeout?: number;
  defaultHeaders?: Record<string, string>;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}

export interface TenantCreateRequest {
  name: string;
  domain: string;
  description?: string;
  category?: string;
  location?: string;
}

export interface TenantBrandingRequest {
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  fontFamily: string;
  customFontUrl?: string;
}

export interface FileUploadRequest {
  files: FileList;
  type: 'CSV' | 'JSON';
}

export interface PublishRequest {
  tenantId: string;
}

export interface ProvisioningJobResponse {
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

export interface AuthLoginRequest {
  email: string;
  password: string;
}

export interface AuthRegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  businessName?: string;
  businessRole?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    businessName?: string;
    businessRole?: string;
    createdAt: string;
  };
  token: string;
  refreshToken: string;
  expiresAt: string;
}

export interface ClaimResponse {
  id: string;
  listingId: string;
  status: 'PENDING_VERIFICATION' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  submittedAt: string;
  reviewedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  reviewerNotes?: string;
}

export interface UserClaimsResponse {
  claims: ClaimResponse[];
  total: number;
  page: number;
  limit: number;
}

class ApiClient {
  private config: ApiConfig;
  private authToken: string | null = null;

  constructor(config: ApiConfig) {
    this.config = {
      timeout: 30000,
      defaultHeaders: {
        'Content-Type': 'application/json',
      },
      ...config,
    };

    // Load auth token from storage
    this.loadAuthToken();
  }

  private loadAuthToken(): void {
    const sessionData = localStorage.getItem('user_session') || sessionStorage.getItem('user_session');
    if (sessionData) {
      try {
        const session = JSON.parse(sessionData);
        this.authToken = session.token || null;
      } catch (err) {
        console.warn('Failed to parse auth token from session:', err);
      }
    }
  }

  private getHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
    const headers = { ...this.config.defaultHeaders, ...customHeaders };

    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  private async makeRequest<T>(
    method: string,
    url: string,
    data?: any,
    customHeaders?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    const fullUrl = `${this.config.baseUrl}${url}`;
    const headers = this.getHeaders(customHeaders);

    const requestInit: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.config.timeout || 30000),
    };

    if (data) {
      if (data instanceof FormData) {
        // Don't set Content-Type for FormData, let browser set it with boundary
        delete headers['Content-Type'];
        requestInit.body = data;
      } else {
        requestInit.body = JSON.stringify(data);
      }
    }

    try {
      const response = await fetch(fullUrl, requestInit);

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let responseData;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      if (!response.ok) {
        throw new ApiError({
          message: responseData?.message || `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
          code: responseData?.code,
          details: responseData,
        });
      }

      return {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError({
          message: 'Request timeout',
          code: 'TIMEOUT',
        });
      }

      throw new ApiError({
        message: error instanceof Error ? error.message : 'Network error',
        code: 'NETWORK_ERROR',
        details: error,
      });
    }
  }

  // Auth methods
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  clearAuthToken(): void {
    this.authToken = null;
  }

  // Generic HTTP methods
  async get<T>(url: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('GET', url, undefined, headers);
  }

  async post<T>(url: string, data?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('POST', url, data, headers);
  }

  async put<T>(url: string, data?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('PUT', url, data, headers);
  }

  async delete<T>(url: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('DELETE', url, undefined, headers);
  }

  // Tenant/Wizard API methods
  async createTenant(data: TenantCreateRequest): Promise<ApiResponse<{ id: string; sessionId: string }>> {
    return this.post('/api/tenants', data);
  }

  async updateTenantBranding(tenantId: string, data: TenantBrandingRequest): Promise<ApiResponse<void>> {
    return this.put(`/api/tenants/${tenantId}/branding`, data);
  }

  async uploadTenantFiles(tenantId: string, formData: FormData): Promise<ApiResponse<{
    uploadId: string;
    totalFiles: number;
    processedFiles: number;
  }>> {
    return this.post(`/api/tenants/${tenantId}/upload`, formData);
  }

  async getTenantPreview(tenantId: string): Promise<ApiResponse<{
    previewUrl: string;
    stats: {
      totalListings: number;
      totalCategories: number;
      lastUpdated: string;
    };
  }>> {
    return this.get(`/api/tenants/${tenantId}/preview`);
  }

  async publishTenant(tenantId: string): Promise<ApiResponse<{ jobId: string }>> {
    return this.post(`/api/tenants/${tenantId}/publish`);
  }

  async getProvisioningJob(tenantId: string, jobId: string): Promise<ApiResponse<ProvisioningJobResponse>> {
    return this.get(`/api/tenants/${tenantId}/jobs/${jobId}`);
  }

  // Auth API methods
  async login(data: AuthLoginRequest): Promise<ApiResponse<AuthResponse>> {
    const response = await this.post<AuthResponse>('/api/auth/login', data);
    if (response.data.token) {
      this.setAuthToken(response.data.token);
    }
    return response;
  }

  async register(data: AuthRegisterRequest): Promise<ApiResponse<AuthResponse>> {
    const response = await this.post<AuthResponse>('/api/auth/register', data);
    if (response.data.token) {
      this.setAuthToken(response.data.token);
    }
    return response;
  }

  async verifyEmail(token: string): Promise<ApiResponse<{ message: string }>> {
    return this.post('/api/auth/verify-email', { token });
  }

  async logout(): Promise<void> {
    try {
      await this.post('/api/auth/logout');
    } catch (err) {
      // Ignore logout errors
      console.warn('Logout request failed:', err);
    }
    this.clearAuthToken();
  }

  // Claims API methods
  async submitClaim(listingId: string, data: ClaimFormData): Promise<ApiResponse<ClaimResponse>> {
    return this.post(`/api/listings/${listingId}/claim`, data);
  }

  async verifyClaim(claimId: string, verificationData: any): Promise<ApiResponse<ClaimResponse>> {
    return this.post(`/api/claims/${claimId}/verify`, verificationData);
  }

  async getClaim(claimId: string): Promise<ApiResponse<ClaimResponse>> {
    return this.get(`/api/claims/${claimId}`);
  }

  async getUserClaims(page = 1, limit = 10): Promise<ApiResponse<UserClaimsResponse>> {
    return this.get(`/api/users/me/claims?page=${page}&limit=${limit}`);
  }

  async updateListing(listingId: string, data: any): Promise<ApiResponse<void>> {
    return this.put(`/api/listings/${listingId}/update`, data);
  }

  // File upload helper
  createFileUploadFormData(files: FileList, type: 'CSV' | 'JSON'): FormData {
    const formData = new FormData();

    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    formData.append('type', type);

    return formData;
  }

  // Utility methods
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return this.get('/api/health');
  }

  async getVersion(): Promise<ApiResponse<{ version: string; build: string }>> {
    return this.get('/api/version');
  }
}

// Custom error class
class ApiError extends Error {
  public status?: number;
  public code?: string;
  public details?: any;

  constructor({ message, status, code, details }: {
    message: string;
    status?: number;
    code?: string;
    details?: any;
  }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Default API client instance
const defaultConfig: ApiConfig = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001',
  timeout: 30000,
};

export const apiClient = new ApiClient(defaultConfig);

// Factory function for custom configurations
export const createApiClient = (config: ApiConfig): ApiClient => {
  return new ApiClient(config);
};

export { ApiClient, ApiError };

// Type exports for convenience
export type {
  TenantCreateRequest,
  TenantBrandingRequest,
  FileUploadRequest,
  PublishRequest,
  ProvisioningJobResponse,
  AuthLoginRequest,
  AuthRegisterRequest,
  AuthResponse,
  ClaimResponse,
  UserClaimsResponse,
};