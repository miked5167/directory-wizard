import request from 'supertest';
import app from '../../src/index';
import path from 'path';
import fs from 'fs';

describe('Integration: External Service Provisioning', () => {
  let tenantId: string;
  let tenantDomain: string;

  // Helper to create test files
  const createTestFile = (filename: string, content: string): string => {
    const testFilePath = path.join(__dirname, filename);
    fs.writeFileSync(testFilePath, content);
    return testFilePath;
  };

  // Helper to clean up test files
  const cleanupTestFile = (filepath: string): void => {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  };

  // Helper to wait for job completion with timeout
  const waitForJobCompletion = async (
    jobId: string,
    timeoutMs: number = 15000
  ): Promise<any> => {
    const startTime = Date.now();
    let lastStatus = '';

    while (Date.now() - startTime < timeoutMs) {
      const response = await request(app).get(`/api/tenants/${tenantId}/jobs/${jobId}`);

      if (response.status === 200) {
        const job = response.body;
        if (job.status === 'COMPLETED' || job.status === 'FAILED') {
          return job;
        }
        if (job.status !== lastStatus) {
          console.log(`Job ${jobId} progress: ${job.current_step} (${job.progress}%)`);
          lastStatus = job.status;
        }
      }

      // Wait 100ms before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error(`Job ${jobId} did not complete within ${timeoutMs}ms`);
  };

  beforeEach(async () => {
    // Create a tenant with complete data for provisioning
    tenantDomain = `provisioning-test-${Date.now()}`;

    const tenantResponse = await request(app).post('/api/tenants').send({
      name: 'Provisioning Test Directory',
      domain: tenantDomain,
    });

    tenantId = tenantResponse.body.id;
    expect(tenantResponse.status).toBe(201);

    // Add branding
    await request(app)
      .put(`/api/tenants/${tenantId}/branding`)
      .field('primary_color', '#1E40AF')
      .field('secondary_color', '#F8FAFC')
      .field('accent_color', '#7C3AED')
      .field('font_family', 'Inter, sans-serif');

    // Add categories
    const categories = JSON.stringify([
      { name: 'Restaurants', slug: 'restaurants', description: 'Dining establishments' },
      { name: 'Shopping', slug: 'shopping', description: 'Retail stores' },
    ]);

    const categoriesFilePath = createTestFile('provisioning-categories.json', categories);
    await request(app)
      .post(`/api/tenants/${tenantId}/upload?type=categories`)
      .attach('file', categoriesFilePath);
    cleanupTestFile(categoriesFilePath);

    // Add listings
    const listings = `title,category,description
"Test Restaurant","restaurants","A great place to eat"
"Test Shop","shopping","Best shopping experience"`;

    const listingsFilePath = createTestFile('provisioning-listings.csv', listings);
    await request(app)
      .post(`/api/tenants/${tenantId}/upload?type=listings`)
      .attach('file', listingsFilePath);
    cleanupTestFile(listingsFilePath);
  });

  describe('Publishing Workflow', () => {
    it('should start provisioning job when publishing tenant', async () => {
      const response = await request(app)
        .post(`/api/tenants/${tenantId}/publish`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty('job_id');
      expect(response.body).toHaveProperty('status', 'QUEUED');
      expect(response.body).toHaveProperty('message');

      // Validate job ID format (UUID)
      expect(response.body.job_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('should prevent publishing already published tenant', async () => {
      // Start first publish
      const firstPublish = await request(app)
        .post(`/api/tenants/${tenantId}/publish`)
        .expect(202);

      const jobId = firstPublish.body.job_id;

      // Try to publish again immediately
      const secondPublish = await request(app)
        .post(`/api/tenants/${tenantId}/publish`)
        .expect('Content-Type', /json/);

      expect(secondPublish.status).toBe(409);
      expect(secondPublish.body).toHaveProperty('error');
      expect(secondPublish.body.error).toContain('already being published');

      // Wait for first job to complete to avoid interference with other tests
      await waitForJobCompletion(jobId);
    });

    it('should handle publishing tenant with minimal data', async () => {
      // Create a minimal tenant
      const minimalTenantResponse = await request(app).post('/api/tenants').send({
        name: 'Minimal Tenant',
        domain: `minimal-${Date.now()}`,
      });

      const minimalTenantId = minimalTenantResponse.body.id;

      // Try to publish without categories or listings
      const response = await request(app)
        .post(`/api/tenants/${minimalTenantId}/publish`)
        .expect('Content-Type', /json/);

      // Should still start job but may warn about missing data
      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty('job_id');

      // Wait for job completion to see if it handles empty tenant gracefully
      const completedJob = await waitForJobCompletion(response.body.job_id);

      // Should complete successfully even with minimal data
      expect(completedJob.status).toBe('COMPLETED');
    });
  });

  describe('Job Status Monitoring', () => {
    it('should provide detailed job status and progress', async () => {
      // Start publishing
      const publishResponse = await request(app)
        .post(`/api/tenants/${tenantId}/publish`)
        .expect(202);

      const jobId = publishResponse.body.job_id;

      // Check job status immediately
      const statusResponse = await request(app)
        .get(`/api/tenants/${tenantId}/jobs/${jobId}`)
        .expect('Content-Type', /json/);

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body).toHaveProperty('job_id', jobId);
      expect(statusResponse.body).toHaveProperty('tenant_id', tenantId);
      expect(statusResponse.body).toHaveProperty('status');
      expect(statusResponse.body).toHaveProperty('progress');
      expect(statusResponse.body).toHaveProperty('current_step');
      expect(statusResponse.body).toHaveProperty('steps_total');
      expect(statusResponse.body).toHaveProperty('steps_completed');
      expect(statusResponse.body).toHaveProperty('started_at');

      // Progress should be a number between 0 and 100
      expect(typeof statusResponse.body.progress).toBe('number');
      expect(statusResponse.body.progress).toBeGreaterThanOrEqual(0);
      expect(statusResponse.body.progress).toBeLessThanOrEqual(100);

      // Steps should be valid numbers
      expect(statusResponse.body.steps_total).toBeGreaterThan(0);
      expect(statusResponse.body.steps_completed).toBeGreaterThanOrEqual(0);
      expect(statusResponse.body.steps_completed).toBeLessThanOrEqual(
        statusResponse.body.steps_total
      );

      // Wait for completion
      await waitForJobCompletion(jobId);
    });

    it('should return 404 for non-existent job', async () => {
      const nonExistentJobId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app)
        .get(`/api/tenants/${tenantId}/jobs/${nonExistentJobId}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });

    it('should return 400 for invalid job ID format', async () => {
      const response = await request(app)
        .get(`/api/tenants/${tenantId}/jobs/invalid-job-id`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Complete Provisioning Saga', () => {
    it('should complete full provisioning workflow with all steps', async () => {
      // Start publishing
      const publishResponse = await request(app)
        .post(`/api/tenants/${tenantId}/publish`)
        .expect(202);

      const jobId = publishResponse.body.job_id;

      // Wait for job to complete
      const completedJob = await waitForJobCompletion(jobId);

      // Validate final job state
      expect(completedJob.status).toBe('COMPLETED');
      expect(completedJob.progress).toBe(100);
      expect(completedJob.current_step).toBe('COMPLETED');
      expect(completedJob.steps_completed).toBe(completedJob.steps_total);
      expect(completedJob).toHaveProperty('completed_at');

      // Validate result URLs
      expect(completedJob).toHaveProperty('result');
      expect(completedJob.result).toHaveProperty('tenant_url');
      expect(completedJob.result).toHaveProperty('admin_url');

      const tenantUrl = completedJob.result.tenant_url;
      const adminUrl = completedJob.result.admin_url;

      expect(tenantUrl).toMatch(new RegExp(`https://${tenantDomain}\\.example\\.com`));
      expect(adminUrl).toMatch(new RegExp(`https://${tenantDomain}\\.example\\.com/admin`));

      // Verify tenant status was updated
      const tenantResponse = await request(app).get(`/api/tenants/${tenantId}`);
      expect(tenantResponse.status).toBe(200);
      expect(tenantResponse.body.status).toBe('PUBLISHED');
      expect(tenantResponse.body).toHaveProperty('published_at');
    });

    it('should track progress through all provisioning steps', async () => {
      // Start publishing
      const publishResponse = await request(app)
        .post(`/api/tenants/${tenantId}/publish`)
        .expect(202);

      const jobId = publishResponse.body.job_id;

      // Track progress through steps
      const expectedSteps = [
        'QUEUED',
        'VALIDATE_TENANT',
        'GENERATE_STATIC_SITE',
        'DEPLOY_TO_CDN',
        'SETUP_SEARCH_INDEX',
        'CONFIGURE_DOMAIN',
        'COMPLETED'
      ];

      const observedSteps: string[] = [];
      let completed = false;

      while (!completed) {
        const statusResponse = await request(app).get(`/api/tenants/${tenantId}/jobs/${jobId}`);

        if (statusResponse.status === 200) {
          const currentStep = statusResponse.body.current_step;

          // Record new steps we haven't seen yet
          if (!observedSteps.includes(currentStep)) {
            observedSteps.push(currentStep);
          }

          if (statusResponse.body.status === 'COMPLETED' || statusResponse.body.status === 'FAILED') {
            completed = true;
          }
        }

        if (!completed) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Should have observed most of the expected steps
      expect(observedSteps.length).toBeGreaterThan(2);
      expect(observedSteps).toContain('COMPLETED');
    });
  });

  describe('Error Handling and Compensation', () => {
    it('should handle job status queries during execution', async () => {
      // Start publishing
      const publishResponse = await request(app)
        .post(`/api/tenants/${tenantId}/publish`)
        .expect(202);

      const jobId = publishResponse.body.job_id;

      // Query status multiple times during execution
      const statusQueries = [];
      for (let i = 0; i < 5; i++) {
        statusQueries.push(
          request(app).get(`/api/tenants/${tenantId}/jobs/${jobId}`)
        );
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      const responses = await Promise.all(statusQueries);

      // All queries should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('job_id', jobId);
        expect(response.body).toHaveProperty('status');
      });

      // Wait for completion
      await waitForJobCompletion(jobId);
    });

    it('should handle concurrent publishing requests properly', async () => {
      // Start first publish
      const firstPublish = await request(app)
        .post(`/api/tenants/${tenantId}/publish`)
        .expect(202);

      const firstJobId = firstPublish.body.job_id;

      // Try to start second publish (should be rejected)
      const secondPublish = await request(app)
        .post(`/api/tenants/${tenantId}/publish`)
        .expect(409);

      expect(secondPublish.body.error).toContain('already being published');

      // Wait for first job to complete
      const completedJob = await waitForJobCompletion(firstJobId);
      expect(completedJob.status).toBe('COMPLETED');

      // Now should be able to publish again (republish)
      const thirdPublish = await request(app)
        .post(`/api/tenants/${tenantId}/publish`)
        .expect(202);

      // Wait for republish to complete
      await waitForJobCompletion(thirdPublish.body.job_id);
    });

    it('should maintain job state consistency under load', async () => {
      // Start publishing
      const publishResponse = await request(app)
        .post(`/api/tenants/${tenantId}/publish`)
        .expect(202);

      const jobId = publishResponse.body.job_id;

      // Query job status from multiple concurrent requests
      const concurrentQueries = Array.from({ length: 10 }, () =>
        request(app).get(`/api/tenants/${tenantId}/jobs/${jobId}`)
      );

      const responses = await Promise.all(concurrentQueries);

      // All queries should return consistent data
      const firstResponse = responses[0];
      expect(firstResponse).toBeDefined();

      if (firstResponse) {
        expect(firstResponse.status).toBe(200);
      }

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.job_id).toBe(jobId);
        expect(response.body.tenant_id).toBe(tenantId);
        // Progress might vary between requests, but should be consistent format
        expect(typeof response.body.progress).toBe('number');
      });

      // Wait for completion
      await waitForJobCompletion(jobId);
    });
  });

  describe('External Service Integration Simulation', () => {
    it('should simulate external service calls with proper timing', async () => {
      const startTime = Date.now();

      // Start publishing
      const publishResponse = await request(app)
        .post(`/api/tenants/${tenantId}/publish`)
        .expect(202);

      const jobId = publishResponse.body.job_id;

      // Wait for completion
      const completedJob = await waitForJobCompletion(jobId);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should take reasonable time (simulated delays)
      expect(duration).toBeGreaterThan(2000); // At least 2 seconds for all steps
      expect(duration).toBeLessThan(15000); // But not more than 15 seconds

      expect(completedJob.status).toBe('COMPLETED');
    });

    it('should generate external service references', async () => {
      // Start publishing
      const publishResponse = await request(app)
        .post(`/api/tenants/${tenantId}/publish`)
        .expect(202);

      const jobId = publishResponse.body.job_id;

      // Wait for completion
      const completedJob = await waitForJobCompletion(jobId);

      // Check that external references were created during provisioning
      // These are stored internally and would be used by real external services
      expect(completedJob.status).toBe('COMPLETED');
      expect(completedJob.result).toHaveProperty('tenant_url');
      expect(completedJob.result).toHaveProperty('admin_url');

      // URLs should be properly formatted
      expect(completedJob.result.tenant_url).toMatch(/^https:\/\/.*\.example\.com$/);
      expect(completedJob.result.admin_url).toMatch(/^https:\/\/.*\.example\.com\/admin$/);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple tenants provisioning simultaneously', async () => {
      // Create second tenant
      const secondTenantResponse = await request(app).post('/api/tenants').send({
        name: 'Second Tenant',
        domain: `second-${Date.now()}`,
      });

      const secondTenantId = secondTenantResponse.body.id;

      // Add minimal data to second tenant
      const categories = JSON.stringify([
        { name: 'General', slug: 'general', description: 'General category' },
      ]);

      const categoriesFilePath = createTestFile('second-categories.json', categories);
      await request(app)
        .post(`/api/tenants/${secondTenantId}/upload?type=categories`)
        .attach('file', categoriesFilePath);
      cleanupTestFile(categoriesFilePath);

      // Start publishing both tenants simultaneously
      const [firstPublish, secondPublish] = await Promise.all([
        request(app).post(`/api/tenants/${tenantId}/publish`),
        request(app).post(`/api/tenants/${secondTenantId}/publish`),
      ]);

      expect(firstPublish.status).toBe(202);
      expect(secondPublish.status).toBe(202);

      const firstJobId = firstPublish.body.job_id;
      const secondJobId = secondPublish.body.job_id;

      // Jobs should have different IDs
      expect(firstJobId).not.toBe(secondJobId);

      // Wait for both jobs to complete
      const [firstJob, secondJob] = await Promise.all([
        waitForJobCompletion(firstJobId),
        waitForJobCompletion(secondJobId),
      ]);

      expect(firstJob.status).toBe('COMPLETED');
      expect(secondJob.status).toBe('COMPLETED');

      // Should have different URLs
      expect(firstJob.result.tenant_url).not.toBe(secondJob.result.tenant_url);
    });

    it('should maintain acceptable performance under load', async () => {
      const iterations = 3; // Keep reasonable for test performance
      const statusChecks: Promise<any>[] = [];

      // Start publishing
      const publishResponse = await request(app)
        .post(`/api/tenants/${tenantId}/publish`)
        .expect(202);

      const jobId = publishResponse.body.job_id;

      // Create multiple status check requests
      for (let i = 0; i < iterations; i++) {
        statusChecks.push(
          request(app).get(`/api/tenants/${tenantId}/jobs/${jobId}`)
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(statusChecks);
      const endTime = Date.now();

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.job_id).toBe(jobId);
      });

      // Response time should be reasonable
      const avgResponseTime = (endTime - startTime) / iterations;
      expect(avgResponseTime).toBeLessThan(1000); // Less than 1 second per request

      // Wait for job completion
      await waitForJobCompletion(jobId);
    });
  });
});