import { jest } from '@jest/globals';

// Extend Jest timeout for integration tests
jest.setTimeout(30000);

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./test.db';
process.env.JWT_SECRET = 'test-secret-key';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';

// Global test setup
beforeAll(async () => {
  // Setup test database, mock services, etc.
  console.log('🧪 Test environment initialized');
});

afterAll(async () => {
  // Cleanup test resources
  console.log('🧪 Test environment cleaned up');
});

// Reset mocks and clean database between tests
beforeEach(async () => {
  jest.clearAllMocks();

  // Clean up test database to avoid unique constraint conflicts
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  try {
    // Delete in reverse dependency order
    await prisma.listingClaimVerification.deleteMany(); // First: verification depends on claims
    await prisma.listingClaim.deleteMany(); // Second: claims depend on listings and users
    await prisma.listing.deleteMany(); // Third: listings depend on categories
    await prisma.category.deleteMany(); // Fourth: categories depend on tenants
    await prisma.tenantBranding.deleteMany(); // Fifth: branding depends on tenants
    await prisma.adminSession.deleteMany(); // Sixth: sessions depend on tenants
    await prisma.user.deleteMany(); // Seventh: cleanup users
    await prisma.tenant.deleteMany(); // Last: tenants are the root
  } catch (error) {
    console.warn('Database cleanup error (this may be expected for first run):', error);
  } finally {
    await prisma.$disconnect();
  }
});
