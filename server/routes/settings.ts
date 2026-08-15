import { Router } from 'express';
import { getCompanySettings, updateCompanySettings, uploadTenantLogo, getOrgSettings, updateOrgSettings } from '../controllers/settings';

const router = Router();

/**
 * @swagger
 * /api/settings/company:
 *   get:
 *     summary: Get company settings
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: Company settings details
 *   put:
 *     summary: Update company settings
 *     tags: [Settings]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyName
 *             properties:
 *               companyName:
 *                 type: string
 *               companyLogo:
 *                 type: string
 *               supportEmail:
 *                 type: string
 *               supportPhone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Company settings updated successfully
 *       400:
 *         description: Invalid parameters
 *       403:
 *         description: Access denied
 */
router.get('/company', getCompanySettings);
router.put('/company', updateCompanySettings);
router.put('/logo', uploadTenantLogo);
router.post('/logo', uploadTenantLogo);

router.get('/organization', getOrgSettings);
router.put('/organization', updateOrgSettings);
router.post('/organization', updateOrgSettings);

export default router;
