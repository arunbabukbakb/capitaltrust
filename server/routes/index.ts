import { Router } from 'express';
import { getDatabase } from '../database';
import authRoutes from './auth';
import rolesRoutes from './roles';
import usersRoutes from './users';
import loansRoutes from './loans';
import paymentsRoutes from './payments';
import loanPaymentsRoutes from './loanPayments';
import contributionsRoutes from './contributions';
import dashboardRoutes from './dashboard';
import collectionTypesRoutes from './collectionTypes';
import memberCollectionsRoutes from './memberCollections';
import menusRoutes from './menus';
import permissionsRoutes from './permissions';
import settingsRoutes from './settings';
import tenantsRoutes from './tenants';
import notificationRoutes from './notification';
import superadminRoutes from './superadmin';

const router = Router();

// Tenant resolution middleware to resolve subdomain string to integer ID
router.use(async (req, res, next) => {
  const subdomain = req.headers['x-tenant-id'] as string;
  if (subdomain) {
    if (subdomain === 'default') {
      req.headers['x-tenant-id'] = '1';
    } else {
      try {
        const db = getDatabase();
        const tenant = await db.get("SELECT id FROM tenants WHERE LOWER(subdomain) = ?", [subdomain.toLowerCase().trim()]);
        if (tenant) {
          req.headers['x-tenant-id'] = String(tenant.id);
        }
      } catch (err) {
        console.error("[Tenant Resolution Middleware] Error:", err);
      }
    }
  }
  next();
});

router.use('/auth', authRoutes);
router.use('/roles', rolesRoutes);
router.use('/users', usersRoutes);
router.use('/loans', loansRoutes);
router.use('/payments', paymentsRoutes);
router.use('/loan-payments', loanPaymentsRoutes);
router.use('/contributions', contributionsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/collection-types', collectionTypesRoutes);
router.use('/fund-collections', memberCollectionsRoutes);
router.use('/menus', menusRoutes);
router.use('/permissions', permissionsRoutes);
router.use('/settings', settingsRoutes);
router.use('/tenants', tenantsRoutes);
router.use('/notifications', notificationRoutes);
router.use('/super-admin', superadminRoutes);

export default router;
