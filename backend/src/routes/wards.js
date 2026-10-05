/**
 * GET /api/v1/wards — list all wards (static pilot seed).
 * Auth: none.
 */

import { Router } from 'express';
import { listWards } from '../services/index.js';

const router = Router();

router.get('/wards', async (_req, res, next) => {
  try {
    const wards = await listWards();
    res.json(wards);
  } catch (err) {
    next(err);
  }
});

export default router;
