/**
 * geohashUtils.js — geohash encoding helpers.
 *
 * Wraps ngeohash so the rest of the codebase uses a
 * clean, documented interface instead of calling the
 * library directly.
 */

import ngeohash from 'ngeohash';

// Precision 5 → ≈ 4.9 km × 4.9 km cells.
// Covers a typical Delhi ward in 4–12 prefixes.
export const DEFAULT_PRECISION = 5;

/**
 * Encode a lat/lng point to a geohash string.
 * @param {number} lat
 * @param {number} lng
 * @param {number} [precision=DEFAULT_PRECISION]
 * @returns {string}
 */
export function encode(lat, lng, precision = DEFAULT_PRECISION) {
  return ngeohash.encode(lat, lng, precision);
}

/**
 * Decode a geohash string to { latitude, longitude, error }.
 * @param {string} hash
 * @returns {{ latitude: number, longitude: number, error: { latitude: number, longitude: number } }}
 */
export function decode(hash) {
  return ngeohash.decode_bbox ? ngeohash.decode(hash) : ngeohash.decode(hash);
}

/**
 * Return all geohash prefixes at `precision` that cover a bounding box.
 * Used by cloudApi.listReports to fan out prefix queries to the Cloud API.
 *
 * @param {number} minLat
 * @param {number} minLng
 * @param {number} maxLat
 * @param {number} maxLng
 * @param {number} [precision=DEFAULT_PRECISION]
 * @returns {string[]}
 */
export function bboxPrefixes(minLat, minLng, maxLat, maxLng, precision = DEFAULT_PRECISION) {
  return ngeohash.bboxes(minLat, minLng, maxLat, maxLng, precision);
}

/**
 * Parse a bbox query string and return the geohash prefixes covering it.
 * Convenience wrapper used by the reports controller.
 *
 * @param {string} bboxStr  "minLng,minLat,maxLng,maxLat"
 * @param {number} [precision=DEFAULT_PRECISION]
 * @returns {string[]}
 */
export function bboxStringToPrefixes(bboxStr, precision = DEFAULT_PRECISION) {
  const [minLng, minLat, maxLng, maxLat] = bboxStr.split(',').map(Number);
  return bboxPrefixes(minLat, minLng, maxLat, maxLng, precision);
}

/**
 * Return the geohash neighbours (8 surrounding cells) of a given hash.
 * Useful for proximity queries.
 * @param {string} hash
 * @returns {string[]}
 */
export function neighbours(hash) {
  return ngeohash.neighbors(hash);
}
