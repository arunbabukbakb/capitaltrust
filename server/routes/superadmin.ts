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
  testSmtpConnection,
  sendTenantBroadcastMail,
  resetFullData,
  getGlobalCompanyDetails,
  updateGlobalCompanyDetails,
  getLiveInboxMessages,
  replyToInboxEmail,
  deleteInboxMessage,
  updateSuperAdminPushToken,
  listVideoTutorials,
  createVideoTutorial,
  updateVideoTutorial,
  toggleVideoTutorialStatus,
  deleteVideoTutorial,
  getPublicVideoTutorials
} from '../controllers/superadmin';
import {
  listOrganizationTypes,
  getActiveOrganizationTypes,
  createOrganizationType,
  updateOrganizationType,
  toggleOrganizationTypeStatus,
  deleteOrganizationType
} from '../controllers/organizationTypes';

const router = Router();

router.post('/login', superAdminLogin);
router.get('/me', getSuperAdminProfile);
router.get('/tenants', listTenants);
router.post('/tenants/:id/status', toggleTenantStatus);
router.put('/tenants/:id', updateTenantDetails);
router.put('/profile', updateSuperAdminProfile);
router.get('/price', getPriceDetails);
router.put('/price', updatePriceDetails);
router.get('/company-details', getGlobalCompanyDetails);
router.put('/company-details', updateGlobalCompanyDetails);
router.post('/tenants/:id/confirm-payment', confirmTenantPayment);
router.get('/tenants/:id/amc', listTenantAmcRecords);
router.post('/amc/:id/pay', payTenantAmcRecord);
router.post('/reset-data', resetFullData);

// SMTP Settings, Live Inbox, Push Tokens & Broadcast Mail Routes
router.get('/smtp', listSmtpSettings);
router.post('/smtp', createSmtpSetting);
router.put('/smtp/:id', updateSmtpSetting);
router.post('/smtp/:id/activate', activateSmtpSetting);
router.delete('/smtp/:id', deleteSmtpSetting);
router.post('/smtp/:id/test', testSmtpConnection);
router.post('/send-mail', sendTenantBroadcastMail);
router.get('/inbox', getLiveInboxMessages);
router.post('/inbox/reply', replyToInboxEmail);
router.delete('/inbox/:uid', deleteInboxMessage);
router.post('/push-token', updateSuperAdminPushToken);

// Video Tutorial Routes
router.get('/video-tutorials/public', getPublicVideoTutorials);
router.get('/video-tutorials', listVideoTutorials);
router.post('/video-tutorials', createVideoTutorial);
router.put('/video-tutorials/:id', updateVideoTutorial);
router.patch('/video-tutorials/:id/status', toggleVideoTutorialStatus);
router.delete('/video-tutorials/:id', deleteVideoTutorial);

// Organization Type Master Routes
router.get('/organization-types/public', getActiveOrganizationTypes);
router.get('/organization-types', listOrganizationTypes);
router.post('/organization-types', createOrganizationType);
router.put('/organization-types/:id', updateOrganizationType);
router.patch('/organization-types/:id/status', toggleOrganizationTypeStatus);
router.delete('/organization-types/:id', deleteOrganizationType);

export default router;
