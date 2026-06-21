import { Router } from 'express';
import { getContributions, createContribution } from '../controllers/contributions';

const router = Router();

/**
 * @swagger
 * /api/contributions:
 *   get:
 *     summary: Get all capital contributions list
 *     tags: [Contributions]
 *     responses:
 *       200:
 *         description: Array of contributions details
 *   post:
 *     summary: Register a new capital contribution to the liquidity pool
 *     tags: [Contributions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *               method:
 *                 type: string
 *               reinvestmentEnabled:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Created contribution verification
 *       400:
 *         description: Missing amount
 */
router.get('/', getContributions);
router.post('/', createContribution);

export default router;
