import { Router } from 'express';
import tenantsRoutes from './tenants';
import wizardRoutes from './wizard';
import authRoutes from './auth';
import listingsRoutes from './listings';
import claimsRoutes from './claims';
import usersRoutes from './users';

const router = Router();

// Mount route handlers
router.use('/tenants', tenantsRoutes);
router.use('/wizard', wizardRoutes);
router.use('/auth', authRoutes);
router.use('/listings', listingsRoutes);
router.use('/claims', claimsRoutes);
router.use('/users', usersRoutes);

// Health check for API
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Directory Wizard API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

export default router;
