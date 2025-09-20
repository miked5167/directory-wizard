import request from 'supertest';
import app from '../../src/index';
import path from 'path';
import fs from 'fs';

describe('Integration: Preview Generation', () => {
  let tenantId: string;
  let tenantName: string;
  let tenantDomain: string;

  // Helper to create test files
  const createTestFile = (filename: string, content: string | Buffer): string => {
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

  beforeEach(async () => {
    // Create a test tenant with complete data for preview testing
    tenantName = 'Preview Test Directory';
    tenantDomain = `preview-test-${Date.now()}`;

    const tenantResponse = await request(app).post('/api/tenants').send({
      name: tenantName,
      domain: tenantDomain,
    });

    tenantId = tenantResponse.body.id;
    expect(tenantResponse.status).toBe(201);

    // Add branding configuration
    await request(app)
      .put(`/api/tenants/${tenantId}/branding`)
      .field('primary_color', '#2563EB')
      .field('secondary_color', '#F8FAFC')
      .field('accent_color', '#7C3AED')
      .field('font_family', 'Inter, sans-serif');

    // Add categories
    const categories = JSON.stringify([
      {
        name: 'Restaurants',
        slug: 'restaurants',
        description: 'Fine dining and casual eateries',
        icon: 'restaurant',
        sort_order: 1,
      },
      {
        name: 'Shopping',
        slug: 'shopping',
        description: 'Retail stores and boutiques',
        icon: 'shopping-bag',
        sort_order: 2,
      },
      {
        name: 'Services',
        slug: 'services',
        description: 'Professional services',
        icon: 'briefcase',
        sort_order: 3,
      },
    ]);

    const categoriesFilePath = createTestFile('preview-categories.json', categories);
    await request(app)
      .post(`/api/tenants/${tenantId}/upload?type=categories`)
      .attach('file', categoriesFilePath);
    cleanupTestFile(categoriesFilePath);

    // Add listings
    const listings = `title,category,description
"Pizza Palace","restaurants","Best pizza in town with wood-fired oven"
"Coffee & Co","restaurants","Artisan coffee roasters and café"
"Fashion Boutique","shopping","Trendy clothing and accessories"
"Tech Store","shopping","Latest gadgets and electronics"
"Law Office","services","Professional legal services"
"Marketing Agency","services","Digital marketing specialists"`;

    const listingsFilePath = createTestFile('preview-listings.csv', listings);
    await request(app)
      .post(`/api/tenants/${tenantId}/upload?type=listings`)
      .attach('file', listingsFilePath);
    cleanupTestFile(listingsFilePath);
  });

  describe('Preview Data Generation', () => {
    it('should generate complete preview data for a tenant', async () => {
      const response = await request(app)
        .get(`/api/tenants/${tenantId}/preview`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);

      // Validate top-level structure
      expect(response.body).toHaveProperty('tenant_id', tenantId);
      expect(response.body).toHaveProperty('name', tenantName);
      expect(response.body).toHaveProperty('domain', tenantDomain);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('preview_url');
      expect(response.body).toHaveProperty('admin_url');

      // Validate preview URL format
      expect(response.body.preview_url).toMatch(
        new RegExp(`https://${tenantDomain}\\.example\\.com/preview`)
      );
    });

    it('should include accurate statistics in preview data', async () => {
      const response = await request(app)
        .get(`/api/tenants/${tenantId}/preview`)
        .expect(200);

      expect(response.body).toHaveProperty('statistics');
      const stats = response.body.statistics;

      expect(stats).toHaveProperty('categories_count');
      expect(stats).toHaveProperty('listings_count');
      expect(stats).toHaveProperty('media_files_count');
      expect(stats).toHaveProperty('total_pages');

      // Verify expected counts
      expect(stats.categories_count).toBe(3);
      expect(stats.listings_count).toBe(6);
      expect(stats.media_files_count).toBeGreaterThanOrEqual(0);
      expect(stats.total_pages).toBeGreaterThan(0);

      // Total pages should be home + categories + listings
      const expectedPages = 1 + stats.categories_count + stats.listings_count;
      expect(stats.total_pages).toBe(expectedPages);
    });

    it('should include branding configuration in preview data', async () => {
      const response = await request(app)
        .get(`/api/tenants/${tenantId}/preview`)
        .expect(200);

      expect(response.body).toHaveProperty('branding');
      const branding = response.body.branding;

      expect(branding).toHaveProperty('primaryColor', '#2563EB');
      expect(branding).toHaveProperty('secondaryColor', '#F8FAFC');
      expect(branding).toHaveProperty('accentColor', '#7C3AED');
      expect(branding).toHaveProperty('fontFamily', 'Inter, sans-serif');

      // Check for duplicate naming conventions (both snake_case and camelCase)
      expect(branding).toHaveProperty('primary_color', '#2563EB');
      expect(branding).toHaveProperty('secondary_color', '#F8FAFC');
      expect(branding).toHaveProperty('accent_color', '#7C3AED');
      expect(branding).toHaveProperty('font_family', 'Inter, sans-serif');
    });

    it('should include site structure with pages and navigation', async () => {
      const response = await request(app)
        .get(`/api/tenants/${tenantId}/preview`)
        .expect(200);

      expect(response.body).toHaveProperty('site_structure');
      const siteStructure = response.body.site_structure;

      expect(siteStructure).toHaveProperty('pages');
      expect(siteStructure).toHaveProperty('navigation');

      // Validate pages array
      expect(Array.isArray(siteStructure.pages)).toBe(true);
      expect(siteStructure.pages.length).toBeGreaterThan(0);

      // Should have home page
      const homePage = siteStructure.pages.find((page: any) => page.path === '/');
      expect(homePage).toBeDefined();
      expect(homePage.title).toBe('Home');
      expect(homePage.type).toBe('home');

      // Should have category pages
      const categoryPages = siteStructure.pages.filter((page: any) => page.type === 'category');
      expect(categoryPages.length).toBe(3);

      // Validate navigation array
      expect(Array.isArray(siteStructure.navigation)).toBe(true);
      expect(siteStructure.navigation.length).toBeGreaterThan(0);
    });

    it('should include categories and listings data', async () => {
      const response = await request(app)
        .get(`/api/tenants/${tenantId}/preview`)
        .expect(200);

      expect(response.body).toHaveProperty('categories');
      expect(response.body).toHaveProperty('listings');

      // Validate categories
      expect(Array.isArray(response.body.categories)).toBe(true);
      expect(response.body.categories.length).toBe(3);

      const restaurant = response.body.categories.find((cat: any) => cat.slug === 'restaurants');
      expect(restaurant).toBeDefined();
      expect(restaurant.name).toBe('Restaurants');
      expect(restaurant.description).toBe('Fine dining and casual eateries');

      // Validate listings
      expect(Array.isArray(response.body.listings)).toBe(true);
      expect(response.body.listings.length).toBe(6);

      const pizzaPlace = response.body.listings.find((listing: any) =>
        listing.title === 'Pizza Palace'
      );
      expect(pizzaPlace).toBeDefined();
      expect(pizzaPlace.description).toBe('Best pizza in town with wood-fired oven');
    });
  });

  describe('Preview Configuration Options', () => {
    it('should handle preview with minimal configuration', async () => {
      const response = await request(app)
        .get(`/api/tenants/${tenantId}/preview?includeContent=false`)
        .expect(200);

      expect(response.body).toHaveProperty('tenant_id');
      expect(response.body).toHaveProperty('statistics');

      // Content should be minimal when includeContent=false
      if (response.body.site_structure && response.body.site_structure.pages) {
        response.body.site_structure.pages.forEach((page: any) => {
          expect(page.content).toBeUndefined();
        });
      }
    });

    it('should handle preview with draft listings included', async () => {
      const response = await request(app)
        .get(`/api/tenants/${tenantId}/preview?includeDrafts=true`)
        .expect(200);

      expect(response.body).toHaveProperty('listings');
      // Since we only have featured listings in our test data,
      // the count should be the same regardless of includeDrafts
      expect(response.body.listings.length).toBe(6);
    });

    it('should handle preview with limited listings', async () => {
      const response = await request(app)
        .get(`/api/tenants/${tenantId}/preview?maxListings=3`)
        .expect(200);

      expect(response.body).toHaveProperty('listings');
      expect(response.body.listings.length).toBeLessThanOrEqual(3);
      expect(response.body.statistics.listings_count).toBeLessThanOrEqual(3);
    });
  });

  describe('Preview Readiness Validation', () => {
    it('should validate preview readiness for complete tenant', async () => {
      // This endpoint doesn't exist yet in the routes, but the service method exists
      // For now, we'll test through the regular preview endpoint which calls validation
      const response = await request(app)
        .get(`/api/tenants/${tenantId}/preview`)
        .expect(200);

      // A complete tenant should be able to generate preview
      expect(response.body).toHaveProperty('status');
      expect(response.body.statistics.categories_count).toBeGreaterThan(0);
      expect(response.body.statistics.listings_count).toBeGreaterThan(0);
    });

    it('should handle preview for tenant with no branding', async () => {
      // Create a tenant without branding
      const simpleTenantResponse = await request(app).post('/api/tenants').send({
        name: 'Simple Tenant',
        domain: `simple-${Date.now()}`,
      });

      const simpleTenantId = simpleTenantResponse.body.id;

      // Add minimal categories
      const simpleCategories = JSON.stringify([
        { name: 'General', slug: 'general', description: 'General listings' },
      ]);

      const categoriesFilePath = createTestFile('simple-categories.json', simpleCategories);
      await request(app)
        .post(`/api/tenants/${simpleTenantId}/upload?type=categories`)
        .attach('file', categoriesFilePath);
      cleanupTestFile(categoriesFilePath);

      const response = await request(app)
        .get(`/api/tenants/${simpleTenantId}/preview`)
        .expect(200);

      // Should still generate preview with default branding
      expect(response.body).toHaveProperty('branding');
      expect(response.body.branding.primaryColor).toBeDefined();
      expect(response.body.branding.secondaryColor).toBeDefined();
    });

    it('should handle preview for tenant with empty categories', async () => {
      // Create a tenant with categories but no listings
      const emptyTenantResponse = await request(app).post('/api/tenants').send({
        name: 'Empty Tenant',
        domain: `empty-${Date.now()}`,
      });

      const emptyTenantId = emptyTenantResponse.body.id;

      // Add categories but no listings
      const emptyCategories = JSON.stringify([
        { name: 'Empty Category', slug: 'empty', description: 'No listings here' },
      ]);

      const categoriesFilePath = createTestFile('empty-categories.json', emptyCategories);
      await request(app)
        .post(`/api/tenants/${emptyTenantId}/upload?type=categories`)
        .attach('file', categoriesFilePath);
      cleanupTestFile(categoriesFilePath);

      const response = await request(app)
        .get(`/api/tenants/${emptyTenantId}/preview`)
        .expect(200);

      // Should still work but with zero listings
      expect(response.body.statistics.categories_count).toBe(1);
      expect(response.body.statistics.listings_count).toBe(0);
      expect(response.body.listings).toEqual([]);
    });
  });

  describe('Preview Error Handling', () => {
    it('should return 404 for non-existent tenant', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app)
        .get(`/api/tenants/${nonExistentId}/preview`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });

    it('should return 400 for invalid tenant ID format', async () => {
      const response = await request(app)
        .get('/api/tenants/invalid-id/preview')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle preview generation errors gracefully', async () => {
      // Create a minimal tenant that might cause issues
      const problematicTenantResponse = await request(app).post('/api/tenants').send({
        name: 'Problematic Tenant',
        domain: `problematic-${Date.now()}`,
      });

      const problematicTenantId = problematicTenantResponse.body.id;

      // Try to generate preview without any data
      const response = await request(app)
        .get(`/api/tenants/${problematicTenantId}/preview`)
        .expect('Content-Type', /json/);

      // Should handle gracefully - either 200 with empty data or proper error
      expect([200, 400, 422]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('statistics');
        expect(response.body.statistics.categories_count).toBe(0);
        expect(response.body.statistics.listings_count).toBe(0);
      } else {
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('Preview Performance and Scalability', () => {
    it('should handle preview generation within reasonable time', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get(`/api/tenants/${tenantId}/preview`)
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Preview generation should complete within 5 seconds
      expect(duration).toBeLessThan(5000);
      expect(response.body).toHaveProperty('tenant_id');
    });

    it('should handle concurrent preview requests', async () => {
      const promises = Array.from({ length: 3 }, () =>
        request(app).get(`/api/tenants/${tenantId}/preview`)
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('tenant_id', tenantId);
      });
    });
  });

  describe('Preview Data Consistency', () => {
    it('should maintain consistent data across multiple preview requests', async () => {
      const response1 = await request(app)
        .get(`/api/tenants/${tenantId}/preview`)
        .expect(200);

      const response2 = await request(app)
        .get(`/api/tenants/${tenantId}/preview`)
        .expect(200);

      // Core data should be identical
      expect(response1.body.tenant_id).toBe(response2.body.tenant_id);
      expect(response1.body.name).toBe(response2.body.name);
      expect(response1.body.domain).toBe(response2.body.domain);
      expect(response1.body.statistics.categories_count).toBe(
        response2.body.statistics.categories_count
      );
      expect(response1.body.statistics.listings_count).toBe(
        response2.body.statistics.listings_count
      );
    });

    it('should reflect data changes after updates', async () => {
      // Get initial preview
      const initialResponse = await request(app)
        .get(`/api/tenants/${tenantId}/preview`)
        .expect(200);

      const initialListingsCount = initialResponse.body.statistics.listings_count;

      // Add more listings
      const additionalListings = `title,category,description
"New Restaurant","restaurants","Just opened!"
"New Shop","shopping","Latest store"`;

      const listingsFilePath = createTestFile('additional-listings.csv', additionalListings);
      await request(app)
        .post(`/api/tenants/${tenantId}/upload?type=listings`)
        .attach('file', listingsFilePath);
      cleanupTestFile(listingsFilePath);

      // Get updated preview
      const updatedResponse = await request(app)
        .get(`/api/tenants/${tenantId}/preview`)
        .expect(200);

      // Listings count should increase
      expect(updatedResponse.body.statistics.listings_count).toBeGreaterThan(
        initialListingsCount
      );
    });
  });

  describe('Preview URL Generation', () => {
    it('should generate valid preview and admin URLs', async () => {
      const response = await request(app)
        .get(`/api/tenants/${tenantId}/preview`)
        .expect(200);

      expect(response.body).toHaveProperty('preview_url');
      expect(response.body).toHaveProperty('admin_url');

      // Validate URL format
      const previewUrl = response.body.preview_url;
      const adminUrl = response.body.admin_url;

      expect(previewUrl).toMatch(/^https:\/\/.*\.example\.com\/preview$/);
      expect(adminUrl).toMatch(/^https:\/\/.*\.example\.com/);
      expect(previewUrl).toContain(tenantDomain);
      expect(adminUrl).toContain(tenantDomain);
    });

    it('should generate unique URLs for different tenants', async () => {
      // Create another tenant
      const anotherTenantResponse = await request(app).post('/api/tenants').send({
        name: 'Another Tenant',
        domain: `another-${Date.now()}`,
      });

      const anotherTenantId = anotherTenantResponse.body.id;

      // Get preview for both tenants
      const [response1, response2] = await Promise.all([
        request(app).get(`/api/tenants/${tenantId}/preview`),
        request(app).get(`/api/tenants/${anotherTenantId}/preview`),
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // URLs should be different
      expect(response1.body.preview_url).not.toBe(response2.body.preview_url);
      expect(response1.body.admin_url).not.toBe(response2.body.admin_url);
    });
  });
});