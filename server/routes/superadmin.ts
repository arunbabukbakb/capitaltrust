import { Router } from 'express';
import {
  superAdminLogin,
  getSuperAdminProfile,
  listTenants,
  toggleTenantStatus,
  updateSuperAdminProfile,
  getPriceDetails,
  updatePriceDetails,
  confirmTenantPayment,
  listTenantAmcRecords,
  payTenantAmcRecord
} from '../controllers/superadmin';

const router = Router();

router.post('/login', superAdminLogin);
router.get('/me', getSuperAdminProfile);
router.get('/tenants', listTenants);
router.post('/tenants/:id/status', toggleTenantStatus);
router.put('/profile', updateSuperAdminProfile);
router.get('/price', getPriceDetails);
router.put('/price', updatePriceDetails);
router.post('/tenants/:id/confirm-payment', confirmTenantPayment);
router.get('/tenants/:id/amc', listTenantAmcRecords);
router.post('/amc/:id/pay', payTenantAmcRecord);

export default router;
