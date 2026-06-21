import { Router } from 'express';
import { getPayments, createPayment } from '../controllers/payments';

const router = Router();

/**
 * @swagger
 * /api/payments:
 *   get:
 *     summary: Get all cash repayment transactions
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Array of payments in historical order
 *   post:
 *     summary: Submit a loan principal or installment payment
 *     tags: [Payments]
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
 *               type:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created payment verification
 *       400:
 *         description: Missing amount
 */
router.get('/', getPayments);
router.post('/', createPayment);

export default router;
