/**
 * cloudApi.js — real Cloud API implementation.
 *
 * Base: https://wlsar6ezkg.execute-api.ap-south-1.amazonaws.com/dev
 * Auth: x-api-key header (API Gateway usage plan key).
 * Timeout: CLOUD_API_TIMEOUT_MS (default 8 s).
 *
 * ── Implemented (ready) ──────────────────────────────────────────────────────
 *   presignUpload   POST /cloud/uploads/presign
 *   createReport    POST /cloud/reports
 *   getReport       GET  /cloud/reports/{id}
 *   listReports     GET  /cloud/reports?geohash=&limit=&cursor=  (bbox → geohash)
 *   confirmReport   PATCH /cloud/reports/{id}   (citizen confirm / correct)
 *
 * ── NOT_IMPLEMENTED stubs (stay on mock) ────────────────────────────────────
 *   getRisk, getHotspots, getWardReports, patchReportStatus,
 *   createSubscription, deleteSubscription, listWards
 *
 * ── Field translations ───────────────────────────────────────────────────────
 *   userDepthClass:  "unknown" (Express contract) ↔ "no_flood" (Cloud API)
 *   listReports:     bbox string → ngeohash prefix list → paginated fan-out
 *
 * ── Error mapping ────────────────────────────────────────────────────────────
 *   Cloud 403          → FORBIDDEN   (invalid reportToken)
 *   Cloud 404          → NOT_FOUND
 *   Cloud 401          → UNAUTHORIZED
 *   Cloud 5xx / other  → UPSTREAM_ERROR
 *   fetch AbortError   → UPSTREAM_TIMEOUT
 *   network failure    → UPSTREAM_ERROR
 */

import { fetch } from 'undici';
import ngeohash from 'ngeohash';
import env from '../config/env.js';
import { Errors } from '../middleware/errorHandler.js';
import logger from '../logger.js';

const BASE    = env.CLOUD_API_BASE_URL;
const KEY     = env.CLOUD_API_KEY;
const TIMEOUT = env.CLOUD_API_TIMEOUT_MS;

// Geohash precision 5 ≈ 4.9 km × 4.9 km — good ward-level granularity.
// Keeps upstream call count at ~4-12 for a typical Delhi ward bbox.
const GEOHASH_PRECISION = 5;

// ── Field translators ─────────────────────────────────────────────────────────

/**
 * Express contract uses "unknown"; Cloud API uses "no_flood".
 * Both mean "AI could not determine depth". Translate in both directions.
 */
const toCloudDepth   = (d) => (d === 'unknown'  ? 'no_flood' : d);
const fromCloudDepth = (d) => (d === 'no_flood' ? 'unknown'  : d);

/**
 * Normalise a report from the Cloud API into the §7 shape Express expects.
 * Handles both nested assessment (ideal) and flat fields (fallback) since
 * the exact Cloud API response shape is OPEN (integration-mapping.md #O-2).
 */
function normaliseReport(raw) {
  if (!raw) return raw;

  // If the Cloud API already returns a nested assessment object, use it.
  // Otherwise reshape from flat fields (depthClass / passable / confidence /
  // rationale at the top level).
  const assessment = raw.assessment ?? (
    raw.depthClass != null
      ? {
          depthClass:  fromCloudDepth(raw.depthClass),
          passable:    raw.passable    ?? 'unknown',
          confidence:  raw.confidence  ?? null,
          rationale:   raw.rationale   ?? '',
        }
      : null
  );

  // Normalise depthClass inside the nested object too
  if (assessment?.depthClass) {
    assessment.depthClass = fromCloudDepth(assessment.depthClass);
  }

  return {
    ...raw,
    assessment,
    // Flatten away top-level depth fields if they existed
    depthClass:  undefined,
    passable:    undefined,
    confidence:  undefined,
    rationale:   undefined,
  };
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

/**
 * @param {'GET'|'POST'|'PATCH'|'DELETE'} method
 * @param {string} path  — path after BASE (include leading /)
 * @param {object|undefined} body
 * @returns {Promise<object|null>}
 */
async function request(method, path, body) {
  const url = `${BASE}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);

  let res;
  try {
    res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(KEY ? { 'x-api-key': KEY } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw Errors.upstreamTimeout(`Cloud API timed out: ${method} ${path}`);
    }
    logger.error({ err, url }, 'Cloud API network error');
    throw Errors.upstreamError(`Cloud API unreachable: ${err.message}`);
  }

  clearTimeout(timer);

  if (res.status === 204) return null;

  // Always try to read the body — error responses also carry a message
  let json;
  try {
    json = await res.json();
  } catch (_) {
    json = null;
  }

  if (!res.ok) {
    const detail = json?.message ?? json?.error ?? JSON.stringify(json) ?? '';
    logger.warn({ status: res.status, url, detail }, 'Cloud API error response');

    switch (res.status) {
      case 401: throw Errors.unauthorized(detail || 'Unauthorized');
      case 403: throw Errors.forbidden(detail   || 'Invalid or expired report token');
      case 404: throw Errors.notFound(detail    || 'Resource not found');
      default:  throw Errors.upstreamError(detail || `Cloud API returned ${res.status}`);
    }
  }

  return json;
}

// ── Implemented endpoints ─────────────────────────────────────────────────────

/**
 * POST /cloud/uploads/presign
 * @param {{ contentType: string, sizeBytes: number }} params
 * @returns {{ photoKey: string, uploadUrl: string, expiresIn: number }}
 */
export async function presignUpload({ contentType, sizeBytes }) {
  const extension = contentType === 'image/png'
    ? 'png'
    : contentType === 'image/webp'
      ? 'webp'
      : 'jpg';

  return request('POST', '/cloud/uploads/presign', {
    file_name: `upload.${extension}`,
    content_type: contentType,
  });
}

/**
 * POST /cloud/reports
 * @param {{ photoKey, lat, lng, note?, clientTimestamp? }} params
 * @returns {{ reportId, status:'analyzing', reportToken }}
 */
export async function createReport({ photoKey, lat, lng, note, clientTimestamp }) {
  return request('POST', '/cloud/reports', {
    photoKey,
    lat,
    lng,
    note,
    clientTimestamp,
  });
}

/**
 * GET /cloud/reports/{id}
 * @param {string} reportId
 */
export async function getReport(reportId) {
  const raw = await request('GET', `/cloud/reports/${reportId}`);
  return normaliseReport(raw);
}

/**
 * GET /cloud/reports?geohash=&limit=20&cursor=
 *
 * The Cloud API is paginated by geohash prefix, not by bbox.
 * Strategy:
 *   1. Convert the Express bbox string to a set of precision-5 geohash prefixes
 *      using ngeohash.bboxes().
 *   2. For each prefix, fetch all pages (following nextCursor) until exhausted.
 *   3. Merge, deduplicate on reportId, apply in-Express since filter, cap at limit.
 *
 * @param {{ bbox?: string, since?: string, limit?: number }} params
 */
export async function listReports({ bbox, since, limit = 200 } = {}) {
  // Without a bbox we fall back to a no-geohash request — the Cloud API
  // will return recent items in its own default order.
  if (!bbox) {
    const data = await request('GET', '/cloud/reports?limit=20');
    return (data?.items ?? []).map(normaliseReport);
  }

  const [minLng, minLat, maxLng, maxLat] = bbox.split(',').map(Number);

  // Get the geohash prefixes that cover this bbox
  const prefixes = ngeohash.bboxes(minLat, minLng, maxLat, maxLng, GEOHASH_PRECISION);
  logger.debug({ prefixes, bbox }, 'listReports: geohash prefixes');

  const seen    = new Set();
  const results = [];

  // Process prefixes sequentially to avoid bursting the Cloud API
for (const prefix of prefixes) {
  let cursor = null;

  do {
    const qs = new URLSearchParams({ geohash: prefix, limit: '20' });
    if (cursor) qs.set('cursor', cursor);

    const data = await request('GET', `/cloud/reports?${qs}`);
    const items = data?.items ?? [];
    cursor = data?.nextCursor ?? null;

    for (const item of items) {
      if (!seen.has(item.reportId)) {
        seen.add(item.reportId);
        results.push(normaliseReport(item));
      }
    }
  } while (cursor !== null);
}

  // Apply since filter in Express (Cloud API has no since param — O-5)
  const sinceMs = since ? new Date(since).getTime() : null;
  const filtered = sinceMs
    ? results.filter((r) => new Date(r.createdAt).getTime() >= sinceMs)
    : results;

  // Sort newest-first and cap to limit
  return filtered
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
}

/**
 * PATCH /cloud/reports/{id}  — citizen confirms or corrects AI depth.
 *
 * Translates userDepthClass: "unknown" → "no_flood" before sending.
 * Cloud API returns 403 when reportToken is invalid — maps to FORBIDDEN.
 *
 * @param {string} reportId
 * @param {{ userConfirmed: boolean, userDepthClass?: string, reportToken?: string }} patch
 */
export async function confirmReport(reportId, patch) {
  const body = {
    userConfirmed: patch.userConfirmed,
    ...(patch.userDepthClass !== undefined && {
      userDepthClass: toCloudDepth(patch.userDepthClass),
    }),
    ...(patch.reportToken !== undefined && {
      reportToken: patch.reportToken,
    }),
  };
  const raw = await request('PATCH', `/cloud/reports/${reportId}`, body);
  return normaliseReport(raw);
}

// ── NOT_IMPLEMENTED stubs (remain on mockApi via services/index.js) ───────────

function notImplemented(name) {
  return function () {
    throw Errors.upstreamError(
      `cloudApi.${name} is not yet implemented — use mock`,
    );
  };
}

export const getRisk             = notImplemented('getRisk');

/**
 * GET /cloud/hotspots
 * Returns ranked flood-risk hotspots matching the Phase 3 contract.
 * Response shape: { hotspots: [...], total, updatedAt }
 *
 * TODO: Kamal to confirm the exact Cloud API path and pagination scheme.
 * Endpoint assumed: GET /cloud/hotspots?district=&bbox=&riskBand=&limit=
 *
 * @param {{ district?: string, bbox?: string, riskBand?: string, limit?: number }} params
 */
export async function getHotspots({ district, bbox, riskBand, limit = 20 } = {}) {
  const qs = new URLSearchParams();
  if (district) qs.set('district', district);
  if (bbox)     qs.set('bbox',     bbox);
  if (riskBand) qs.set('riskBand', riskBand);
  qs.set('limit', String(limit));
  return request('GET', `/cloud/hotspots?${qs}`);
}

export const getWardReports      = notImplemented('getWardReports');export const patchReportStatus   = notImplemented('patchReportStatus');
export const createSubscription  = notImplemented('createSubscription');
export const deleteSubscription  = notImplemented('deleteSubscription');
export const listWards           = notImplemented('listWards');
