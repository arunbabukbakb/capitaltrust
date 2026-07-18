import { Router } from 'express';
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

const router = Router();

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

export default router;
