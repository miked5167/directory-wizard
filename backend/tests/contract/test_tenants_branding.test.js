"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const path_1 = __importDefault(require("path"));
const index_1 = __importDefault(require("../../src/index"));
describe('PUT /api/tenants/:id/branding - Contract Tests', () => {
    const mockTenantId = '123e4567-e89b-12d3-a456-426614174000';
    describe('Request Schema Validation', () => {
        it('should accept valid branding configuration with logo', async () => {
            const logoPath = path_1.default.join(__dirname, '../fixtures/test-logo.png');
            const response = await (0, supertest_1.default)(index_1.default)
                .put(`/api/tenants/${mockTenantId}/branding`)
                .field('primary_color', '#3B82F6')
                .field('secondary_color', '#1E40AF')
                .field('accent_color', '#F59E0B')
                .field('font_family', 'Inter')
                .attach('logo', logoPath)
                .expect('Content-Type', /json/);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('tenant_id', mockTenantId);
            expect(response.body).toHaveProperty('branding');
            expect(response.body.branding).toHaveProperty('logo_url');
            expect(response.body.branding).toHaveProperty('primary_color', '#3B82F6');
            expect(response.body.branding).toHaveProperty('secondary_color', '#1E40AF');
            expect(response.body.branding).toHaveProperty('accent_color', '#F59E0B');
            expect(response.body.branding).toHaveProperty('font_family', 'Inter');
            expect(response.body).toHaveProperty('next_step', 'CATEGORIES');
        });
        it('should accept valid branding without logo', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .put(`/api/tenants/${mockTenantId}/branding`)
                .field('primary_color', '#E53E3E')
                .field('secondary_color', '#C53030')
                .field('accent_color', '#FBD38D')
                .field('font_family', 'Roboto')
                .expect('Content-Type', /json/);
            expect(response.status).toBe(200);
            expect(response.body.branding.logo_url).toBeNull();
        });
        it('should accept custom font upload', async () => {
            const fontPath = path_1.default.join(__dirname, '../fixtures/custom-font.woff2');
            const response = await (0, supertest_1.default)(index_1.default)
                .put(`/api/tenants/${mockTenantId}/branding`)
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
            const response = await (0, supertest_1.default)(index_1.default)
                .put(`/api/tenants/${mockTenantId}/branding`)
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
            const response = await (0, supertest_1.default)(index_1.default)
                .put(`/api/tenants/${mockTenantId}/branding`)
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
            const invalidFile = path_1.default.join(__dirname, '../fixtures/test-document.pdf');
            const response = await (0, supertest_1.default)(index_1.default)
                .put(`/api/tenants/${mockTenantId}/branding`)
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
            const response = await (0, supertest_1.default)(index_1.default)
                .put(`/api/tenants/${mockTenantId}/branding`)
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
            const response = await (0, supertest_1.default)(index_1.default)
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
            const response = await (0, supertest_1.default)(index_1.default)
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
            const response = await (0, supertest_1.default)(index_1.default)
                .put(`/api/tenants/${mockTenantId}/branding`)
                .field('primary_color', '#3B82F6')
                .field('secondary_color', '#1E40AF')
                .field('accent_color', '#F59E0B')
                .field('font_family', 'Inter')
                .expect(200);
            expect(response.body).toEqual(expect.objectContaining({
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
            }));
        });
    });
});
//# sourceMappingURL=test_tenants_branding.test.js.map