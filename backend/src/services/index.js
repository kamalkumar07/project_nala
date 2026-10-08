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
 *        REAL_PRESIGN=true    → presignUpload   uses cloudApi
 *        REAL_REPORTS=true    → createReport / getReport / listReports use cloudApi
 *        REAL_CONFIRM=true    → confirmReport   uses cloudApi
 *        REAL_HOTSPOTS=true   → getHotspots     uses cloudApi
 *
 * Functions with no real Cloud API implementation yet always fall back to
 * mock (risk, ward ops, subscriptions, wards) — cloudApi exports
 * NOT_IMPLEMENTED stubs for them, but index.js shadows them with mock so
 * USE_MOCK=false doesn't break the server.
 *
 * ── Decision table ────────────────────────────────────────────────────────
 *  Function           MOCK + flag=false   MOCK + flag=true   USE_MOCK=false
 *  ────────────────── ─────────────────   ───────────────    ──────────────
 *  presignUpload      mock                real               real
 *  createReport       mock                real               real
 *  getReport          mock                real               real
 *  listReports        mock                real               real
 *  confirmReport      mock                real               real
 *  getHotspots        mock                real               real
 *  getRisk            mock                mock               mock *
 *  getWardReports     mock                mock               mock *
 *  patchReportStatus  mock                mock               mock *
 *  createSubscription mock                mock               mock *
 *  deleteSubscription mock                mock               mock *
 *  listWards          mock                mock               mock *
 *
 *  * cloudApi stub → NOT_IMPLEMENTED; index.js routes to mock to prevent crash.
 */

import env from '../config/env.js';
import * as mock  from './mockApi.js';
import * as cloud from './cloudApi.js';

const useReal = {
  presign:   !env.USE_MOCK || env.REAL_PRESIGN,
  reports:   !env.USE_MOCK || env.REAL_REPORTS,
  confirm:   !env.USE_MOCK || env.REAL_CONFIRM,
  hotspots:  !env.USE_MOCK || env.REAL_HOTSPOTS,
};

// ── Implemented real endpoints ────────────────────────────────────────────────
export const presignUpload  = useReal.presign   ? cloud.presignUpload  : mock.presignUpload;
export const createReport   = useReal.reports   ? cloud.createReport   : mock.createReport;
export const getReport      = useReal.reports   ? cloud.getReport      : mock.getReport;
export const listReports    = useReal.reports   ? cloud.listReports    : mock.listReports;
export const confirmReport  = useReal.confirm   ? cloud.confirmReport  : mock.confirmReport;
export const getHotspots    = useReal.hotspots  ? cloud.getHotspots    : mock.getHotspots;

// ── Always on mock (no real Cloud API endpoint yet) ───────────────────────────
export const getRisk            = mock.getRisk;
export const getWardReports     = mock.getWardReports;
export const patchReportStatus  = mock.patchReportStatus;
export const createSubscription = mock.createSubscription;
export const deleteSubscription = mock.deleteSubscription;
export const listWards          = mock.listWards;
