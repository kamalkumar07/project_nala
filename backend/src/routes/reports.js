/**
 * Reports routes (section 6.4):
 *
 *   POST   /api/v1/reports              Submit a new flood report
 *   GET    /api/v1/reports              Map pins (bbox + since + limit)
 *   GET    /api/v1/reports/:id          Poll status / assessment
 *   PATCH  /api/v1/reports/:id/confirm  Citizen confirms / corrects depth
 */

import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { standardLimiter } from '../middleware/rateLimit.js';
import {
  createReport,
  getReport,
  listReports,
  confirmReport,
} from '../services/index.js';

const router = Router();

// ── POST /reports ───────────────────────────────────────────────────────────

const CreateReportBody = z.object({
  photoKey:        z.string().min(1),
  lat:             z.number().min(-90).max(90),
  lng:             z.number().min(-180).max(180),
  hazardType:      z.enum(['flood', 'landslide', 'waterlogging', 'road_damage', 'other']).default('flood'),
  note:            z.string().max(500).optional(),
  clientTimestamp: z.string().datetime({ offset: true }).optional(),
});

router.post(
  '/reports',
  standardLimiter,
  validate({ body: CreateReportBody }),
  async (req, res, next) => {
    try {
      const result = await createReport(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /reports ─────────────────────────────────────────────────────────────

const ListReportsQuery = z.object({
  bbox: z
    .string()
    .regex(
      /^-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*$/,
      'bbox must be minLng,minLat,maxLng,maxLat',
    )
    .optional(),
  since: z.string().datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().positive().max(200).default(200),
});

router.get(
  '/reports',
  validate({ query: ListReportsQuery }),
  async (req, res, next) => {
    try {
      const reports = await listReports(req.query);
      res.json(reports);
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /reports/:id ──────────────────────────────────────────────────────────

router.get('/reports/:id', async (req, res, next) => {
  try {
    const report = await getReport(req.params.id);
    res.json(report);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /reports/:id/confirm ────────────────────────────────────────────────

const ConfirmBody = z.object({
  userConfirmed: z.boolean(),
  userDepthClass: z
    .enum(['ankle', 'knee', 'waist', 'unknown'])
    .optional(),
});

router.patch(
  '/reports/:id/confirm',
  validate({ body: ConfirmBody }),
  async (req, res, next) => {
    try {
      const report = await confirmReport(req.params.id, req.body);
      res.json(report);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
