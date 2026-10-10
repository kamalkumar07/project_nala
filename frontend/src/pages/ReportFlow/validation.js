/**
 * validation.js — client-side validation rules for hazard reporting.
 */

export const ALLOWED_HAZARD_TYPES = [
  'flood',
  'landslide',
  'waterlogging',
  'road_damage',
  'other',
];

export const MAX_NOTE_LENGTH = 500;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Validate citizen hazard report form input.
 *
 * @param {object} input
 * @param {File|Blob|null} [input.photo]
 * @param {number|null} [input.lat]
 * @param {number|null} [input.lng]
 * @param {string} [input.hazardType]
 * @param {string} [input.note]
 * @param {boolean} [input.outsideHpConfirmed]
 * @param {boolean} [input.isOutsideHp]
 * @returns {{ isValid: boolean, errors: Record<string, string> }}
 */
export function validateReportForm(input = {}) {
  const errors = {};

  // 1. Photo validation
  if (!input.photo) {
    errors.photo = 'A photo of the hazard incident is required.';
  } else if (input.photo.size > MAX_IMAGE_BYTES) {
    errors.photo = 'Photo exceeds maximum allowed size of 5 MB.';
  }

  // 2. Coordinate validation
  const lat = input.lat;
  const lng = input.lng;
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    errors.location = 'Incident location coordinates are required.';
  } else {
    const numLat = Number(lat);
    const numLng = Number(lng);
    if (!Number.isFinite(numLat) || !Number.isFinite(numLng)) {
      errors.location = 'Invalid coordinates provided.';
    } else if (numLat < -90 || numLat > 90 || numLng < -180 || numLng > 180) {
      errors.location = 'Coordinates are outside valid geographic range.';
    }
  }

  // 3. Outside Himachal confirmation
  if (input.isOutsideHp && !input.outsideHpConfirmed) {
    errors.outsideHp = 'Please confirm that you want to submit a report outside Himachal Pradesh.';
  }

  // 4. Hazard type validation
  const hazardType = input.hazardType || 'flood';
  if (!ALLOWED_HAZARD_TYPES.includes(hazardType)) {
    errors.hazardType = `Hazard type must be one of: ${ALLOWED_HAZARD_TYPES.join(', ')}.`;
  }

  // 5. Note character length limit
  if (input.note && typeof input.note === 'string' && input.note.length > MAX_NOTE_LENGTH) {
    errors.note = `Description cannot exceed ${MAX_NOTE_LENGTH} characters.`;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
