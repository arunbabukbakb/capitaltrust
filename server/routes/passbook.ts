import { Router } from 'express';
import { getMemberPassbookData, getMemberPassbookTransactions } from '../controllers/passbook';

const router = Router();

router.get('/members/:memberId/passbook', getMemberPassbookData);
router.get('/members/:memberId/passbook/transactions', getMemberPassbookTransactions);

export default router;
