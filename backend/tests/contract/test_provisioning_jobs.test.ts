import request from 'supertest';
import app from '../../src/index';

describe('GET /api/tenants/:id/jobs/:jobId - Contract Tests', () => {
  let testTenantId: string;
  let testJobId: string;

  beforeEach(async () => {
    // Create a tenant for testing job endpoint
    const tenantResponse = await request(app)
      .post('/api/tenants')
      .send({
        name: 'Job Test Tenant',
        domain: `job-test-tenant-${Date.now()}`,
      })
      .expect(201);

    testTenantId = tenantResponse.body.id;

    // Start a publish job to get a valid job ID
    const publishResponse = await request(app)
      .post(`/api/tenants/${testTenantId}/publish`)
      .expect(202);

    testJobId = publishResponse.body.job_id;
  });

  describe('Request Schema Validation', () => {
    it('should reject invalid tenant ID format', async () => {
      const response = await request(app)
        .get(`/api/tenants/invalid-id/jobs/${testJobId}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('tenant ID');
    });

    it('should return 404 for non-existent tenant', async () => {
      const nonExistentId = '999e4567-e89b-12d3-a456-426614174999';

      const response = await request(app)
        .get(`/api/tenants/${nonExistentId}/jobs/${testJobId}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Tenant not found');
    });

    it('should return 404 for non-existent job', async () => {
      const nonExistentJobId = 'job-999999999';

      const response = await request(app)
        .get(`/api/tenants/${testTenantId}/jobs/${nonExistentJobId}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Job not found');
    });
  });

  describe('Response Schema Validation', () => {
    it('should return job status with correct schema', async () => {
      const response = await request(app)
        .get(`/api/tenants/${testTenantId}/jobs/${testJobId}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);

      // Validate response schema
      expect(response.body).toHaveProperty('job_id', testJobId);
      expect(response.body).toHaveProperty('tenant_id', testTenantId);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('progress');
      expect(response.body).toHaveProperty('current_step');
      expect(response.body).toHaveProperty('steps_total');
      expect(response.body).toHaveProperty('steps_completed');
      expect(response.body).toHaveProperty('started_at');

      // Validate data types
      expect(typeof response.body.job_id).toBe('string');
      expect(typeof response.body.tenant_id).toBe('string');
      expect(typeof response.body.status).toBe('string');
      expect(typeof response.body.progress).toBe('number');
      expect(typeof response.body.current_step).toBe('string');
      expect(typeof response.body.steps_total).toBe('number');
      expect(typeof response.body.steps_completed).toBe('number');
      expect(typeof response.body.started_at).toBe('string');

      // Validate value ranges
      expect(response.body.progress).toBeGreaterThanOrEqual(0);
      expect(response.body.progress).toBeLessThanOrEqual(100);
      expect(response.body.steps_completed).toBeLessThanOrEqual(response.body.steps_total);
    });

    it('should return valid job status values', async () => {
      const response = await request(app)
        .get(`/api/tenants/${testTenantId}/jobs/${testJobId}`)
        .expect(200);

      const validStatuses = ['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED'];
      expect(validStatuses).toContain(response.body.status);
    });

    it('should include completion data when job is completed', async () => {
      // Wait for job to complete
      let jobComplete = false;
      let attempts = 0;
      const maxAttempts = 10;

      while (!jobComplete && attempts < maxAttempts) {
        const response = await request(app)
          .get(`/api/tenants/${testTenantId}/jobs/${testJobId}`)
          .expect(200);

        if (response.body.status === 'COMPLETED') {
          jobComplete = true;

          // Validate completion-specific fields
          expect(response.body).toHaveProperty('completed_at');
          expect(response.body).toHaveProperty('result');
          expect(response.body.progress).toBe(100);
          expect(response.body.current_step).toBe('COMPLETED');

          // Validate result object
          expect(response.body.result).toHaveProperty('tenant_url');
          expect(response.body.result).toHaveProperty('admin_url');
          expect(typeof response.body.result.tenant_url).toBe('string');
          expect(typeof response.body.result.admin_url).toBe('string');
        }

        attempts++;
        if (!jobComplete && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      expect(jobComplete).toBe(true);
    });
  });

  describe('Business Logic Validation', () => {
    it('should show job progression over time', async () => {
      const initialResponse = await request(app)
        .get(`/api/tenants/${testTenantId}/jobs/${testJobId}`)
        .expect(200);

      // Wait a moment for job to progress
      await new Promise(resolve => setTimeout(resolve, 1500));

      const laterResponse = await request(app)
        .get(`/api/tenants/${testTenantId}/jobs/${testJobId}`)
        .expect(200);

      // Progress should be same or higher
      expect(laterResponse.body.progress).toBeGreaterThanOrEqual(initialResponse.body.progress);

      // Steps completed should be same or higher
      expect(laterResponse.body.steps_completed).toBeGreaterThanOrEqual(
        initialResponse.body.steps_completed
      );
    });

    it('should generate valid tenant URLs upon completion', async () => {
      // Wait for job completion
      let jobComplete = false;
      let attempts = 0;
      const maxAttempts = 10;

      while (!jobComplete && attempts < maxAttempts) {
        const response = await request(app)
          .get(`/api/tenants/${testTenantId}/jobs/${testJobId}`)
          .expect(200);

        if (response.body.status === 'COMPLETED') {
          jobComplete = true;

          // Get tenant info to validate URL generation
          const tenantResponse = await request(app).get(`/api/tenants/${testTenantId}`).expect(200);

          const domain = tenantResponse.body.domain;

          // Validate URL format matches tenant domain
          expect(response.body.result.tenant_url).toContain(domain);
          expect(response.body.result.admin_url).toContain(domain);
          expect(response.body.result.tenant_url).toMatch(/^https:\/\/.+\.example\.com$/);
          expect(response.body.result.admin_url).toMatch(/^https:\/\/.+\.example\.com\/admin$/);
        }

        attempts++;
        if (!jobComplete && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      expect(jobComplete).toBe(true);
    });

    it('should maintain consistent job_id and tenant_id throughout lifecycle', async () => {
      // Check job multiple times during its lifecycle
      const checks = [];
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .get(`/api/tenants/${testTenantId}/jobs/${testJobId}`)
          .expect(200);

        checks.push({
          job_id: response.body.job_id,
          tenant_id: response.body.tenant_id,
        });

        await new Promise(resolve => setTimeout(resolve, 800));
      }

      // All checks should have consistent IDs
      checks.forEach(check => {
        expect(check.job_id).toBe(testJobId);
        expect(check.tenant_id).toBe(testTenantId);
      });
    });

    it('should show realistic step progression', async () => {
      const response = await request(app)
        .get(`/api/tenants/${testTenantId}/jobs/${testJobId}`)
        .expect(200);

      expect(response.body.steps_total).toBeGreaterThan(0);
      expect(response.body.steps_total).toBeLessThanOrEqual(10); // Reasonable upper bound

      // Current step should be descriptive
      expect(response.body.current_step).toMatch(/\w+/);
      expect(response.body.current_step.length).toBeGreaterThan(0);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle failed jobs appropriately', async () => {
      // Note: Our current implementation doesn't simulate failures,
      // but this test documents the expected behavior
      const response = await request(app)
        .get(`/api/tenants/${testTenantId}/jobs/${testJobId}`)
        .expect(200);

      // If status is FAILED, should include error message
      if (response.body.status === 'FAILED') {
        expect(response.body).toHaveProperty('error_message');
        expect(typeof response.body.error_message).toBe('string');
        expect(response.body.error_message.length).toBeGreaterThan(0);
      }
    });

    it('should validate started_at timestamp format', async () => {
      const response = await request(app)
        .get(`/api/tenants/${testTenantId}/jobs/${testJobId}`)
        .expect(200);

      // Should be valid ISO timestamp
      expect(() => new Date(response.body.started_at)).not.toThrow();
      const startedAt = new Date(response.body.started_at);
      expect(startedAt.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });
});
