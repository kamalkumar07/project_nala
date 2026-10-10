/**
 * geoUtils.js — geographic distance and calculation utilities.
 */

/**
 * Calculate great-circle distance between two coordinates in kilometers using Haversine formula.
 *
 * @param {number|null} lat1
 * @param {number|null} lon1
 * @param {number|null} lat2
 * @param {number|null} lon2
 * @returns {number|null} Distance in kilometers or null if any coordinate is missing
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (
    lat1 === null ||
    lat1 === undefined ||
    lon1 === null ||
    lon1 === undefined ||
    lat2 === null ||
    lat2 === undefined ||
    lon2 === null ||
    lon2 === undefined
  ) {
    return null;
  }

  const numLat1 = Number(lat1);
  const numLon1 = Number(lon1);
  const numLat2 = Number(lat2);
  const numLon2 = Number(lon2);

  if (
    !Number.isFinite(numLat1) ||
    !Number.isFinite(numLon1) ||
    !Number.isFinite(numLat2) ||
    !Number.isFinite(numLon2)
  ) {
    return null;
  }

  const R = 6371; // Earth radius in kilometers
  const dLat = ((numLat2 - numLat1) * Math.PI) / 180;
  const dLon = ((numLon2 - numLon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((numLat1 * Math.PI) / 180) *
      Math.cos((numLat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Format distance in a human-friendly sentence-case string.
 *
 * @param {number|null} km
 * @returns {string|null}
 */
export function formatDistance(km) {
  if (km === null || km === undefined || !Number.isFinite(km)) return null;
  if (km < 1) {
    const metres = Math.round(km * 1000);
    return `${metres} m away`;
  }
  return `${km.toFixed(1)} km away`;
}

// Himachal Pradesh Bounds: [lng, lat]
export const HP_MIN_LNG = 75.6;
export const HP_MAX_LNG = 79.0;
export const HP_MIN_LAT = 30.4;
export const HP_MAX_LAT = 33.2;

/**
 * Check if given latitude and longitude coordinates are within the
 * Himachal Pradesh bounding box [75.6-79.0°E, 30.4-33.2°N].
 *
 * @param {number|null} lat
 * @param {number|null} lng
 * @returns {boolean}
 */
export function isInsideHimachal(lat, lng) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return false;
  }
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (!Number.isFinite(numLat) || !Number.isFinite(numLng)) {
    return false;
  }
  return (
    numLat >= HP_MIN_LAT &&
    numLat <= HP_MAX_LAT &&
    numLng >= HP_MIN_LNG &&
    numLng <= HP_MAX_LNG
  );
}
