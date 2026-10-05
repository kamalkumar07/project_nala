/**
 * services/index.js — per-function service router.
 *
 * Each exported function is sourced from either cloudApi.js or mockApi.js
 * based on two orthogonal controls:
 *
 *   1. USE_MOCK=false   → everything goes to the real Cloud API
 *      USE_MOCK=true    → everything goes to mock by default
 *
 *   2. Per-feature flags (independent of USE_MOCK):
 *        REAL_PRESIGN=true  → presignUpload uses cloudApi even in mock mode
 *        REAL_REPORTS=true  → createReport, getReport, listReports use cloudApi
 *        REAL_CONFIRM=true  → confirmReport uses cloudApi
 *
 * Functions that have no real implementation yet (risk, hotspots, ward ops,
 * subscriptions, wards) always use mockApi regardless of USE_MOCK, because
 * cloudApi.js exports NOT_IMPLEMENTED stubs for them. This prevents a hard
 * crash when USE_MOCK=false but Kamal hasn't delivered those endpoints yet.
 *
 * Decision table (columns = USE_MOCK, rows = function):
 *
 *   Function           USE_MOCK=true + flag=false  USE_MOCK=true + flag=true  USE_MOCK=false
 *   ─────────────────  ─────────────────────────   ──────────────────────    ──────────────
 *   presignUpload      mock                         real                      real
 *   createReport       mock                         real (REAL_REPORTS)       real
 *   getReport          mock                         real (REAL_REPORTS)       real
 *   listReports        mock                         real (REAL_REPORTS)       real
 *   confirmReport      mock                         real (REAL_CONFIRM)       real
 *   getRisk            mock                         mock                      mock *
 *   getHotspots        mock                         mock                      mock *
 *   getWardReports     mock                         mock                      mock *
 *   patchReportStatus  mock                         mock                      mock *
 *   createSubscription mock                         mock                      mock *
 *   deleteSubscription mock                         mock                      mock *
 *   listWards          mock                         mock                      mock *
 *
 *   * = cloudApi stub throws NOT_IMPLEMENTED; index.js routes to mock instead
 *       so these never break, even with USE_MOCK=false.
 */

import env from '../config/env.js';
import * as mock  from './mockApi.js';
import * as cloud from './cloudApi.js';

// Convenience: are we using the real Cloud API for a given feature?
const useReal = {
  presign:  !env.USE_MOCK || env.REAL_PRESIGN,
  reports:  !env.USE_MOCK || env.REAL_REPORTS,
  confirm:  !env.USE_MOCK || env.REAL_CONFIRM,
};

// ── Implemented real endpoints ────────────────────────────────────────────────
export const presignUpload  = useReal.presign  ? cloud.presignUpload  : mock.presignUpload;
export const createReport   = useReal.reports  ? cloud.createReport   : mock.createReport;
export const getReport      = useReal.reports  ? cloud.getReport      : mock.getReport;
export const listReports    = useReal.reports  ? cloud.listReports    : mock.listReports;
export const confirmReport  = useReal.confirm  ? cloud.confirmReport  : mock.confirmReport;

// ── Always on mock (no real endpoint yet) ─────────────────────────────────────
export const getRisk            = mock.getRisk;
export const getHotspots        = mock.getHotspots;
export const getWardReports     = mock.getWardReports;
export const patchReportStatus  = mock.patchReportStatus;
export const createSubscription = mock.createSubscription;
export const deleteSubscription = mock.deleteSubscription;
export const listWards          = mock.listWards;
