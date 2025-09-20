import { Router, Request, Response, NextFunction } from 'express';
import { ClaimService, ListingService } from '../services';
import { ValidationUtils } from '../utils/validation';
import { authenticateJWT } from '../middleware/authMiddleware';
import { ValidationError, NotFoundError, ConflictError, ForbiddenError } from '../middleware/errorMiddleware';

const router = Router();

// POST /api/listings/:id/claim - Create a claim for a listing
router.post('/:id/claim', authenticateJWT, async (req, res, next): Promise<void> => {
  try {
    const listingId = req.params.id;
    const { claim_method: claimMethod, verification_data: verificationData } = req.body;
    const userId = req.userId!; // Guaranteed by authenticateJWT

    // Check if listing ID is provided
    if (!listingId) {
      throw new ValidationError('Listing ID is required in the URL path', 'listingId');
    }

    // Validate listing ID format
    const listingIdValidation = ValidationUtils.validateTenantId(listingId);
    if (!listingIdValidation.isValid) {
      throw new ValidationError('Invalid listing ID format', 'listingId');
    }

    // Validate required fields
    if (!claimMethod) {
      throw new ValidationError('Missing required field: claim_method', 'claim_method');
    }

    if (!verificationData) {
      throw new ValidationError('Missing required field: verification_data', 'verification_data');
    }

    // Validate claim method
    const validMethods = ['EMAIL_VERIFICATION', 'PHONE_VERIFICATION', 'DOCUMENT_UPLOAD'];
    if (!validMethods.includes(claimMethod)) {
      throw new ValidationError('Invalid claimMethod', 'claimMethod');
    }

    // Prepare claim data
    const claimData = {
      listingId,
      userId,
      claimMethod,
      verificationData,
    };

    // Validate claim data using ClaimService
    const validation = ClaimService.validateClaimData(claimData);
    if (!validation.isValid) {
      throw new ValidationError('Invalid claim data');
    }

    // Create the claim
    const claim = await ClaimService.createClaim(claimData);

    res.status(201).json({
      claim_id: claim.id,
      status: claim.status,
      expires_at: claim.expiresAt,
      next_steps: [
        'Please check your email for verification instructions',
        'Complete verification within 7 days',
        'Contact support if you need assistance'
      ],
    });
    return;
  } catch (error) {
    // Handle specific business logic errors
    if (error instanceof Error) {
      if (error.message === 'Listing not found') {
        next(new NotFoundError('Listing'));
        return;
      }
      if (error.message.includes('already have an active claim')) {
        next(new ConflictError('You already have an active claim for this listing'));
        return;
      }
    }
    next(error);
  }
});

// GET /api/listings/:id/claims - Get all claims for a listing (admin only for now)
router.get('/:id/claims', authenticateJWT, async (req, res, next): Promise<void> => {
  try {
    const { id: listingId } = req.params;

    // Check if listing ID is provided
    if (!listingId) {
      throw new ValidationError('Listing ID is required in the URL path', 'listingId');
    }

    // Validate listing ID format
    const listingIdValidation = ValidationUtils.validateTenantId(listingId);
    if (!listingIdValidation.isValid) {
      throw new ValidationError('Invalid listing ID format', 'listingId');
    }

    // Get all claims for the listing
    const claims = await ClaimService.getListingClaims(listingId);

    res.status(200).json({
      success: true,
      listingId,
      claims: claims.map(claim => ({
        id: claim.id,
        userId: claim.userId,
        claimMethod: claim.claimMethod,
        status: claim.status,
        submittedAt: claim.submittedAt,
        reviewedAt: claim.reviewedAt,
        expiresAt: claim.expiresAt,
        user: {
          id: claim.user.id,
          email: claim.user.email,
          firstName: claim.user.firstName,
          lastName: claim.user.lastName,
        },
        verificationCount: claim.verifications.length,
      })),
    });
    return;
  } catch (error) {
    next(error);
  }
});

// PUT /api/listings/:id/update - Update claimed listing (owner only)
router.put('/:id/update', authenticateJWT, async (req, res, next): Promise<void> => {
  try {
    const listingId = req.params.id;
    const { title, description, data } = req.body;
    const userId = req.userId!; // Guaranteed by authenticateJWT

    // Check if listing ID is provided
    if (!listingId) {
      throw new ValidationError('Listing ID is required in the URL path', 'listingId');
    }

    // Validate listing ID format
    const listingIdValidation = ValidationUtils.validateTenantId(listingId);
    if (!listingIdValidation.isValid) {
      throw new ValidationError('Invalid listing ID format', 'listingId');
    }

    // Check if listing exists
    const listing = await ListingService.getListingById(listingId);
    if (!listing) {
      throw new NotFoundError('Listing');
    }

    // Check if user owns this listing (has verified/approved claim)
    const hasOwnership = await ListingService.checkUserOwnership(listingId, userId);
    if (!hasOwnership) {
      throw new ForbiddenError('Access denied - user doesn\'t own this listing');
    }

    // Validate title if provided
    if (title !== undefined) {
      if (!title || typeof title !== 'string' || title.length < 5 || title.length > 200) {
        throw new ValidationError('Title must be between 5 and 200 characters', 'title');
      }
    }

    // Validate description if provided
    if (description !== undefined && typeof description !== 'string') {
      throw new ValidationError('Description must be a string', 'description');
    }

    // Validate data if provided
    if (data !== undefined && typeof data !== 'object') {
      throw new ValidationError('Data must be an object', 'data');
    }

    // Prepare update data
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (data !== undefined) updateData.data = data;

    // Update search text if title or description changed
    if (title !== undefined || description !== undefined) {
      updateData.searchText = `${title || listing.title} ${description || listing.description || ''}`;
    }

    // Update the listing
    const updatedListing = await ListingService.updateListing(listingId, updateData);

    res.status(200).json({
      success: true,
      message: 'Listing updated successfully',
      listing: {
        id: updatedListing.id,
        title: updatedListing.title,
        description: updatedListing.description,
        data: updatedListing.data,
        updated_at: updatedListing.updatedAt,
      },
    });
    return;
  } catch (error) {
    next(error);
  }
});

export default router;
