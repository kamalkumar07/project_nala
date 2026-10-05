/**
 * POST /api/v1/uploads/presign
 * Returns a presigned S3 PUT URL for a citizen photo upload.
 * Auth: none (rate-limited).
 */

import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { presignLimiter } from '../middleware/rateLimit.js';
import { presignUpload } from '../services/index.js';
import env from '../config/env.js';

const router = Router();

const PresignBody = z.object({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(env.MAX_UPLOAD_BYTES, `File must be ≤ ${env.MAX_UPLOAD_BYTES} bytes`),
});

router.post(
  '/uploads/presign',
  presignLimiter,
  validate({ body: PresignBody }),
  async (req, res, next) => {
    try {
      const result = await presignUpload(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
