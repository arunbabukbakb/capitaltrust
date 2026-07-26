import { Router } from 'express';
import { getMemberLedgerData, getLoanRepaymentHistory, getCollectionTypeHistory, getDueReportData } from '../controllers/reports';

const router = Router();

router.get('/member-ledger/:userId', getMemberLedgerData);
router.get('/member-ledger/loans/:loanMemberId/payments', getLoanRepaymentHistory);
router.get('/member-ledger/collections/:collectionTypeId/history', getCollectionTypeHistory);
router.get('/due-report', getDueReportData);

export default router;
