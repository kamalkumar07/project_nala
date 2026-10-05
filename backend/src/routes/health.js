/**
 * GET /health — liveness check (no /api/v1 prefix).
 * Returns 200 so load balancers and CI can confirm the process is up.
 */

import { Router } from 'express';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
