/**
 * Ward officer routes (JWT ward_officer role required):
 *
 *   GET   /api/v1/ward/hotspots             Ranked pump-priority list
 *   GET   /api/v1/ward/reports              Report feed by wardId / status
 *   PATCH /api/v1/ward/reports/:id/status   Update ops status
 */

import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireWardOfficer } from '../middleware/auth.js';
import {
  getHotspots,
  getWardReports,
  patchReportStatus,
} from '../services/index.js';

const router = Router();

// All ward routes require the ward_officer role
router.use(requireWardOfficer);

// ── GET /ward/hotspots ────────────────────────────────────────────────────────

const HotspotsQuery = z.object({
  wardId: z.string().optional(),
});

router.get(
  '/ward/hotspots',
  validate({ query: HotspotsQuery }),
  async (req, res, next) => {
    try {
      const hotspots = await getHotspots(req.query);
      res.json(hotspots);
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /ward/reports ─────────────────────────────────────────────────────────

const WardReportsQuery = z.object({
  wardId: z.string().optional(),
  status: z.enum(['open', 'dispatched', 'resolved']).optional(),
});

router.get(
  '/ward/reports',
  validate({ query: WardReportsQuery }),
  async (req, res, next) => {
    try {
      const reports = await getWardReports(req.query);
      res.json(reports);
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /ward/reports/:id/status ────────────────────────────────────────────

const PatchStatusBody = z.object({
  opsStatus: z.enum(['open', 'dispatched', 'resolved']),
});

router.patch(
  '/ward/reports/:id/status',
  validate({ body: PatchStatusBody }),
  async (req, res, next) => {
    try {
      const report = await patchReportStatus(req.params.id, req.body);
      res.json(report);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
