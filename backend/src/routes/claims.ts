import { Router, Request, Response, NextFunction } from 'express';
import { ClaimService } from '../services';
import { ValidationUtils } from '../utils/validation';
import { authenticateJWT } from '../middleware/authMiddleware';
import { ValidationError, NotFoundError, ForbiddenError } from '../middleware/errorMiddleware';
import multer from 'multer';

const router = Router();

// File upload configuration for claim verification evidence
const evidenceUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for evidence files
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'evidence_file') {
      // Accept PDF, JPG, PNG files for evidence
      if (
        file.mimetype === 'application/pdf' ||
        file.mimetype === 'image/jpeg' ||
        file.mimetype === 'image/png'
      ) {
        cb(null, true);
      } else {
        cb(new Error('Evidence file must be PDF, JPG, or PNG'));
      }
    } else {
      cb(new Error('Unexpected field'));
    }
  },
}).single('evidence_file');

// POST /api/claims/:id/verify - Submit verification evidence for claim
router.post('/:id/verify', authenticateJWT, (req, res, next) => {
  evidenceUpload(req, res, async (uploadError) => {
    if (uploadError) {
      return next(new ValidationError(uploadError.message, 'evidence_file'));
    }

    try {
      const claimId = req.params.id;
      const { verification_type: verificationType, evidence_data: evidenceData } = req.body;
      const userId = req.userId!; // Guaranteed by authenticateJWT

      // Check if claim ID is provided
      if (!claimId) {
        throw new ValidationError('Claim ID is required in the URL path', 'claimId');
      }

      // Validate claim ID format
      const claimIdValidation = ValidationUtils.validateTenantId(claimId);
      if (!claimIdValidation.isValid) {
        throw new ValidationError('Invalid claim ID format', 'claimId');
      }

      // Validate required fields
      if (!verificationType) {
        throw new ValidationError('Missing required field: verification_type', 'verification_type');
      }

      // Validate verification type
      const validTypes = ['EMAIL_DOMAIN', 'PHONE_NUMBER', 'BUSINESS_DOCUMENT', 'UTILITY_BILL'];
      if (!validTypes.includes(verificationType)) {
        throw new ValidationError('Invalid verification_type', 'verification_type');
      }

      // Get the claim and verify ownership
      const claim = await ClaimService.getClaimById(claimId);
      if (!claim) {
        throw new NotFoundError('Claim');
      }

      // Check if user owns this claim
      if (claim.userId !== userId) {
        throw new ForbiddenError('Access denied - not your claim');
      }

      // Check if claim is in correct status
      if (claim.status !== 'PENDING') {
        throw new ValidationError('Can only add verification to pending claims', 'status');
      }

      // Check if claim is not expired
      if (claim.expiresAt < new Date()) {
        throw new ValidationError('Cannot add verification to expired claim', 'status');
      }

      // TODO: In a real implementation, upload the evidence file to storage
      // For now, we'll use a placeholder URL
      const evidenceUrl = req.file ? `https://storage.example.com/evidence/${Date.now()}-${req.file.originalname}` : '';

      // Parse evidence data if provided
      let parsedEvidenceData = {};
      if (evidenceData) {
        try {
          parsedEvidenceData = JSON.parse(evidenceData);
        } catch (error) {
          throw new ValidationError('Invalid JSON format in evidence_data', 'evidence_data');
        }
      }

      // Create verification record
      const verification = await ClaimService.addVerification(claimId, {
        verificationType,
        evidenceUrl,
        evidenceData: parsedEvidenceData,
      });

      res.status(200).json({
        verification_id: verification.id,
        status: 'PENDING',
        message: 'Verification evidence submitted successfully. It will be reviewed within 2-3 business days.',
      });
      return;
    } catch (error) {
      next(error);
    }
  });
});

// GET /api/claims/:id - Get claim status and details
router.get('/:id', authenticateJWT, async (req, res, next): Promise<void> => {
  try {
    const claimId = req.params.id;
    const userId = req.userId!; // Guaranteed by authenticateJWT

    // Check if claim ID is provided
    if (!claimId) {
      throw new ValidationError('Claim ID is required in the URL path', 'claimId');
    }

    // Validate claim ID format
    const claimIdValidation = ValidationUtils.validateTenantId(claimId);
    if (!claimIdValidation.isValid) {
      throw new ValidationError('Invalid claim ID format', 'claimId');
    }

    // Get the claim
    const claim = await ClaimService.getClaimById(claimId);
    if (!claim) {
      throw new NotFoundError('Claim');
    }

    // Check if user owns this claim
    if (claim.userId !== userId) {
      throw new ForbiddenError('Access denied - not your claim');
    }

    res.status(200).json({
      id: claim.id,
      listing_id: claim.listingId,
      user_id: claim.userId,
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
      verifications: claim.verifications.map(verification => ({
        id: verification.id,
        verification_type: verification.verificationType,
        evidence_url: verification.evidenceUrl,
        verified: verification.verified,
        verified_at: verification.verifiedAt,
        submitted_at: verification.submittedAt,
      })),
    });
    return;
  } catch (error) {
    next(error);
  }
});


export default router;