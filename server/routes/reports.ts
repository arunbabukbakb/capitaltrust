import { Router } from 'express';
import { getMemberLedgerData, getLoanRepaymentHistory, getCollectionTypeHistory } from '../controllers/reports';

const router = Router();

router.get('/member-ledger/:userId', getMemberLedgerData);
router.get('/member-ledger/loans/:loanMemberId/payments', getLoanRepaymentHistory);
router.get('/member-ledger/collections/:collectionTypeId/history', getCollectionTypeHistory);

export default router;
