import request from 'supertest';
import app from '../../src/index';
import path from 'path';

describe('POST /api/listings/:id/claim - Contract Tests', () => {
  let authToken: string;
  let testUserId: string;
  let testListingId: string;

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

    // Create a test tenant and listing for each test
    const tenantResponse = await request(app)
      .post('/api/tenants')
      .send({
        name: 'Claim Test Tenant',
        domain: `claim-api-test-${Date.now()}`,
      });

    const tenantId = tenantResponse.body.id;

    // Upload categories and listings using file upload approach
    const categoriesPath = path.join(__dirname, '../fixtures/categories.json');
    await request(app)
      .post(`/api/tenants/${tenantId}/upload?type=categories`)
      .attach('file', categoriesPath);

    const listingsPath = path.join(__dirname, '../fixtures/listings.csv');
    await request(app)
      .post(`/api/tenants/${tenantId}/upload?type=listings`)
      .attach('file', listingsPath);

    // Get the created listing ID
    const tenantDetails = await request(app).get(`/api/tenants/${tenantId}`);

    testListingId = tenantDetails.body.listings[0].id;
  });

  describe('Request Authentication', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/listings/${testListingId}/claim`)
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
      const response = await request(app)
        .post(`/api/listings/${testListingId}/claim`)
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

  describe('Request Validation', () => {
    it('should accept valid email verification claim request', async () => {
      const validPayload = {
        claimMethod: 'EMAIL_VERIFICATION',
        verificationData: {
          email: 'owner@business.com',
          businessName: 'Test Business LLC',
        },
      };

      const response = await request(app)
        .post(`/api/listings/${testListingId}/claim`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(validPayload)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('claim');
      expect(response.body.claim).toHaveProperty('id');
      expect(response.body.claim).toHaveProperty('status', 'PENDING');
      expect(response.body.claim).toHaveProperty('expiresAt');

      // Validate UUID format
      expect(response.body.claim.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );

      // Validate expiration date is in the future
      const expiresAt = new Date(response.body.claim.expiresAt);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should accept valid phone verification claim request', async () => {
      const validPayload = {
        claimMethod: 'PHONE_VERIFICATION',
        verificationData: {
          phoneNumber: '+1-555-0123',
          businessName: 'Test Business LLC',
        },
      };

      const response = await request(app)
        .post(`/api/listings/${testListingId}/claim`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(validPayload)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('claim');
      expect(response.body.claim).toHaveProperty('id');
      expect(response.body.claim).toHaveProperty('status', 'PENDING');
    });

    it('should accept valid document upload claim request', async () => {
      const validPayload = {
        claimMethod: 'DOCUMENT_UPLOAD',
        verificationData: {
          businessName: 'Test Business LLC',
          documentType: 'business_license',
        },
      };

      const response = await request(app)
        .post(`/api/listings/${testListingId}/claim`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(validPayload)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('claim');
      expect(response.body.claim).toHaveProperty('id');
      expect(response.body.claim).toHaveProperty('status', 'PENDING');
    });
  });

  describe('Validation Rules', () => {
    it('should reject request missing required claim_method field', async () => {
      const invalidPayload = {
        verificationData: {
          email: 'owner@business.com',
        },
      };

      const response = await request(app)
        .post(`/api/listings/${testListingId}/claim`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidPayload)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('claimMethod');
    });

    it('should reject invalid claim_method value', async () => {
      const invalidPayload = {
        claimMethod: 'INVALID_METHOD',
        verificationData: {
          email: 'owner@business.com',
        },
      };

      const response = await request(app)
        .post(`/api/listings/${testListingId}/claim`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidPayload)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('claimMethod');
    });

    it('should reject email verification without email in verification_data', async () => {
      const invalidPayload = {
        claimMethod: 'EMAIL_VERIFICATION',
        verificationData: {
          businessName: 'Test Business',
        },
      };

      const response = await request(app)
        .post(`/api/listings/${testListingId}/claim`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidPayload)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(422);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('email');
    });

    it('should reject phone verification without phone in verification_data', async () => {
      const invalidPayload = {
        claimMethod: 'PHONE_VERIFICATION',
        verificationData: {
          businessName: 'Test Business',
        },
      };

      const response = await request(app)
        .post(`/api/listings/${testListingId}/claim`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidPayload)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(422);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('phone');
    });

    it('should reject invalid email format in verification_data', async () => {
      const invalidPayload = {
        claimMethod: 'EMAIL_VERIFICATION',
        verificationData: {
          email: 'not-an-email',
          businessName: 'Test Business',
        },
      };

      const response = await request(app)
        .post(`/api/listings/${testListingId}/claim`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidPayload)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(422);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('email');
      expect(response.body.error).toContain('format');
    });
  });

  describe('Business Logic Validation', () => {
    it('should reject claim for listing that already has an active claim', async () => {
      const payload = {
        claimMethod: 'EMAIL_VERIFICATION',
        verificationData: {
          email: 'owner@business.com',
          businessName: 'Test Business',
        },
      };

      // First claim should succeed
      await request(app)
        .post(`/api/listings/${testListingId}/claim`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload)
        .expect(201);

      // Second claim should fail
      const response = await request(app)
        .post(`/api/listings/${testListingId}/claim`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('active claim');
    });

    it('should reject claim for non-existent listing', async () => {
      const nonExistentId = '999e4567-e89b-12d3-a456-426614174999';
      const payload = {
        claimMethod: 'EMAIL_VERIFICATION',
        verificationData: {
          email: 'owner@business.com',
          businessName: 'Test Business',
        },
      };

      const response = await request(app)
        .post(`/api/listings/${nonExistentId}/claim`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('listing');
      expect(response.body.error).toContain('not found');
    });
  });

  describe('Response Schema Validation', () => {
    it('should return claim response with correct schema', async () => {
      const payload = {
        claimMethod: 'EMAIL_VERIFICATION',
        verificationData: {
          email: 'schema-test@business.com',
          businessName: 'Schema Test Business',
        },
      };

      const response = await request(app)
        .post(`/api/listings/${testListingId}/claim`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload)
        .expect(201);

      // Validate response schema matches OpenAPI spec
      expect(response.body).toEqual(
        expect.objectContaining({
          claim_id: expect.any(String),
          status: expect.stringMatching(/^(PENDING|APPROVED|REJECTED|VERIFIED|EXPIRED)$/),
          expires_at: expect.any(String),
          next_steps: expect.any(Array),
        })
      );

      // Validate ISO date format
      expect(response.body.expires_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      // Validate next_steps contains actionable items
      expect(response.body.next_steps.length).toBeGreaterThan(0);
      response.body.next_steps.forEach((step: string) => {
        expect(typeof step).toBe('string');
        expect(step.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Path Parameter Validation', () => {
    it('should reject invalid listing ID format', async () => {
      const payload = {
        claimMethod: 'EMAIL_VERIFICATION',
        verificationData: {
          email: 'owner@business.com',
          businessName: 'Test Business',
        },
      };

      const response = await request(app)
        .post('/api/listings/invalid-id/claim')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('invalid');
    });
  });
});
