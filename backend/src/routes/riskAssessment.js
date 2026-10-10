/**
 * GET /api/v1/risk/assessment
 * Returns a point-based provisional AWS V1 risk assessment.
 */

import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { getRiskAssessment } from '../services/index.js';

const router = Router();

const optionalNumber = (schema) =>
  z.preprocess(
    (value) => (value === '' ? undefined : value),
    schema.optional(),
  );

const AssessmentQuery = z.object({
  lat: z.coerce.number().finite().min(-90).max(90),
  lng: z.coerce.number().finite().min(-180).max(180),

  rainfall_1d_mm: optionalNumber(
    z.coerce.number().finite().min(0),
  ),

  rainfall_3d_mm: optionalNumber(
    z.coerce.number().finite().min(0),
  ),

  slope_deg: optionalNumber(
    z.coerce.number().finite().min(0).max(90),
  ),

  tri: optionalNumber(
    z.coerce.number().finite().min(0),
  ),
});

router.get(
  '/risk/assessment',
  validate({ query: AssessmentQuery }),
  async (req, res, next) => {
    try {
      const assessment = await getRiskAssessment(req.query);
      res.json(assessment);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
