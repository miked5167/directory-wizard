import { Router } from 'express';
import { WizardService } from '../services';

const router = Router();

// GET /api/wizard/:sessionId - Get wizard session
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await WizardService.getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
      });
    }

    return res.json({
      id: session.id,
      tenant_id: session.tenantId,
      current_step: session.step,
      data: session.data,
      created_at: session.createdAt,
      updated_at: session.updatedAt,
      expires_at: session.expiresAt,
    });
  } catch (error) {
    console.error('Error fetching wizard session:', error);
    return res.status(500).json({
      error: 'Failed to fetch session',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// PUT /api/wizard/:sessionId/step - Update wizard step
router.put('/:sessionId/step', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { step, data } = req.body;

    if (!step) {
      return res.status(400).json({
        error: 'Step is required',
      });
    }

    const validSteps = ['BASIC_INFO', 'BRANDING', 'CATEGORIES', 'LISTINGS', 'PREVIEW', 'PUBLISH'];
    if (!validSteps.includes(step)) {
      return res.status(400).json({
        error: 'Invalid step',
        valid_steps: validSteps,
      });
    }

    const session = await WizardService.updateStep(sessionId, step, data || {});

    return res.json({
      id: session.id,
      current_step: session.step,
      data: session.data,
      updated_at: session.updatedAt,
    });
  } catch (error) {
    console.error('Error updating wizard step:', error);
    return res.status(500).json({
      error: 'Failed to update step',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/wizard/:sessionId/categories - Process categories
router.post('/:sessionId/categories', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { categories } = req.body;

    if (!categories || !Array.isArray(categories)) {
      return res.status(400).json({
        error: 'Categories array is required',
      });
    }

    const result = await WizardService.processCategories(sessionId, categories);

    return res.json({
      success: true,
      created_count: result.length,
      categories: result,
    });
  } catch (error) {
    console.error('Error processing categories:', error);
    return res.status(500).json({
      error: 'Failed to process categories',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/wizard/:sessionId/listings - Process listings
router.post('/:sessionId/listings', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { listings } = req.body;

    if (!listings || !Array.isArray(listings)) {
      return res.status(400).json({
        error: 'Listings array is required',
      });
    }

    const result = await WizardService.processListings(sessionId, listings);

    return res.json({
      success: true,
      created_count: result.length,
      listings: result,
    });
  } catch (error) {
    console.error('Error processing listings:', error);
    return res.status(500).json({
      error: 'Failed to process listings',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/wizard/:sessionId/complete - Complete wizard
router.post('/:sessionId/complete', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await WizardService.completeWizard(sessionId);

    return res.json({
      success: true,
      tenant_id: result.tenantId,
      message: 'Wizard completed successfully',
    });
  } catch (error) {
    console.error('Error completing wizard:', error);
    return res.status(500).json({
      error: 'Failed to complete wizard',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
