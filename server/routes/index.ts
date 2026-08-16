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
import expensesRoutes from './expenses';
import transactionsRoutes from './transactions';
import reportsRoutes from './reports';
import contactRoutes from './contact';
import trafficRoutes from './traffic';
import tenantOrgRoutes from './tenantOrganization';
import meetingsRoutes from './meetings';
import passbookRoutes from './passbook';

const router = Router();


// Tenant resolution middleware to resolve subdomain string to integer ID
router.use(async (req, res, next) => {
  let subdomain = req.headers['x-tenant-id'] as string;
  if (!subdomain) {
    subdomain = 'demo';
  }

  if (subdomain === 'demo' || subdomain === 'default') {
    req.headers['x-tenant-id'] = '1';
  } else {
    try {
      const db = getDatabase();
      const tenant = await db.get("SELECT id FROM tenants WHERE LOWER(subdomain) = ?", [subdomain.toLowerCase().trim()]);
      if (tenant) {
        req.headers['x-tenant-id'] = String(tenant.id);
      } else {
        req.headers['x-tenant-id'] = '-1'; // Use -1 to represent non-existent tenant instead of falling back to demo (1)
      }
    } catch (err) {
      console.error("[Tenant Resolution Middleware] Error:", err);
      req.headers['x-tenant-id'] = '-1'; // Use -1 on error
    }
  }
  next();
});

// Demo / Read-Only Mode Middleware
router.use((req, res, next) => {
  const method = req.method;
  const path = req.path;

  // Modifying methods (POST, PUT, DELETE, PATCH)
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    // Exempt authentication, password reset, tenant creation/payment, super-admin, and traffic telemetry operations
    const isExempt =
      path.startsWith('/auth/login') ||
      path.startsWith('/auth/logout') ||
      path.startsWith('/tenants') ||
      path.startsWith('/super-admin') ||
      path.startsWith('/contact') ||
      path.startsWith('/menus') ||
      path.startsWith('/traffic');

    if (!isExempt) {
      const tenantId = req.headers['x-tenant-id'] as string;
      const isDefaultTenant = tenantId === '1';
      const isDemoMode = process.env.DEMO_MODE === 'true' || isDefaultTenant;

      if (isDemoMode) {
        return res.status(403).json({
          error: "Action disabled: The portal is running in Demo Mode (Read-Only)."
        });
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
router.use('/expenses', expensesRoutes);
router.use('/transactions', transactionsRoutes);
router.use('/reports', reportsRoutes);
router.use('/contact', contactRoutes);
router.use('/traffic', trafficRoutes);
router.use('/', tenantOrgRoutes);
router.use('/', meetingsRoutes);
router.use('/', passbookRoutes);

export default router;
