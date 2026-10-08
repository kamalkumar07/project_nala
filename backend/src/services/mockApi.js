/**
 * mockApi.js — mock implementation of every Cloud API method.
 *
 * All methods share the same signatures as cloudApi.js so routes never
 * need to know which implementation is active.
 *
 * Behaviour:
 *  - presignUpload  → returns a fake S3 URL immediately
 *  - createReport   → stores the report in memory with status "analyzing",
 *                     then transitions to "assessed" after ~3 s
 *  - getReport      → reads from the in-memory store
 *  - listReports    → returns seed data merged with any in-memory reports
 *  - patchReport    → updates userConfirmed / userDepthClass / opsStatus in memory
 *  - getRisk        → returns seed risk segments (optionally bbox-filtered)
 *  - getHotspots    → returns seed hotspots (optionally wardId-filtered)
 *  - createSubscription / deleteSubscription → in-memory CRUD
 */

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Errors } from '../middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mocksDir = path.join(__dirname, '../mocks');

// ── helpers ────────────────────────────────────────────────────────────────

async function loadSeed(filename) {
  const raw = await readFile(path.join(mocksDir, filename), 'utf8');
  return JSON.parse(raw);
}

function nanoid() {
  return Math.random().toString(36).slice(2, 12).toUpperCase();
}

function nowIso() {
  return new Date().toISOString();
}

// ── in-memory stores (seeded lazily) ───────────────────────────────────────

let _reports = null;
let _subscriptions = null;

async function getReports() {
  if (!_reports) _reports = await loadSeed('reports.json');
  return _reports;
}

async function getSubscriptions() {
  if (!_subscriptions) _subscriptions = await loadSeed('subscriptions.json');
  return _subscriptions;
}

// ── depth-class assessment helper (deterministic for a given photoKey) ─────

const DEPTH_CLASSES = ['ankle', 'knee', 'waist'];
const PASSABLE_MAP = { ankle: 'caution', knee: 'no', waist: 'no' };
const RATIONALES = {
  ankle: 'Shallow pooling; two-wheelers should proceed with care',
  knee: 'Significant water depth; pedestrian and two-wheeler passage unsafe',
  waist: 'Deep flooding; all vehicles should avoid this route',
};

function fakeAssessment(photoKey) {
  // Pick a class deterministically from the photoKey so repeated polls
  // return the same result for the same submission.
  const idx =
    photoKey.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) %
    DEPTH_CLASSES.length;
  const depthClass = DEPTH_CLASSES[idx];
  return {
    depthClass,
    passable: PASSABLE_MAP[depthClass],
    confidence: Math.round((0.65 + Math.random() * 0.30) * 100) / 100,
    rationale: RATIONALES[depthClass],
  };
}

// ── public API ─────────────────────────────────────────────────────────────

/**
 * Get a presigned S3 PUT URL for a photo upload.
 * @param {{ contentType: string, sizeBytes: number }} params
 */
export async function presignUpload({ contentType, sizeBytes }) {
  const photoKey = `reports/2026/10/09/${nanoid().toLowerCase()}.jpg`;
  return {
    photoKey,
    uploadUrl: `https://nala-watch-mock-bucket.s3.ap-south-1.amazonaws.com/${photoKey}?X-Amz-Mock=1`,
    expiresIn: 300,
  };
}

/**
 * Create a report and start the fake analyzing → assessed transition.
 * @param {{ photoKey: string, lat: number, lng: number, note?: string, clientTimestamp?: string }} params
 */
export async function createReport({ photoKey, lat, lng, hazardType = 'flood', note, clientTimestamp }) {
  const reports = await getReports();
  const reportToken = `tok_${nanoid()}`;
  const reportId = `rpt_MOCK${nanoid()}`;

  const report = {
    reportId,
    status: 'analyzing',
    lat,
    lng,
    geohash: 'ttnfv0',
    wardId: 'ward_07',
    photoKey,
    hazardType,
    createdAt: clientTimestamp ?? nowIso(),
    assessment: null,
    userConfirmed: false,
    userDepthClass: null,
    opsStatus: 'open',
    _reportToken: reportToken,
  };

  reports.push(report);

  // Simulate the Bedrock analysis delay (~3 s)
  setTimeout(async () => {
    report.status = 'assessed';
    report.assessment = fakeAssessment(photoKey);
  }, 3000);

  return { reportId, status: 'analyzing', reportToken };
}

/**
 * Get a single report by ID.
 * @param {string} reportId
 */
export async function getReport(reportId) {
  const reports = await getReports();
  const report = reports.find((r) => r.reportId === reportId);
  if (!report) throw Errors.notFound(`Report ${reportId} not found`);
  // Strip internal fields before returning
  const { _reportToken, ...safe } = report;
  return safe;
}

/**
 * List reports, optionally filtered by bbox and/or since timestamp.
 * @param {{ bbox?: string, since?: string, limit?: number }} params
 */
export async function listReports({ bbox, since, limit = 200 } = {}) {
  const reports = await getReports();
  let result = reports.map(({ _reportToken, ...r }) => r);

  if (since) {
    const sinceMs = new Date(since).getTime();
    result = result.filter((r) => new Date(r.createdAt).getTime() >= sinceMs);
  }

  if (bbox) {
    const [minLng, minLat, maxLng, maxLat] = bbox.split(',').map(Number);
    result = result.filter(
      (r) =>
        r.lng >= minLng &&
        r.lng <= maxLng &&
        r.lat >= minLat &&
        r.lat <= maxLat,
    );
  }

  return result.slice(0, limit);
}

/**
 * Update userConfirmed / userDepthClass on a report (citizen correction).
 * @param {string} reportId
 * @param {{ userConfirmed?: boolean, userDepthClass?: string }} patch
 */
export async function confirmReport(reportId, patch) {
  const reports = await getReports();
  const report = reports.find((r) => r.reportId === reportId);
  if (!report) throw Errors.notFound(`Report ${reportId} not found`);
  if (patch.userConfirmed !== undefined) report.userConfirmed = patch.userConfirmed;
  if (patch.userDepthClass !== undefined) report.userDepthClass = patch.userDepthClass;
  const { _reportToken, ...safe } = report;
  return safe;
}

/**
 * Update the operational status of a report (ward officer action).
 * @param {string} reportId
 * @param {{ opsStatus: string }} patch
 */
export async function patchReportStatus(reportId, { opsStatus }) {
  const reports = await getReports();
  const report = reports.find((r) => r.reportId === reportId);
  if (!report) throw Errors.notFound(`Report ${reportId} not found`);
  report.opsStatus = opsStatus;
  const { _reportToken, ...safe } = report;
  return safe;
}

/**
 * Get risk segments, optionally filtered by bbox.
 * @param {{ bbox?: string }} params
 */
export async function getRisk({ bbox } = {}) {
  const segments = await loadSeed('risk.json');
  if (!bbox) return segments;
  // Risk segments don't have coordinates in the seed, so return all for mock
  return segments;
}

/**
 * Get ranked hotspots for the ward dashboard.
 * @param {{ wardId?: string }} params
 */
export async function getHotspots({ wardId } = {}) {
  const hotspots = await loadSeed('hotspots.json');
  if (!wardId) return hotspots;
  return hotspots; // seed covers one ward; real impl would filter
}

/**
 * Get the ward report feed.
 * @param {{ wardId?: string, status?: string }} params
 */
export async function getWardReports({ wardId, status } = {}) {
  const reports = await getReports();
  let result = reports.map(({ _reportToken, ...r }) => r);
  if (wardId) result = result.filter((r) => r.wardId === wardId);
  if (status) result = result.filter((r) => r.opsStatus === status);
  return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Create an alert subscription.
 * @param {{ channel: string, contact: string, lat: number, lng: number, radiusM: number }} params
 */
export async function createSubscription({ channel, contact, lat, lng, radiusM }) {
  const subs = await getSubscriptions();
  const sub = {
    subscriptionId: `sub_MOCK${nanoid()}`,
    channel,
    contact,
    lat,
    lng,
    radiusM,
  };
  subs.push(sub);
  return sub;
}

/**
 * Delete an alert subscription by ID.
 * @param {string} subscriptionId
 */
export async function deleteSubscription(subscriptionId) {
  const subs = await getSubscriptions();
  const idx = subs.findIndex((s) => s.subscriptionId === subscriptionId);
  if (idx === -1) throw Errors.notFound(`Subscription ${subscriptionId} not found`);
  subs.splice(idx, 1);
  return { deleted: true };
}

/**
 * List all wards (static seed).
 */
export async function listWards() {
  return loadSeed('wards.json');
}
