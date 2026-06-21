import { Router } from 'express';
import { 
  getCollectionTypes, 
  createCollectionType, 
  updateCollectionType 
} from '../controllers/collectionTypes';

const router = Router();

router.get('/', getCollectionTypes);
router.post('/', createCollectionType);
router.put('/:id', updateCollectionType);

export default router;
