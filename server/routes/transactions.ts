import { Router } from 'express';
import { getTransactions, getTransactionSummary } from '../controllers/transactions';

const router = Router();

router.get('/summary', getTransactionSummary);
router.get('/', getTransactions);

export default router;
