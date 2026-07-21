import { Router } from 'express';
import {
  superAdminLogin,
  getSuperAdminProfile,
  listTenants,
  toggleTenantStatus,
  updateTenantDetails,
  updateSuperAdminProfile,
  getPriceDetails,
  updatePriceDetails,
  confirmTenantPayment,
  listTenantAmcRecords,
  payTenantAmcRecord,
  listSmtpSettings,
  createSmtpSetting,
  updateSmtpSetting,
  activateSmtpSetting,
  deleteSmtpSetting,
  sendTenantBroadcastMail
} from '../controllers/superadmin';

const router = Router();

router.post('/login', superAdminLogin);
router.get('/me', getSuperAdminProfile);
router.get('/tenants', listTenants);
router.post('/tenants/:id/status', toggleTenantStatus);
router.put('/tenants/:id', updateTenantDetails);
router.put('/profile', updateSuperAdminProfile);
router.get('/price', getPriceDetails);
router.put('/price', updatePriceDetails);
router.post('/tenants/:id/confirm-payment', confirmTenantPayment);
router.get('/tenants/:id/amc', listTenantAmcRecords);
router.post('/amc/:id/pay', payTenantAmcRecord);

// SMTP Settings & Broadcast Mail Routes
router.get('/smtp', listSmtpSettings);
router.post('/smtp', createSmtpSetting);
router.put('/smtp/:id', updateSmtpSetting);
router.post('/smtp/:id/activate', activateSmtpSetting);
router.delete('/smtp/:id', deleteSmtpSetting);
router.post('/send-mail', sendTenantBroadcastMail);

export default router;
