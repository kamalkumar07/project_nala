/**
 * pinHelpers.js — utilities shared between the map layer and the legend.
 *
 * Passable → colour mapping matches tokens.css exactly so the legend
 * and the map markers are always in sync.
 */

export const PASSABLE_COLOR = {
  yes:     '#22c55e',   // --color-yes
  caution: '#f97316',   // --color-caution
  no:      '#ef4444',   // --color-no
  unknown: '#9ca3af',   // --color-unknown
};

export const PASSABLE_LABEL = {
  yes:     'Passable',
  caution: 'Use caution',
  no:      'Not passable',
  unknown: 'Unknown',
};

export const PASSABLE_EMOJI = {
  yes:     '',
  caution: '',
  no:      '',
  unknown: '',
};

export const DEPTH_LABEL = {
  ankle:   'Ankle deep',
  knee:    'Knee deep',
  waist:   'Waist deep',
  unknown: 'Unknown depth',
};

export const DEPTH_EMOJI = {
  ankle:   '',
  knee:    '',
  waist:   '',
  unknown: '',
};

/** Risk band → fill colour (semi-transparent for the polygon layer) */
export const RISK_BAND_COLOR = {
  low:      'rgba(34,197,94,0.18)',
  moderate: 'rgba(251,191,36,0.28)',
  high:     'rgba(249,115,22,0.38)',
  severe:   'rgba(239,68,68,0.48)',
};

export const RISK_BAND_BORDER = {
  low:      '#16a34a',
  moderate: '#d97706',
  high:     '#ea580c',
  severe:   '#dc2626',
};

/**
 * Build a GeoJSON FeatureCollection from an array of report objects.
 * Embeds the full report as a property so the click handler can read it.
 */
export function reportsToGeoJSON(reports) {
  return {
    type: 'FeatureCollection',
    features: reports
      .filter((r) => r.lat != null && r.lng != null)
      .map((r) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [r.lng, r.lat] },
        properties: {
          reportId:   r.reportId,
          passable:   r.assessment?.passable  ?? 'unknown',
          depthClass: r.assessment?.depthClass ?? 'unknown',
          confidence: r.assessment?.confidence ?? 0,
          rationale:  r.assessment?.rationale  ?? '',
          status:     r.status,
          opsStatus:  r.opsStatus,
          createdAt:  r.createdAt,
          wardId:     r.wardId,
          // Embed the whole object as JSON for the detail sheet
          _raw: JSON.stringify(r),
        },
      })),
  };
}

/**
 * Build a GeoJSON FeatureCollection from risk segments.
 * Each segment becomes a small circle polygon centred on a rough tile
 * (real geometry would come from the backend; for now we fake a 400 m radius).
 */
export function riskToGeoJSON(segments) {
  return {
    type: 'FeatureCollection',
    features: segments.map((s) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [s.lng ?? 77.209, s.lat ?? 28.6139] },
      properties: {
        segmentId: s.segmentId,
        wardId:    s.wardId,
        score:     s.score,
        band:      s.band,
        drivers:   JSON.stringify(s.drivers ?? {}),
      },
    })),
  };
}

/**
 * MapLibre expression: map passable value → circle colour.
 * Used as the `circle-color` paint property.
 */
export const PASSABLE_COLOR_EXPR = [
  'match',
  ['get', 'passable'],
  'yes',     PASSABLE_COLOR.yes,
  'caution', PASSABLE_COLOR.caution,
  'no',      PASSABLE_COLOR.no,
  /* default */ PASSABLE_COLOR.unknown,
];

/**
 * MapLibre expression: map risk band → fill colour.
 */
export const RISK_FILL_EXPR = [
  'match',
  ['get', 'band'],
  'low',      RISK_BAND_COLOR.low,
  'moderate', RISK_BAND_COLOR.moderate,
  'high',     RISK_BAND_COLOR.high,
  'severe',   RISK_BAND_COLOR.severe,
  'rgba(0,0,0,0)',
];

export const RISK_STROKE_EXPR = [
  'match',
  ['get', 'band'],
  'low',      RISK_BAND_BORDER.low,
  'moderate', RISK_BAND_BORDER.moderate,
  'high',     RISK_BAND_BORDER.high,
  'severe',   RISK_BAND_BORDER.severe,
  'rgba(0,0,0,0)',
];
