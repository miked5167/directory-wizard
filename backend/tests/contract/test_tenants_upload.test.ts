import request from 'supertest';
import path from 'path';
import app from '../../src/index';

describe('POST /api/tenants/:id/upload - Contract Tests', () => {
  let testTenantId: string;

  beforeEach(async () => {
    // Create a tenant for testing upload endpoints
    const tenantResponse = await request(app)
      .post('/api/tenants')
      .send({
        name: 'Test Tenant',
        domain: `test-upload-tenant-${Date.now()}`,
      })
      .expect(201);

    testTenantId = tenantResponse.body.id;
  });

  describe('Categories Upload', () => {
    it('should accept valid categories JSON file', async () => {
      const categoriesPath = path.join(__dirname, '../fixtures/categories.json');

      const response = await request(app)
        .post(`/api/tenants/${testTenantId}/upload?type=categories`)
        .attach('file', categoriesPath)
        .expect('Content-Type', /json/);

      // This test MUST FAIL until we implement the endpoint
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('file_id');
      expect(response.body).toHaveProperty('type', 'categories');
      expect(response.body).toHaveProperty('filename', 'categories.json');
      expect(response.body).toHaveProperty('records_count');
      expect(response.body.records_count).toBeGreaterThan(0);
      expect(response.body).toHaveProperty('validation_status', 'VALID');
      expect(response.body).toHaveProperty('next_step', 'LISTINGS');
    });

    it('should reject invalid JSON format', async () => {
      const invalidJsonPath = path.join(__dirname, '../fixtures/invalid.json');

      // Create invalid JSON file for test
      const fs = require('fs');
      fs.writeFileSync(invalidJsonPath, '{ invalid json }');

      const response = await request(app)
        .post(`/api/tenants/${testTenantId}/upload?type=categories`)
        .attach('file', invalidJsonPath)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(422);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('validation_errors');
      expect(response.body.validation_errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            line: expect.any(Number),
            field: expect.any(String),
            message: expect.stringContaining('JSON'),
          }),
        ])
      );

      // Cleanup
      fs.unlinkSync(invalidJsonPath);
    });

    it('should reject categories with missing required fields', async () => {
      const invalidCategoriesPath = path.join(__dirname, '../fixtures/invalid-categories.json');

      // Create invalid categories file
      const fs = require('fs');
      const invalidCategories = [
        {
          name: 'Valid Category',
          slug: 'valid',
        },
        {
          // Missing name field
          slug: 'invalid',
        },
      ];
      fs.writeFileSync(invalidCategoriesPath, JSON.stringify(invalidCategories));

      const response = await request(app)
        .post(`/api/tenants/${testTenantId}/upload?type=categories`)
        .attach('file', invalidCategoriesPath)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(422);
      expect(response.body.validation_errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            line: 2,
            field: 'name',
            message: expect.stringContaining('required'),
          }),
        ])
      );

      // Cleanup
      fs.unlinkSync(invalidCategoriesPath);
    });
  });

  describe('Listings Upload', () => {
    it('should accept valid listings CSV file', async () => {
      const listingsPath = path.join(__dirname, '../fixtures/listings.csv');

      const response = await request(app)
        .post(`/api/tenants/${testTenantId}/upload?type=listings`)
        .attach('file', listingsPath)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('file_id');
      expect(response.body).toHaveProperty('type', 'listings');
      expect(response.body).toHaveProperty('filename', 'listings.csv');
      expect(response.body).toHaveProperty('records_count');
      expect(response.body.records_count).toBeGreaterThan(0);
      expect(response.body).toHaveProperty('validation_status', 'VALID');
      expect(response.body).toHaveProperty('next_step', 'PREVIEW');
    });

    it('should reject CSV with invalid headers', async () => {
      const invalidCsvPath = path.join(__dirname, '../fixtures/invalid-headers.csv');

      // Create CSV with invalid headers
      const fs = require('fs');
      const invalidCsv = 'wrong_header,another_wrong\nvalue1,value2';
      fs.writeFileSync(invalidCsvPath, invalidCsv);

      const response = await request(app)
        .post(`/api/tenants/${testTenantId}/upload?type=listings`)
        .attach('file', invalidCsvPath)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(422);
      expect(response.body.validation_errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            line: 1,
            field: 'headers',
            message: expect.stringContaining('title'),
          }),
        ])
      );

      // Cleanup
      fs.unlinkSync(invalidCsvPath);
    });

    it('should reject listings with missing required fields', async () => {
      const invalidListingsPath = path.join(__dirname, '../fixtures/invalid-listings.csv');

      // Create CSV with missing required fields
      const fs = require('fs');
      const invalidCsv =
        'title,category,description\n,restaurants,Missing title\nValid Title,,Missing category';
      fs.writeFileSync(invalidListingsPath, invalidCsv);

      const response = await request(app)
        .post(`/api/tenants/${testTenantId}/upload?type=listings`)
        .attach('file', invalidListingsPath)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(422);
      expect(response.body.validation_errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            line: 2,
            field: 'title',
            message: expect.stringContaining('required'),
          }),
          expect.objectContaining({
            line: 3,
            field: 'category',
            message: expect.stringContaining('required'),
          }),
        ])
      );

      // Cleanup
      fs.unlinkSync(invalidListingsPath);
    });
  });

  describe('File Size and Type Validation', () => {
    it('should reject files that are too large', async () => {
      // This would require creating a large file for testing
      // For now, we'll test the validation logic
      const response = await request(app)
        .post(`/api/tenants/${testTenantId}/upload?type=categories`)
        .attach('file', Buffer.alloc(11 * 1024 * 1024), 'large-file.json') // 11MB
        .expect('Content-Type', /json/);

      expect(response.status).toBe(413);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('file size');
    });

    it('should reject invalid file types', async () => {
      const textFilePath = path.join(__dirname, '../fixtures/test.txt');

      // Create a text file
      const fs = require('fs');
      fs.writeFileSync(textFilePath, 'This is not JSON or CSV');

      const response = await request(app)
        .post(`/api/tenants/${testTenantId}/upload?type=categories`)
        .attach('file', textFilePath)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('file type');

      // Cleanup
      fs.unlinkSync(textFilePath);
    });
  });

  describe('Query Parameter Validation', () => {
    it('should reject missing type parameter', async () => {
      const categoriesPath = path.join(__dirname, '../fixtures/categories.json');

      const response = await request(app)
        .post(`/api/tenants/${testTenantId}/upload`)
        .attach('file', categoriesPath)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('type');
    });

    it('should reject invalid type parameter', async () => {
      const categoriesPath = path.join(__dirname, '../fixtures/categories.json');

      const response = await request(app)
        .post(`/api/tenants/${testTenantId}/upload?type=invalid`)
        .attach('file', categoriesPath)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('type');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent tenant', async () => {
      const nonExistentId = '999e4567-e89b-12d3-a456-426614174999';
      const categoriesPath = path.join(__dirname, '../fixtures/categories.json');

      const response = await request(app)
        .post(`/api/tenants/${nonExistentId}/upload?type=categories`)
        .attach('file', categoriesPath)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('tenant');
    });
  });
});
