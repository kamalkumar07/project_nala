/**
 * GET /api/v1/risk — risk segments for the map overlay.
 * Auth: none.
 */

import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { getRisk } from '../services/index.js';

const router = Router();

const RiskQuery = z.object({
  bbox: z
    .string()
    .regex(
      /^-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*$/,
      'bbox must be minLng,minLat,maxLng,maxLat',
    )
    .optional(),
});

router.get(
  '/risk',
  validate({ query: RiskQuery }),
  async (req, res, next) => {
    try {
      const segments = await getRisk(req.query);
      res.json(segments);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
