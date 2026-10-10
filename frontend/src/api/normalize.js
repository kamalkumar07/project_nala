/**
 * normalize.js — domain normalization layer.
 *
 * Rules:
 *   • Accept lat/lng OR latitude/longitude -> { lat, lng }
 *   • Score 0-1 or 0-100 -> integer 0-100
 *   • Band in any case (low/LOW/moderate/high/severe) -> LOW | MODERATE | HIGH | SEVERE | UNKNOWN
 *   • Missing fields -> null (never undefined)
 */

/**
 * Extract normalized { lat, lng } from various backend shapes.
 */
export function normalizeCoordinates(item) {
  if (!item || typeof item !== 'object') {
    return { lat: null, lng: null };
  }

  // Direct lat/lng
  if (item.lat !== undefined && item.lng !== undefined && item.lat !== null && item.lng !== null) {
    const lat = Number(item.lat);
    const lng = Number(item.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
    return { lat: null, lng: null };
  }

  // latitude/longitude
  if (item.latitude !== undefined && item.longitude !== undefined && item.latitude !== null && item.longitude !== null) {
    const lat = Number(item.latitude);
    const lng = Number(item.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
    return { lat: null, lng: null };
  }

  // Nested centroid { lat, lng }
  if (item.centroid && typeof item.centroid === 'object') {
    return normalizeCoordinates(item.centroid);
  }

  return { lat: null, lng: null };
}

/**
 * Normalize score from 0-1 (decimal) or 0-100 (percentage) into an integer 0-100.
 */
export function normalizeScore(score) {
  if (score === null || score === undefined || !Number.isFinite(Number(score))) {
    return null;
  }
  const num = Number(score);
  if (num < 0) return 0;
  // If in 0.0 - 1.0 range, scale up
  if (num <= 1 && num > 0) {
    return Math.round(num * 100);
  }
  return Math.min(100, Math.round(num));
}

/**
 * Normalize risk band string to strict uppercase enum.
 * Values: LOW | MODERATE | HIGH | SEVERE | UNKNOWN
 */
export function normalizeBand(band) {
  if (!band) return 'UNKNOWN';
  const clean = String(band).trim().toUpperCase();

  switch (clean) {
    case 'LOW':
      return 'LOW';
    case 'MODERATE':
    case 'MEDIUM':
      return 'MODERATE';
    case 'HIGH':
      return 'HIGH';
    case 'SEVERE':
      return 'SEVERE';
    default:
      return 'UNKNOWN';
  }
}

/**
 * Normalize a single hotspot object.
 */
export function normalizeHotspot(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const { lat, lng } = normalizeCoordinates(raw);
  const score = normalizeScore(raw.riskScore ?? raw.score);
  const band = normalizeBand(raw.riskBand ?? raw.band);

  return {
    hotspotId: raw.hotspotId ?? raw.id ?? raw.segmentId ?? null,
    district: raw.district ?? null,
    wardId: raw.wardId ?? null,
    wardNo: raw.wardNo ? String(raw.wardNo) : null,
    wardName: raw.wardName ?? null,
    lat,
    lng,
    riskScore: score,
    riskBand: band,
    reportCount: raw.reportCount !== undefined && raw.reportCount !== null ? Number(raw.reportCount) : null,
    activeReports: raw.activeReports !== undefined && raw.activeReports !== null
      ? Number(raw.activeReports)
      : (raw.openReports !== undefined && raw.openReports !== null ? Number(raw.openReports) : null),
    lastUpdated: raw.lastUpdated ?? raw.latestReportAt ?? raw.updatedAt ?? null,
    riskFactors: (raw.riskFactors || raw.drivers) && typeof (raw.riskFactors || raw.drivers) === 'object'
      ? Object.fromEntries(
          Object.entries(raw.riskFactors || raw.drivers).map(([key, val]) => [
            key,
            val !== null && val !== undefined && !Number.isNaN(Number(val))
              ? Number(val)
              : val,
          ])
        )
      : null,
  };
}

/**
 * Normalize a single hazard report object.
 */
export function normalizeReport(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const { lat, lng } = normalizeCoordinates(raw);

  const assessment = raw.assessment
    ? {
        depthClass: raw.assessment.depthClass ?? 'unknown',
        passable: raw.assessment.passable ?? 'unknown',
        confidence: raw.assessment.confidence !== undefined && raw.assessment.confidence !== null
          ? Number(raw.assessment.confidence)
          : null,
        rationale: raw.assessment.rationale ?? null,
      }
    : null;

  return {
    reportId: raw.reportId ?? raw.id ?? null,
    status: raw.status ?? 'analyzing',
    lat,
    lng,
    geohash: raw.geohash ?? null,
    wardId: raw.wardId ?? null,
    wardNo: raw.wardNo ? String(raw.wardNo) : null,
    wardName: raw.wardName ?? null,
    photoKey: raw.photoKey ?? null,
    hazardType: raw.hazardType ?? 'flood',
    note: raw.note ?? null,
    createdAt: raw.createdAt ?? null,
    assessment,
    userConfirmed: Boolean(raw.userConfirmed),
    userDepthClass: raw.userDepthClass ?? null,
    opsStatus: raw.opsStatus ?? 'open',
  };
}

/**
 * Normalize a single alert subscription object.
 */
export function normalizeSubscription(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const { lat, lng } = normalizeCoordinates(raw);

  return {
    subscriptionId: raw.subscriptionId ?? raw.id ?? null,
    channel: raw.channel ?? null,
    contact: raw.contact ?? null,
    lat,
    lng,
    radiusM: raw.radiusM !== undefined && raw.radiusM !== null ? Number(raw.radiusM) : 1000,
  };
}

/**
 * Normalize a risk segment object.
 */
export function normalizeRiskSegment(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const { lat, lng } = normalizeCoordinates(raw);

  return {
    segmentId: raw.segmentId ?? raw.id ?? null,
    wardId: raw.wardId ?? null,
    score: normalizeScore(raw.score),
    band: normalizeBand(raw.band),
    drivers: raw.drivers
      ? {
          rain: raw.drivers.rain !== undefined ? Number(raw.drivers.rain) : null,
          reports: raw.drivers.reports !== undefined ? Number(raw.drivers.reports) : null,
          lowness: raw.drivers.lowness !== undefined ? Number(raw.drivers.lowness) : null,
        }
      : null,
    lat,
    lng,
    updatedAt: raw.updatedAt ?? null,
  };
}
