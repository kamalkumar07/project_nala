/**
 * mapStyle.js — resolves the MapLibre style object.
 *
 * Priority:
 *   1. Amazon Location Service tiles — used when both VITE_LOCATION_MAP_NAME
 *      and VITE_LOCATION_API_KEY are set.
 *   2. OpenFreeMap "Positron" — a clean, free public tile set used as the
 *      fallback so the map always renders, even in local dev without ALS creds.
 *
 * The ALS style URL format:
 *   https://maps.geo.<region>.amazonaws.com/maps/v0/maps/<mapName>/style-descriptor
 *   ?key=<apiKey>
 */

const MAP_NAME   = import.meta.env.VITE_LOCATION_MAP_NAME;
const API_KEY    = import.meta.env.VITE_LOCATION_API_KEY;
const AWS_REGION = import.meta.env.VITE_AWS_REGION ?? 'ap-south-1';

/**
 * Returns a MapLibre style URL string (ALS) or a full style object (fallback).
 * @returns {string | object}
 */
export function resolveMapStyle() {
  if (MAP_NAME && API_KEY) {
    // Amazon Location Service — returns a style descriptor URL directly
    return (
      `https://maps.geo.${AWS_REGION}.amazonaws.com/maps/v0/maps/` +
      `${MAP_NAME}/style-descriptor?key=${API_KEY}`
    );
  }

  // ── OpenFreeMap Liberty (fallback, no credentials needed) ───────────────
  // "positron" is not served at this URL; liberty is the confirmed working style.
  // See: https://openfreemap.org/quick_start/
  return 'https://tiles.openfreemap.org/styles/liberty';
}

/** Centre of Delhi — used as the default map start position */
export const DEFAULT_CENTER = [77.209, 28.6139]; // [lng, lat]
export const DEFAULT_ZOOM   = 12;
