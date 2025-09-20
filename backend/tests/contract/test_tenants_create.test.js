"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = __importDefault(require("../../src/index"));
describe('POST /api/tenants - Contract Tests', () => {
    describe('Request Schema Validation', () => {
        it('should accept valid tenant creation request', async () => {
            const validPayload = {
                name: 'Local Restaurant Directory',
                domain: 'restaurants-downtown',
                description: 'A comprehensive directory of local restaurants',
            };
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/tenants')
                .send(validPayload)
                .expect('Content-Type', /json/);
            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('name', validPayload.name);
            expect(response.body).toHaveProperty('domain', validPayload.domain);
            expect(response.body).toHaveProperty('status', 'DRAFT');
            expect(response.body).toHaveProperty('session_id');
            expect(response.body).toHaveProperty('next_step', 'BRANDING');
        });
        it('should reject request missing required name field', async () => {
            const invalidPayload = {
                domain: 'test-domain',
            };
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/tenants')
                .send(invalidPayload)
                .expect('Content-Type', /json/);
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('name');
        });
        it('should reject request missing required domain field', async () => {
            const invalidPayload = {
                name: 'Test Directory',
            };
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/tenants')
                .send(invalidPayload)
                .expect('Content-Type', /json/);
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('domain');
        });
        it('should reject invalid domain format', async () => {
            const invalidPayload = {
                name: 'Test Directory',
                domain: 'Invalid Domain!',
            };
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/tenants')
                .send(invalidPayload)
                .expect('Content-Type', /json/);
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('domain');
        });
        it('should reject name that is too short', async () => {
            const invalidPayload = {
                name: 'AB',
                domain: 'test-domain',
            };
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/tenants')
                .send(invalidPayload)
                .expect('Content-Type', /json/);
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('name');
        });
        it('should reject name that is too long', async () => {
            const invalidPayload = {
                name: 'A'.repeat(101),
                domain: 'test-domain',
            };
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/tenants')
                .send(invalidPayload)
                .expect('Content-Type', /json/);
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('name');
        });
    });
    describe('Business Logic Validation', () => {
        it('should reject duplicate domain', async () => {
            const payload = {
                name: 'Test Directory',
                domain: 'existing-domain',
            };
            await (0, supertest_1.default)(index_1.default)
                .post('/api/tenants')
                .send(payload)
                .expect(201);
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/tenants')
                .send(payload)
                .expect('Content-Type', /json/);
            expect(response.status).toBe(409);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('domain');
            expect(response.body.error).toContain('exists');
        });
    });
    describe('Response Schema Validation', () => {
        it('should return tenant object with correct schema', async () => {
            const payload = {
                name: 'Schema Test Directory',
                domain: 'schema-test',
            };
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/tenants')
                .send(payload)
                .expect(201);
            expect(response.body).toEqual(expect.objectContaining({
                id: expect.any(String),
                name: expect.any(String),
                domain: expect.any(String),
                status: expect.stringMatching(/^(DRAFT|PREVIEW|PUBLISHED|UPDATING|FAILED)$/),
                session_id: expect.any(String),
                next_step: expect.stringMatching(/^(BRANDING|CATEGORIES|LISTINGS|PREVIEW|PUBLISH)$/),
            }));
            expect(response.body.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
            expect(response.body.session_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        });
    });
});
//# sourceMappingURL=test_tenants_create.test.js.map