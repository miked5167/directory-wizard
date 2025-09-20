"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const path_1 = __importDefault(require("path"));
const index_1 = __importDefault(require("../../src/index"));
describe('POST /api/tenants/:id/upload - Contract Tests', () => {
    const mockTenantId = '123e4567-e89b-12d3-a456-426614174000';
    describe('Categories Upload', () => {
        it('should accept valid categories JSON file', async () => {
            const categoriesPath = path_1.default.join(__dirname, '../fixtures/categories.json');
            const response = await (0, supertest_1.default)(index_1.default)
                .post(`/api/tenants/${mockTenantId}/upload?type=categories`)
                .attach('file', categoriesPath)
                .expect('Content-Type', /json/);
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
            const invalidJsonPath = path_1.default.join(__dirname, '../fixtures/invalid.json');
            const fs = require('fs');
            fs.writeFileSync(invalidJsonPath, '{ invalid json }');
            const response = await (0, supertest_1.default)(index_1.default)
                .post(`/api/tenants/${mockTenantId}/upload?type=categories`)
                .attach('file', invalidJsonPath)
                .expect('Content-Type', /json/);
            expect(response.status).toBe(422);
            expect(response.body).toHaveProperty('error');
            expect(response.body).toHaveProperty('validation_errors');
            expect(response.body.validation_errors).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    line: expect.any(Number),
                    field: expect.any(String),
                    message: expect.stringContaining('JSON'),
                }),
            ]));
            fs.unlinkSync(invalidJsonPath);
        });
        it('should reject categories with missing required fields', async () => {
            const invalidCategoriesPath = path_1.default.join(__dirname, '../fixtures/invalid-categories.json');
            const fs = require('fs');
            const invalidCategories = [
                {
                    name: 'Valid Category',
                    slug: 'valid',
                },
                {
                    slug: 'invalid',
                },
            ];
            fs.writeFileSync(invalidCategoriesPath, JSON.stringify(invalidCategories));
            const response = await (0, supertest_1.default)(index_1.default)
                .post(`/api/tenants/${mockTenantId}/upload?type=categories`)
                .attach('file', invalidCategoriesPath)
                .expect('Content-Type', /json/);
            expect(response.status).toBe(422);
            expect(response.body.validation_errors).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    line: 2,
                    field: 'name',
                    message: expect.stringContaining('required'),
                }),
            ]));
            fs.unlinkSync(invalidCategoriesPath);
        });
    });
    describe('Listings Upload', () => {
        it('should accept valid listings CSV file', async () => {
            const listingsPath = path_1.default.join(__dirname, '../fixtures/listings.csv');
            const response = await (0, supertest_1.default)(index_1.default)
                .post(`/api/tenants/${mockTenantId}/upload?type=listings`)
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
            const invalidCsvPath = path_1.default.join(__dirname, '../fixtures/invalid-headers.csv');
            const fs = require('fs');
            const invalidCsv = 'wrong_header,another_wrong\nvalue1,value2';
            fs.writeFileSync(invalidCsvPath, invalidCsv);
            const response = await (0, supertest_1.default)(index_1.default)
                .post(`/api/tenants/${mockTenantId}/upload?type=listings`)
                .attach('file', invalidCsvPath)
                .expect('Content-Type', /json/);
            expect(response.status).toBe(422);
            expect(response.body.validation_errors).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    line: 1,
                    field: 'headers',
                    message: expect.stringContaining('title'),
                }),
            ]));
            fs.unlinkSync(invalidCsvPath);
        });
        it('should reject listings with missing required fields', async () => {
            const invalidListingsPath = path_1.default.join(__dirname, '../fixtures/invalid-listings.csv');
            const fs = require('fs');
            const invalidCsv = 'title,category,description\n,restaurants,Missing title\nValid Title,,Missing category';
            fs.writeFileSync(invalidListingsPath, invalidCsv);
            const response = await (0, supertest_1.default)(index_1.default)
                .post(`/api/tenants/${mockTenantId}/upload?type=listings`)
                .attach('file', invalidListingsPath)
                .expect('Content-Type', /json/);
            expect(response.status).toBe(422);
            expect(response.body.validation_errors).toEqual(expect.arrayContaining([
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
            ]));
            fs.unlinkSync(invalidListingsPath);
        });
    });
    describe('File Size and Type Validation', () => {
        it('should reject files that are too large', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .post(`/api/tenants/${mockTenantId}/upload?type=categories`)
                .attach('file', Buffer.alloc(11 * 1024 * 1024), 'large-file.json')
                .expect('Content-Type', /json/);
            expect(response.status).toBe(413);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('file size');
        });
        it('should reject invalid file types', async () => {
            const textFilePath = path_1.default.join(__dirname, '../fixtures/test.txt');
            const fs = require('fs');
            fs.writeFileSync(textFilePath, 'This is not JSON or CSV');
            const response = await (0, supertest_1.default)(index_1.default)
                .post(`/api/tenants/${mockTenantId}/upload?type=categories`)
                .attach('file', textFilePath)
                .expect('Content-Type', /json/);
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('file type');
            fs.unlinkSync(textFilePath);
        });
    });
    describe('Query Parameter Validation', () => {
        it('should reject missing type parameter', async () => {
            const categoriesPath = path_1.default.join(__dirname, '../fixtures/categories.json');
            const response = await (0, supertest_1.default)(index_1.default)
                .post(`/api/tenants/${mockTenantId}/upload`)
                .attach('file', categoriesPath)
                .expect('Content-Type', /json/);
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('type');
        });
        it('should reject invalid type parameter', async () => {
            const categoriesPath = path_1.default.join(__dirname, '../fixtures/categories.json');
            const response = await (0, supertest_1.default)(index_1.default)
                .post(`/api/tenants/${mockTenantId}/upload?type=invalid`)
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
            const categoriesPath = path_1.default.join(__dirname, '../fixtures/categories.json');
            const response = await (0, supertest_1.default)(index_1.default)
                .post(`/api/tenants/${nonExistentId}/upload?type=categories`)
                .attach('file', categoriesPath)
                .expect('Content-Type', /json/);
            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('tenant');
        });
    });
});
//# sourceMappingURL=test_tenants_upload.test.js.map