import request from 'supertest';
import app from '../../src/index';

describe('POST /api/tenants/:id/publish - Contract Tests', () => {
  let testTenantId: string;

  beforeEach(async () => {
    // Create a tenant for testing publish endpoint
    const tenantResponse = await request(app)
      .post('/api/tenants')
      .send({
        name: 'Publish Test Tenant',
        domain: `publish-test-tenant-${Date.now()}`,
      })
      .expect(201);

    testTenantId = tenantResponse.body.id;
  });

  describe('Request Schema Validation', () => {
    it('should reject invalid tenant ID format', async () => {
      const response = await request(app)
        .post('/api/tenants/invalid-id/publish')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('tenant ID');
    });

    it('should return 404 for non-existent tenant', async () => {
      const nonExistentId = '999e4567-e89b-12d3-a456-426614174999';

      const response = await request(app)
        .post(`/api/tenants/${nonExistentId}/publish`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Tenant not found');
    });
  });

  describe('Response Schema Validation', () => {
    it('should return publish job response with correct schema', async () => {
      const response = await request(app)
        .post(`/api/tenants/${testTenantId}/publish`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(202);

      // Validate response schema
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('job_id');
      expect(response.body).toHaveProperty('tenant_id', testTenantId);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('estimated_duration');

      // Validate data types
      expect(typeof response.body.message).toBe('string');
      expect(typeof response.body.job_id).toBe('string');
      expect(typeof response.body.tenant_id).toBe('string');
      expect(typeof response.body.status).toBe('string');
      expect(typeof response.body.estimated_duration).toBe('string');

      // Validate initial status
      expect(response.body.status).toBe('QUEUED');
      expect(response.body.message).toContain('Publishing started');
    });

    it('should generate unique job IDs for different requests', async () => {
      // Create second tenant for comparison
      const tenant2Response = await request(app)
        .post('/api/tenants')
        .send({
          name: 'Publish Test Tenant 2',
          domain: `publish-test-tenant-2-${Date.now()}`,
        })
        .expect(201);

      const response1 = await request(app).post(`/api/tenants/${testTenantId}/publish`).expect(202);

      const response2 = await request(app)
        .post(`/api/tenants/${tenant2Response.body.id}/publish`)
        .expect(202);

      expect(response1.body.job_id).not.toBe(response2.body.job_id);
      expect(response1.body.job_id).toMatch(/^job-\d+$/);
      expect(response2.body.job_id).toMatch(/^job-\d+$/);
    });
  });

  describe('Business Logic Validation', () => {
    it('should update tenant status to UPDATING', async () => {
      // Verify initial status
      const initialResponse = await request(app).get(`/api/tenants/${testTenantId}`).expect(200);
      expect(initialResponse.body.status).toBe('DRAFT');

      // Publish tenant
      await request(app).post(`/api/tenants/${testTenantId}/publish`).expect(202);

      // Verify status changed
      const updatedResponse = await request(app).get(`/api/tenants/${testTenantId}`).expect(200);
      expect(updatedResponse.body.status).toBe('UPDATING');
    });

    it('should reject publishing already published tenant', async () => {
      // Manually set tenant to PUBLISHED status to test the logic
      await request(app)
        .put(`/api/tenants/${testTenantId}`)
        .send({ name: 'Updated Name' }) // Trigger an update
        .expect(200);

      // Use direct model update to set PUBLISHED status (simulating completed job)
      const { TenantModel } = await import('../../src/models');
      await TenantModel.updateStatus(testTenantId, 'PUBLISHED');

      // Now try to publish the already published tenant
      const response = await request(app)
        .post(`/api/tenants/${testTenantId}/publish`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already published');
    });

    it('should provide reasonable estimated duration', async () => {
      const response = await request(app).post(`/api/tenants/${testTenantId}/publish`).expect(202);

      expect(response.body.estimated_duration).toMatch(/\d+-\d+\s+minutes/);
    });
  });

  describe('Idempotency and Error Handling', () => {
    it('should handle multiple simultaneous publish requests gracefully', async () => {
      // Make multiple publish requests at the same time
      const promises = Array(3)
        .fill(null)
        .map(() => request(app).post(`/api/tenants/${testTenantId}/publish`));

      const responses = await Promise.all(promises);

      // First request should succeed
      expect(responses[0]?.status).toBe(202);

      // Subsequent requests should either succeed with same job ID or fail appropriately
      responses.slice(1).forEach(response => {
        expect([202, 409]).toContain(response.status);
      });
    });

    it('should include tenant_id in response for job tracking', async () => {
      const response = await request(app).post(`/api/tenants/${testTenantId}/publish`).expect(202);

      expect(response.body.tenant_id).toBe(testTenantId);
    });
  });
});
