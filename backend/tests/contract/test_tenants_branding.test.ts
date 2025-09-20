import request from 'supertest';
import path from 'path';
import app from '../../src/index';

describe('PUT /api/tenants/:id/branding - Contract Tests', () => {
  let testTenantId: string;

  beforeEach(async () => {
    // Create a tenant for testing branding endpoints
    const tenantResponse = await request(app)
      .post('/api/tenants')
      .send({
        name: 'Test Tenant',
        domain: `test-branding-tenant-${Date.now()}`,
      })
      .expect(201);

    testTenantId = tenantResponse.body.id;
  });

  describe('Request Schema Validation', () => {
    it('should accept valid branding configuration with logo', async () => {
      const logoPath = path.join(__dirname, '../fixtures/test-logo.png');

      const response = await request(app)
        .put(`/api/tenants/${testTenantId}/branding`)
        .field('primary_color', '#3B82F6')
        .field('secondary_color', '#1E40AF')
        .field('accent_color', '#F59E0B')
        .field('font_family', 'Inter')
        .attach('logo', logoPath)
        .expect('Content-Type', /json/);

      // This test MUST FAIL until we implement the endpoint
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tenant_id', testTenantId);
      expect(response.body).toHaveProperty('branding');
      expect(response.body.branding).toHaveProperty('logo_url');
      expect(response.body.branding).toHaveProperty('primary_color', '#3B82F6');
      expect(response.body.branding).toHaveProperty('secondary_color', '#1E40AF');
      expect(response.body.branding).toHaveProperty('accent_color', '#F59E0B');
      expect(response.body.branding).toHaveProperty('font_family', 'Inter');
      expect(response.body).toHaveProperty('next_step', 'CATEGORIES');
    });

    it('should accept valid branding without logo', async () => {
      const response = await request(app)
        .put(`/api/tenants/${testTenantId}/branding`)
        .field('primary_color', '#E53E3E')
        .field('secondary_color', '#C53030')
        .field('accent_color', '#FBD38D')
        .field('font_family', 'Roboto')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.branding.logo_url).toBe('');
    });

    it('should accept custom font upload', async () => {
      const fontPath = path.join(__dirname, '../fixtures/custom-font.woff2');

      const response = await request(app)
        .put(`/api/tenants/${testTenantId}/branding`)
        .field('primary_color', '#3B82F6')
        .field('secondary_color', '#1E40AF')
        .field('accent_color', '#F59E0B')
        .field('font_family', 'custom')
        .attach('font_file', fontPath)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.branding).toHaveProperty('font_url');
      expect(response.body.branding.font_url).toMatch(/\.(woff|woff2|ttf)$/);
    });
  });

  describe('Validation Rules', () => {
    it('should reject invalid color format', async () => {
      const response = await request(app)
        .put(`/api/tenants/${testTenantId}/branding`)
        .field('primary_color', 'not-a-color')
        .field('secondary_color', '#1E40AF')
        .field('accent_color', '#F59E0B')
        .field('font_family', 'Inter')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('primary_color');
    });

    it('should reject invalid font family', async () => {
      const response = await request(app)
        .put(`/api/tenants/${testTenantId}/branding`)
        .field('primary_color', '#3B82F6')
        .field('secondary_color', '#1E40AF')
        .field('accent_color', '#F59E0B')
        .field('font_family', 'InvalidFont')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('font_family');
    });

    it('should reject invalid logo file type', async () => {
      const invalidFile = path.join(__dirname, '../fixtures/test-document.pdf');

      const response = await request(app)
        .put(`/api/tenants/${testTenantId}/branding`)
        .field('primary_color', '#3B82F6')
        .field('secondary_color', '#1E40AF')
        .field('accent_color', '#F59E0B')
        .field('font_family', 'Inter')
        .attach('logo', invalidFile)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('logo');
      expect(response.body.error).toContain('format');
    });

    it('should reject missing required color fields', async () => {
      const response = await request(app)
        .put(`/api/tenants/${testTenantId}/branding`)
        .field('primary_color', '#3B82F6')
        .field('font_family', 'Inter')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('secondary_color');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent tenant', async () => {
      const nonExistentId = '999e4567-e89b-12d3-a456-426614174999';

      const response = await request(app)
        .put(`/api/tenants/${nonExistentId}/branding`)
        .field('primary_color', '#3B82F6')
        .field('secondary_color', '#1E40AF')
        .field('accent_color', '#F59E0B')
        .field('font_family', 'Inter')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('tenant');
      expect(response.body.error).toContain('not found');
    });

    it('should return 400 for invalid tenant ID format', async () => {
      const response = await request(app)
        .put('/api/tenants/invalid-id/branding')
        .field('primary_color', '#3B82F6')
        .field('secondary_color', '#1E40AF')
        .field('accent_color', '#F59E0B')
        .field('font_family', 'Inter')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('invalid');
    });
  });

  describe('Response Schema Validation', () => {
    it('should return branding object with correct schema', async () => {
      const response = await request(app)
        .put(`/api/tenants/${testTenantId}/branding`)
        .field('primary_color', '#3B82F6')
        .field('secondary_color', '#1E40AF')
        .field('accent_color', '#F59E0B')
        .field('font_family', 'Inter')
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          tenant_id: expect.any(String),
          branding: expect.objectContaining({
            logo_url: expect.any(String),
            primary_color: expect.stringMatching(/^#[0-9A-Fa-f]{6}$/),
            secondary_color: expect.stringMatching(/^#[0-9A-Fa-f]{6}$/),
            accent_color: expect.stringMatching(/^#[0-9A-Fa-f]{6}$/),
            font_family: expect.any(String),
            font_url: expect.any(String),
          }),
          next_step: expect.stringMatching(/^(CATEGORIES|LISTINGS|PREVIEW|PUBLISH)$/),
        })
      );
    });
  });
});
