/**
 * Alerts / subscriptions routes:
 *
 *   POST   /api/v1/alerts/subscriptions      Subscribe to nearby alerts
 *   DELETE /api/v1/alerts/subscriptions/:id  Unsubscribe
 *
 * Auth: none (rate-limited).
 */

import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { standardLimiter } from '../middleware/rateLimit.js';
import { createSubscription, deleteSubscription } from '../services/index.js';

const router = Router();

const CreateSubBody = z.object({
  channel: z.enum(['email', 'push']),
  contact: z.string().min(1).max(320),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusM: z.number().int().positive().max(50000).default(1000),
});

router.post(
  '/alerts/subscriptions',
  standardLimiter,
  validate({ body: CreateSubBody }),
  async (req, res, next) => {
    try {
      const sub = await createSubscription(req.body);
      res.status(201).json(sub);
    } catch (err) {
      next(err);
    }
  },
);

router.delete('/alerts/subscriptions/:id', async (req, res, next) => {
  try {
    await deleteSubscription(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
