/**
 * mapUtils.js — pure utility functions shared across map components.
 * No React, no MapLibre imports — safe to use in hooks and workers.
 */

// ── Bbox ──────────────────────────────────────────────────────────────────────

/** Format a MapLibre LngLatBounds as our standard "minLng,minLat,maxLng,maxLat" string. */
export function boundsToString(bounds) {
  return [
    bounds.getWest().toFixed(5),
    bounds.getSouth().toFixed(5),
    bounds.getEast().toFixed(5),
    bounds.getNorth().toFixed(5),
  ].join(',');
}

/** Parse a bbox string → [minLng, minLat, maxLng, maxLat] numbers. */
export function parseBbox(str) {
  return str.split(',').map(Number);
}

/** True if a [lng, lat] coordinate is inside a bbox string. */
export function inBbox(lng, lat, bboxStr) {
  if (!bboxStr) return false;
  const [minLng, minLat, maxLng, maxLat] = parseBbox(bboxStr);
  return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
}

// ── Ward properties ───────────────────────────────────────────────────────────

/**
 * Categorise a Ward_No string.
 * Returns 'mcd' | 'cant' | 'ndmc'
 */
export function wardType(wardNo) {
  if (String(wardNo).startsWith('CANT')) return 'cant';
  if (String(wardNo).startsWith('NDMC')) return 'ndmc';
  return 'mcd';
}

/** Return a human-readable ward body name. */
export function wardBodyLabel(wardNo) {
  switch (wardType(wardNo)) {
    case 'cant': return 'Delhi Cantonment';
    case 'ndmc': return 'NDMC';
    default:     return 'MCD';
  }
}

/** Title-case a ward name (they arrive ALL-CAPS in the dataset). */
export function titleCase(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Risk / depth labels ───────────────────────────────────────────────────────

export const RISK_BAND_META = {
  low:      { label: 'Low',      color: '#16a34a', fill: 'rgba(34,197,94,0.15)',  stroke: '#16a34a' },
  moderate: { label: 'Moderate', color: '#d97706', fill: 'rgba(251,191,36,0.22)', stroke: '#d97706' },
  high:     { label: 'High',     color: '#ea580c', fill: 'rgba(249,115,22,0.32)', stroke: '#ea580c' },
  severe:   { label: 'Severe',   color: '#dc2626', fill: 'rgba(239,68,68,0.42)',  stroke: '#dc2626' },
};

export const DEPTH_META = {
  ankle:   { label: 'Ankle deep',  color: '#fbbf24' },
  knee:    { label: 'Knee deep',   color: '#f97316' },
  waist:   { label: 'Waist deep',  color: '#ef4444' },
  unknown: { label: 'Unknown',     color: '#9ca3af' },
};

export const PASSABLE_META = {
  yes:     { label: 'Passable',      color: '#22c55e' },
  caution: { label: 'Use caution',   color: '#f97316' },
  no:      { label: 'Not passable',  color: '#ef4444' },
  unknown: { label: 'Unknown',       color: '#9ca3af' },
};

/** Map a report passable value to a marker colour hex. */
export function markerColor(passable, status) {
  if (status === 'analyzing') return '#9ca3af';
  return PASSABLE_META[passable]?.color ?? '#9ca3af';
}

/** Map a report passable value to a marker label. */
export function markerLabel(passable, status) {
  if (status === 'analyzing') return 'Analyzing…';
  return PASSABLE_META[passable]?.label ?? 'Unknown';
}

// ── Point-in-polygon (ray-casting) ────────────────────────────────────────────

/**
 * Test whether [lng, lat] is inside a GeoJSON Polygon ring array.
 * Used to find which ward a click-point belongs to WITHOUT a backend call.
 * Performance is fine for 290 wards at click speed.
 */
function pointInRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Find the ward feature whose polygon contains [lng, lat].
 * @param {number} lng
 * @param {number} lat
 * @param {object[]} features — GeoJSON feature array
 * @returns {object|null} the matching feature, or null
 */
export function wardFromLatLng(lng, lat, features) {
  for (const f of features) {
    if (!f.geometry) continue;
    const { type, coordinates } = f.geometry;
    if (type === 'Polygon') {
      if (pointInRing(lng, lat, coordinates[0])) return f;
    } else if (type === 'MultiPolygon') {
      for (const poly of coordinates) {
        if (pointInRing(lng, lat, poly[0])) return f;
      }
    }
  }
  return null;
}

// ── Coordinate formatting ─────────────────────────────────────────────────────

/** Format a decimal degree to 6 significant figures with a direction suffix. */
export function fmtLat(lat) {
  return `${Math.abs(lat).toFixed(6)}° ${lat >= 0 ? 'N' : 'S'}`;
}
export function fmtLng(lng) {
  return `${Math.abs(lng).toFixed(6)}° ${lng >= 0 ? 'E' : 'W'}`;
}

// ── Relative time ─────────────────────────────────────────────────────────────

export function relativeTime(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.floor(h / 24)} day ago`;
}
