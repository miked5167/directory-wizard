import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ClaimService, ClaimCreateData, ClaimVerificationData, ClaimUpdateData } from '../../src/services/ClaimService';
import { prisma } from '../../src/models';

// Mock prisma
jest.mock('../../src/models', () => ({
  prisma: {
    listing: {
      findUnique: jest.fn(),
    },
    listingClaim: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      groupBy: jest.fn(),
    },
    listingClaimVerification: {
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock timers for date-dependent tests
jest.useFakeTimers();

describe('ClaimService - Claim Verification', () => {
  const mockListingId = 'listing-123';
  const mockUserId = 'user-456';
  const mockClaimId = 'claim-789';
  const mockVerificationId = 'verification-abc';

  const mockListing = {
    id: mockListingId,
    title: 'Test Business',
    slug: 'test-business',
    tenantId: 'tenant-123',
    categoryId: 'category-456',
    status: 'PUBLISHED',
    tenant: {
      id: 'tenant-123',
      name: 'Test Directory',
      domain: 'test-directory',
    },
    category: {
      id: 'category-456',
      name: 'Restaurants',
      slug: 'restaurants',
    },
  };

  const mockUser = {
    id: mockUserId,
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    emailVerified: true,
  };

  const mockClaim = {
    id: mockClaimId,
    listingId: mockListingId,
    userId: mockUserId,
    status: 'PENDING',
    claimMethod: 'EMAIL_VERIFICATION',
    verificationData: { email: 'business@example.com' },
    submittedAt: new Date('2024-01-01T00:00:00Z'),
    expiresAt: new Date('2024-01-31T00:00:00Z'),
    reviewedAt: null,
    reviewerNotes: null,
    listing: mockListing,
    user: mockUser,
    verifications: [],
  };

  const mockVerification = {
    id: mockVerificationId,
    claimId: mockClaimId,
    verificationType: 'BUSINESS_DOCUMENT',
    evidenceUrl: 'https://example.com/document.pdf',
    evidenceData: { documentType: 'business_license' },
    verified: false,
    verifiedAt: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.setSystemTime(new Date('2024-01-15T00:00:00Z')); // Mid-way through claim period
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  describe('createClaim', () => {
    const claimData: ClaimCreateData = {
      listingId: mockListingId,
      userId: mockUserId,
      claimMethod: 'EMAIL_VERIFICATION',
      verificationData: { email: 'business@example.com' },
    };

    it('should successfully create a new claim', async () => {
      (prisma.listing.findUnique as jest.Mock).mockResolvedValue(mockListing);
      (prisma.listingClaim.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.listingClaim.create as jest.Mock).mockResolvedValue(mockClaim);

      const result = await ClaimService.createClaim(claimData);

      expect(result).toEqual(mockClaim);
      expect(prisma.listingClaim.create).toHaveBeenCalledWith({
        data: {
          listingId: mockListingId,
          userId: mockUserId,
          claimMethod: 'EMAIL_VERIFICATION',
          verificationData: { email: 'business@example.com' },
          expiresAt: new Date('2024-02-14T00:00:00Z'), // 30 days from current time
          status: 'PENDING',
        },
        include: expect.any(Object),
      });
    });

    it('should set correct expiration date (30 days from creation)', async () => {
      (prisma.listing.findUnique as jest.Mock).mockResolvedValue(mockListing);
      (prisma.listingClaim.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.listingClaim.create as jest.Mock).mockResolvedValue(mockClaim);

      await ClaimService.createClaim(claimData);

      const expectedExpiration = new Date('2024-02-14T00:00:00Z'); // 30 days from 2024-01-15
      expect(prisma.listingClaim.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expiresAt: expectedExpiration,
          }),
        })
      );
    });

    it('should throw error if listing does not exist', async () => {
      (prisma.listing.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(ClaimService.createClaim(claimData)).rejects.toThrow('Listing not found');

      expect(prisma.listingClaim.create).not.toHaveBeenCalled();
    });

    it('should throw error if user already has active claim', async () => {
      (prisma.listing.findUnique as jest.Mock).mockResolvedValue(mockListing);
      (prisma.listingClaim.findFirst as jest.Mock).mockResolvedValue(mockClaim);

      await expect(ClaimService.createClaim(claimData)).rejects.toThrow(
        'You already have an active claim for this listing'
      );

      expect(prisma.listingClaim.create).not.toHaveBeenCalled();
    });

    it('should check for existing claims with correct statuses', async () => {
      (prisma.listing.findUnique as jest.Mock).mockResolvedValue(mockListing);
      (prisma.listingClaim.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.listingClaim.create as jest.Mock).mockResolvedValue(mockClaim);

      await ClaimService.createClaim(claimData);

      expect(prisma.listingClaim.findFirst).toHaveBeenCalledWith({
        where: {
          listingId: mockListingId,
          userId: mockUserId,
          status: {
            in: ['PENDING', 'APPROVED', 'VERIFIED'],
          },
        },
      });
    });

    it('should handle different claim methods', async () => {
      (prisma.listing.findUnique as jest.Mock).mockResolvedValue(mockListing);
      (prisma.listingClaim.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.listingClaim.create as jest.Mock).mockResolvedValue(mockClaim);

      const methods: Array<ClaimCreateData['claimMethod']> = [
        'EMAIL_VERIFICATION',
        'PHONE_VERIFICATION',
        'DOCUMENT_UPLOAD',
      ];

      for (const method of methods) {
        const claimDataWithMethod = { ...claimData, claimMethod: method };
        await ClaimService.createClaim(claimDataWithMethod);

        expect(prisma.listingClaim.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              claimMethod: method,
            }),
          })
        );
      }
    });
  });

  describe('addVerification', () => {
    const verificationData: ClaimVerificationData = {
      verificationType: 'BUSINESS_DOCUMENT',
      evidenceUrl: 'https://example.com/document.pdf',
      evidenceData: { documentType: 'business_license' },
    };

    it('should successfully add verification to pending claim', async () => {
      (prisma.listingClaim.findUnique as jest.Mock).mockResolvedValue(mockClaim);
      (prisma.listingClaimVerification.create as jest.Mock).mockResolvedValue(mockVerification);

      const result = await ClaimService.addVerification(mockClaimId, verificationData);

      expect(result).toEqual(mockVerification);
      expect(prisma.listingClaimVerification.create).toHaveBeenCalledWith({
        data: {
          claimId: mockClaimId,
          verificationType: 'BUSINESS_DOCUMENT',
          evidenceUrl: 'https://example.com/document.pdf',
          evidenceData: { documentType: 'business_license' },
          verified: false,
        },
      });
    });

    it('should throw error if claim does not exist', async () => {
      (prisma.listingClaim.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(ClaimService.addVerification(mockClaimId, verificationData)).rejects.toThrow(
        'Claim not found'
      );

      expect(prisma.listingClaimVerification.create).not.toHaveBeenCalled();
    });

    it('should throw error if claim is not pending', async () => {
      const approvedClaim = { ...mockClaim, status: 'APPROVED' };
      (prisma.listingClaim.findUnique as jest.Mock).mockResolvedValue(approvedClaim);

      await expect(ClaimService.addVerification(mockClaimId, verificationData)).rejects.toThrow(
        'Can only add verification to pending claims'
      );

      expect(prisma.listingClaimVerification.create).not.toHaveBeenCalled();
    });

    it('should throw error if claim is expired', async () => {
      const expiredClaim = {
        ...mockClaim,
        expiresAt: new Date('2024-01-01T00:00:00Z'), // Expired
      };
      (prisma.listingClaim.findUnique as jest.Mock).mockResolvedValue(expiredClaim);

      await expect(ClaimService.addVerification(mockClaimId, verificationData)).rejects.toThrow(
        'Cannot add verification to expired claim'
      );

      expect(prisma.listingClaimVerification.create).not.toHaveBeenCalled();
    });

    it('should handle different verification types', async () => {
      (prisma.listingClaim.findUnique as jest.Mock).mockResolvedValue(mockClaim);
      (prisma.listingClaimVerification.create as jest.Mock).mockResolvedValue(mockVerification);

      const verificationTypes: Array<ClaimVerificationData['verificationType']> = [
        'EMAIL_DOMAIN',
        'PHONE_NUMBER',
        'BUSINESS_DOCUMENT',
        'UTILITY_BILL',
      ];

      for (const verificationType of verificationTypes) {
        const verificationWithType = { ...verificationData, verificationType };
        await ClaimService.addVerification(mockClaimId, verificationWithType);

        expect(prisma.listingClaimVerification.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              verificationType,
            }),
          })
        );
      }
    });
  });

  describe('verifyEvidence', () => {
    it('should successfully verify evidence', async () => {
      const verificationWithClaim = {
        ...mockVerification,
        verified: true,
        verifiedAt: new Date(),
        claim: {
          ...mockClaim,
          verifications: [{ ...mockVerification, verified: true }],
        },
      };

      (prisma.listingClaimVerification.update as jest.Mock).mockResolvedValue(verificationWithClaim);
      (prisma.listingClaim.update as jest.Mock).mockResolvedValue({
        ...mockClaim,
        status: 'VERIFIED',
      });

      const result = await ClaimService.verifyEvidence(mockVerificationId, true);

      expect(result.verified).toBe(true);
      expect(result.verifiedAt).toBeTruthy();
      expect(prisma.listingClaimVerification.update).toHaveBeenCalledWith({
        where: { id: mockVerificationId },
        data: {
          verified: true,
          verifiedAt: expect.any(Date),
        },
        include: expect.any(Object),
      });
    });

    it('should reject evidence when verified is false', async () => {
      const rejectedVerification = {
        ...mockVerification,
        verified: false,
        verifiedAt: null,
        claim: {
          ...mockClaim,
          verifications: [{ ...mockVerification, verified: false }],
        },
      };

      (prisma.listingClaimVerification.update as jest.Mock).mockResolvedValue(rejectedVerification);

      const result = await ClaimService.verifyEvidence(mockVerificationId, false);

      expect(result.verified).toBe(false);
      expect(result.verifiedAt).toBeNull();
      expect(prisma.listingClaimVerification.update).toHaveBeenCalledWith({
        where: { id: mockVerificationId },
        data: {
          verified: false,
          verifiedAt: null,
        },
        include: expect.any(Object),
      });
    });

    it('should automatically verify claim when all evidence is verified', async () => {
      const allVerifiedClaim = {
        ...mockClaim,
        verifications: [
          { ...mockVerification, verified: true },
          { id: 'verification-2', verified: true },
        ],
      };

      const verificationWithAllVerified = {
        ...mockVerification,
        verified: true,
        verifiedAt: new Date(),
        claim: allVerifiedClaim,
      };

      (prisma.listingClaimVerification.update as jest.Mock).mockResolvedValue(verificationWithAllVerified);
      (prisma.listingClaim.update as jest.Mock).mockResolvedValue({
        ...allVerifiedClaim,
        status: 'VERIFIED',
      });

      await ClaimService.verifyEvidence(mockVerificationId, true);

      // Should update claim status to VERIFIED
      expect(prisma.listingClaim.update).toHaveBeenCalledWith({
        where: { id: mockClaimId },
        data: {
          status: 'VERIFIED',
          reviewerNotes: 'All verification evidence has been validated',
          reviewedAt: expect.any(Date),
        },
        include: expect.any(Object),
      });
    });

    it('should not auto-verify claim if some evidence is unverified', async () => {
      const partiallyVerifiedClaim = {
        ...mockClaim,
        verifications: [
          { ...mockVerification, verified: true },
          { id: 'verification-2', verified: false }, // One unverified
        ],
      };

      const verificationWithPartial = {
        ...mockVerification,
        verified: true,
        verifiedAt: new Date(),
        claim: partiallyVerifiedClaim,
      };

      (prisma.listingClaimVerification.update as jest.Mock).mockResolvedValue(verificationWithPartial);

      await ClaimService.verifyEvidence(mockVerificationId, true);

      // Should NOT update claim status
      expect(prisma.listingClaim.update).toHaveBeenCalledTimes(1); // Only the verification update
    });

    it('should not auto-verify claim with no verifications', async () => {
      const claimWithNoVerifications = {
        ...mockClaim,
        verifications: [],
      };

      const verificationWithNoClaim = {
        ...mockVerification,
        verified: true,
        verifiedAt: new Date(),
        claim: claimWithNoVerifications,
      };

      (prisma.listingClaimVerification.update as jest.Mock).mockResolvedValue(verificationWithNoClaim);

      await ClaimService.verifyEvidence(mockVerificationId, true);

      // Should NOT update claim status
      expect(prisma.listingClaim.update).toHaveBeenCalledTimes(1); // Only the verification update
    });
  });

  describe('updateClaimStatus', () => {
    const updateData: ClaimUpdateData = {
      status: 'APPROVED',
      reviewerNotes: 'Claim approved after manual review',
    };

    it('should successfully update claim status', async () => {
      (prisma.listingClaim.findUnique as jest.Mock).mockResolvedValue(mockClaim);
      (prisma.listingClaim.update as jest.Mock).mockResolvedValue({
        ...mockClaim,
        ...updateData,
        reviewedAt: new Date(),
      });

      const result = await ClaimService.updateClaimStatus(mockClaimId, updateData);

      expect(result.status).toBe('APPROVED');
      expect(result.reviewerNotes).toBe('Claim approved after manual review');
      expect(prisma.listingClaim.update).toHaveBeenCalledWith({
        where: { id: mockClaimId },
        data: {
          ...updateData,
          reviewedAt: expect.any(Date),
        },
        include: expect.any(Object),
      });
    });

    it('should throw error if claim does not exist', async () => {
      (prisma.listingClaim.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(ClaimService.updateClaimStatus(mockClaimId, updateData)).rejects.toThrow(
        'Claim not found'
      );

      expect(prisma.listingClaim.update).not.toHaveBeenCalled();
    });

    it('should throw error for expired claim (unless marking as expired)', async () => {
      const expiredClaim = {
        ...mockClaim,
        expiresAt: new Date('2024-01-01T00:00:00Z'), // Expired
      };
      (prisma.listingClaim.findUnique as jest.Mock).mockResolvedValue(expiredClaim);

      await expect(ClaimService.updateClaimStatus(mockClaimId, updateData)).rejects.toThrow(
        'Cannot update expired claim'
      );

      expect(prisma.listingClaim.update).not.toHaveBeenCalled();
    });

    it('should allow marking expired claim as EXPIRED', async () => {
      const expiredClaim = {
        ...mockClaim,
        expiresAt: new Date('2024-01-01T00:00:00Z'), // Expired
      };
      (prisma.listingClaim.findUnique as jest.Mock).mockResolvedValue(expiredClaim);
      (prisma.listingClaim.update as jest.Mock).mockResolvedValue({
        ...expiredClaim,
        status: 'EXPIRED',
      });

      const expiredUpdateData = { status: 'EXPIRED' as const };
      await ClaimService.updateClaimStatus(mockClaimId, expiredUpdateData);

      expect(prisma.listingClaim.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'EXPIRED',
          }),
        })
      );
    });

    it('should set reviewedAt timestamp when status changes', async () => {
      (prisma.listingClaim.findUnique as jest.Mock).mockResolvedValue(mockClaim);
      (prisma.listingClaim.update as jest.Mock).mockResolvedValue({
        ...mockClaim,
        status: 'APPROVED',
      });

      await ClaimService.updateClaimStatus(mockClaimId, { status: 'APPROVED' });

      expect(prisma.listingClaim.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reviewedAt: expect.any(Date),
          }),
        })
      );
    });

    it('should not set reviewedAt if status unchanged', async () => {
      (prisma.listingClaim.findUnique as jest.Mock).mockResolvedValue(mockClaim);
      (prisma.listingClaim.update as jest.Mock).mockResolvedValue(mockClaim);

      // Update with same status
      await ClaimService.updateClaimStatus(mockClaimId, {
        status: 'PENDING',
        reviewerNotes: 'Just adding notes'
      });

      expect(prisma.listingClaim.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({
            reviewedAt: expect.any(Date),
          }),
        })
      );
    });
  });

  describe('expireOldClaims', () => {
    it('should expire old pending claims', async () => {
      const expiredCount = { count: 5 };
      (prisma.listingClaim.updateMany as jest.Mock).mockResolvedValue(expiredCount);

      const result = await ClaimService.expireOldClaims();

      expect(result).toEqual(expiredCount);
      expect(prisma.listingClaim.updateMany).toHaveBeenCalledWith({
        where: {
          expiresAt: { lt: new Date('2024-01-15T00:00:00Z') },
          status: 'PENDING',
        },
        data: {
          status: 'EXPIRED',
          reviewedAt: new Date('2024-01-15T00:00:00Z'),
          reviewerNotes: 'Claim expired after 30 days',
        },
      });
    });

    it('should only affect pending claims', async () => {
      await ClaimService.expireOldClaims();

      expect(prisma.listingClaim.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PENDING',
          }),
        })
      );
    });

    it('should handle case with no expired claims', async () => {
      (prisma.listingClaim.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await ClaimService.expireOldClaims();

      expect(result.count).toBe(0);
    });
  });

  describe('validateClaimData', () => {
    it('should validate valid claim data', () => {
      const validData: ClaimCreateData = {
        listingId: 'valid-listing-id',
        userId: 'valid-user-id',
        claimMethod: 'EMAIL_VERIFICATION',
        verificationData: { email: 'test@example.com' },
      };

      const result = ClaimService.validateClaimData(validData);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject missing listing ID', () => {
      const invalidData = {
        userId: 'valid-user-id',
        claimMethod: 'EMAIL_VERIFICATION',
        verificationData: { email: 'test@example.com' },
      } as ClaimCreateData;

      const result = ClaimService.validateClaimData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Valid listing ID is required');
    });

    it('should reject missing user ID', () => {
      const invalidData = {
        listingId: 'valid-listing-id',
        claimMethod: 'EMAIL_VERIFICATION',
        verificationData: { email: 'test@example.com' },
      } as ClaimCreateData;

      const result = ClaimService.validateClaimData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Valid user ID is required');
    });

    it('should reject invalid claim method', () => {
      const invalidData: ClaimCreateData = {
        listingId: 'valid-listing-id',
        userId: 'valid-user-id',
        claimMethod: 'INVALID_METHOD' as any,
        verificationData: { email: 'test@example.com' },
      };

      const result = ClaimService.validateClaimData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid claim method');
    });

    it('should reject missing verification data', () => {
      const invalidData: ClaimCreateData = {
        listingId: 'valid-listing-id',
        userId: 'valid-user-id',
        claimMethod: 'EMAIL_VERIFICATION',
        verificationData: null as any,
      };

      const result = ClaimService.validateClaimData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Verification data is required');
    });

    describe('Method-specific validation', () => {
      it('should validate EMAIL_VERIFICATION method', () => {
        const validEmailData: ClaimCreateData = {
          listingId: 'valid-listing-id',
          userId: 'valid-user-id',
          claimMethod: 'EMAIL_VERIFICATION',
          verificationData: { email: 'test@example.com' },
        };

        const result = ClaimService.validateClaimData(validEmailData);

        expect(result.isValid).toBe(true);
      });

      it('should reject invalid email for EMAIL_VERIFICATION', () => {
        const invalidEmailData: ClaimCreateData = {
          listingId: 'valid-listing-id',
          userId: 'valid-user-id',
          claimMethod: 'EMAIL_VERIFICATION',
          verificationData: { email: 'invalid-email' },
        };

        const result = ClaimService.validateClaimData(invalidEmailData);

        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Valid email is required for email verification');
      });

      it('should validate PHONE_VERIFICATION method', () => {
        const validPhoneData: ClaimCreateData = {
          listingId: 'valid-listing-id',
          userId: 'valid-user-id',
          claimMethod: 'PHONE_VERIFICATION',
          verificationData: { phoneNumber: '+1234567890' },
        };

        const result = ClaimService.validateClaimData(validPhoneData);

        expect(result.isValid).toBe(true);
      });

      it('should reject short phone number for PHONE_VERIFICATION', () => {
        const invalidPhoneData: ClaimCreateData = {
          listingId: 'valid-listing-id',
          userId: 'valid-user-id',
          claimMethod: 'PHONE_VERIFICATION',
          verificationData: { phoneNumber: '123' },
        };

        const result = ClaimService.validateClaimData(invalidPhoneData);

        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Valid phone number is required for phone verification');
      });

      it('should validate DOCUMENT_UPLOAD method', () => {
        const validDocumentData: ClaimCreateData = {
          listingId: 'valid-listing-id',
          userId: 'valid-user-id',
          claimMethod: 'DOCUMENT_UPLOAD',
          verificationData: { documentType: 'business_license' },
        };

        const result = ClaimService.validateClaimData(validDocumentData);

        expect(result.isValid).toBe(true);
      });

      it('should reject missing document type for DOCUMENT_UPLOAD', () => {
        const invalidDocumentData: ClaimCreateData = {
          listingId: 'valid-listing-id',
          userId: 'valid-user-id',
          claimMethod: 'DOCUMENT_UPLOAD',
          verificationData: { someOtherField: 'value' },
        };

        const result = ClaimService.validateClaimData(invalidDocumentData);

        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Document type is required for document upload');
      });
    });
  });

  describe('getUserClaimStats', () => {
    it('should return formatted claim statistics', async () => {
      const mockStats = [
        { status: 'PENDING', _count: { status: 3 } },
        { status: 'APPROVED', _count: { status: 2 } },
        { status: 'VERIFIED', _count: { status: 1 } },
        { status: 'REJECTED', _count: { status: 1 } },
      ];

      (prisma.listingClaim.groupBy as jest.Mock).mockResolvedValue(mockStats);

      const result = await ClaimService.getUserClaimStats(mockUserId);

      expect(result).toEqual({
        total: 7,
        pending: 3,
        approved: 2,
        rejected: 1,
        verified: 1,
        expired: 0,
      });
    });

    it('should handle empty statistics', async () => {
      (prisma.listingClaim.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await ClaimService.getUserClaimStats(mockUserId);

      expect(result).toEqual({
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        verified: 0,
        expired: 0,
      });
    });
  });

  describe('getPendingClaims', () => {
    it('should return pending claims with pagination', async () => {
      const mockPendingClaims = [mockClaim];
      (prisma.listingClaim.findMany as jest.Mock).mockResolvedValue(mockPendingClaims);

      const result = await ClaimService.getPendingClaims(10, 0);

      expect(result).toEqual(mockPendingClaims);
      expect(prisma.listingClaim.findMany).toHaveBeenCalledWith({
        where: {
          status: 'PENDING',
          expiresAt: { gt: new Date('2024-01-15T00:00:00Z') },
        },
        include: expect.any(Object),
        orderBy: { submittedAt: 'asc' },
        take: 10,
        skip: 0,
      });
    });

    it('should use default pagination parameters', async () => {
      (prisma.listingClaim.findMany as jest.Mock).mockResolvedValue([]);

      await ClaimService.getPendingClaims();

      expect(prisma.listingClaim.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 0,
        })
      );
    });

    it('should only return non-expired pending claims', async () => {
      await ClaimService.getPendingClaims();

      expect(prisma.listingClaim.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'PENDING',
            expiresAt: { gt: expect.any(Date) },
          },
        })
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database errors in createClaim', async () => {
      (prisma.listing.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

      const claimData: ClaimCreateData = {
        listingId: mockListingId,
        userId: mockUserId,
        claimMethod: 'EMAIL_VERIFICATION',
        verificationData: { email: 'test@example.com' },
      };

      await expect(ClaimService.createClaim(claimData)).rejects.toThrow('Database error');
    });

    it('should handle database errors in verifyEvidence', async () => {
      (prisma.listingClaimVerification.update as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(ClaimService.verifyEvidence(mockVerificationId, true)).rejects.toThrow('Database error');
    });

    it('should handle invalid dates in expiration checks', async () => {
      const claimWithInvalidDate = {
        ...mockClaim,
        expiresAt: new Date('invalid-date'),
      };
      (prisma.listingClaim.findUnique as jest.Mock).mockResolvedValue(claimWithInvalidDate);

      // Should still work - invalid dates are compared correctly
      const verificationData: ClaimVerificationData = {
        verificationType: 'BUSINESS_DOCUMENT',
        evidenceUrl: 'https://example.com/doc.pdf',
        evidenceData: {},
      };

      await expect(ClaimService.addVerification(mockClaimId, verificationData)).rejects.toThrow(
        'Cannot add verification to expired claim'
      );
    });

    it('should handle concurrent verification attempts', async () => {
      (prisma.listingClaim.findUnique as jest.Mock).mockResolvedValue(mockClaim);
      (prisma.listingClaimVerification.create as jest.Mock).mockImplementation((data) =>
        Promise.resolve({ ...mockVerification, id: `verification-${Date.now()}` })
      );

      const verificationData: ClaimVerificationData = {
        verificationType: 'BUSINESS_DOCUMENT',
        evidenceUrl: 'https://example.com/doc.pdf',
        evidenceData: {},
      };

      const promises = Array.from({ length: 3 }, () =>
        ClaimService.addVerification(mockClaimId, verificationData)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toHaveProperty('id');
        expect(result.claimId).toBe(mockClaimId);
      });
    });
  });
});