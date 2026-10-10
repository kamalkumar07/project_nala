import { describe, it, expect } from 'vitest';
import {
  normalizeCoordinates,
  normalizeScore,
  normalizeBand,
  normalizeHotspot,
  normalizeReport,
  normalizeSubscription,
  normalizeRiskSegment,
} from './normalize.js';

describe('normalizeCoordinates', () => {
  it('normalizes direct lat and lng fields (numeric)', () => {
    expect(normalizeCoordinates({ lat: 31.1048, lng: 77.1734 })).toEqual({
      lat: 31.1048,
      lng: 77.1734,
    });
  });

  it('normalizes stringified lat and lng fields', () => {
    expect(normalizeCoordinates({ lat: '32.2432', lng: '77.1892' })).toEqual({
      lat: 32.2432,
      lng: 77.1892,
    });
  });

  it('normalizes latitude and longitude property names', () => {
    expect(normalizeCoordinates({ latitude: 31.8021, longitude: 76.5231 })).toEqual({
      lat: 31.8021,
      lng: 76.5231,
    });
  });

  it('normalizes nested centroid { lat, lng }', () => {
    expect(normalizeCoordinates({ centroid: { lat: 31.55, lng: 76.95 } })).toEqual({
      lat: 31.55,
      lng: 76.95,
    });
  });

  it('returns nulls for missing, invalid, or non-object inputs', () => {
    expect(normalizeCoordinates(null)).toEqual({ lat: null, lng: null });
    expect(normalizeCoordinates({})).toEqual({ lat: null, lng: null });
    expect(normalizeCoordinates({ lat: 'invalid', lng: 77.2 })).toEqual({ lat: null, lng: null });
    expect(normalizeCoordinates({ lat: null, lng: 77.2 })).toEqual({ lat: null, lng: null });
  });
});

describe('normalizeScore', () => {
  it('scales 0.0 to 1.0 decimals into 0 to 100 integers', () => {
    expect(normalizeScore(0.85)).toBe(85);
    expect(normalizeScore(0.426)).toBe(43);
    expect(normalizeScore(1.0)).toBe(100);
    expect(normalizeScore('0.64')).toBe(64);
  });

  it('preserves already scaled 0-100 integers', () => {
    expect(normalizeScore(0)).toBe(0);
    expect(normalizeScore(15)).toBe(15);
    expect(normalizeScore(88)).toBe(88);
    expect(normalizeScore(100)).toBe(100);
    expect(normalizeScore('92')).toBe(92);
  });

  it('clamps values below 0 and above 100', () => {
    expect(normalizeScore(-10)).toBe(0);
    expect(normalizeScore(125)).toBe(100);
  });

  it('returns null for null, undefined, or NaN inputs', () => {
    expect(normalizeScore(null)).toBeNull();
    expect(normalizeScore(undefined)).toBeNull();
    expect(normalizeScore('not-a-number')).toBeNull();
  });
});

describe('normalizeBand', () => {
  it('normalizes uppercase and lowercase strings to uppercase enums', () => {
    expect(normalizeBand('low')).toBe('LOW');
    expect(normalizeBand('LOW')).toBe('LOW');
    expect(normalizeBand('moderate')).toBe('MODERATE');
    expect(normalizeBand('MODERATE')).toBe('MODERATE');
    expect(normalizeBand('high')).toBe('HIGH');
    expect(normalizeBand('HIGH')).toBe('HIGH');
    expect(normalizeBand('severe')).toBe('SEVERE');
    expect(normalizeBand('SEVERE')).toBe('SEVERE');
  });

  it('maps "medium" to "MODERATE"', () => {
    expect(normalizeBand('medium')).toBe('MODERATE');
    expect(normalizeBand('MEDIUM')).toBe('MODERATE');
  });

  it('maps unrecognised, empty, or null bands to "UNKNOWN"', () => {
    expect(normalizeBand(null)).toBe('UNKNOWN');
    expect(normalizeBand('')).toBe('UNKNOWN');
    expect(normalizeBand('critical_danger')).toBe('UNKNOWN');
  });
});

describe('normalizeHotspot', () => {
  it('normalizes full backend hotspot payload', () => {
    const raw = {
      hotspotId: 'hs_shimla_01',
      district: 'Shimla',
      wardId: 'ward_12',
      wardNo: 12,
      wardName: 'Mall Road',
      latitude: 31.1048,
      longitude: 77.1734,
      score: 0.78,
      band: 'high',
      reportCount: '6',
      openReports: '4',
      lastUpdated: '2026-10-09T18:30:00Z',
      riskFactors: {
        rainfall: 0.85,
        slope: 0.6,
      },
    };

    const res = normalizeHotspot(raw);
    expect(res).toEqual({
      hotspotId: 'hs_shimla_01',
      district: 'Shimla',
      wardId: 'ward_12',
      wardNo: '12',
      wardName: 'Mall Road',
      lat: 31.1048,
      lng: 77.1734,
      riskScore: 78,
      riskBand: 'HIGH',
      reportCount: 6,
      activeReports: 4,
      lastUpdated: '2026-10-09T18:30:00Z',
      riskFactors: {
        rainfall: 0.85,
        slope: 0.6,
      },
    });
  });

  it('safely handles partial hotspot with missing optional fields', () => {
    const raw = {
      id: 'hs_kullu_partial',
      district: 'Kullu',
      lat: 31.95,
      lng: 77.10,
    };

    const res = normalizeHotspot(raw);
    expect(res.hotspotId).toBe('hs_kullu_partial');
    expect(res.district).toBe('Kullu');
    expect(res.wardName).toBeNull();
    expect(res.riskScore).toBeNull();
    expect(res.riskBand).toBe('UNKNOWN');
    expect(res.reportCount).toBeNull();
    expect(res.riskFactors).toBeNull();
  });

  it('returns null for non-object raw payload', () => {
    expect(normalizeHotspot(null)).toBeNull();
    expect(normalizeHotspot(undefined)).toBeNull();
  });
});

describe('normalizeReport', () => {
  it('normalizes complete hazard report with AI assessment', () => {
    const raw = {
      reportId: 'rep_123',
      status: 'assessed',
      lat: 32.24,
      lng: 77.18,
      hazardType: 'flood',
      note: 'Water rising near stream bank',
      createdAt: '2026-10-09T15:00:00Z',
      assessment: {
        depthClass: 'knee',
        passable: 'caution',
        confidence: 0.89,
        rationale: 'Submerged vehicle wheels visible up to rims',
      },
    };

    const res = normalizeReport(raw);
    expect(res.reportId).toBe('rep_123');
    expect(res.hazardType).toBe('flood');
    expect(res.assessment.depthClass).toBe('knee');
    expect(res.assessment.confidence).toBe(0.89);
  });

  it('handles report without assessment', () => {
    const raw = {
      id: 'rep_456',
      status: 'analyzing',
      latitude: 31.6,
      longitude: 77.2,
    };

    const res = normalizeReport(raw);
    expect(res.reportId).toBe('rep_456');
    expect(res.assessment).toBeNull();
    expect(res.hazardType).toBe('flood');
  });
});
