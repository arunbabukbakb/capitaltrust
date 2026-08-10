import { Router } from 'express';
import { 
  submitMemberCollections, 
  getCollectionSummary, 
  getAuditReport,
  getCollectionGroups,
  getCollectionGroupDetails,
  getOpeningBalances,
  saveOpeningBalances
} from '../controllers/memberCollections';

const router = Router();

router.get('/', getCollectionGroups);
router.get('/audit', getAuditReport);
router.get('/summary/:typeId', getCollectionSummary);
router.get('/opening-balance', getOpeningBalances);
router.post('/opening-balance', saveOpeningBalances);
router.get('/:id', getCollectionGroupDetails);
router.post('/submit', submitMemberCollections);

export default router;

