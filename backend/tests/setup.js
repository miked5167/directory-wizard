"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
globals_1.jest.setTimeout(30000);
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.JWT_SECRET = 'test-secret-key';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
beforeAll(async () => {
    console.log('🧪 Test environment initialized');
});
afterAll(async () => {
    console.log('🧪 Test environment cleaned up');
});
beforeEach(() => {
    globals_1.jest.clearAllMocks();
});
//# sourceMappingURL=setup.js.map