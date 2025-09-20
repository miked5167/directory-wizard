import request from 'supertest';
import app from '../../src/index';

describe('POST /api/listings/:id/claim - Simple Contract Tests', () => {
  let authToken: string;
  let testUserId: string;

  beforeEach(async () => {
    // Register and login to get a JWT token for each test
    const testUser = {
      email: `claimapi-${Date.now()}@example.com`,
      password: 'SecurePass123!',
      firstName: 'Claim',
      lastName: 'Tester',
    };

    const registerResponse = await request(app).post('/api/auth/register').send(testUser);

    testUserId = registerResponse.body.user.id;

    const loginResponse = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });

    authToken = loginResponse.body.token;
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      const mockListingId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .post(`/api/listings/${mockListingId}/claim`)
        .send({
          claimMethod: 'EMAIL_VERIFICATION',
          verificationData: {
            email: 'test@example.com',
            message: 'I own this business',
          },
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Authorization header required');
    });

    it('should reject invalid auth tokens', async () => {
      const mockListingId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .post(`/api/listings/${mockListingId}/claim`)
        .set('Authorization', 'Bearer invalid-token')
        .send({
          claimMethod: 'EMAIL_VERIFICATION',
          verificationData: {
            email: 'test@example.com',
            message: 'I own this business',
          },
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid or expired token');
    });
  });

  describe('Validation', () => {
    it('should reject invalid listing ID format', async () => {
      const response = await request(app)
        .post('/api/listings/invalid-id/claim')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          claimMethod: 'EMAIL_VERIFICATION',
          verificationData: {
            email: 'test@example.com',
            message: 'I own this business',
          },
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid listing ID format');
    });

    it('should reject missing claimMethod', async () => {
      const mockListingId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .post(`/api/listings/${mockListingId}/claim`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          verificationData: {
            email: 'test@example.com',
            message: 'I own this business',
          },
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Missing required field: claimMethod');
    });

    it('should reject missing verificationData', async () => {
      const mockListingId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .post(`/api/listings/${mockListingId}/claim`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          claimMethod: 'EMAIL_VERIFICATION',
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Missing required field: verificationData');
    });

    it('should reject invalid claimMethod', async () => {
      const mockListingId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .post(`/api/listings/${mockListingId}/claim`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          claimMethod: 'INVALID_METHOD',
          verificationData: {
            email: 'test@example.com',
            message: 'I own this business',
          },
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid claimMethod');
    });

    it('should reject invalid email verification data', async () => {
      const mockListingId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .post(`/api/listings/${mockListingId}/claim`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          claimMethod: 'EMAIL_VERIFICATION',
          verificationData: {
            email: 'invalid-email',
            message: 'I own this business',
          },
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid claim data');
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent listings', async () => {
      const nonExistentId = '999e4567-e89b-12d3-a456-426614174999';
      const response = await request(app)
        .post(`/api/listings/${nonExistentId}/claim`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          claimMethod: 'EMAIL_VERIFICATION',
          verificationData: {
            email: 'test@example.com',
            message: 'I own this business',
          },
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Listing not found');
    });
  });
});
