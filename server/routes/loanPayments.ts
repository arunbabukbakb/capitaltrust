import { Router } from 'express';
import { getLoanPaymentsList, approveLoanPayment, finalSubmitLoanPayments, deleteLoanPayment } from '../controllers/loanPayments';

const router = Router();

/**
 * @swagger
 * /api/loan-payments:
 *   get:
 *     summary: Get loan repayments list including dues, interest, principal, and status
 *     tags: [LoanPayments]
 *     parameters:
 *       - in: query
 *         name: loanId
 *         schema:
 *           type: string
 *         description: Loan ID for filtering group loan member dues
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Set to 'single' to fetch all single loans
 *     responses:
 *       200:
 *         description: Array of loan repayment details
 */
router.get('/', getLoanPaymentsList);

/**
 * @swagger
 * /api/loan-payments/final-submit:
 *   post:
 *     summary: Finalize and process a batch of approved and manual repayments
 *     tags: [LoanPayments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               payments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     loanMemberId:
 *                       type: integer
 *                     approved:
 *                       type: boolean
 *                     amountPaid:
 *                       type: number
 *                     requestId:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Batch processed successfully
 */
router.post('/final-submit', finalSubmitLoanPayments);

/**
 * @swagger
 * /api/loan-payments/{id}/approve:
 *   put:
 *     summary: Approve a loan repayment request (DEPRECATED - use /final-submit instead)
 *     tags: [LoanPayments]
 */
router.put('/:id/approve', approveLoanPayment);

/**
 * @swagger
 * /api/loan-payments:
 *   delete:
 *     summary: Delete the most recent payment for a loan member
 *     tags: [LoanPayments]
 */
router.delete('/', deleteLoanPayment);

export default router;
