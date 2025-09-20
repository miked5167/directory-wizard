import {
  ApiClient,
  ApiError,
  apiClient,
  createApiClient,
  TenantCreateRequest,
  TenantBrandingRequest,
  AuthLoginRequest,
  AuthRegisterRequest,
  ClaimFormData,
} from '../ApiClient';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock AbortSignal.timeout for older environments
if (!AbortSignal.timeout) {
  AbortSignal.timeout = jest.fn().mockReturnValue(new AbortController().signal);
}

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

describe('ApiClient', () => {
  const baseUrl = 'https://api.example.com';
  let client: ApiClient;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    sessionStorageMock.getItem.mockReturnValue(null);

    client = new ApiClient({
      baseUrl,
      timeout: 5000,
    });
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with default configuration', () => {
      const defaultClient = new ApiClient({ baseUrl });

      expect(defaultClient).toBeDefined();
    });

    it('should load auth token from localStorage', () => {
      const sessionData = {
        token: 'stored-token-123',
        userId: 'user123',
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(sessionData));

      const clientWithToken = new ApiClient({ baseUrl });

      // Should set the token internally (we can't directly test private properties)
      expect(localStorageMock.getItem).toHaveBeenCalledWith('user_session');
    });

    it('should load auth token from sessionStorage when localStorage is empty', () => {
      const sessionData = {
        token: 'session-token-123',
        userId: 'user123',
      };

      localStorageMock.getItem.mockReturnValue(null);
      sessionStorageMock.getItem.mockReturnValue(JSON.stringify(sessionData));

      const clientWithToken = new ApiClient({ baseUrl });

      expect(sessionStorageMock.getItem).toHaveBeenCalledWith('user_session');
    });

    it('should handle corrupted session data gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json');

      expect(() => {
        new ApiClient({ baseUrl });
      }).not.toThrow();
    });
  });

  describe('Auth Token Management', () => {
    it('should set auth token', () => {
      const token = 'new-auth-token';

      client.setAuthToken(token);

      // Token should be used in subsequent requests
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ success: true }),
      });

      client.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${token}`,
          }),
        })
      );
    });

    it('should clear auth token', () => {
      client.setAuthToken('token-to-clear');
      client.clearAuthToken();

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ success: true }),
      });

      client.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.any(String),
          }),
        })
      );
    });
  });

  describe('HTTP Methods', () => {
    const mockSuccessResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({
        'content-type': 'application/json',
        'x-custom-header': 'custom-value',
      }),
      json: () => Promise.resolve({ message: 'Success', data: { id: 123 } }),
    };

    beforeEach(() => {
      mockFetch.mockResolvedValue(mockSuccessResponse);
    });

    it('should make GET requests', async () => {
      const response = await client.get('/users/123');

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/users/123`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );

      expect(response.status).toBe(200);
      expect(response.data.message).toBe('Success');
      expect(response.headers['x-custom-header']).toBe('custom-value');
    });

    it('should make POST requests with JSON data', async () => {
      const postData = { name: 'John Doe', email: 'john@example.com' };

      await client.post('/users', postData);

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/users`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(postData),
        })
      );
    });

    it('should make POST requests with FormData', async () => {
      const formData = new FormData();
      formData.append('file', new Blob(['test'], { type: 'text/plain' }));
      formData.append('description', 'Test file');

      await client.post('/upload', formData);

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/upload`,
        expect.objectContaining({
          method: 'POST',
          body: formData,
          headers: expect.not.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should make PUT requests', async () => {
      const putData = { name: 'Updated Name' };

      await client.put('/users/123', putData);

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/users/123`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(putData),
        })
      );
    });

    it('should make DELETE requests', async () => {
      await client.delete('/users/123');

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/users/123`,
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should include custom headers', async () => {
      const customHeaders = {
        'X-Custom-Header': 'custom-value',
        'Accept-Language': 'en-US',
      };

      await client.get('/test', customHeaders);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining(customHeaders),
        })
      );
    });
  });

  describe('Response Handling', () => {
    it('should handle JSON responses', async () => {
      const jsonData = { message: 'Success', items: [1, 2, 3] };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(jsonData),
      });

      const response = await client.get('/test');

      expect(response.data).toEqual(jsonData);
    });

    it('should handle text responses', async () => {
      const textData = 'Plain text response';

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: () => Promise.resolve(textData),
      });

      const response = await client.get('/test');

      expect(response.data).toBe(textData);
    });

    it('should handle empty responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: new Headers(),
        text: () => Promise.resolve(''),
      });

      const response = await client.get('/test');

      expect(response.status).toBe(204);
      expect(response.data).toBe('');
    });
  });

  describe('Error Handling', () => {
    it('should handle HTTP error responses', async () => {
      const errorResponse = {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: { field: 'email', reason: 'invalid format' },
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(errorResponse),
      });

      await expect(client.get('/test')).rejects.toThrow(ApiError);

      try {
        await client.get('/test');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(400);
        expect((error as ApiError).message).toBe('Validation failed');
        expect((error as ApiError).code).toBe('VALIDATION_ERROR');
        expect((error as ApiError).details).toEqual(errorResponse);
      }
    });

    it('should handle HTTP errors without JSON body', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: () => Promise.resolve('Server Error'),
      });

      await expect(client.get('/test')).rejects.toThrow('HTTP 500: Internal Server Error');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network connection failed'));

      await expect(client.get('/test')).rejects.toThrow(ApiError);

      try {
        await client.get('/test');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe('NETWORK_ERROR');
        expect((error as ApiError).message).toBe('Network connection failed');
      }
    });

    it('should handle timeout errors', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      await expect(client.get('/test')).rejects.toThrow(ApiError);

      try {
        await client.get('/test');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe('TIMEOUT');
        expect((error as ApiError).message).toBe('Request timeout');
      }
    });
  });

  describe('Tenant/Wizard API Methods', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ success: true }),
      });
    });

    it('should create tenant', async () => {
      const tenantData: TenantCreateRequest = {
        name: 'Test Directory',
        domain: 'test-directory',
        description: 'A test directory',
        category: 'business',
        location: 'New York',
      };

      await client.createTenant(tenantData);

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/tenants`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(tenantData),
        })
      );
    });

    it('should update tenant branding', async () => {
      const tenantId = 'tenant123';
      const brandingData: TenantBrandingRequest = {
        primaryColor: '#3B82F6',
        secondaryColor: '#1F2937',
        logoUrl: 'https://example.com/logo.png',
        fontFamily: 'Inter',
        customFontUrl: 'https://fonts.googleapis.com/css2?family=Inter',
      };

      await client.updateTenantBranding(tenantId, brandingData);

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/tenants/${tenantId}/branding`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(brandingData),
        })
      );
    });

    it('should upload tenant files', async () => {
      const tenantId = 'tenant123';
      const formData = new FormData();
      formData.append('file', new Blob(['test'], { type: 'text/csv' }));

      await client.uploadTenantFiles(tenantId, formData);

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/tenants/${tenantId}/upload`,
        expect.objectContaining({
          method: 'POST',
          body: formData,
        })
      );
    });

    it('should get tenant preview', async () => {
      const tenantId = 'tenant123';

      await client.getTenantPreview(tenantId);

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/tenants/${tenantId}/preview`,
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should publish tenant', async () => {
      const tenantId = 'tenant123';

      await client.publishTenant(tenantId);

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/tenants/${tenantId}/publish`,
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should get provisioning job status', async () => {
      const tenantId = 'tenant123';
      const jobId = 'job456';

      await client.getProvisioningJob(tenantId, jobId);

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/tenants/${tenantId}/jobs/${jobId}`,
        expect.objectContaining({
          method: 'GET',
        })
      );
    });
  });

  describe('Auth API Methods', () => {
    const mockAuthResponse = {
      user: {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        createdAt: '2024-01-01T00:00:00Z',
      },
      token: 'jwt-token-123',
      refreshToken: 'refresh-token-123',
      expiresAt: '2024-01-02T00:00:00Z',
    };

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(mockAuthResponse),
      });
    });

    it('should login and set auth token', async () => {
      const loginData: AuthLoginRequest = {
        email: 'test@example.com',
        password: 'password123',
      };

      const response = await client.login(loginData);

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/auth/login`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(loginData),
        })
      );

      expect(response.data).toEqual(mockAuthResponse);

      // Verify token is set for subsequent requests
      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({}),
      });

      await client.get('/protected');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockAuthResponse.token}`,
          }),
        })
      );
    });

    it('should register and set auth token', async () => {
      const registerData: AuthRegisterRequest = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'test@example.com',
        password: 'password123',
        businessName: 'Test Business',
        businessRole: 'Owner',
      };

      const response = await client.register(registerData);

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/auth/register`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(registerData),
        })
      );

      expect(response.data).toEqual(mockAuthResponse);
    });

    it('should verify email', async () => {
      const token = 'verification-token-123';

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ message: 'Email verified successfully' }),
      });

      await client.verifyEmail(token);

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/auth/verify-email`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ token }),
        })
      );
    });

    it('should logout and clear auth token', async () => {
      // Set a token first
      client.setAuthToken('token-to-clear');

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        text: () => Promise.resolve(''),
      });

      await client.logout();

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/auth/logout`,
        expect.objectContaining({
          method: 'POST',
        })
      );

      // Verify token is cleared for subsequent requests
      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({}),
      });

      await client.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.any(String),
          }),
        })
      );
    });

    it('should handle logout errors gracefully', async () => {
      client.setAuthToken('token-to-clear');

      mockFetch.mockRejectedValue(new Error('Logout failed'));

      // Should not throw, just log warning
      await expect(client.logout()).resolves.toBeUndefined();
    });
  });

  describe('Claims API Methods', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ success: true }),
      });
    });

    it('should submit claim', async () => {
      const listingId = 'listing123';
      const claimData = {
        claimerName: 'John Doe',
        claimerEmail: 'john@example.com',
        claimerPhone: '555-1234',
        businessRole: 'Owner',
        verificationMethod: 'business_documents',
        message: 'I own this business',
      } as ClaimFormData;

      await client.submitClaim(listingId, claimData);

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/listings/${listingId}/claim`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(claimData),
        })
      );
    });

    it('should verify claim', async () => {
      const claimId = 'claim123';
      const verificationData = {
        documents: ['doc1.pdf', 'doc2.pdf'],
        notes: 'Verification complete',
      };

      await client.verifyClaim(claimId, verificationData);

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/claims/${claimId}/verify`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(verificationData),
        })
      );
    });

    it('should get claim', async () => {
      const claimId = 'claim123';

      await client.getClaim(claimId);

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/claims/${claimId}`,
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should get user claims with pagination', async () => {
      const page = 2;
      const limit = 20;

      await client.getUserClaims(page, limit);

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/users/me/claims?page=${page}&limit=${limit}`,
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should get user claims with default pagination', async () => {
      await client.getUserClaims();

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/users/me/claims?page=1&limit=10`,
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should update listing', async () => {
      const listingId = 'listing123';
      const updateData = {
        name: 'Updated Business Name',
        description: 'Updated description',
        phone: '555-9999',
      };

      await client.updateListing(listingId, updateData);

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/listings/${listingId}/update`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateData),
        })
      );
    });
  });

  describe('Utility Methods', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ success: true }),
      });
    });

    it('should create file upload form data', () => {
      const files = [
        new File(['content1'], 'file1.csv', { type: 'text/csv' }),
        new File(['content2'], 'file2.json', { type: 'application/json' }),
      ] as any as FileList;

      const formData = client.createFileUploadFormData(files, 'CSV');

      expect(formData).toBeInstanceOf(FormData);
      expect(formData.get('type')).toBe('CSV');
      expect(formData.getAll('files')).toHaveLength(2);
    });

    it('should perform health check', async () => {
      await client.healthCheck();

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/health`,
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should get version info', async () => {
      await client.getVersion();

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/version`,
        expect.objectContaining({
          method: 'GET',
        })
      );
    });
  });

  describe('Factory Functions', () => {
    it('should create API client with custom config', () => {
      const customConfig = {
        baseUrl: 'https://custom.api.com',
        timeout: 10000,
        defaultHeaders: {
          'X-Custom-Header': 'custom-value',
        },
      };

      const customClient = createApiClient(customConfig);

      expect(customClient).toBeInstanceOf(ApiClient);
    });

    it('should provide default API client instance', () => {
      expect(apiClient).toBeInstanceOf(ApiClient);
    });
  });

  describe('ApiError Class', () => {
    it('should create ApiError with all properties', () => {
      const errorData = {
        message: 'Test error',
        status: 400,
        code: 'TEST_ERROR',
        details: { field: 'email', reason: 'invalid' },
      };

      const error = new ApiError(errorData);

      expect(error.name).toBe('ApiError');
      expect(error.message).toBe('Test error');
      expect(error.status).toBe(400);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.details).toEqual(errorData.details);
      expect(error).toBeInstanceOf(Error);
    });

    it('should create ApiError with minimal properties', () => {
      const error = new ApiError({ message: 'Simple error' });

      expect(error.message).toBe('Simple error');
      expect(error.status).toBeUndefined();
      expect(error.code).toBeUndefined();
      expect(error.details).toBeUndefined();
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should handle empty response bodies', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: new Headers(),
        text: () => Promise.resolve(''),
      });

      const response = await client.delete('/resource/123');

      expect(response.status).toBe(204);
      expect(response.data).toBe('');
    });

    it('should handle large JSON responses', async () => {
      const largeData = {
        items: Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          description: `Description for item ${i}`.repeat(10),
        })),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(largeData),
      });

      const response = await client.get('/large-dataset');

      expect(response.data.items).toHaveLength(10000);
    });

    it('should handle concurrent requests', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ success: true }),
      });

      const requests = Array.from({ length: 10 }, (_, i) =>
        client.get(`/endpoint-${i}`)
      );

      const responses = await Promise.all(requests);

      expect(responses).toHaveLength(10);
      expect(mockFetch).toHaveBeenCalledTimes(10);
    });

    it('should handle malformed JSON gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.reject(new Error('Unexpected token in JSON')),
      });

      await expect(client.get('/malformed-json')).rejects.toThrow(ApiError);
    });

    it('should preserve request order for sequential calls', async () => {
      const responses = ['response1', 'response2', 'response3'];
      let responseIndex = 0;

      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve({ data: responses[responseIndex++] }),
        })
      );

      const results = [];
      for (let i = 0; i < 3; i++) {
        const response = await client.get(`/endpoint-${i}`);
        results.push(response.data.data);
      }

      expect(results).toEqual(['response1', 'response2', 'response3']);
    });
  });
});