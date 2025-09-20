import request from 'supertest';
import app from '../../src/index';
import path from 'path';
import fs from 'fs';

describe('Integration: File Validation and Error Handling', () => {
  let tenantId: string;

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
    // Create a test tenant for each test
    const tenantResponse = await request(app).post('/api/tenants').send({
      name: 'File Validation Test Directory',
      domain: `file-test-${Date.now()}`,
    });

    tenantId = tenantResponse.body.id;
    expect(tenantResponse.status).toBe(201);
  });

  describe('Categories File Validation', () => {
    it('should accept valid categories JSON file', async () => {
      const validCategories = JSON.stringify([
        {
          name: 'Restaurants',
          slug: 'restaurants',
          description: 'Food and dining establishments',
          icon: 'restaurant',
          sort_order: 1,
        },
        {
          name: 'Shopping',
          slug: 'shopping',
          description: 'Retail stores and shops',
          icon: 'shopping-cart',
          sort_order: 2,
        },
      ]);

      const testFilePath = createTestFile('valid-categories.json', validCategories);

      try {
        const response = await request(app)
          .post(`/api/tenants/${tenantId}/upload?type=categories`)
          .attach('file', testFilePath)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('file_id');
        expect(response.body).toHaveProperty('type', 'categories');
        expect(response.body).toHaveProperty('records_count', 2);
        expect(response.body).toHaveProperty('validation_status', 'VALID');
        expect(response.body).toHaveProperty('next_step', 'LISTINGS');
      } finally {
        cleanupTestFile(testFilePath);
      }
    });

    it('should reject categories file with invalid JSON format', async () => {
      const invalidJson = '{"name": "Restaurants", "slug": "restaurants"'; // Missing closing brace

      const testFilePath = createTestFile('invalid-categories.json', invalidJson);

      try {
        const response = await request(app)
          .post(`/api/tenants/${tenantId}/upload?type=categories`)
          .attach('file', testFilePath)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(422);
        expect(response.body).toHaveProperty('error', 'File validation failed');
        expect(response.body).toHaveProperty('validation_errors');
        expect(Array.isArray(response.body.validation_errors)).toBe(true);
        expect(response.body.validation_errors[0]).toHaveProperty('field', 'file');
        expect(response.body.validation_errors[0].message).toContain('JSON');
      } finally {
        cleanupTestFile(testFilePath);
      }
    });

    it('should reject categories file with non-array format', async () => {
      const nonArrayCategories = JSON.stringify({
        name: 'Restaurants',
        slug: 'restaurants',
      });

      const testFilePath = createTestFile('non-array-categories.json', nonArrayCategories);

      try {
        const response = await request(app)
          .post(`/api/tenants/${tenantId}/upload?type=categories`)
          .attach('file', testFilePath)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(422);
        expect(response.body).toHaveProperty('error', 'File validation failed');
        expect(response.body.validation_errors[0].message).toContain('array');
      } finally {
        cleanupTestFile(testFilePath);
      }
    });

    it('should reject categories with missing required fields', async () => {
      const categoriesWithMissingFields = JSON.stringify([
        {
          name: 'Restaurants',
          // Missing slug
          description: 'Food establishments',
        },
        {
          // Missing name
          slug: 'shopping',
          description: 'Retail stores',
        },
      ]);

      const testFilePath = createTestFile('missing-fields-categories.json', categoriesWithMissingFields);

      try {
        const response = await request(app)
          .post(`/api/tenants/${tenantId}/upload?type=categories`)
          .attach('file', testFilePath)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(422);
        expect(response.body).toHaveProperty('error', 'File validation failed');
        expect(response.body.validation_errors).toHaveLength(2);

        // Should have error for missing slug on line 1
        expect(response.body.validation_errors.some((e: any) =>
          e.line === 1 && e.field === 'slug'
        )).toBe(true);

        // Should have error for missing name on line 2
        expect(response.body.validation_errors.some((e: any) =>
          e.line === 2 && e.field === 'name'
        )).toBe(true);
      } finally {
        cleanupTestFile(testFilePath);
      }
    });

    it('should reject non-JSON file for categories', async () => {
      const csvContent = 'name,slug,description\nRestaurants,restaurants,Food places';
      const testFilePath = createTestFile('categories.csv', csvContent);

      try {
        const response = await request(app)
          .post(`/api/tenants/${tenantId}/upload?type=categories`)
          .attach('file', testFilePath)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('JSON file');
      } finally {
        cleanupTestFile(testFilePath);
      }
    });
  });

  describe('Listings File Validation', () => {
    beforeEach(async () => {
      // Add categories first for listings to reference
      const categories = JSON.stringify([
        { name: 'Restaurants', slug: 'restaurants' },
        { name: 'Shopping', slug: 'shopping' },
      ]);

      const categoriesFilePath = createTestFile('setup-categories.json', categories);
      await request(app)
        .post(`/api/tenants/${tenantId}/upload?type=categories`)
        .attach('file', categoriesFilePath);
      cleanupTestFile(categoriesFilePath);
    });

    it('should accept valid listings CSV file', async () => {
      const validListings = `title,category,description
"Pizza Palace","restaurants","Best pizza in town"
"Coffee Shop","restaurants","Great coffee and pastries"
"Clothing Store","shopping","Fashion for everyone"`;

      const testFilePath = createTestFile('valid-listings.csv', validListings);

      try {
        const response = await request(app)
          .post(`/api/tenants/${tenantId}/upload?type=listings`)
          .attach('file', testFilePath)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('file_id');
        expect(response.body).toHaveProperty('type', 'listings');
        expect(response.body).toHaveProperty('records_count', 3);
        expect(response.body).toHaveProperty('validation_status', 'VALID');
        expect(response.body).toHaveProperty('next_step', 'PREVIEW');
      } finally {
        cleanupTestFile(testFilePath);
      }
    });

    it('should reject empty CSV file', async () => {
      const testFilePath = createTestFile('empty-listings.csv', '');

      try {
        const response = await request(app)
          .post(`/api/tenants/${tenantId}/upload?type=listings`)
          .attach('file', testFilePath)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(422);
        expect(response.body).toHaveProperty('error', 'File validation failed');
        expect(response.body.validation_errors[0].message).toContain('empty');
      } finally {
        cleanupTestFile(testFilePath);
      }
    });

    it('should reject CSV with missing required headers', async () => {
      const missingHeadersCsv = `name,type,info
"Pizza Palace","restaurant","Great food"`;

      const testFilePath = createTestFile('missing-headers-listings.csv', missingHeadersCsv);

      try {
        const response = await request(app)
          .post(`/api/tenants/${tenantId}/upload?type=listings`)
          .attach('file', testFilePath)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(422);
        expect(response.body).toHaveProperty('error', 'File validation failed');
        expect(response.body.validation_errors[0]).toHaveProperty('field', 'headers');
        expect(response.body.validation_errors[0].message).toContain('Missing required headers');
      } finally {
        cleanupTestFile(testFilePath);
      }
    });

    it('should reject CSV with missing required field values', async () => {
      const missingValuesCsv = `title,category,description
"Pizza Palace","restaurants",""
"","restaurants","Great coffee"
"Clothing Store","","Fashion store"`;

      const testFilePath = createTestFile('missing-values-listings.csv', missingValuesCsv);

      try {
        const response = await request(app)
          .post(`/api/tenants/${tenantId}/upload?type=listings`)
          .attach('file', testFilePath)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(422);
        expect(response.body).toHaveProperty('error', 'File validation failed');
        expect(response.body.validation_errors.length).toBeGreaterThan(0);

        // Should have specific field errors
        expect(response.body.validation_errors.some((e: any) =>
          e.field === 'description' && e.line === 2
        )).toBe(true);
        expect(response.body.validation_errors.some((e: any) =>
          e.field === 'title' && e.line === 3
        )).toBe(true);
        expect(response.body.validation_errors.some((e: any) =>
          e.field === 'category' && e.line === 4
        )).toBe(true);
      } finally {
        cleanupTestFile(testFilePath);
      }
    });

    it('should reject non-CSV file for listings', async () => {
      const jsonContent = JSON.stringify([{ title: 'Pizza Palace', category: 'restaurants' }]);
      const testFilePath = createTestFile('listings.json', jsonContent);

      try {
        const response = await request(app)
          .post(`/api/tenants/${tenantId}/upload?type=listings`)
          .attach('file', testFilePath)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('CSV file');
      } finally {
        cleanupTestFile(testFilePath);
      }
    });
  });

  describe('File Size and Format Validation', () => {
    it('should reject files exceeding size limit', async () => {
      // Create a large file (simulate 11MB file)
      const largeContent = 'x'.repeat(11 * 1024 * 1024);
      const testFilePath = createTestFile('large-categories.json', largeContent);

      try {
        const response = await request(app)
          .post(`/api/tenants/${tenantId}/upload?type=categories`)
          .attach('file', testFilePath)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(413);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('File too large');
      } finally {
        cleanupTestFile(testFilePath);
      }
    });

    it('should handle binary file uploads gracefully', async () => {
      // Create a binary file (image data)
      const binaryData = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      ]);
      const testFilePath = createTestFile('image.json', binaryData);

      try {
        const response = await request(app)
          .post(`/api/tenants/${tenantId}/upload?type=categories`)
          .attach('file', testFilePath)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(422);
        expect(response.body).toHaveProperty('error', 'File validation failed');
      } finally {
        cleanupTestFile(testFilePath);
      }
    });
  });

  describe('Error Recovery and Persistence', () => {
    it('should not create partial data on validation failure', async () => {
      const invalidCategories = JSON.stringify([
        { name: 'Valid Category', slug: 'valid' },
        { name: 'Invalid Category' }, // Missing slug
      ]);

      const testFilePath = createTestFile('partial-categories.json', invalidCategories);

      try {
        const response = await request(app)
          .post(`/api/tenants/${tenantId}/upload?type=categories`)
          .attach('file', testFilePath)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(422);

        // Verify no categories were created
        const tenantResponse = await request(app).get(`/api/tenants/${tenantId}`);
        expect(tenantResponse.body.categories || []).toHaveLength(0);
      } finally {
        cleanupTestFile(testFilePath);
      }
    });

    it('should handle concurrent file uploads gracefully', async () => {
      const categories1 = JSON.stringify([
        { name: 'Category 1', slug: 'category-1' },
      ]);
      const categories2 = JSON.stringify([
        { name: 'Category 2', slug: 'category-2' },
      ]);

      const testFilePath1 = createTestFile('concurrent-categories-1.json', categories1);
      const testFilePath2 = createTestFile('concurrent-categories-2.json', categories2);

      try {
        // Upload files concurrently
        const [response1, response2] = await Promise.all([
          request(app)
            .post(`/api/tenants/${tenantId}/upload?type=categories`)
            .attach('file', testFilePath1),
          request(app)
            .post(`/api/tenants/${tenantId}/upload?type=categories`)
            .attach('file', testFilePath2),
        ]);

        // Both should succeed or at least handle gracefully
        expect([200, 201, 409].includes(response1.status)).toBe(true);
        expect([200, 201, 409].includes(response2.status)).toBe(true);
      } finally {
        cleanupTestFile(testFilePath1);
        cleanupTestFile(testFilePath2);
      }
    });

    it('should provide detailed error messages for debugging', async () => {
      const categoriesWithMultipleErrors = JSON.stringify([
        { name: '', slug: 'empty-name' }, // Empty name
        { name: 'Valid Name' }, // Missing slug
        { slug: 'no-name' }, // Missing name
      ]);

      const testFilePath = createTestFile('multiple-errors-categories.json', categoriesWithMultipleErrors);

      try {
        const response = await request(app)
          .post(`/api/tenants/${tenantId}/upload?type=categories`)
          .attach('file', testFilePath)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(422);
        expect(response.body.validation_errors).toHaveLength(3);

        // Verify each error has required properties
        response.body.validation_errors.forEach((error: any) => {
          expect(error).toHaveProperty('line');
          expect(error).toHaveProperty('field');
          expect(error).toHaveProperty('message');
          expect(typeof error.line).toBe('number');
          expect(typeof error.field).toBe('string');
          expect(typeof error.message).toBe('string');
          expect(error.line).toBeGreaterThan(0);
        });
      } finally {
        cleanupTestFile(testFilePath);
      }
    });
  });

  describe('UTF-8 and Character Encoding', () => {
    it('should handle UTF-8 characters correctly in categories', async () => {
      const categoriesWithUtf8 = JSON.stringify([
        {
          name: 'Café & Restaurants',
          slug: 'cafe-restaurants',
          description: 'Cafés, brasseries, and fine dining establishments',
        },
        {
          name: '购物中心',
          slug: 'shopping-centers',
          description: 'Shopping centers and retail stores',
        },
      ]);

      const testFilePath = createTestFile('utf8-categories.json', categoriesWithUtf8);

      try {
        const response = await request(app)
          .post(`/api/tenants/${tenantId}/upload?type=categories`)
          .attach('file', testFilePath)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body.validation_status).toBe('VALID');
      } finally {
        cleanupTestFile(testFilePath);
      }
    });

    it('should handle UTF-8 characters correctly in listings CSV', async () => {
      // First add categories
      const categories = JSON.stringify([{ name: 'Restaurants', slug: 'restaurants' }]);
      const categoriesFilePath = createTestFile('setup-utf8-categories.json', categories);
      await request(app)
        .post(`/api/tenants/${tenantId}/upload?type=categories`)
        .attach('file', categoriesFilePath);
      cleanupTestFile(categoriesFilePath);

      const listingsWithUtf8 = `title,category,description
"Café Pierre","restaurants","Authentic French café with crêpes"
"北京饭店","restaurants","Traditional Chinese restaurant"
"José's Tacos","restaurants","Authentic Mexican food with jalapeños"`;

      const testFilePath = createTestFile('utf8-listings.csv', listingsWithUtf8);

      try {
        const response = await request(app)
          .post(`/api/tenants/${tenantId}/upload?type=listings`)
          .attach('file', testFilePath)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body.validation_status).toBe('VALID');
      } finally {
        cleanupTestFile(testFilePath);
      }
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle very large number of records', async () => {
      // Create a large categories file with 1000+ entries
      const largeCategories = Array.from({ length: 1000 }, (_, i) => ({
        name: `Category ${i + 1}`,
        slug: `category-${i + 1}`,
        description: `Description for category ${i + 1}`,
      }));

      const testFilePath = createTestFile('large-categories.json', JSON.stringify(largeCategories));

      try {
        const response = await request(app)
          .post(`/api/tenants/${tenantId}/upload?type=categories`)
          .attach('file', testFilePath)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body.records_count).toBe(1000);
        expect(response.body.validation_status).toBe('VALID');
      } finally {
        cleanupTestFile(testFilePath);
      }
    });

    it('should handle CSV with different line endings', async () => {
      // First add categories
      const categories = JSON.stringify([{ name: 'Test', slug: 'test' }]);
      const categoriesFilePath = createTestFile('line-endings-categories.json', categories);
      await request(app)
        .post(`/api/tenants/${tenantId}/upload?type=categories`)
        .attach('file', categoriesFilePath);
      cleanupTestFile(categoriesFilePath);

      // Test with Windows line endings (\r\n)
      const csvWithCRLF = 'title,category,description\r\n"Test Business","test","A test business"\r\n';
      const testFilePath = createTestFile('crlf-listings.csv', csvWithCRLF);

      try {
        const response = await request(app)
          .post(`/api/tenants/${tenantId}/upload?type=listings`)
          .attach('file', testFilePath)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body.validation_status).toBe('VALID');
      } finally {
        cleanupTestFile(testFilePath);
      }
    });
  });
});