import request from 'supertest';
import app from '../../src/index';
import { resetRateLimiting } from '../../src/routes/auth';
import path from 'path';
import fs from 'fs';

describe('POST /api/claims/{claimId}/verify - Contract Tests', () => {
  let authToken: string;
  let claimId: string;
  let testUserId: string;
  let listingId: string;

  // Test user data
  const testUser = {
    email: 'claimverify@example.com',
    password: 'SecurePass123!',
    firstName: 'Claim',
    lastName: 'Verifier',
  };

  // Create test PDF file for document uploads
  const createTestPDF = () => {
    const testPdfPath = path.join(__dirname, 'test-verification-doc.pdf');
    const testPdfContent = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000079 00000 n \n0000000173 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n253\n%%EOF'
    );
    fs.writeFileSync(testPdfPath, testPdfContent);
    return testPdfPath;
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

    // Create a test tenant and listing for claiming
    const tenantResponse = await request(app)
      .post('/api/tenants')
      .send({
        name: 'Test Verification Tenant',
        domain: `verify-test-${Date.now()}.example.com`,
        description: 'Test tenant for verification',
      });

    const tenantId = tenantResponse.body.id;

    // Use a mock listing ID for testing
    // In a real implementation, this would be created through the upload process
    listingId = '550e8400-e29b-41d4-a716-446655440000';

    // Create a claim for this listing
    const claimResponse = await request(app)
      .post(`/api/listings/${listingId}/claim`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        claim_method: 'DOCUMENT_UPLOAD',
        verification_data: {
          business_name: 'Test Business for Claim',
        },
      });

    claimId = claimResponse.body.claim_id;
  });

  afterEach(() => {
    // Clean up test files
    const testPdfPath = path.join(__dirname, 'test-verification-doc.pdf');
    if (fs.existsSync(testPdfPath)) {
      fs.unlinkSync(testPdfPath);
    }
  });

  describe('Authentication Requirements', () => {
    it('should reject request without authentication token', async () => {
      const testPdfPath = createTestPDF();

      const response = await request(app)
        .post(`/api/claims/${claimId}/verify`)
        .attach('evidence_file', testPdfPath)
        .field('verification_type', 'BUSINESS_DOCUMENT')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('token');
    });

    it('should reject request with invalid authentication token', async () => {
      const testPdfPath = createTestPDF();

      const response = await request(app)
        .post(`/api/claims/${claimId}/verify`)
        .set('Authorization', 'Bearer invalid-token')
        .attach('evidence_file', testPdfPath)
        .field('verification_type', 'BUSINESS_DOCUMENT')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Path Parameter Validation', () => {
    it('should reject invalid claim ID format', async () => {
      const testPdfPath = createTestPDF();

      const response = await request(app)
        .post('/api/claims/invalid-uuid/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('evidence_file', testPdfPath)
        .field('verification_type', 'BUSINESS_DOCUMENT')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('claim');
    });

    it('should reject non-existent claim ID', async () => {
      const testPdfPath = createTestPDF();
      const nonExistentClaimId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app)
        .post(`/api/claims/${nonExistentClaimId}/verify`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('evidence_file', testPdfPath)
        .field('verification_type', 'BUSINESS_DOCUMENT')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });
  });

  describe('Request Schema Validation', () => {
    it('should accept valid verification request with document upload', async () => {
      const testPdfPath = createTestPDF();

      const response = await request(app)
        .post(`/api/claims/${claimId}/verify`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('evidence_file', testPdfPath)
        .field('verification_type', 'BUSINESS_DOCUMENT')
        .field('evidence_data', JSON.stringify({ business_name: 'Test Business' }))
        .expect('Content-Type', /json/);

      // This test MUST FAIL until we implement the endpoint
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('verification_id');
      expect(response.body).toHaveProperty('status', 'PENDING');
      expect(response.body).toHaveProperty('message');
    });

    it('should reject request missing required verification_type field', async () => {
      const testPdfPath = createTestPDF();

      const response = await request(app)
        .post(`/api/claims/${claimId}/verify`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('evidence_file', testPdfPath)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('verification_type');
    });

    it('should reject invalid verification_type', async () => {
      const testPdfPath = createTestPDF();

      const response = await request(app)
        .post(`/api/claims/${claimId}/verify`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('evidence_file', testPdfPath)
        .field('verification_type', 'INVALID_TYPE')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('verification_type');
    });
  });

  describe('File Upload Validation', () => {
    it('should accept PDF file upload', async () => {
      const testPdfPath = createTestPDF();

      const response = await request(app)
        .post(`/api/claims/${claimId}/verify`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('evidence_file', testPdfPath)
        .field('verification_type', 'BUSINESS_DOCUMENT')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
    });

    it('should accept JPG file upload', async () => {
      // Create a minimal JPG file (1x1 pixel)
      const jpgData = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
        0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
        0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
        0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
        0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
        0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xd9,
      ]);

      const response = await request(app)
        .post(`/api/claims/${claimId}/verify`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('evidence_file', jpgData, 'test-image.jpg')
        .field('verification_type', 'BUSINESS_DOCUMENT')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
    });

    it('should reject file upload with unsupported format', async () => {
      const txtData = Buffer.from('This is a text file');

      const response = await request(app)
        .post(`/api/claims/${claimId}/verify`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('evidence_file', txtData, 'test.txt')
        .field('verification_type', 'BUSINESS_DOCUMENT')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('file format');
    });

    it('should reject file upload exceeding size limit', async () => {
      // Create a large file (simulating oversized upload)
      const largeData = Buffer.alloc(10 * 1024 * 1024); // 10MB

      const response = await request(app)
        .post(`/api/claims/${claimId}/verify`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('evidence_file', largeData, 'large-file.pdf')
        .field('verification_type', 'BUSINESS_DOCUMENT')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(413);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('file size');
    });
  });

  describe('Verification Type Validation', () => {
    it('should accept EMAIL_DOMAIN verification type', async () => {
      const testPdfPath = createTestPDF();

      const response = await request(app)
        .post(`/api/claims/${claimId}/verify`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('evidence_file', testPdfPath)
        .field('verification_type', 'EMAIL_DOMAIN')
        .field('evidence_data', JSON.stringify({ domain: 'example.com' }))
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
    });

    it('should accept PHONE_NUMBER verification type', async () => {
      const testPdfPath = createTestPDF();

      const response = await request(app)
        .post(`/api/claims/${claimId}/verify`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('evidence_file', testPdfPath)
        .field('verification_type', 'PHONE_NUMBER')
        .field('evidence_data', JSON.stringify({ phone: '+1234567890' }))
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
    });

    it('should accept UTILITY_BILL verification type', async () => {
      const testPdfPath = createTestPDF();

      const response = await request(app)
        .post(`/api/claims/${claimId}/verify`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('evidence_file', testPdfPath)
        .field('verification_type', 'UTILITY_BILL')
        .field('evidence_data', JSON.stringify({ address: '123 Main St' }))
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
    });
  });

  describe('Evidence Data Validation', () => {
    it('should accept valid JSON in evidence_data field', async () => {
      const testPdfPath = createTestPDF();
      const evidenceData = { business_name: 'Test Corp', address: '123 Business St' };

      const response = await request(app)
        .post(`/api/claims/${claimId}/verify`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('evidence_file', testPdfPath)
        .field('verification_type', 'BUSINESS_DOCUMENT')
        .field('evidence_data', JSON.stringify(evidenceData))
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
    });

    it('should reject invalid JSON in evidence_data field', async () => {
      const testPdfPath = createTestPDF();

      const response = await request(app)
        .post(`/api/claims/${claimId}/verify`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('evidence_file', testPdfPath)
        .field('verification_type', 'BUSINESS_DOCUMENT')
        .field('evidence_data', 'invalid-json{')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('evidence_data');
    });
  });

  describe('Response Schema Validation', () => {
    it('should return verification response with correct schema', async () => {
      const testPdfPath = createTestPDF();

      const response = await request(app)
        .post(`/api/claims/${claimId}/verify`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('evidence_file', testPdfPath)
        .field('verification_type', 'BUSINESS_DOCUMENT')
        .field('evidence_data', JSON.stringify({ business_name: 'Test Business' }))
        .expect(200);

      // Validate response schema
      expect(response.body).toHaveProperty('verification_id');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('message');

      // Validate data types
      expect(typeof response.body.verification_id).toBe('string');
      expect(typeof response.body.status).toBe('string');
      expect(typeof response.body.message).toBe('string');

      // Validate enum values
      expect(['PENDING', 'APPROVED', 'REJECTED']).toContain(response.body.status);
      expect(response.body.verification_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });
  });

  describe('Ownership Validation', () => {
    it('should reject verification attempt by non-claim owner', async () => {
      // Create another user
      const otherUser = {
        email: 'other@example.com',
        password: 'OtherPass123!',
        firstName: 'Other',
        lastName: 'User',
      };

      await request(app).post('/api/auth/register').send(otherUser);

      const otherLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: otherUser.email, password: otherUser.password });

      const otherAuthToken = otherLoginResponse.body.token;
      const testPdfPath = createTestPDF();

      const response = await request(app)
        .post(`/api/claims/${claimId}/verify`)
        .set('Authorization', `Bearer ${otherAuthToken}`)
        .attach('evidence_file', testPdfPath)
        .field('verification_type', 'BUSINESS_DOCUMENT')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Access denied');
    });
  });

  describe('Claim Status Validation', () => {
    it('should reject verification for already verified claim', async () => {
      // This test assumes we have a way to set claim status
      // For now, we'll test the endpoint's response to this scenario
      const testPdfPath = createTestPDF();

      // Submit first verification
      await request(app)
        .post(`/api/claims/${claimId}/verify`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('evidence_file', testPdfPath)
        .field('verification_type', 'BUSINESS_DOCUMENT');

      // Try to submit another verification (should be rejected if already verified)
      const response = await request(app)
        .post(`/api/claims/${claimId}/verify`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('evidence_file', testPdfPath)
        .field('verification_type', 'BUSINESS_DOCUMENT')
        .expect('Content-Type', /json/);

      // The response depends on business logic - either allow multiple submissions
      // or reject if already verified
      expect([200, 409]).toContain(response.status);

      if (response.status === 409) {
        expect(response.body.error).toContain('already');
      }
    });
  });
});