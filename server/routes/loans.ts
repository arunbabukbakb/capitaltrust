import { Router } from 'express';
import { getLoans, createLoan, updateLoan, deleteLoan, approveLoan, requestLoan } from '../controllers/loans';

const router = Router();

/**
 * @swagger
 * /api/loans:
 *   get:
 *     summary: Get all loans in the register
 *     tags: [Loans]
 *     responses:
 *       200:
 *         description: Array of loans including members and slab rules
 *   post:
 *     summary: Create a structured loan entry
 *     tags: [Loans]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - loanType
 *               - amount
 *               - tenureMonths
 *               - startDate
 *               - interestMode
 *               - members
 *             properties:
 *               loanType:
 *                 type: string
 *                 enum: [Single, Group]
 *               amount:
 *                 type: number
 *               tenureMonths:
 *                 type: integer
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               interestMode:
 *                 type: string
 *                 enum: [Fixed, Variable]
 *               interestRate:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [Pending, Active, Closed, Cancelled]
 *               members:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - userId
 *                     - loanShareAmount
 *                   properties:
 *                     userId:
 *                       type: string
 *                     loanShareAmount:
 *                       type: number
 *               slabs:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - fromAmount
 *                     - toAmount
 *                     - interestRate
 *                   properties:
 *                     fromAmount:
 *                       type: number
 *                     toAmount:
 *                       type: number
 *                     interestRate:
 *                       type: number
 *     responses:
 *       201:
 *         description: Created loan object
 *       400:
 *         description: Validation payload error
 */
router.get('/', getLoans);
router.post('/request', requestLoan);
router.post('/', createLoan);

/**
 * @swagger
 * /api/loans/{id}:
 *   put:
 *     summary: Update an existing structured loan entry
 *     tags: [Loans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - loanType
 *               - amount
 *               - tenureMonths
 *               - startDate
 *               - interestMode
 *               - members
 *             properties:
 *               loanType:
 *                 type: string
 *                 enum: [Single, Group]
 *               amount:
 *                 type: number
 *               tenureMonths:
 *                 type: integer
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               interestMode:
 *                 type: string
 *                 enum: [Fixed, Variable]
 *               interestRate:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [Pending, Active, Closed, Cancelled]
 *               members:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - userId
 *                     - loanShareAmount
 *                   properties:
 *                     userId:
 *                       type: string
 *                     loanShareAmount:
 *                       type: number
 *               slabs:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - fromAmount
 *                     - toAmount
 *                     - interestRate
 *                   properties:
 *                     fromAmount:
 *                       type: number
 *                     toAmount:
 *                       type: number
 *                     interestRate:
 *                       type: number
 *     responses:
 *       200:
 *         description: Updated loan object
 *       400:
 *         description: Validation payload error or loan amount less than repayment
 *       404:
 *         description: Loan not found
 *   delete:
 *     summary: Delete a structured loan entry
 *     tags: [Loans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Loan deleted successfully
 *       404:
 *         description: Loan not found
 *       409:
 *         description: Delete blocked because repayments already started
 */
router.put('/:id', updateLoan);
router.delete('/:id', deleteLoan);
router.post('/:id/approve', approveLoan);

export default router;
