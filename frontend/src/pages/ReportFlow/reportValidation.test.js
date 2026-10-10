import { describe, it, expect } from 'vitest';
import {
  validateReportForm,
  ALLOWED_HAZARD_TYPES,
  MAX_NOTE_LENGTH,
  MAX_IMAGE_BYTES,
} from './validation.js';
import { isInsideHimachal } from '../../utils/geoUtils.js';

describe('Report Form Validation (validateReportForm)', () => {
  const dummyFile = new File(['fake-image-bytes'], 'hazard.jpg', { type: 'image/jpeg' });

  it('passes when all required fields are valid and within Himachal Pradesh', () => {
    const input = {
      photo: dummyFile,
      lat: 31.1048,
      lng: 77.1734,
      hazardType: 'flood',
      note: 'Water overflowing over drainage culvert',
      isOutsideHp: false,
      outsideHpConfirmed: false,
    };

    const result = validateReportForm(input);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('fails when photo is missing', () => {
    const input = {
      photo: null,
      lat: 31.1048,
      lng: 77.1734,
      hazardType: 'flood',
    };

    const result = validateReportForm(input);
    expect(result.isValid).toBe(false);
    expect(result.errors.photo).toBe('A photo of the hazard incident is required.');
  });

  it('fails when photo exceeds 5 MB size limit', () => {
    // Create oversized file mock
    const largeFile = { size: 6 * 1024 * 1024, name: 'huge.jpg' };
    const input = {
      photo: largeFile,
      lat: 31.1048,
      lng: 77.1734,
      hazardType: 'flood',
    };

    const result = validateReportForm(input);
    expect(result.isValid).toBe(false);
    expect(result.errors.photo).toContain('exceeds maximum allowed size of 5 MB');
  });

  it('fails when coordinates are missing or non-finite', () => {
    expect(validateReportForm({ photo: dummyFile, lat: null, lng: 77.17 }).isValid).toBe(false);
    expect(validateReportForm({ photo: dummyFile, lat: 31.10, lng: null }).isValid).toBe(false);
    expect(validateReportForm({ photo: dummyFile, lat: 'NaN', lng: 77.17 }).isValid).toBe(false);
  });

  it('validates allowed hazard type enum values', () => {
    for (const type of ALLOWED_HAZARD_TYPES) {
      const res = validateReportForm({
        photo: dummyFile,
        lat: 31.1,
        lng: 77.1,
        hazardType: type,
      });
      expect(res.isValid).toBe(true);
    }

    const invalidRes = validateReportForm({
      photo: dummyFile,
      lat: 31.1,
      lng: 77.1,
      hazardType: 'alien_invasion',
    });
    expect(invalidRes.isValid).toBe(false);
    expect(invalidRes.errors.hazardType).toContain('Hazard type must be one of');
  });

  it('validates description length against 500-character backend limit', () => {
    const okNote = 'A'.repeat(500);
    expect(validateReportForm({
      photo: dummyFile,
      lat: 31.1,
      lng: 77.1,
      note: okNote,
    }).isValid).toBe(true);

    const tooLongNote = 'A'.repeat(501);
    const failRes = validateReportForm({
      photo: dummyFile,
      lat: 31.1,
      lng: 77.1,
      note: tooLongNote,
    });
    expect(failRes.isValid).toBe(false);
    expect(failRes.errors.note).toContain(`cannot exceed ${MAX_NOTE_LENGTH} characters`);
  });
});

describe('Outside Himachal Warning and Boundary Check (isInsideHimachal)', () => {
  const dummyFile = new File(['fake-image-bytes'], 'hazard.jpg', { type: 'image/jpeg' });

  it('correctly identifies coordinates within Himachal Pradesh [75.6-79.0°E, 30.4-33.2°N]', () => {
    // Shimla
    expect(isInsideHimachal(31.1048, 77.1734)).toBe(true);
    // Manali / Kullu
    expect(isInsideHimachal(32.2432, 77.1892)).toBe(true);
    // Dharamshala / Kangra
    expect(isInsideHimachal(32.2190, 76.3234)).toBe(true);
    // Keylong / Lahaul
    expect(isInsideHimachal(32.5710, 77.0320)).toBe(true);
  });

  it('correctly identifies coordinates outside Himachal Pradesh', () => {
    // New Delhi
    expect(isInsideHimachal(28.6139, 77.2090)).toBe(false);
    // Chandigarh
    expect(isInsideHimachal(30.7333, 76.7794)).toBe(true); // Near southern border
    // Mumbai
    expect(isInsideHimachal(19.0760, 72.8777)).toBe(false);
    // International / equator
    expect(isInsideHimachal(0.0, 0.0)).toBe(false);
  });

  it('returns false for missing or invalid coordinates', () => {
    expect(isInsideHimachal(null, 77.17)).toBe(false);
    expect(isInsideHimachal(31.1, null)).toBe(false);
    expect(isInsideHimachal(undefined, undefined)).toBe(false);
    expect(isInsideHimachal('invalid', 77.17)).toBe(false);
  });

  it('requires explicit confirmation when coordinates are outside Himachal Pradesh', () => {
    // Delhi coordinates detected
    const unconfirmedOutside = validateReportForm({
      photo: dummyFile,
      lat: 28.6139,
      lng: 77.2090,
      isOutsideHp: true,
      outsideHpConfirmed: false,
    });
    expect(unconfirmedOutside.isValid).toBe(false);
    expect(unconfirmedOutside.errors.outsideHp).toContain('confirm that you want to submit a report outside Himachal Pradesh');

    // Confirmed outside
    const confirmedOutside = validateReportForm({
      photo: dummyFile,
      lat: 28.6139,
      lng: 77.2090,
      isOutsideHp: true,
      outsideHpConfirmed: true,
    });
    expect(confirmedOutside.isValid).toBe(true);
    expect(confirmedOutside.errors.outsideHp).toBeUndefined();
  });
});
