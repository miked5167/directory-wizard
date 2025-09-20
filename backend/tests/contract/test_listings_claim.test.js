"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = __importDefault(require("../../src/index"));
describe('POST /api/listings/:id/claim - Contract Tests', () => {
    const mockListingId = '123e4567-e89b-12d3-a456-426614174000';
    const mockJwtToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
    describe('Authentication', () => {
        it('should reject request without authentication token', async () => {
            const payload = {
                claim_method: 'EMAIL_VERIFICATION',
                verification_data: {
                    email: 'owner@business.com',
                    business_name: 'Test Business',
                },
            };
            const response = await (0, supertest_1.default)(index_1.default)
                .post(`/api/listings/${mockListingId}/claim`)
                .send(payload)
                .expect('Content-Type', /json/);
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('authentication');
        });
        it('should reject request with invalid authentication token', async () => {
            const payload = {
                claim_method: 'EMAIL_VERIFICATION',
                verification_data: {
                    email: 'owner@business.com',
                    business_name: 'Test Business',
                },
            };
            const response = await (0, supertest_1.default)(index_1.default)
                .post(`/api/listings/${mockListingId}/claim`)
                .set('Authorization', 'Bearer invalid-token')
                .send(payload)
                .expect('Content-Type', /json/);
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('token');
        });
    });
    describe('Request Schema Validation', () => {
        it('should accept valid email verification claim request', async () => {
            const validPayload = {
                claim_method: 'EMAIL_VERIFICATION',
                verification_data: {
                    email: 'owner@business.com',
                    business_name: 'Test Business LLC',
                },
            };
            const response = await (0, supertest_1.default)(index_1.default)
                .post(`/api/listings/${mockListingId}/claim`)
                .set('Authorization', mockJwtToken)
                .send(validPayload)
                .expect('Content-Type', /json/);
            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('claim_id');
            expect(response.body).toHaveProperty('status', 'PENDING');
            expect(response.body).toHaveProperty('expires_at');
            expect(response.body).toHaveProperty('next_steps');
            expect(Array.isArray(response.body.next_steps)).toBe(true);
            expect(response.body.claim_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
            const expiresAt = new Date(response.body.expires_at);
            expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
        });
        it('should accept valid phone verification claim request', async () => {
            const validPayload = {
                claim_method: 'PHONE_VERIFICATION',
                verification_data: {
                    phone: '+1-555-0123',
                    business_name: 'Test Business LLC',
                },
            };
            const response = await (0, supertest_1.default)(index_1.default)
                .post(`/api/listings/${mockListingId}/claim`)
                .set('Authorization', mockJwtToken)
                .send(validPayload)
                .expect('Content-Type', /json/);
            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('claim_id');
            expect(response.body).toHaveProperty('status', 'PENDING');
        });
        it('should accept valid document upload claim request', async () => {
            const validPayload = {
                claim_method: 'DOCUMENT_UPLOAD',
                verification_data: {
                    business_name: 'Test Business LLC',
                    document_type: 'business_license',
                },
            };
            const response = await (0, supertest_1.default)(index_1.default)
                .post(`/api/listings/${mockListingId}/claim`)
                .set('Authorization', mockJwtToken)
                .send(validPayload)
                .expect('Content-Type', /json/);
            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('claim_id');
            expect(response.body).toHaveProperty('status', 'PENDING');
        });
    });
    describe('Validation Rules', () => {
        it('should reject request missing required claim_method field', async () => {
            const invalidPayload = {
                verification_data: {
                    email: 'owner@business.com',
                },
            };
            const response = await (0, supertest_1.default)(index_1.default)
                .post(`/api/listings/${mockListingId}/claim`)
                .set('Authorization', mockJwtToken)
                .send(invalidPayload)
                .expect('Content-Type', /json/);
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('claim_method');
        });
        it('should reject invalid claim_method value', async () => {
            const invalidPayload = {
                claim_method: 'INVALID_METHOD',
                verification_data: {
                    email: 'owner@business.com',
                },
            };
            const response = await (0, supertest_1.default)(index_1.default)
                .post(`/api/listings/${mockListingId}/claim`)
                .set('Authorization', mockJwtToken)
                .send(invalidPayload)
                .expect('Content-Type', /json/);
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('claim_method');
        });
        it('should reject email verification without email in verification_data', async () => {
            const invalidPayload = {
                claim_method: 'EMAIL_VERIFICATION',
                verification_data: {
                    business_name: 'Test Business',
                },
            };
            const response = await (0, supertest_1.default)(index_1.default)
                .post(`/api/listings/${mockListingId}/claim`)
                .set('Authorization', mockJwtToken)
                .send(invalidPayload)
                .expect('Content-Type', /json/);
            expect(response.status).toBe(422);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('email');
        });
        it('should reject phone verification without phone in verification_data', async () => {
            const invalidPayload = {
                claim_method: 'PHONE_VERIFICATION',
                verification_data: {
                    business_name: 'Test Business',
                },
            };
            const response = await (0, supertest_1.default)(index_1.default)
                .post(`/api/listings/${mockListingId}/claim`)
                .set('Authorization', mockJwtToken)
                .send(invalidPayload)
                .expect('Content-Type', /json/);
            expect(response.status).toBe(422);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('phone');
        });
        it('should reject invalid email format in verification_data', async () => {
            const invalidPayload = {
                claim_method: 'EMAIL_VERIFICATION',
                verification_data: {
                    email: 'not-an-email',
                    business_name: 'Test Business',
                },
            };
            const response = await (0, supertest_1.default)(index_1.default)
                .post(`/api/listings/${mockListingId}/claim`)
                .set('Authorization', mockJwtToken)
                .send(invalidPayload)
                .expect('Content-Type', /json/);
            expect(response.status).toBe(422);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('email');
            expect(response.body.error).toContain('format');
        });
    });
    describe('Business Logic Validation', () => {
        it('should reject claim for listing that already has an active claim', async () => {
            const payload = {
                claim_method: 'EMAIL_VERIFICATION',
                verification_data: {
                    email: 'owner@business.com',
                    business_name: 'Test Business',
                },
            };
            await (0, supertest_1.default)(index_1.default)
                .post(`/api/listings/${mockListingId}/claim`)
                .set('Authorization', mockJwtToken)
                .send(payload)
                .expect(201);
            const response = await (0, supertest_1.default)(index_1.default)
                .post(`/api/listings/${mockListingId}/claim`)
                .set('Authorization', mockJwtToken)
                .send(payload)
                .expect('Content-Type', /json/);
            expect(response.status).toBe(409);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('active claim');
        });
        it('should reject claim for non-existent listing', async () => {
            const nonExistentId = '999e4567-e89b-12d3-a456-426614174999';
            const payload = {
                claim_method: 'EMAIL_VERIFICATION',
                verification_data: {
                    email: 'owner@business.com',
                    business_name: 'Test Business',
                },
            };
            const response = await (0, supertest_1.default)(index_1.default)
                .post(`/api/listings/${nonExistentId}/claim`)
                .set('Authorization', mockJwtToken)
                .send(payload)
                .expect('Content-Type', /json/);
            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('listing');
            expect(response.body.error).toContain('not found');
        });
    });
    describe('Response Schema Validation', () => {
        it('should return claim response with correct schema', async () => {
            const payload = {
                claim_method: 'EMAIL_VERIFICATION',
                verification_data: {
                    email: 'schema-test@business.com',
                    business_name: 'Schema Test Business',
                },
            };
            const response = await (0, supertest_1.default)(index_1.default)
                .post(`/api/listings/${mockListingId}/claim`)
                .set('Authorization', mockJwtToken)
                .send(payload)
                .expect(201);
            expect(response.body).toEqual(expect.objectContaining({
                claim_id: expect.any(String),
                status: expect.stringMatching(/^(PENDING|APPROVED|REJECTED|VERIFIED|EXPIRED)$/),
                expires_at: expect.any(String),
                next_steps: expect.any(Array),
            }));
            expect(response.body.expires_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
            expect(response.body.next_steps.length).toBeGreaterThan(0);
            response.body.next_steps.forEach((step) => {
                expect(typeof step).toBe('string');
                expect(step.length).toBeGreaterThan(0);
            });
        });
    });
    describe('Path Parameter Validation', () => {
        it('should reject invalid listing ID format', async () => {
            const payload = {
                claim_method: 'EMAIL_VERIFICATION',
                verification_data: {
                    email: 'owner@business.com',
                    business_name: 'Test Business',
                },
            };
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/listings/invalid-id/claim')
                .set('Authorization', mockJwtToken)
                .send(payload)
                .expect('Content-Type', /json/);
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('invalid');
        });
    });
});
//# sourceMappingURL=test_listings_claim.test.js.map