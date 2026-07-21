import { Router } from 'express';
import { getExpenses, createExpense, approveExpense, cancelExpense, updateExpense, getTodayExpenseSummary } from '../controllers/expenses';

const router = Router();

/**
 * @swagger
 * /api/expenses:
 *   get:
 *     summary: Retrieve expense register for active tenant
 *     tags: [Expenses]
 *   post:
 *     summary: Create new expense record
 *     tags: [Expenses]
 */
router.get('/', getExpenses);
router.get('/today-summary', getTodayExpenseSummary);
router.post('/', createExpense);
router.put('/:id', updateExpense);
router.put('/:id/approve', approveExpense);
router.put('/:id/cancel', cancelExpense);

export default router;
