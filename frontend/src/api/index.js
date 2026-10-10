/**
 * index.js — public interface for /frontend/src/api.
 * Screens and pages must only import network calls and hooks from this module.
 */

export { apiRequest, putToS3, ApiError } from './client.js';
export {
  normalizeCoordinates,
  normalizeScore,
  normalizeBand,
  normalizeHotspot,
  normalizeReport,
  normalizeSubscription,
  normalizeRiskSegment,
} from './normalize.js';
export {
  useHotspots,
  useHotspot,
  useReports,
  useCreateReport,
  useAlerts,
} from './hooks.js';
