import { Router } from 'express';
import { handleContactFormSubmission } from '../controllers/contact';

const router = Router();

router.post('/send', handleContactFormSubmission);

export default router;
