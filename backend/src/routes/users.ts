import { Router, Request, Response, NextFunction } from 'express';
import { ClaimService } from '../services';
import { authenticateJWT } from '../middleware/authMiddleware';

const router = Router();

// GET /api/users/me/claims - Get current user's claims across all tenants
router.get('/me/claims', authenticateJWT, async (req, res, next): Promise<void> => {
  try {
    const userId = req.userId!; // Guaranteed by authenticateJWT
    const { status, page = 1, limit = 20 } = req.query;

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;

    // Get user claims with optional status filter
    let claims = await ClaimService.getUserClaims(userId);

    // Filter by status if provided
    if (status && typeof status === 'string') {
      const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'VERIFIED', 'EXPIRED'];
      if (validStatuses.includes(status.toUpperCase())) {
        claims = claims.filter(claim => claim.status === status.toUpperCase());
      }
    }

    // Apply pagination
    const totalClaims = claims.length;
    const paginatedClaims = claims.slice(offset, offset + limitNum);

    res.status(200).json({
      claims: paginatedClaims.map(claim => ({
        id: claim.id,
        claim_method: claim.claimMethod,
        status: claim.status,
        submitted_at: claim.submittedAt,
        reviewed_at: claim.reviewedAt,
        expires_at: claim.expiresAt,
        reviewer_notes: claim.reviewerNotes,
        listing: {
          id: claim.listing.id,
          title: claim.listing.title,
          description: claim.listing.description,
          tenant: {
            id: claim.listing.tenant.id,
            name: claim.listing.tenant.name,
            domain: claim.listing.tenant.domain,
          },
          category: claim.listing.category ? {
            id: claim.listing.category.id,
            name: claim.listing.category.name,
          } : null,
        },
        verification_count: claim.verifications.length,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalClaims,
        total_pages: Math.ceil(totalClaims / limitNum),
        has_next: pageNum * limitNum < totalClaims,
        has_prev: pageNum > 1,
      },
    });
    return;
  } catch (error) {
    next(error);
  }
});

export default router;