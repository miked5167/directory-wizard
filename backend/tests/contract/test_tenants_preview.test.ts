import request from 'supertest';
import path from 'path';
import app from '../../src/index';

describe('GET /api/tenants/:id/preview - Contract Tests', () => {
  let testTenantId: string;

  beforeEach(async () => {
    // Create a tenant for testing preview endpoint
    const tenantResponse = await request(app)
      .post('/api/tenants')
      .send({
        name: 'Preview Test Tenant',
        domain: `preview-test-tenant-${Date.now()}`,
      })
      .expect(201);

    testTenantId = tenantResponse.body.id;

    // Add some test data for meaningful preview
    // Upload categories
    const categoriesPath = path.join(__dirname, '../fixtures/categories.json');
    await request(app)
      .post(`/api/tenants/${testTenantId}/upload?type=categories`)
      .attach('file', categoriesPath)
      .expect(200);

    // Upload listings
    const listingsPath = path.join(__dirname, '../fixtures/listings.csv');
    await request(app)
      .post(`/api/tenants/${testTenantId}/upload?type=listings`)
      .attach('file', listingsPath)
      .expect(200);
  });

  describe('Request Schema Validation', () => {
    it('should reject invalid tenant ID format', async () => {
      const response = await request(app)
        .get('/api/tenants/invalid-id/preview')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('tenant ID');
    });

    it('should return 404 for non-existent tenant', async () => {
      const nonExistentId = '999e4567-e89b-12d3-a456-426614174999';

      const response = await request(app)
        .get(`/api/tenants/${nonExistentId}/preview`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Tenant not found');
    });
  });

  describe('Response Schema Validation', () => {
    it('should return preview with correct schema', async () => {
      const response = await request(app)
        .get(`/api/tenants/${testTenantId}/preview`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);

      // Validate response schema
      expect(response.body).toHaveProperty('tenant_id', testTenantId);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('domain');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('preview_url');
      expect(response.body).toHaveProperty('statistics');

      // Validate statistics object
      expect(response.body.statistics).toHaveProperty('categories_count');
      expect(response.body.statistics).toHaveProperty('listings_count');
      expect(response.body.statistics).toHaveProperty('media_files_count');

      // Validate data types
      expect(typeof response.body.tenant_id).toBe('string');
      expect(typeof response.body.name).toBe('string');
      expect(typeof response.body.domain).toBe('string');
      expect(typeof response.body.status).toBe('string');
      expect(typeof response.body.preview_url).toBe('string');
      expect(typeof response.body.statistics.categories_count).toBe('number');
      expect(typeof response.body.statistics.listings_count).toBe('number');
      expect(typeof response.body.statistics.media_files_count).toBe('number');
    });

    it('should include categories and listings data', async () => {
      const response = await request(app).get(`/api/tenants/${testTenantId}/preview`).expect(200);

      expect(response.body).toHaveProperty('categories');
      expect(response.body).toHaveProperty('listings');
      expect(Array.isArray(response.body.categories)).toBe(true);
      expect(Array.isArray(response.body.listings)).toBe(true);
    });

    it('should show correct statistics after data upload', async () => {
      const response = await request(app).get(`/api/tenants/${testTenantId}/preview`).expect(200);

      // Should reflect uploaded test data
      expect(response.body.statistics.categories_count).toBeGreaterThan(0);
      expect(response.body.statistics.listings_count).toBeGreaterThan(0);
      expect(response.body.statistics.media_files_count).toBe(0); // No media uploaded
    });
  });

  describe('Business Logic Validation', () => {
    it('should generate preview URL with correct format', async () => {
      const response = await request(app).get(`/api/tenants/${testTenantId}/preview`).expect(200);

      const expectedUrlPattern = new RegExp(`https://.+\\.example\\.com/preview`);
      expect(response.body.preview_url).toMatch(expectedUrlPattern);
    });

    it('should include branding data if configured', async () => {
      // Add branding to tenant
      await request(app)
        .put(`/api/tenants/${testTenantId}/branding`)
        .field('primary_color', '#3B82F6')
        .field('secondary_color', '#1E40AF')
        .field('accent_color', '#F59E0B')
        .field('font_family', 'Inter')
        .expect(200);

      const response = await request(app).get(`/api/tenants/${testTenantId}/preview`).expect(200);

      expect(response.body).toHaveProperty('branding');
      expect(response.body.branding).toHaveProperty('primaryColor', '#3B82F6');
    });

    it('should work for tenants with no uploaded data', async () => {
      // Create fresh tenant with no uploads
      const freshTenantResponse = await request(app)
        .post('/api/tenants')
        .send({
          name: 'Empty Test Tenant',
          domain: `empty-test-tenant-${Date.now()}`,
        })
        .expect(201);

      const response = await request(app)
        .get(`/api/tenants/${freshTenantResponse.body.id}/preview`)
        .expect(200);

      expect(response.body.statistics.categories_count).toBe(0);
      expect(response.body.statistics.listings_count).toBe(0);
      expect(response.body.categories).toHaveLength(0);
      expect(response.body.listings).toHaveLength(0);
    });
  });
});
