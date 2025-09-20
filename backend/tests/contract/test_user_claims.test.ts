import request from 'supertest';
import app from '../../src/index';
import { resetRateLimiting } from '../../src/routes/auth';

describe('GET /api/users/me/claims - Contract Tests', () => {
  let authToken: string;
  let testUserId: string;
  let tenantId: string;
  let listingId1: string;
  let listingId2: string;
  let claimId1: string;
  let claimId2: string;

  // Test user data
  const testUser = {
    email: 'userclaims@example.com',
    password: 'SecurePass123!',
    firstName: 'User',
    lastName: 'Claims',
  };

  beforeEach(async () => {
    // Reset rate limiting state for clean tests
    resetRateLimiting();

    // Register and login test user
    await request(app).post('/api/auth/register').send(testUser);

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    authToken = loginResponse.body.token;
    testUserId = loginResponse.body.user.id;

    // Create a test tenant with listings
    const tenantResponse = await request(app)
      .post('/api/tenants')
      .send({
        name: 'User Claims Test Tenant',
        domain: `user-claims-test-${Date.now()}.example.com`,
        description: 'Test tenant for user claims',
      });

    tenantId = tenantResponse.body.id;

    // Use mock listing IDs for testing
    listingId1 = '550e8400-e29b-41d4-a716-446655440000';
    listingId2 = '550e8400-e29b-41d4-a716-446655440001';

    // Create multiple claims for testing pagination and filtering
    const claimResponse1 = await request(app)
      .post(`/api/listings/${listingId1}/claim`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        claim_method: 'EMAIL_VERIFICATION',
        verification_data: {
          email: 'business@example.com',
          business_name: 'Test Business 1',
        },
      });

    claimId1 = claimResponse1.body.claim_id;

    const claimResponse2 = await request(app)
      .post(`/api/listings/${listingId2}/claim`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        claim_method: 'DOCUMENT_UPLOAD',
        verification_data: {
          business_name: 'Test Business 2',
        },
      });

    claimId2 = claimResponse2.body.claim_id;
  });

  describe('Authentication Requirements', () => {
    it('should reject request without authentication token', async () => {
      const response = await request(app)
        .get('/api/users/me/claims')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('token');
    });

    it('should reject request with invalid authentication token', async () => {
      const response = await request(app)
        .get('/api/users/me/claims')
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Basic Functionality', () => {
    it('should return user claims with valid authentication', async () => {
      const response = await request(app)
        .get('/api/users/me/claims')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      // This test MUST FAIL until we implement the endpoint
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('claims');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.claims)).toBe(true);
      expect(response.body.claims.length).toBeGreaterThan(0);
    });

    it('should return empty array for user with no claims', async () => {
      // Create a new user with no claims
      const newUser = {
        email: 'noclaims@example.com',
        password: 'SecurePass123!',
        firstName: 'No',
        lastName: 'Claims',
      };

      await request(app).post('/api/auth/register').send(newUser);

      const newLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: newUser.email, password: newUser.password });

      const newAuthToken = newLoginResponse.body.token;

      const response = await request(app)
        .get('/api/users/me/claims')
        .set('Authorization', `Bearer ${newAuthToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('claims');
      expect(response.body.claims).toEqual([]);
      expect(response.body).toHaveProperty('pagination');
    });
  });

  describe('Response Schema Validation', () => {
    it('should return claims with correct schema', async () => {
      const response = await request(app)
        .get('/api/users/me/claims')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Validate response structure
      expect(response.body).toHaveProperty('claims');
      expect(response.body).toHaveProperty('pagination');

      // Validate claims array
      expect(Array.isArray(response.body.claims)).toBe(true);

      if (response.body.claims.length > 0) {
        const claim = response.body.claims[0];

        // Validate claim properties
        expect(claim).toHaveProperty('id');
        expect(claim).toHaveProperty('listing_id');
        expect(claim).toHaveProperty('user_id');
        expect(claim).toHaveProperty('status');
        expect(claim).toHaveProperty('claim_method');
        expect(claim).toHaveProperty('submitted_at');
        expect(claim).toHaveProperty('expires_at');
        expect(claim).toHaveProperty('listing');

        // Validate data types
        expect(typeof claim.id).toBe('string');
        expect(typeof claim.listing_id).toBe('string');
        expect(typeof claim.user_id).toBe('string');
        expect(typeof claim.status).toBe('string');
        expect(typeof claim.claim_method).toBe('string');
        expect(typeof claim.submitted_at).toBe('string');
        expect(typeof claim.expires_at).toBe('string');
        expect(typeof claim.listing).toBe('object');

        // Validate enum values
        expect(['PENDING', 'APPROVED', 'REJECTED', 'VERIFIED', 'EXPIRED']).toContain(claim.status);
        expect(['EMAIL_VERIFICATION', 'PHONE_VERIFICATION', 'DOCUMENT_UPLOAD']).toContain(
          claim.claim_method
        );

        // Validate UUID format for IDs
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        expect(claim.id).toMatch(uuidRegex);
        expect(claim.listing_id).toMatch(uuidRegex);
        expect(claim.user_id).toMatch(uuidRegex);

        // Validate date format (ISO 8601)
        expect(new Date(claim.submitted_at).toString()).not.toBe('Invalid Date');
        expect(new Date(claim.expires_at).toString()).not.toBe('Invalid Date');

        // Validate listing object
        expect(claim.listing).toHaveProperty('title');
        expect(claim.listing).toHaveProperty('slug');
        expect(claim.listing).toHaveProperty('tenant_domain');
        expect(typeof claim.listing.title).toBe('string');
        expect(typeof claim.listing.slug).toBe('string');
        expect(typeof claim.listing.tenant_domain).toBe('string');

        // Should not include sensitive or internal data
        expect(claim).not.toHaveProperty('verification_data');
        expect(claim).not.toHaveProperty('reviewer_notes');
      }

      // Validate pagination object
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('pages');

      expect(typeof response.body.pagination.page).toBe('number');
      expect(typeof response.body.pagination.limit).toBe('number');
      expect(typeof response.body.pagination.total).toBe('number');
      expect(typeof response.body.pagination.pages).toBe('number');

      expect(response.body.pagination.page).toBeGreaterThan(0);
      expect(response.body.pagination.limit).toBeGreaterThan(0);
      expect(response.body.pagination.total).toBeGreaterThanOrEqual(0);
      expect(response.body.pagination.pages).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Query Parameter Validation', () => {
    it('should accept valid status filter', async () => {
      const response = await request(app)
        .get('/api/users/me/claims?status=PENDING')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('claims');

      // All returned claims should have PENDING status
      response.body.claims.forEach((claim: any) => {
        expect(claim.status).toBe('PENDING');
      });
    });

    it('should reject invalid status filter', async () => {
      const response = await request(app)
        .get('/api/users/me/claims?status=INVALID_STATUS')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('status');
    });

    it('should accept valid page parameter', async () => {
      const response = await request(app)
        .get('/api/users/me/claims?page=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(1);
    });

    it('should reject invalid page parameter', async () => {
      const response = await request(app)
        .get('/api/users/me/claims?page=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('page');
    });

    it('should accept valid limit parameter', async () => {
      const response = await request(app)
        .get('/api/users/me/claims?limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.pagination.limit).toBe(10);
    });

    it('should reject limit parameter exceeding maximum', async () => {
      const response = await request(app)
        .get('/api/users/me/claims?limit=1000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('limit');
    });

    it('should use default values for missing pagination parameters', async () => {
      const response = await request(app)
        .get('/api/users/me/claims')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(20);
    });
  });

  describe('Pagination Functionality', () => {
    it('should handle pagination correctly', async () => {
      // Get first page with limit 1
      const response1 = await request(app)
        .get('/api/users/me/claims?page=1&limit=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response1.status).toBe(200);
      expect(response1.body.claims.length).toBeLessThanOrEqual(1);
      expect(response1.body.pagination.page).toBe(1);
      expect(response1.body.pagination.limit).toBe(1);

      // If there are multiple claims, get second page
      if (response1.body.pagination.total > 1) {
        const response2 = await request(app)
          .get('/api/users/me/claims?page=2&limit=1')
          .set('Authorization', `Bearer ${authToken}`)
          .expect('Content-Type', /json/);

        expect(response2.status).toBe(200);
        expect(response2.body.pagination.page).toBe(2);

        // Claims should be different between pages
        if (response1.body.claims.length > 0 && response2.body.claims.length > 0) {
          expect(response1.body.claims[0].id).not.toBe(response2.body.claims[0].id);
        }
      }
    });

    it('should return empty array for page beyond total pages', async () => {
      const response = await request(app)
        .get('/api/users/me/claims?page=999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.claims).toEqual([]);
    });
  });

  describe('Status Filtering', () => {
    it('should filter claims by PENDING status', async () => {
      const response = await request(app)
        .get('/api/users/me/claims?status=PENDING')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      response.body.claims.forEach((claim: any) => {
        expect(claim.status).toBe('PENDING');
      });
    });

    it('should filter claims by APPROVED status', async () => {
      const response = await request(app)
        .get('/api/users/me/claims?status=APPROVED')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      response.body.claims.forEach((claim: any) => {
        expect(claim.status).toBe('APPROVED');
      });
    });

    it('should filter claims by REJECTED status', async () => {
      const response = await request(app)
        .get('/api/users/me/claims?status=REJECTED')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      response.body.claims.forEach((claim: any) => {
        expect(claim.status).toBe('REJECTED');
      });
    });
  });

  describe('User Isolation', () => {
    it('should only return claims for the authenticated user', async () => {
      // Create another user with claims
      const otherUser = {
        email: 'otheruser@example.com',
        password: 'OtherPass123!',
        firstName: 'Other',
        lastName: 'User',
      };

      await request(app).post('/api/auth/register').send(otherUser);

      const otherLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: otherUser.email, password: otherUser.password });

      const otherAuthToken = otherLoginResponse.body.token;

      // Create a claim for the other user
      await request(app)
        .post(`/api/listings/${listingId1}/claim`)
        .set('Authorization', `Bearer ${otherAuthToken}`)
        .send({
          claim_method: 'EMAIL_VERIFICATION',
          verification_data: {
            email: 'other@example.com',
            business_name: 'Other Business',
          },
        });

      // Get claims for original user
      const response = await request(app)
        .get('/api/users/me/claims')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);

      // All returned claims should belong to the authenticated user
      response.body.claims.forEach((claim: any) => {
        expect(claim.user_id).toBe(testUserId);
      });
    });
  });

  describe('Cross-Tenant Claims', () => {
    it('should return claims from all tenants for the user', async () => {
      // Create another tenant
      const anotherTenantResponse = await request(app)
        .post('/api/tenants')
        .send({
          name: 'Another Test Tenant',
          domain: `another-test-${Date.now()}.example.com`,
          description: 'Another test tenant',
        });

      const anotherTenantId = anotherTenantResponse.body.id;
      const anotherListingId = '550e8400-e29b-41d4-a716-446655440002';

      // Create a claim in the new tenant
      await request(app)
        .post(`/api/listings/${anotherListingId}/claim`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          claim_method: 'PHONE_VERIFICATION',
          verification_data: {
            phone: '+1234567890',
            business_name: 'Cross Tenant Business',
          },
        });

      const response = await request(app)
        .get('/api/users/me/claims')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.claims.length).toBeGreaterThanOrEqual(3); // Original 2 + new one

      // Should have claims from different tenants
      const tenantDomains = response.body.claims.map((claim: any) => claim.listing.tenant_domain);
      const uniqueTenants = [...new Set(tenantDomains)];
      expect(uniqueTenants.length).toBeGreaterThan(1);
    });
  });
});