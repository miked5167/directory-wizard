import request from 'supertest';
import path from 'path';
import app from '../../src/index';

describe('Integration: Complete Tenant Creation Flow', () => {
  let tenantId: string;
  let sessionId: string;

  describe('End-to-End Wizard Flow', () => {
    it('should complete full tenant creation from start to published', async () => {
      // Step 1: Create new tenant
      const createResponse = await request(app).post('/api/tenants').send({
        name: 'Integration Test Directory',
        domain: 'integration-test',
        description: 'Full integration test directory',
      });

      // This test MUST FAIL until we implement the endpoints
      expect(createResponse.status).toBe(201);
      expect(createResponse.body).toHaveProperty('id');
      expect(createResponse.body).toHaveProperty('session_id');

      tenantId = createResponse.body.id;
      sessionId = createResponse.body.session_id;

      // Step 2: Configure branding
      const brandingResponse = await request(app)
        .put(`/api/tenants/${tenantId}/branding`)
        .field('primary_color', '#3B82F6')
        .field('secondary_color', '#1E40AF')
        .field('accent_color', '#F59E0B')
        .field('font_family', 'Inter');

      expect(brandingResponse.status).toBe(200);
      expect(brandingResponse.body).toHaveProperty('branding');
      expect(brandingResponse.body.next_step).toBe('CATEGORIES');

      // Step 3: Upload categories
      const categoriesPath = path.join(__dirname, '../fixtures/categories.json');
      const categoriesResponse = await request(app)
        .post(`/api/tenants/${tenantId}/upload?type=categories`)
        .attach('file', categoriesPath);

      expect(categoriesResponse.status).toBe(200);
      expect(categoriesResponse.body.validation_status).toBe('VALID');
      expect(categoriesResponse.body.next_step).toBe('LISTINGS');

      // Step 4: Upload listings
      const listingsPath = path.join(__dirname, '../fixtures/listings.csv');
      const listingsResponse = await request(app)
        .post(`/api/tenants/${tenantId}/upload?type=listings`)
        .attach('file', listingsPath);

      expect(listingsResponse.status).toBe(200);
      expect(listingsResponse.body.validation_status).toBe('VALID');
      expect(listingsResponse.body.next_step).toBe('PREVIEW');

      // Step 5: Generate preview
      const previewResponse = await request(app).get(`/api/tenants/${tenantId}/preview`);

      expect(previewResponse.status).toBe(200);
      expect(previewResponse.body).toHaveProperty('preview_url');
      expect(previewResponse.body).toHaveProperty('statistics');
      expect(previewResponse.body.statistics.categories_count).toBeGreaterThan(0);
      expect(previewResponse.body.statistics.listings_count).toBeGreaterThan(0);

      // Step 6: Publish tenant
      const publishResponse = await request(app).post(`/api/tenants/${tenantId}/publish`);

      expect(publishResponse.status).toBe(202);
      expect(publishResponse.body).toHaveProperty('job_id');
      expect(publishResponse.body.status).toBe('QUEUED');

      const jobId = publishResponse.body.job_id;

      // Step 7: Monitor publishing progress
      let jobComplete = false;
      let attempts = 0;
      const maxAttempts = 10;

      while (!jobComplete && attempts < maxAttempts) {
        const jobResponse = await request(app).get(`/api/tenants/${tenantId}/jobs/${jobId}`);

        expect(jobResponse.status).toBe(200);
        expect(jobResponse.body).toHaveProperty('status');
        expect(jobResponse.body).toHaveProperty('progress');

        if (jobResponse.body.status === 'COMPLETED') {
          jobComplete = true;
          expect(jobResponse.body.progress).toBe(100);
        } else if (jobResponse.body.status === 'FAILED') {
          fail(`Publishing job failed: ${jobResponse.body.error_message}`);
        }

        attempts++;
        if (!jobComplete && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        }
      }

      expect(jobComplete).toBe(true);

      // Step 8: Verify tenant is published
      const finalTenantResponse = await request(app).get(`/api/tenants/${tenantId}`);

      expect(finalTenantResponse.status).toBe(200);
      expect(finalTenantResponse.body.status).toBe('PUBLISHED');
      expect(finalTenantResponse.body).toHaveProperty('published_at');
    });

    it('should handle wizard session recovery after interruption', async () => {
      // Create tenant and start wizard
      const createResponse = await request(app).post('/api/tenants').send({
        name: 'Session Recovery Test',
        domain: 'session-recovery',
      });

      expect(createResponse.status).toBe(201);
      tenantId = createResponse.body.id;
      sessionId = createResponse.body.session_id;

      // Configure branding
      await request(app)
        .put(`/api/tenants/${tenantId}/branding`)
        .field('primary_color', '#3B82F6')
        .field('secondary_color', '#1E40AF')
        .field('accent_color', '#F59E0B')
        .field('font_family', 'Inter');

      // Simulate session recovery by checking tenant state
      const tenantResponse = await request(app).get(`/api/tenants/${tenantId}`);

      expect(tenantResponse.status).toBe(200);
      expect(tenantResponse.body.status).toBe('DRAFT');
      expect(tenantResponse.body).toHaveProperty('branding');

      // Should be able to continue from where we left off
      const categoriesPath = path.join(__dirname, '../fixtures/categories.json');
      const categoriesResponse = await request(app)
        .post(`/api/tenants/${tenantId}/upload?type=categories`)
        .attach('file', categoriesPath);

      expect(categoriesResponse.status).toBe(200);
    });

    it('should validate data consistency across all steps', async () => {
      // Create tenant with specific data
      const tenantData = {
        name: 'Consistency Test Directory',
        domain: 'consistency-test',
        description: 'Testing data consistency',
      };

      const createResponse = await request(app).post('/api/tenants').send(tenantData);

      expect(createResponse.status).toBe(201);
      tenantId = createResponse.body.id;

      // Configure branding with specific colors
      const brandingData = {
        primary_color: '#E53E3E',
        secondary_color: '#C53030',
        accent_color: '#FBD38D',
        font_family: 'Roboto',
      };

      await request(app)
        .put(`/api/tenants/${tenantId}/branding`)
        .field('primary_color', brandingData.primary_color)
        .field('secondary_color', brandingData.secondary_color)
        .field('accent_color', brandingData.accent_color)
        .field('font_family', brandingData.font_family);

      // Upload categories and verify they're processed correctly
      const categoriesPath = path.join(__dirname, '../fixtures/categories.json');
      const categoriesResponse = await request(app)
        .post(`/api/tenants/${tenantId}/upload?type=categories`)
        .attach('file', categoriesPath);

      expect(categoriesResponse.body.records_count).toBe(2); // From our fixture

      // Upload listings and verify they reference correct categories
      const listingsPath = path.join(__dirname, '../fixtures/listings.csv');
      const listingsResponse = await request(app)
        .post(`/api/tenants/${tenantId}/upload?type=listings`)
        .attach('file', listingsPath);

      expect(listingsResponse.body.records_count).toBe(4); // From our fixture

      // Generate preview and verify all data is included
      const previewResponse = await request(app).get(`/api/tenants/${tenantId}/preview`);

      expect(previewResponse.body.statistics).toEqual({
        categories_count: 2,
        listings_count: 4,
        media_files_count: 0,
      });

      // Verify tenant data integrity
      const tenantResponse = await request(app).get(`/api/tenants/${tenantId}`);

      expect(tenantResponse.body.name).toBe(tenantData.name);
      expect(tenantResponse.body.domain).toBe(tenantData.domain);
      expect(tenantResponse.body.branding.primary_color).toBe(brandingData.primary_color);
      expect(tenantResponse.body.branding.font_family).toBe(brandingData.font_family);
    });
  });

  describe('Error Recovery and Rollback', () => {
    it('should rollback tenant creation if external service provisioning fails', async () => {
      // Create tenant that will trigger provisioning failure
      const createResponse = await request(app).post('/api/tenants').send({
        name: 'Failure Test Directory',
        domain: 'failure-test',
      });

      expect(createResponse.status).toBe(201);
      tenantId = createResponse.body.id;

      // Complete wizard steps
      await request(app)
        .put(`/api/tenants/${tenantId}/branding`)
        .field('primary_color', '#3B82F6')
        .field('secondary_color', '#1E40AF')
        .field('accent_color', '#F59E0B')
        .field('font_family', 'Inter');

      const categoriesPath = path.join(__dirname, '../fixtures/categories.json');
      await request(app)
        .post(`/api/tenants/${tenantId}/upload?type=categories`)
        .attach('file', categoriesPath);

      const listingsPath = path.join(__dirname, '../fixtures/listings.csv');
      await request(app)
        .post(`/api/tenants/${tenantId}/upload?type=listings`)
        .attach('file', listingsPath);

      // Attempt to publish (will fail due to mock service failure)
      const publishResponse = await request(app).post(`/api/tenants/${tenantId}/publish`);

      expect(publishResponse.status).toBe(202);
      const jobId = publishResponse.body.job_id;

      // Monitor job until it fails
      let jobFailed = false;
      let attempts = 0;

      while (!jobFailed && attempts < 10) {
        const jobResponse = await request(app).get(`/api/tenants/${tenantId}/jobs/${jobId}`);

        if (jobResponse.body.status === 'FAILED') {
          jobFailed = true;
          expect(jobResponse.body).toHaveProperty('error_message');
        }

        attempts++;
        if (!jobFailed && attempts < 10) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      expect(jobFailed).toBe(true);

      // Verify tenant status is set to FAILED
      const tenantResponse = await request(app).get(`/api/tenants/${tenantId}`);

      expect(tenantResponse.body.status).toBe('FAILED');

      // Verify that external resources were cleaned up (rollback)
      // This would involve checking that no resources were left in external services
    });

    it('should handle partial file uploads gracefully', async () => {
      const createResponse = await request(app).post('/api/tenants').send({
        name: 'Partial Upload Test',
        domain: 'partial-upload',
      });

      tenantId = createResponse.body.id;

      // Simulate interrupted file upload by sending incomplete data
      const incompleteJsonPath = path.join(__dirname, '../fixtures/incomplete.json');

      // Create incomplete JSON file
      const fs = require('fs');
      fs.writeFileSync(incompleteJsonPath, '{"incomplete": "json"'); // Missing closing brace

      const uploadResponse = await request(app)
        .post(`/api/tenants/${tenantId}/upload?type=categories`)
        .attach('file', incompleteJsonPath);

      expect(uploadResponse.status).toBe(422);
      expect(uploadResponse.body).toHaveProperty('validation_errors');

      // Verify tenant state is still valid for retry
      const tenantResponse = await request(app).get(`/api/tenants/${tenantId}`);

      expect(tenantResponse.body.status).toBe('DRAFT');

      // Should be able to upload correct file after failure
      const categoriesPath = path.join(__dirname, '../fixtures/categories.json');
      const retryResponse = await request(app)
        .post(`/api/tenants/${tenantId}/upload?type=categories`)
        .attach('file', categoriesPath);

      expect(retryResponse.status).toBe(200);

      // Cleanup
      fs.unlinkSync(incompleteJsonPath);
    });
  });

  afterEach(async () => {
    // Cleanup test data
    if (tenantId) {
      await request(app).delete(`/api/tenants/${tenantId}`);
    }
  });
});
