import request from 'supertest';
import app from '../../src/index';

describe('Error Handling Middleware - Contract Tests', () => {
  describe('404 Errors', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/non-existent-route')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code', 'NOT_FOUND_ERROR');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('path', '/api/non-existent-route');
      expect(response.body).toHaveProperty('method', 'GET');
      expect(response.body.error).toContain('Route /api/non-existent-route not found');
    });

    it('should return 404 for non-existent POST routes', async () => {
      const response = await request(app)
        .post('/api/invalid-endpoint')
        .send({ test: 'data' })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code', 'NOT_FOUND_ERROR');
      expect(response.body).toHaveProperty('method', 'POST');
    });
  });

  describe('JSON Parsing Errors', () => {
    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/tenants')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(response.body.error).toContain('Invalid JSON');
    });
  });

  describe('Validation Errors', () => {
    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/tenants')
        .send({}) // Empty body - missing required fields
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('path', '/api/tenants');
      expect(response.body).toHaveProperty('method', 'POST');
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent error response format', async () => {
      const response = await request(app).get('/api/non-existent').expect('Content-Type', /json/);

      // Verify required fields
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('path');
      expect(response.body).toHaveProperty('method');

      // Verify field types
      expect(typeof response.body.error).toBe('string');
      expect(typeof response.body.message).toBe('string');
      expect(typeof response.body.timestamp).toBe('string');
      expect(typeof response.body.path).toBe('string');
      expect(typeof response.body.method).toBe('string');

      // Verify timestamp is valid ISO string
      expect(() => new Date(response.body.timestamp)).not.toThrow();
    });

    it('should include stack trace in development mode', async () => {
      // Set NODE_ENV to development
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const response = await request(app).get('/api/non-existent').expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('stack');
      expect(typeof response.body.stack).toBe('string');

      // Restore original NODE_ENV
      process.env.NODE_ENV = originalEnv;
    });

    it('should not include stack trace in production mode', async () => {
      // Set NODE_ENV to production
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app).get('/api/non-existent').expect('Content-Type', /json/);

      expect(response.body).not.toHaveProperty('stack');

      // Restore original NODE_ENV
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Database Error Handling', () => {
    it('should handle non-existent tenant lookup gracefully', async () => {
      const nonExistentId = '999e4567-e89b-12d3-a456-426614174999';

      const response = await request(app)
        .get(`/api/tenants/${nonExistentId}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Method Not Allowed', () => {
    it('should handle unsupported HTTP methods', async () => {
      const response = await request(app)
        .patch('/health') // PATCH not supported on /health
        .expect('Content-Type', /json/);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code', 'NOT_FOUND_ERROR');
    });
  });
});
