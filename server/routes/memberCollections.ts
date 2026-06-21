import { Router } from 'express';
import { 
  submitMemberCollections, 
  getCollectionSummary, 
  getAuditReport,
  getCollectionGroups,
  getCollectionGroupDetails
} from '../controllers/memberCollections';

const router = Router();

router.get('/', getCollectionGroups);
router.get('/audit', getAuditReport);
router.get('/summary/:typeId', getCollectionSummary);
router.get('/:id', getCollectionGroupDetails);
router.post('/submit', submitMemberCollections);

export default router;
