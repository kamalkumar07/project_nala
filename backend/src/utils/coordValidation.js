/**
 * coordValidation.js — coordinate and geographic input helpers.
 *
 * Used by controllers and routes to validate and parse
 * lat/lng/bbox values before hitting the service layer.
 */

/**
 * Parse and validate a bbox query string "minLng,minLat,maxLng,maxLat".
 * Returns { minLng, minLat, maxLng, maxLat } or throws a descriptive Error.
 * @param {string} bboxStr
 * @returns {{ minLng: number, minLat: number, maxLng: number, maxLat: number }}
 */
export function parseBbox(bboxStr) {
  if (!bboxStr) return null;
  const parts = bboxStr.split(',').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) {
    throw new Error('bbox must be four comma-separated numbers: minLng,minLat,maxLng,maxLat');
  }
  const [minLng, minLat, maxLng, maxLat] = parts;
  if (minLat < -90 || maxLat > 90)   throw new Error('Latitude values must be between -90 and 90');
  if (minLng < -180 || maxLng > 180) throw new Error('Longitude values must be between -180 and 180');
  if (minLat >= maxLat)  throw new Error('minLat must be less than maxLat');
  if (minLng >= maxLng)  throw new Error('minLng must be less than maxLng');
  return { minLng, minLat, maxLng, maxLat };
}

/**
 * Return true if a [lat, lng] point falls inside a parsed bbox object.
 * @param {number} lat
 * @param {number} lng
 * @param {{ minLng, minLat, maxLng, maxLat }} bbox
 */
export function pointInBbox(lat, lng, bbox) {
  if (!bbox) return true; // no filter → all points pass
  return (
    lng >= bbox.minLng &&
    lng <= bbox.maxLng &&
    lat >= bbox.minLat &&
    lat <= bbox.maxLat
  );
}

/**
 * Assert that a latitude value is in range.
 * @param {number} lat
 * @param {string} [fieldName='lat']
 */
export function assertValidLat(lat, fieldName = 'lat') {
  if (typeof lat !== 'number' || lat < -90 || lat > 90) {
    throw new Error(`${fieldName} must be a number between -90 and 90`);
  }
}

/**
 * Assert that a longitude value is in range.
 * @param {number} lng
 * @param {string} [fieldName='lng']
 */
export function assertValidLng(lng, fieldName = 'lng') {
  if (typeof lng !== 'number' || lng < -180 || lng > 180) {
    throw new Error(`${fieldName} must be a number between -180 and 180`);
  }
}

/**
 * Format a decimal lat/lng pair for display or logging.
 * @param {number} lat
 * @param {number} lng
 * @returns {string}  e.g. "28.6448°N, 77.2167°E"
 */
export function formatCoord(lat, lng) {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}`;
}
