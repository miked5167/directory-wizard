import { prisma } from '../models';

export interface ClaimCreateData {
  listingId: string;
  userId: string;
  claimMethod: 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION' | 'DOCUMENT_UPLOAD';
  verificationData: any;
}

export interface ClaimVerificationData {
  verificationType: 'EMAIL_DOMAIN' | 'PHONE_NUMBER' | 'BUSINESS_DOCUMENT' | 'UTILITY_BILL';
  evidenceUrl: string;
  evidenceData: any;
}

export interface ClaimUpdateData {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'VERIFIED' | 'EXPIRED';
  reviewerNotes?: string;
}

export class ClaimService {
  // Create a new listing claim
  static async createClaim(data: ClaimCreateData) {
    const { listingId, userId, claimMethod, verificationData } = data;

    // Check if listing exists
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { tenant: true },
    });

    if (!listing) {
      throw new Error('Listing not found');
    }

    // Check if user already has a pending or approved claim for this listing
    const existingClaim = await prisma.listingClaim.findFirst({
      where: {
        listingId,
        userId,
        status: {
          in: ['PENDING', 'APPROVED', 'VERIFIED'],
        },
      },
    });

    if (existingClaim) {
      throw new Error('You already have an active claim for this listing');
    }

    // Set expiration date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Create the claim
    const claim = await prisma.listingClaim.create({
      data: {
        listingId,
        userId,
        claimMethod,
        verificationData,
        expiresAt,
        status: 'PENDING',
      },
      include: {
        listing: {
          include: {
            tenant: true,
            category: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            emailVerified: true,
          },
        },
      },
    });

    return claim;
  }

  // Get claim by ID
  static async getClaimById(claimId: string) {
    const claim = await prisma.listingClaim.findUnique({
      where: { id: claimId },
      include: {
        listing: {
          include: {
            tenant: true,
            category: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            emailVerified: true,
          },
        },
        verifications: true,
      },
    });

    return claim;
  }

  // Get all claims for a user
  static async getUserClaims(userId: string) {
    const claims = await prisma.listingClaim.findMany({
      where: { userId },
      include: {
        listing: {
          include: {
            tenant: true,
            category: true,
          },
        },
        verifications: true,
      },
      orderBy: { submittedAt: 'desc' },
    });

    return claims;
  }

  // Get all claims for a listing
  static async getListingClaims(listingId: string) {
    const claims = await prisma.listingClaim.findMany({
      where: { listingId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            emailVerified: true,
          },
        },
        verifications: true,
      },
      orderBy: { submittedAt: 'desc' },
    });

    return claims;
  }

  // Update claim status (for admin/review purposes)
  static async updateClaimStatus(claimId: string, updateData: ClaimUpdateData) {
    const claim = await prisma.listingClaim.findUnique({
      where: { id: claimId },
    });

    if (!claim) {
      throw new Error('Claim not found');
    }

    // Check if claim is still valid (not expired)
    if (claim.expiresAt < new Date() && updateData.status !== 'EXPIRED') {
      throw new Error('Cannot update expired claim');
    }

    const updatedData: any = { ...updateData };

    // Set reviewedAt timestamp when status changes
    if (updateData.status && updateData.status !== claim.status) {
      updatedData.reviewedAt = new Date();
    }

    const updatedClaim = await prisma.listingClaim.update({
      where: { id: claimId },
      data: updatedData,
      include: {
        listing: {
          include: {
            tenant: true,
            category: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            emailVerified: true,
          },
        },
        verifications: true,
      },
    });

    return updatedClaim;
  }

  // Add verification evidence to a claim
  static async addVerification(claimId: string, verificationData: ClaimVerificationData) {
    const claim = await prisma.listingClaim.findUnique({
      where: { id: claimId },
    });

    if (!claim) {
      throw new Error('Claim not found');
    }

    if (claim.status !== 'PENDING') {
      throw new Error('Can only add verification to pending claims');
    }

    if (claim.expiresAt < new Date()) {
      throw new Error('Cannot add verification to expired claim');
    }

    const verification = await prisma.listingClaimVerification.create({
      data: {
        claimId,
        verificationType: verificationData.verificationType,
        evidenceUrl: verificationData.evidenceUrl,
        evidenceData: verificationData.evidenceData,
        verified: false,
      },
    });

    return verification;
  }

  // Verify a specific verification (admin action)
  static async verifyEvidence(verificationId: string, verified: boolean) {
    const verification = await prisma.listingClaimVerification.update({
      where: { id: verificationId },
      data: {
        verified,
        verifiedAt: verified ? new Date() : null,
      },
      include: {
        claim: {
          include: {
            verifications: true,
          },
        },
      },
    });

    // If this verification is approved and all verifications are verified,
    // automatically approve the claim
    if (verified) {
      const claim = verification.claim;
      const allVerified = claim.verifications.every(v => v.verified);

      if (allVerified && claim.verifications.length > 0) {
        await this.updateClaimStatus(claim.id, {
          status: 'VERIFIED',
          reviewerNotes: 'All verification evidence has been validated',
        });
      }
    }

    return verification;
  }

  // Check for expired claims and mark them as expired
  static async expireOldClaims() {
    const now = new Date();

    const expiredClaims = await prisma.listingClaim.updateMany({
      where: {
        expiresAt: { lt: now },
        status: 'PENDING',
      },
      data: {
        status: 'EXPIRED',
        reviewedAt: now,
        reviewerNotes: 'Claim expired after 30 days',
      },
    });

    return expiredClaims;
  }

  // Get claim statistics for a user
  static async getUserClaimStats(userId: string) {
    const stats = await prisma.listingClaim.groupBy({
      by: ['status'],
      where: { userId },
      _count: {
        status: true,
      },
    });

    const formattedStats = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      verified: 0,
      expired: 0,
    };

    stats.forEach(stat => {
      formattedStats.total += stat._count.status;
      formattedStats[stat.status.toLowerCase() as keyof typeof formattedStats] = stat._count.status;
    });

    return formattedStats;
  }

  // Get all pending claims (for admin review)
  static async getPendingClaims(limit: number = 50, offset: number = 0) {
    const claims = await prisma.listingClaim.findMany({
      where: {
        status: 'PENDING',
        expiresAt: { gt: new Date() }, // Only non-expired claims
      },
      include: {
        listing: {
          include: {
            tenant: true,
            category: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            emailVerified: true,
          },
        },
        verifications: true,
      },
      orderBy: { submittedAt: 'asc' }, // Oldest first for FIFO processing
      take: limit,
      skip: offset,
    });

    return claims;
  }

  // Validate claim data before creation
  static validateClaimData(data: ClaimCreateData): { isValid: boolean; error?: string } {
    const { listingId, userId, claimMethod, verificationData } = data;

    if (!listingId || typeof listingId !== 'string') {
      return { isValid: false, error: 'Valid listing ID is required' };
    }

    if (!userId || typeof userId !== 'string') {
      return { isValid: false, error: 'Valid user ID is required' };
    }

    const validMethods = ['EMAIL_VERIFICATION', 'PHONE_VERIFICATION', 'DOCUMENT_UPLOAD'];
    if (!validMethods.includes(claimMethod)) {
      return { isValid: false, error: 'Invalid claim method' };
    }

    if (!verificationData) {
      return { isValid: false, error: 'Verification data is required' };
    }

    // Method-specific validation
    switch (claimMethod) {
      case 'EMAIL_VERIFICATION':
        if (!verificationData.email || !verificationData.email.includes('@')) {
          return { isValid: false, error: 'Valid email is required for email verification' };
        }
        break;
      case 'PHONE_VERIFICATION':
        if (!verificationData.phoneNumber || verificationData.phoneNumber.length < 10) {
          return { isValid: false, error: 'Valid phone number is required for phone verification' };
        }
        break;
      case 'DOCUMENT_UPLOAD':
        if (!verificationData.documentType) {
          return { isValid: false, error: 'Document type is required for document upload' };
        }
        break;
    }

    return { isValid: true };
  }
}
