import request from 'supertest';
import app from '../../src/index';
import {
  AppError,
  ValidationError,
  BusinessLogicError,
  DatabaseError,
  NotFoundError,
  ConflictError,
  AuthenticationError,
} from '../../src/middleware/errorMiddleware';

describe('Error Middleware Integration Tests', () => {
  describe('Custom Error Classes', () => {
    it('should create AppError with correct properties', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR');

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.isOperational).toBe(true);
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
    });

    it('should create ValidationError with field information', () => {
      const error = new ValidationError('Email is required', 'email');

      expect(error.message).toBe('Email is required');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.field).toBe('email');
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ValidationError);
    });

    it('should create BusinessLogicError with custom status code', () => {
      const error = new BusinessLogicError('Cannot delete active user', 422);

      expect(error.message).toBe('Cannot delete active user');
      expect(error.statusCode).toBe(422);
      expect(error.code).toBe('BUSINESS_LOGIC_ERROR');
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(BusinessLogicError);
    });

    it('should create DatabaseError with original error stack', () => {
      const originalError = new Error('Connection failed');
      const error = new DatabaseError('Database operation failed', originalError);

      expect(error.message).toBe('Database operation failed');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('DATABASE_ERROR');
      expect(error.stack).toBe(originalError.stack);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(DatabaseError);
    });

    it('should create NotFoundError for specific resource', () => {
      const error = new NotFoundError('User');

      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND_ERROR');
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(NotFoundError);
    });

    it('should create ConflictError for resource conflicts', () => {
      const error = new ConflictError('Email already exists');

      expect(error.message).toBe('Email already exists');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT_ERROR');
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ConflictError);
    });

    it('should create AuthenticationError with default message', () => {
      const error = new AuthenticationError();

      expect(error.message).toBe('Authentication required');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTHENTICATION_ERROR');
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(AuthenticationError);
    });
  });

  describe('Error Handler Integration', () => {
    it('should handle 404 routes consistently', async () => {
      const responses = await Promise.all([
        request(app).get('/api/fake-route').expect(404),
        request(app).post('/api/another-fake').expect(404),
        request(app).put('/api/not-real').expect(404),
        request(app).delete('/api/missing').expect(404),
      ]);

      responses.forEach(response => {
        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('code', 'NOT_FOUND_ERROR');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('path');
        expect(response.body).toHaveProperty('method');
        expect(response.body.error).toContain('not found');
      });
    });

    it('should provide detailed error information', async () => {
      const response = await request(app).get('/api/detailed-error-test').expect(404);

      const errorResponse = response.body;

      // Verify all required fields are present
      expect(errorResponse).toEqual(
        expect.objectContaining({
          error: expect.any(String),
          message: expect.any(String),
          timestamp: expect.any(String),
          path: expect.any(String),
          method: expect.any(String),
        })
      );

      // Verify timestamp is valid ISO date
      expect(() => new Date(errorResponse.timestamp)).not.toThrow();
      expect(new Date(errorResponse.timestamp).getTime()).toBeLessThanOrEqual(Date.now());

      // Verify path and method match request
      expect(errorResponse.path).toBe('/api/detailed-error-test');
      expect(errorResponse.method).toBe('GET');
    });
  });

  describe('Error Response Consistency', () => {
    it('should maintain consistent error format across different routes', async () => {
      const routes = ['/api/unknown-endpoint', '/api/missing/route', '/api/fake/resource/123'];

      const responses = await Promise.all(routes.map(route => request(app).get(route).expect(404)));

      // All responses should have the same structure
      const errorStructure = {
        error: 'string',
        message: 'string',
        code: 'string',
        timestamp: 'string',
        path: 'string',
        method: 'string',
      };

      responses.forEach((response, index) => {
        Object.keys(errorStructure).forEach(key => {
          expect(response.body).toHaveProperty(key);
          expect(typeof response.body[key]).toBe(
            errorStructure[key as keyof typeof errorStructure]
          );
        });

        expect(response.body.path).toBe(routes[index]);
        expect(response.body.method).toBe('GET');
        expect(response.body.code).toBe('NOT_FOUND_ERROR');
      });
    });
  });
});
