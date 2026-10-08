/**
 * hotspots.js — GET /api/v1/hotspots
 *
 * Returns ranked flood-risk hotspots for the given area.
 * Used by the frontend map and ward dashboard to show risk markers.
 *
 * Query params:
 *   district  string (optional) — filter to a specific district name
 *   bbox      string (optional) — "minLng,minLat,maxLng,maxLat"
 *   riskBand  "LOW"|"MEDIUM"|"HIGH" (optional) — filter by minimum band
 *   limit     integer 1-100, default 20
 *
 * Response 200:
 * {
 *   "hotspots": [{
 *     "hotspotId":     string,
 *     "district":      string,
 *     "wardId":        string,
 *     "wardNo":        string,
 *     "wardName":      string,
 *     "latitude":      number,
 *     "longitude":     number,
 *     "riskScore":     number  (0–100),
 *     "riskBand":      "LOW"|"MEDIUM"|"HIGH",
 *     "reportCount":   number,
 *     "activeReports": number,
 *     "lastUpdated":   ISO-8601,
 *     "riskFactors":   { rainfall, reports, lowness }
 *   }],
 *   "total":     number,
 *   "updatedAt": ISO-8601
 * }
 *
 * Auth: none (public).
 */

import { Router } from 'express';
import { z } from 'zod';
import { validate }      from '../middleware/validate.js';
import { getHotspots }   from '../services/index.js';

const router = Router();

const RISK_BAND_ORDER = { LOW: 0, MEDIUM: 1, HIGH: 2 };

const HotspotsQuery = z.object({
  district: z.string().optional(),
  bbox: z
    .string()
    .regex(
      /^-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*$/,
      'bbox must be minLng,minLat,maxLng,maxLat',
    )
    .optional(),
  riskBand: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
});

router.get(
  '/hotspots',
  validate({ query: HotspotsQuery }),
  async (req, res, next) => {
    try {
      const { district, bbox, riskBand, limit } = req.query;

      let hotspots = await getHotspots({ district, bbox });

      // Filter by minimum risk band
      if (riskBand) {
        const minOrder = RISK_BAND_ORDER[riskBand] ?? 0;
        hotspots = hotspots.filter(
          (h) => (RISK_BAND_ORDER[h.riskBand] ?? 0) >= minOrder,
        );
      }

      // Apply bbox filter in Express when the service doesn't handle it
      if (bbox) {
        const [minLng, minLat, maxLng, maxLat] = bbox.split(',').map(Number);
        hotspots = hotspots.filter(
          (h) =>
            h.longitude >= minLng &&
            h.longitude <= maxLng &&
            h.latitude  >= minLat &&
            h.latitude  <= maxLat,
        );
      }

      // Sort by riskScore descending
      hotspots.sort((a, b) => b.riskScore - a.riskScore);

      // Apply limit
      const results = hotspots.slice(0, limit);

      res.json({
        hotspots:  results,
        total:     results.length,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
