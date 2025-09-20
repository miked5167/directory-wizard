import { ClaimService } from '../../src/services/ClaimService';
import { prisma } from '../../src/models';

describe('ClaimService - Core Functionality', () => {
  describe('Claim Validation', () => {
    it('should validate valid email verification data', () => {
      const claimData = {
        listingId: 'test-listing-id',
        userId: 'test-user-id',
        claimMethod: 'EMAIL_VERIFICATION' as const,
        verificationData: {
          email: 'valid@example.com',
          message: 'Valid claim',
        },
      };

      const validation = ClaimService.validateClaimData(claimData);
      expect(validation.isValid).toBe(true);
      expect(validation.error).toBeUndefined();
    });

    it('should validate valid phone verification data', () => {
      const claimData = {
        listingId: 'test-listing-id',
        userId: 'test-user-id',
        claimMethod: 'PHONE_VERIFICATION' as const,
        verificationData: {
          phoneNumber: '+1234567890',
          message: 'Valid phone claim',
        },
      };

      const validation = ClaimService.validateClaimData(claimData);
      expect(validation.isValid).toBe(true);
      expect(validation.error).toBeUndefined();
    });

    it('should validate valid document upload data', () => {
      const claimData = {
        listingId: 'test-listing-id',
        userId: 'test-user-id',
        claimMethod: 'DOCUMENT_UPLOAD' as const,
        verificationData: {
          documentType: 'business_license',
          documentUrl: '/uploads/license.pdf',
        },
      };

      const validation = ClaimService.validateClaimData(claimData);
      expect(validation.isValid).toBe(true);
      expect(validation.error).toBeUndefined();
    });

    it('should reject invalid claim method', () => {
      const claimData = {
        listingId: 'test-listing-id',
        userId: 'test-user-id',
        claimMethod: 'INVALID_METHOD' as any,
        verificationData: { test: 'data' },
      };

      const validation = ClaimService.validateClaimData(claimData);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('Invalid claim method');
    });

    it('should reject missing verification data', () => {
      const claimData = {
        listingId: 'test-listing-id',
        userId: 'test-user-id',
        claimMethod: 'EMAIL_VERIFICATION' as const,
        verificationData: null,
      };

      const validation = ClaimService.validateClaimData(claimData);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('Verification data is required');
    });

    it('should reject invalid email for email verification', () => {
      const claimData = {
        listingId: 'test-listing-id',
        userId: 'test-user-id',
        claimMethod: 'EMAIL_VERIFICATION' as const,
        verificationData: {
          email: 'invalid-email',
          message: 'Test',
        },
      };

      const validation = ClaimService.validateClaimData(claimData);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('Valid email is required');
    });

    it('should reject invalid phone number for phone verification', () => {
      const claimData = {
        listingId: 'test-listing-id',
        userId: 'test-user-id',
        claimMethod: 'PHONE_VERIFICATION' as const,
        verificationData: {
          phoneNumber: '123',
          message: 'Test',
        },
      };

      const validation = ClaimService.validateClaimData(claimData);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('Valid phone number is required');
    });

    it('should reject missing document type for document upload', () => {
      const claimData = {
        listingId: 'test-listing-id',
        userId: 'test-user-id',
        claimMethod: 'DOCUMENT_UPLOAD' as const,
        verificationData: {
          documentUrl: '/uploads/license.pdf',
        },
      };

      const validation = ClaimService.validateClaimData(claimData);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('Document type is required');
    });
  });

  describe('Database Operations', () => {
    it('should create a claim with real database', async () => {
      // Create test data
      const tenant = await prisma.tenant.create({
        data: {
          name: 'Test Tenant',
          domain: `test-${Date.now()}`,
          status: 'PUBLISHED',
        },
      });

      const category = await prisma.category.create({
        data: {
          tenantId: tenant.id,
          name: 'Test Category',
          slug: 'test-category',
        },
      });

      const listing = await prisma.listing.create({
        data: {
          tenantId: tenant.id,
          categoryId: category.id,
          title: 'Test Listing',
          slug: 'test-listing',
          description: 'A test listing',
          searchText: 'test listing',
        },
      });

      const user = await prisma.user.create({
        data: {
          email: `test-${Date.now()}@example.com`,
          passwordHash: 'hashed-password',
          firstName: 'Test',
          lastName: 'User',
          emailVerified: true,
        },
      });

      // Create claim
      const claimData = {
        listingId: listing.id,
        userId: user.id,
        claimMethod: 'EMAIL_VERIFICATION' as const,
        verificationData: {
          email: 'business@example.com',
          message: 'I am the owner of this business',
        },
      };

      const claim = await ClaimService.createClaim(claimData);

      expect(claim).toHaveProperty('id');
      expect(claim.listingId).toBe(listing.id);
      expect(claim.userId).toBe(user.id);
      expect(claim.claimMethod).toBe('EMAIL_VERIFICATION');
      expect(claim.status).toBe('PENDING');
      expect(claim).toHaveProperty('expiresAt');
      expect(claim).toHaveProperty('listing');
      expect(claim).toHaveProperty('user');
      expect(claim.user.email).toContain('@example.com');
    });

    it('should reject claim for non-existent listing', async () => {
      const user = await prisma.user.create({
        data: {
          email: `test-nonexistent-${Date.now()}@example.com`,
          passwordHash: 'hashed-password',
          firstName: 'Test',
          lastName: 'User',
          emailVerified: true,
        },
      });

      const claimData = {
        listingId: 'non-existent-listing-id',
        userId: user.id,
        claimMethod: 'EMAIL_VERIFICATION' as const,
        verificationData: {
          email: 'test@example.com',
          message: 'Test claim',
        },
      };

      await expect(ClaimService.createClaim(claimData)).rejects.toThrow('Listing not found');
    });

    it('should get claim by ID', async () => {
      // Find an existing claim or create one
      const existingClaim = await prisma.listingClaim.findFirst({
        include: {
          listing: true,
          user: true,
        },
      });

      if (existingClaim) {
        const claim = await ClaimService.getClaimById(existingClaim.id);
        expect(claim).toBeTruthy();
        expect(claim!.id).toBe(existingClaim.id);
        expect(claim!.listing).toBeTruthy();
        expect(claim!.user).toBeTruthy();
      } else {
        // If no existing claims, just test with invalid ID
        const claim = await ClaimService.getClaimById('non-existent-id');
        expect(claim).toBeNull();
      }
    });
  });
});
