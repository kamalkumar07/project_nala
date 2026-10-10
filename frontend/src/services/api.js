/**
 * api.js — all network calls to the Express backend.
 *
 * Rules:
 *  - Uses VITE_API_BASE_URL (default ""). Empty string means same origin,
 *    which works with the Vite dev proxy and with the production CloudFront
 *    path-based routing (/api/* → Express origin).
 *  - Never imports AWS SDK or touches DynamoDB.
 *  - Every function throws an ApiError on non-2xx so callers can catch once.
 */

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

// ── Error type ────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  /** @param {number} status @param {string} code @param {string} message */
  constructor(status, code, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function request(method, path, body, signal) {
  const url = `${BASE}${path}`;
  const init = {
    method,
    headers: { 'Content-Type': 'application/json' },
    signal,
  };
  if (body !== undefined) init.body = JSON.stringify(body);

  let res;
  try {
    res = await fetch(url, init);
  } catch (err) {
    if (err.name === 'AbortError') throw err; // let callers handle cancellation
    // Network failure (offline, DNS, refused)
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your connection.');
  }

  if (res.status === 204) return null;

  let json;
  try {
    json = await res.json();
  } catch {
    throw new ApiError(res.status, 'PARSE_ERROR', `Unexpected response from server (${res.status})`);
  }

  if (!res.ok) {
    const code = json?.error?.code ?? 'UNKNOWN_ERROR';
    const message = json?.error?.message ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, code, message);
  }

  return json;
}

// ── S3 direct upload helper ───────────────────────────────────────────────────

/**
 * PUT a File/Blob directly to S3 using the presigned URL.
 * This never passes through Express — it goes straight to S3.
 * @param {string} uploadUrl  presigned PUT URL
 * @param {File}   file       the photo file
 * @param {AbortSignal} [signal]
 */
export async function putToS3(uploadUrl, file, signal) {
  let res;
  try {
    res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not upload photo. Check your connection.');
  }
  if (!res.ok) {
    throw new ApiError(res.status, 'S3_ERROR', `Photo upload failed (${res.status})`);
  }
}

// ── Uploads ───────────────────────────────────────────────────────────────────

/**
 * Ask Express for a presigned S3 PUT URL.
 * @param {{ contentType: string, sizeBytes: number }} params
 * @param {AbortSignal} [signal]
 * @returns {{ photoKey: string, uploadUrl: string, expiresIn: number }}
 */
export async function presignUpload({ contentType, sizeBytes }, signal) {
  return request('POST', '/api/v1/uploads/presign', { contentType, sizeBytes }, signal);
}

// ── Reports ───────────────────────────────────────────────────────────────────

/**
 * Submit a flood report (after photo is already in S3).
 * @param {{ photoKey: string, lat: number, lng: number, note?: string }} params
 * @param {AbortSignal} [signal]
 * @returns {{ reportId: string, status: string, reportToken: string }}
 */
export async function createReport({ photoKey, lat, lng, note }, signal) {
  return request(
    'POST',
    '/api/v1/reports',
    {
      photoKey,
      lat,
      lng,
      note,
      clientTimestamp: new Date().toISOString(),
    },
    signal,
  );
}

/**
 * Poll one report for status + assessment.
 * @param {string} reportId
 * @param {AbortSignal} [signal]
 */
export async function getReport(reportId, signal) {
  return request('GET', `/api/v1/reports/${reportId}`, undefined, signal);
}

/**
 * Citizen confirms or corrects the AI depth assessment.
 * @param {string} reportId
 * @param {{ userConfirmed: boolean, userDepthClass?: string }} patch
 * @param {AbortSignal} [signal]
 */
export async function confirmReport(reportId, patch, signal) {
  return request('PATCH', `/api/v1/reports/${reportId}/confirm`, patch, signal);
}

/**
 * List map pins.
 * @param {{ bbox?: string, since?: string, limit?: number }} params
 */
export async function listReports(params = {}, signal) {
  const qs = new URLSearchParams();
  if (params.bbox) qs.set('bbox', params.bbox);
  if (params.since) qs.set('since', params.since);
  if (params.limit) qs.set('limit', String(params.limit));
  const query = qs.toString() ? `?${qs}` : '';
  return request('GET', `/api/v1/reports${query}`, undefined, signal);
}

// ── Risk ──────────────────────────────────────────────────────────────────────

/**
 * Fetch risk segments for the map overlay.
 * @param {{ bbox?: string }} params
 * @param {AbortSignal} [signal]
 * @returns {Array<{ segmentId, wardId, score, band, drivers, updatedAt }>}
 */
export async function getRisk(params = {}, signal) {
  const qs = new URLSearchParams();
  if (params.bbox) qs.set('bbox', params.bbox);
  const query = qs.toString() ? `?${qs}` : '';
  return request('GET', `/api/v1/risk${query}`, undefined, signal);
}

// ── Ward officer ──────────────────────────────────────────────────────────────

/**
 * Internal helper that adds the Authorization header when a token is present.
 * Ward routes require JWT ward_officer role (or any token in mock mode).
 */
function wardRequest(method, path, token, body, signal) {
  const url = `${BASE}${path}`;
  const init = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal,
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  return fetch(url, init).then(async (res) => {
    if (res.status === 204) return null;
    let json;
    try { json = await res.json(); } catch {
      throw new ApiError(res.status, 'PARSE_ERROR', `Unexpected response (${res.status})`);
    }
    if (!res.ok) {
      throw new ApiError(
        res.status,
        json?.error?.code ?? 'UNKNOWN_ERROR',
        json?.error?.message ?? `Request failed (${res.status})`,
      );
    }
    return json;
  }).catch((err) => {
    if (err instanceof ApiError) throw err;
    if (err.name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your connection.');
  });
}

/**
 * Fetch the current ward officer identity (GET /api/v1/auth/me).
 * Used by the login flow to validate a token and get username/groups.
 * @param {string} token  Bearer token (or any string in mock mode)
 * @param {AbortSignal} [signal]
 */
export function getWardMe(token, signal) {
  return wardRequest('GET', '/api/v1/auth/me', token, undefined, signal);
}

/**
 * Fetch the ranked hotspot list for the ward dashboard.
 * @param {{ wardId?: string }} [params]
 * @param {string} [token]
 * @param {AbortSignal} [signal]
 * @returns {Array<{ rank, segmentId, score, openReports, latestReportAt, lat, lng }>}
 */
export function getWardHotspots(params = {}, token, signal) {
  const qs = new URLSearchParams();
  if (params.wardId) qs.set('wardId', params.wardId);
  const query = qs.toString() ? `?${qs}` : '';
  return wardRequest('GET', `/api/v1/ward/hotspots${query}`, token, undefined, signal);
}

/**
 * Fetch the ward report feed, optionally filtered by wardId and/or status.
 * @param {{ wardId?: string, status?: 'open'|'dispatched'|'resolved' }} [params]
 * @param {string} [token]
 * @param {AbortSignal} [signal]
 */
export function getWardReports(params = {}, token, signal) {
  const qs = new URLSearchParams();
  if (params.wardId) qs.set('wardId', params.wardId);
  if (params.status)  qs.set('status',  params.status);
  const query = qs.toString() ? `?${qs}` : '';
  return wardRequest('GET', `/api/v1/ward/reports${query}`, token, undefined, signal);
}

/**
 * Update the operational status of a report.
 * @param {string} reportId
 * @param {'open'|'dispatched'|'resolved'} opsStatus
 * @param {string} [token]
 * @param {AbortSignal} [signal]
 */
export function patchWardReportStatus(reportId, opsStatus, token, signal) {
  return wardRequest(
    'PATCH',
    `/api/v1/ward/reports/${reportId}/status`,
    token,
    { opsStatus },
    signal,
  );
}

// ── Alert subscriptions ───────────────────────────────────────────────────────

/**
 * Subscribe to nearby flood alerts.
 * @param {{ channel: 'email'|'push', contact: string,
 *           lat: number, lng: number, radiusM?: number }} params
 * @param {AbortSignal} [signal]
 * @returns {{ subscriptionId, channel, contact, lat, lng, radiusM }}
 */
export async function createSubscription(params, signal) {
  return request('POST', '/api/v1/alerts/subscriptions', params, signal);
}

/**
 * Cancel an alert subscription.
 * @param {string} subscriptionId
 * @param {AbortSignal} [signal]
 * @returns {null}
 */
export async function deleteSubscription(subscriptionId, signal) {
  return request(
    'DELETE',
    `/api/v1/alerts/subscriptions/${subscriptionId}`,
    undefined,
    signal,
  );
}

// ── Ward lookup ───────────────────────────────────────────────────────────────

/**
 * TODO: backend endpoint required.
 *
 * Reverse-geocode a lat/lng to a ward object.
 * Kamal needs to add: GET /api/v1/wards/lookup?lat=&lng=
 * Expected response: { wardNo, wardName, wardId, zoneName }
 *
 * Until that endpoint exists this function is NOT called — the frontend
 * resolves wards locally via wardFromLatLng() in mapUtils.js (ray-casting
 * against the bundled GeoJSON). This stub is here so the service interface
 * is declared and the call site is obvious when the backend is ready.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ wardNo: string, wardName: string } | null>}
 */
export async function getWardByLatLng(lat, lng, signal) {
  // TODO: replace with real endpoint once backend delivers:
  //   GET /api/v1/wards/lookup?lat={lat}&lng={lng}
  throw new ApiError(501, 'NOT_IMPLEMENTED',
    'getWardByLatLng: backend endpoint /api/v1/wards/lookup not yet available. ' +
    'Use wardFromLatLng() from mapUtils.js for local resolution.');
}
