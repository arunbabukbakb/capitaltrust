import { Router } from 'express';
import { registerTenant } from '../controllers/tenants';

const router = Router();

/**
 * @swagger
 * /api/tenants/register:
 *   post:
 *     summary: Register a new tenant organization and its admin user
 *     tags: [Tenants]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyName
 *               - subdomain
 *               - adminName
 *               - adminEmail
 *               - adminUsername
 *               - adminPassword
 *             properties:
 *               companyName:
 *                 type: string
 *               subdomain:
 *                 type: string
 *               adminName:
 *                 type: string
 *               adminEmail:
 *                 type: string
 *               adminUsername:
 *                 type: string
 *               adminPassword:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tenant registered successfully
 *       400:
 *         description: Missing fields, invalid subdomain format, or already exists
 *       500:
 *         description: Internal server error
 */
router.post('/register', registerTenant);

export default router;
