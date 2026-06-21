import { Router } from 'express';
import { getStats } from '../controllers/dashboard';

const router = Router();

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Retrieve aggregate performance statistics for dashboard widgets
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Dashboard stats including total outward loans, pool volume, arrears, health indexes
 */
router.get('/stats', getStats);

export default router;
