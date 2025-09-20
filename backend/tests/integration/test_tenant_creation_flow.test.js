"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const path_1 = __importDefault(require("path"));
const index_1 = __importDefault(require("../../src/index"));
describe('Integration: Complete Tenant Creation Flow', () => {
    let tenantId;
    let sessionId;
    describe('End-to-End Wizard Flow', () => {
        it('should complete full tenant creation from start to published', async () => {
            const createResponse = await (0, supertest_1.default)(index_1.default)
                .post('/api/tenants')
                .send({
                name: 'Integration Test Directory',
                domain: 'integration-test',
                description: 'Full integration test directory',
            });
            expect(createResponse.status).toBe(201);
            expect(createResponse.body).toHaveProperty('id');
            expect(createResponse.body).toHaveProperty('session_id');
            tenantId = createResponse.body.id;
            sessionId = createResponse.body.session_id;
            const brandingResponse = await (0, supertest_1.default)(index_1.default)
                .put(`/api/tenants/${tenantId}/branding`)
                .field('primary_color', '#3B82F6')
                .field('secondary_color', '#1E40AF')
                .field('accent_color', '#F59E0B')
                .field('font_family', 'Inter');
            expect(brandingResponse.status).toBe(200);
            expect(brandingResponse.body).toHaveProperty('branding');
            expect(brandingResponse.body.next_step).toBe('CATEGORIES');
            const categoriesPath = path_1.default.join(__dirname, '../fixtures/categories.json');
            const categoriesResponse = await (0, supertest_1.default)(index_1.default)
                .post(`/api/tenants/${tenantId}/upload?type=categories`)
                .attach('file', categoriesPath);
            expect(categoriesResponse.status).toBe(200);
            expect(categoriesResponse.body.validation_status).toBe('VALID');
            expect(categoriesResponse.body.next_step).toBe('LISTINGS');
            const listingsPath = path_1.default.join(__dirname, '../fixtures/listings.csv');
            const listingsResponse = await (0, supertest_1.default)(index_1.default)
                .post(`/api/tenants/${tenantId}/upload?type=listings`)
                .attach('file', listingsPath);
            expect(listingsResponse.status).toBe(200);
            expect(listingsResponse.body.validation_status).toBe('VALID');
            expect(listingsResponse.body.next_step).toBe('PREVIEW');
            const previewResponse = await (0, supertest_1.default)(index_1.default)
                .get(`/api/tenants/${tenantId}/preview`);
            expect(previewResponse.status).toBe(200);
            expect(previewResponse.body).toHaveProperty('preview_url');
            expect(previewResponse.body).toHaveProperty('statistics');
            expect(previewResponse.body.statistics.categories_count).toBeGreaterThan(0);
            expect(previewResponse.body.statistics.listings_count).toBeGreaterThan(0);
            const publishResponse = await (0, supertest_1.default)(index_1.default)
                .post(`/api/tenants/${tenantId}/publish`);
            expect(publishResponse.status).toBe(202);
            expect(publishResponse.body).toHaveProperty('job_id');
            expect(publishResponse.body.status).toBe('QUEUED');
            const jobId = publishResponse.body.job_id;
            let jobComplete = false;
            let attempts = 0;
            const maxAttempts = 10;
            while (!jobComplete && attempts < maxAttempts) {
                const jobResponse = await (0, supertest_1.default)(index_1.default)
                    .get(`/api/tenants/${tenantId}/jobs/${jobId}`);
                expect(jobResponse.status).toBe(200);
                expect(jobResponse.body).toHaveProperty('status');
                expect(jobResponse.body).toHaveProperty('progress');
                if (jobResponse.body.status === 'COMPLETED') {
                    jobComplete = true;
                    expect(jobResponse.body.progress).toBe(100);
                }
                else if (jobResponse.body.status === 'FAILED') {
                    fail(`Publishing job failed: ${jobResponse.body.error_message}`);
                }
                attempts++;
                if (!jobComplete && attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            expect(jobComplete).toBe(true);
            const finalTenantResponse = await (0, supertest_1.default)(index_1.default)
                .get(`/api/tenants/${tenantId}`);
            expect(finalTenantResponse.status).toBe(200);
            expect(finalTenantResponse.body.status).toBe('PUBLISHED');
            expect(finalTenantResponse.body).toHaveProperty('published_at');
        });
        it('should handle wizard session recovery after interruption', async () => {
            const createResponse = await (0, supertest_1.default)(index_1.default)
                .post('/api/tenants')
                .send({
                name: 'Session Recovery Test',
                domain: 'session-recovery',
            });
            expect(createResponse.status).toBe(201);
            tenantId = createResponse.body.id;
            sessionId = createResponse.body.session_id;
            await (0, supertest_1.default)(index_1.default)
                .put(`/api/tenants/${tenantId}/branding`)
                .field('primary_color', '#3B82F6')
                .field('secondary_color', '#1E40AF')
                .field('accent_color', '#F59E0B')
                .field('font_family', 'Inter');
            const tenantResponse = await (0, supertest_1.default)(index_1.default)
                .get(`/api/tenants/${tenantId}`);
            expect(tenantResponse.status).toBe(200);
            expect(tenantResponse.body.status).toBe('DRAFT');
            expect(tenantResponse.body).toHaveProperty('branding');
            const categoriesPath = path_1.default.join(__dirname, '../fixtures/categories.json');
            const categoriesResponse = await (0, supertest_1.default)(index_1.default)
                .post(`/api/tenants/${tenantId}/upload?type=categories`)
                .attach('file', categoriesPath);
            expect(categoriesResponse.status).toBe(200);
        });
        it('should validate data consistency across all steps', async () => {
            const tenantData = {
                name: 'Consistency Test Directory',
                domain: 'consistency-test',
                description: 'Testing data consistency',
            };
            const createResponse = await (0, supertest_1.default)(index_1.default)
                .post('/api/tenants')
                .send(tenantData);
            expect(createResponse.status).toBe(201);
            tenantId = createResponse.body.id;
            const brandingData = {
                primary_color: '#E53E3E',
                secondary_color: '#C53030',
                accent_color: '#FBD38D',
                font_family: 'Roboto',
            };
            await (0, supertest_1.default)(index_1.default)
                .put(`/api/tenants/${tenantId}/branding`)
                .field('primary_color', brandingData.primary_color)
                .field('secondary_color', brandingData.secondary_color)
                .field('accent_color', brandingData.accent_color)
                .field('font_family', brandingData.font_family);
            const categoriesPath = path_1.default.join(__dirname, '../fixtures/categories.json');
            const categoriesResponse = await (0, supertest_1.default)(index_1.default)
                .post(`/api/tenants/${tenantId}/upload?type=categories`)
                .attach('file', categoriesPath);
            expect(categoriesResponse.body.records_count).toBe(2);
            const listingsPath = path_1.default.join(__dirname, '../fixtures/listings.csv');
            const listingsResponse = await (0, supertest_1.default)(index_1.default)
                .post(`/api/tenants/${tenantId}/upload?type=listings`)
                .attach('file', listingsPath);
            expect(listingsResponse.body.records_count).toBe(4);
            const previewResponse = await (0, supertest_1.default)(index_1.default)
                .get(`/api/tenants/${tenantId}/preview`);
            expect(previewResponse.body.statistics).toEqual({
                categories_count: 2,
                listings_count: 4,
                media_files_count: 0,
            });
            const tenantResponse = await (0, supertest_1.default)(index_1.default)
                .get(`/api/tenants/${tenantId}`);
            expect(tenantResponse.body.name).toBe(tenantData.name);
            expect(tenantResponse.body.domain).toBe(tenantData.domain);
            expect(tenantResponse.body.branding.primary_color).toBe(brandingData.primary_color);
            expect(tenantResponse.body.branding.font_family).toBe(brandingData.font_family);
        });
    });
    describe('Error Recovery and Rollback', () => {
        it('should rollback tenant creation if external service provisioning fails', async () => {
            const createResponse = await (0, supertest_1.default)(index_1.default)
                .post('/api/tenants')
                .send({
                name: 'Failure Test Directory',
                domain: 'failure-test',
            });
            expect(createResponse.status).toBe(201);
            tenantId = createResponse.body.id;
            await (0, supertest_1.default)(index_1.default)
                .put(`/api/tenants/${tenantId}/branding`)
                .field('primary_color', '#3B82F6')
                .field('secondary_color', '#1E40AF')
                .field('accent_color', '#F59E0B')
                .field('font_family', 'Inter');
            const categoriesPath = path_1.default.join(__dirname, '../fixtures/categories.json');
            await (0, supertest_1.default)(index_1.default)
                .post(`/api/tenants/${tenantId}/upload?type=categories`)
                .attach('file', categoriesPath);
            const listingsPath = path_1.default.join(__dirname, '../fixtures/listings.csv');
            await (0, supertest_1.default)(index_1.default)
                .post(`/api/tenants/${tenantId}/upload?type=listings`)
                .attach('file', listingsPath);
            const publishResponse = await (0, supertest_1.default)(index_1.default)
                .post(`/api/tenants/${tenantId}/publish`);
            expect(publishResponse.status).toBe(202);
            const jobId = publishResponse.body.job_id;
            let jobFailed = false;
            let attempts = 0;
            while (!jobFailed && attempts < 10) {
                const jobResponse = await (0, supertest_1.default)(index_1.default)
                    .get(`/api/tenants/${tenantId}/jobs/${jobId}`);
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
            const tenantResponse = await (0, supertest_1.default)(index_1.default)
                .get(`/api/tenants/${tenantId}`);
            expect(tenantResponse.body.status).toBe('FAILED');
        });
        it('should handle partial file uploads gracefully', async () => {
            const createResponse = await (0, supertest_1.default)(index_1.default)
                .post('/api/tenants')
                .send({
                name: 'Partial Upload Test',
                domain: 'partial-upload',
            });
            tenantId = createResponse.body.id;
            const incompleteJsonPath = path_1.default.join(__dirname, '../fixtures/incomplete.json');
            const fs = require('fs');
            fs.writeFileSync(incompleteJsonPath, '{"incomplete": "json"');
            const uploadResponse = await (0, supertest_1.default)(index_1.default)
                .post(`/api/tenants/${tenantId}/upload?type=categories`)
                .attach('file', incompleteJsonPath);
            expect(uploadResponse.status).toBe(422);
            expect(uploadResponse.body).toHaveProperty('validation_errors');
            const tenantResponse = await (0, supertest_1.default)(index_1.default)
                .get(`/api/tenants/${tenantId}`);
            expect(tenantResponse.body.status).toBe('DRAFT');
            const categoriesPath = path_1.default.join(__dirname, '../fixtures/categories.json');
            const retryResponse = await (0, supertest_1.default)(index_1.default)
                .post(`/api/tenants/${tenantId}/upload?type=categories`)
                .attach('file', categoriesPath);
            expect(retryResponse.status).toBe(200);
            fs.unlinkSync(incompleteJsonPath);
        });
    });
    afterEach(async () => {
        if (tenantId) {
            await (0, supertest_1.default)(index_1.default).delete(`/api/tenants/${tenantId}`);
        }
    });
});
//# sourceMappingURL=test_tenant_creation_flow.test.js.map