import request from 'supertest';
import path from 'path';
import app from '../../src/index';

describe('Integration: Listing Claims Workflow', () => {
  let userId: string;
  let userToken: string;
  let tenantId: string;
  let listingId: string;
  let claimId: string;

  beforeAll(async () => {
    // Setup: Create a tenant with listings for claiming
    const tenantResponse = await request(app).post('/api/tenants').send({
      name: 'Claims Test Directory',
      domain: 'claims-test',
    });

    tenantId = tenantResponse.body.id;

    // Add branding
    await request(app)
      .put(`/api/tenants/${tenantId}/branding`)
      .field('primary_color', '#3B82F6')
      .field('secondary_color', '#1E40AF')
      .field('accent_color', '#F59E0B')
      .field('font_family', 'Inter');

    // Add categories
    const categoriesPath = path.join(__dirname, '../fixtures/categories.json');
    await request(app)
      .post(`/api/tenants/${tenantId}/upload?type=categories`)
      .attach('file', categoriesPath);

    // Add listings
    const listingsPath = path.join(__dirname, '../fixtures/listings.csv');
    const listingsResponse = await request(app)
      .post(`/api/tenants/${tenantId}/upload?type=listings`)
      .attach('file', listingsPath);

    // Publish tenant to make listings available for claims
    const publishResponse = await request(app).post(`/api/tenants/${tenantId}/publish`);

    const jobId = publishResponse.body.job_id;

    // Wait for publishing to complete
    let jobComplete = false;
    let attempts = 0;
    while (!jobComplete && attempts < 10) {
      const jobResponse = await request(app).get(`/api/tenants/${tenantId}/jobs/${jobId}`);

      if (jobResponse.body.status === 'COMPLETED') {
        jobComplete = true;
      }

      attempts++;
      if (!jobComplete && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Get a listing ID for testing
    // In a real implementation, we'd have an endpoint to list tenant listings
    listingId = '550e8400-e29b-41d4-a716-446655440000'; // Mock listing ID
  });

  describe('User Registration and Authentication Flow', () => {
    it('should complete user registration with email verification', async () => {
      // Step 1: Register new user
      const registrationData = {
        email: 'business-owner@example.com',
        password: 'SecurePass123!',
        first_name: 'Business',
        last_name: 'Owner',
      };

      const registerResponse = await request(app).post('/api/auth/register').send(registrationData);

      // This test MUST FAIL until we implement the endpoints
      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body).toHaveProperty('user_id');
      expect(registerResponse.body).toHaveProperty('verification_sent', true);

      userId = registerResponse.body.user_id;

      // Step 2: Verify email (simulate clicking verification link)
      const verificationResponse = await request(app).post('/api/auth/verify-email').send({
        token: 'mock-verification-token', // In real implementation, this would come from email
      });

      expect(verificationResponse.status).toBe(200);

      // Step 3: Login to get authentication token
      const loginResponse = await request(app).post('/api/auth/login').send({
        email: registrationData.email,
        password: registrationData.password,
      });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body).toHaveProperty('access_token');
      expect(loginResponse.body).toHaveProperty('user');

      userToken = `Bearer ${loginResponse.body.access_token}`;
    });
  });

  describe('Listing Claim Submission and Verification', () => {
    it('should complete email verification claim workflow', async () => {
      // Step 1: Submit claim with email verification
      const claimData = {
        claim_method: 'EMAIL_VERIFICATION',
        verification_data: {
          email: 'contact@joespizza.com', // Should match listing's email domain
          business_name: "Joe's Pizza",
        },
      };

      const claimResponse = await request(app)
        .post(`/api/listings/${listingId}/claim`)
        .set('Authorization', userToken)
        .send(claimData);

      expect(claimResponse.status).toBe(201);
      expect(claimResponse.body).toHaveProperty('claim_id');
      expect(claimResponse.body.status).toBe('PENDING');
      expect(claimResponse.body).toHaveProperty('expires_at');
      expect(claimResponse.body).toHaveProperty('next_steps');

      claimId = claimResponse.body.claim_id;

      // Verify claim has expiration date 7 days in future
      const expiresAt = new Date(claimResponse.body.expires_at);
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      expect(Math.abs(expiresAt.getTime() - sevenDaysFromNow.getTime())).toBeLessThan(60000); // Within 1 minute

      // Step 2: Check claim status
      const statusResponse = await request(app)
        .get(`/api/claims/${claimId}`)
        .set('Authorization', userToken);

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body).toHaveProperty('id', claimId);
      expect(statusResponse.body).toHaveProperty('status', 'PENDING');
      expect(statusResponse.body).toHaveProperty('claim_method', 'EMAIL_VERIFICATION');

      // Step 3: Submit verification evidence
      const verificationData = {
        verification_type: 'EMAIL_DOMAIN',
        evidence_data: JSON.stringify({
          domain_match: true,
          email_verified: true,
          verification_timestamp: new Date().toISOString(),
        }),
      };

      const verifyResponse = await request(app)
        .post(`/api/claims/${claimId}/verify`)
        .set('Authorization', userToken)
        .field('verification_type', verificationData.verification_type)
        .field('evidence_data', verificationData.evidence_data);

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body).toHaveProperty('verification_id');
      expect(verifyResponse.body.status).toBe('PENDING');

      // Step 4: Simulate admin approval (in real scenario, admin would review)
      // For integration test, we'll check that claim status can be updated
      const updatedStatusResponse = await request(app)
        .get(`/api/claims/${claimId}`)
        .set('Authorization', userToken);

      expect(updatedStatusResponse.status).toBe(200);
      // Status should still be PENDING until admin reviews
      expect(updatedStatusResponse.body.status).toBe('PENDING');
    });

    it('should complete document upload verification workflow', async () => {
      // Create another listing for document verification test
      const documentClaimData = {
        claim_method: 'DOCUMENT_UPLOAD',
        verification_data: {
          business_name: 'The French Kitchen',
          document_type: 'business_license',
        },
      };

      const claimResponse = await request(app)
        .post(`/api/listings/${listingId}/claim`)
        .set('Authorization', userToken)
        .send(documentClaimData);

      expect(claimResponse.status).toBe(201);
      const documentClaimId = claimResponse.body.claim_id;

      // Submit business license document
      const documentPath = path.join(__dirname, '../fixtures/business-license.pdf');

      // Create mock PDF file for test
      const fs = require('fs');
      const mockPdfContent =
        '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\nxref\n0 1\n0000000000 65535 f\ntrailer\n<<\n/Size 1\n/Root 1 0 R\n>>\nstartxref\n0\n%%EOF';
      fs.writeFileSync(documentPath, mockPdfContent);

      const documentResponse = await request(app)
        .post(`/api/claims/${documentClaimId}/verify`)
        .set('Authorization', userToken)
        .field('verification_type', 'BUSINESS_DOCUMENT')
        .field(
          'evidence_data',
          JSON.stringify({
            document_name: 'Business License',
            issued_date: '2024-01-01',
            business_name: 'The French Kitchen',
          })
        )
        .attach('evidence_file', documentPath);

      expect(documentResponse.status).toBe(200);
      expect(documentResponse.body).toHaveProperty('verification_id');

      // Cleanup
      fs.unlinkSync(documentPath);
    });

    it('should handle claim expiration correctly', async () => {
      // Create claim that we'll let expire
      const expiredClaimData = {
        claim_method: 'EMAIL_VERIFICATION',
        verification_data: {
          email: 'test@expiry.com',
          business_name: 'Expiry Test Business',
        },
      };

      const claimResponse = await request(app)
        .post(`/api/listings/${listingId}/claim`)
        .set('Authorization', userToken)
        .send(expiredClaimData);

      const expiredClaimId = claimResponse.body.claim_id;

      // Simulate time passing (in real implementation, this would be handled by background job)
      // For test, we'll check that expired claims are properly identified

      // Check claim status
      const statusResponse = await request(app)
        .get(`/api/claims/${expiredClaimId}`)
        .set('Authorization', userToken);

      expect(statusResponse.status).toBe(200);
      // Should still be PENDING since we just created it
      expect(statusResponse.body.status).toBe('PENDING');

      // In a real system, after 7 days a background job would update status to EXPIRED
      // Here we're just testing the API structure is correct
    });
  });

  describe('User Claims Management', () => {
    it('should retrieve all user claims across tenants', async () => {
      const claimsResponse = await request(app)
        .get('/api/users/me/claims')
        .set('Authorization', userToken);

      expect(claimsResponse.status).toBe(200);
      expect(claimsResponse.body).toHaveProperty('claims');
      expect(claimsResponse.body).toHaveProperty('pagination');

      expect(Array.isArray(claimsResponse.body.claims)).toBe(true);
      expect(claimsResponse.body.claims.length).toBeGreaterThan(0);

      // Verify claim structure includes listing info
      const claim = claimsResponse.body.claims[0];
      expect(claim).toHaveProperty('id');
      expect(claim).toHaveProperty('status');
      expect(claim).toHaveProperty('listing');
      expect(claim.listing).toHaveProperty('title');
      expect(claim.listing).toHaveProperty('tenant_domain');
    });

    it('should filter claims by status', async () => {
      const pendingClaimsResponse = await request(app)
        .get('/api/users/me/claims?status=PENDING')
        .set('Authorization', userToken);

      expect(pendingClaimsResponse.status).toBe(200);
      expect(pendingClaimsResponse.body.claims).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            status: 'PENDING',
          }),
        ])
      );
    });

    it('should support pagination for large numbers of claims', async () => {
      const page1Response = await request(app)
        .get('/api/users/me/claims?page=1&limit=2')
        .set('Authorization', userToken);

      expect(page1Response.status).toBe(200);
      expect(page1Response.body.pagination).toEqual(
        expect.objectContaining({
          page: 1,
          limit: 2,
          total: expect.any(Number),
          pages: expect.any(Number),
        })
      );
    });
  });

  describe('Claimed Listing Management', () => {
    it('should allow approved claim holder to update listing', async () => {
      // First, we need to simulate claim approval
      // In a real scenario, an admin would approve the claim

      // For now, test the endpoint structure
      const updateData = {
        title: 'Updated Business Name',
        description: 'Updated business description with new information',
        data: {
          phone: '555-9999',
          website: 'https://updated-business.com',
          hours: 'Mon-Fri 9AM-6PM',
        },
      };

      const updateResponse = await request(app)
        .put(`/api/listings/${listingId}/update`)
        .set('Authorization', userToken)
        .send(updateData);

      // This should fail until claim is approved
      expect(updateResponse.status).toBe(403);
      expect(updateResponse.body.error).toContain('not own');
    });

    it('should prevent non-owners from updating listings', async () => {
      // Register another user
      const otherUserData = {
        email: 'other-user@example.com',
        password: 'SecurePass123!',
        first_name: 'Other',
        last_name: 'User',
      };

      const otherRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send(otherUserData);

      // Login as other user
      const otherLoginResponse = await request(app).post('/api/auth/login').send({
        email: otherUserData.email,
        password: otherUserData.password,
      });

      const otherUserToken = `Bearer ${otherLoginResponse.body.access_token}`;

      // Try to update listing as unauthorized user
      const unauthorizedUpdateResponse = await request(app)
        .put(`/api/listings/${listingId}/update`)
        .set('Authorization', otherUserToken)
        .send({
          title: 'Unauthorized Update',
        });

      expect(unauthorizedUpdateResponse.status).toBe(403);
      expect(unauthorizedUpdateResponse.body.error).toContain('not own');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle duplicate claims gracefully', async () => {
      const duplicateClaimData = {
        claim_method: 'EMAIL_VERIFICATION',
        verification_data: {
          email: 'duplicate@test.com',
          business_name: 'Duplicate Test',
        },
      };

      // First claim should succeed
      const firstClaimResponse = await request(app)
        .post(`/api/listings/${listingId}/claim`)
        .set('Authorization', userToken)
        .send(duplicateClaimData);

      expect(firstClaimResponse.status).toBe(201);

      // Second claim should fail
      const secondClaimResponse = await request(app)
        .post(`/api/listings/${listingId}/claim`)
        .set('Authorization', userToken)
        .send(duplicateClaimData);

      expect(secondClaimResponse.status).toBe(409);
      expect(secondClaimResponse.body.error).toContain('active claim');
    });

    it('should validate file types for document uploads', async () => {
      const textFilePath = path.join(__dirname, '../fixtures/invalid-document.txt');

      // Create invalid document type
      const fs = require('fs');
      fs.writeFileSync(textFilePath, 'This is not a valid business document');

      const invalidDocResponse = await request(app)
        .post(`/api/claims/${claimId}/verify`)
        .set('Authorization', userToken)
        .field('verification_type', 'BUSINESS_DOCUMENT')
        .attach('evidence_file', textFilePath);

      expect(invalidDocResponse.status).toBe(400);
      expect(invalidDocResponse.body.error).toContain('file type');

      // Cleanup
      fs.unlinkSync(textFilePath);
    });

    it('should handle claim verification for non-existent claims', async () => {
      const nonExistentClaimId = '999e4567-e89b-12d3-a456-426614174999';

      const verifyResponse = await request(app)
        .post(`/api/claims/${nonExistentClaimId}/verify`)
        .set('Authorization', userToken)
        .field('verification_type', 'EMAIL_DOMAIN');

      expect(verifyResponse.status).toBe(404);
      expect(verifyResponse.body.error).toContain('claim');
      expect(verifyResponse.body.error).toContain('not found');
    });
  });

  afterAll(async () => {
    // Cleanup test data
    if (tenantId) {
      await request(app).delete(`/api/tenants/${tenantId}`);
    }
    if (userId) {
      await request(app).delete(`/api/users/${userId}`);
    }
  });
});
