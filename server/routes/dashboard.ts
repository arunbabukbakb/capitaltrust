import { Router } from 'express';
import { getStats, getDashboardSummary } from '../controllers/dashboard';

const RouterInstance = Router();

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
RouterInstance.get('/stats', getStats);
RouterInstance.get('/summary', getDashboardSummary);

export default RouterInstance;
