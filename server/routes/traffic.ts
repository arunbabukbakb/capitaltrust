import { Router } from 'express';
import { recordTelemetry, getLiveMetrics, clearTransientLogs, runConcurrentProbe } from '../controllers/traffic';

const router = Router();

router.post('/telemetry', recordTelemetry);
router.get('/metrics', getLiveMetrics);
router.post('/probe', runConcurrentProbe);
router.delete('/metrics', clearTransientLogs);

export default router;
