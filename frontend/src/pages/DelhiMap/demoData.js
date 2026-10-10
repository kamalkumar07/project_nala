/**
 * demoData.js — clearly-labelled simulated reports used only when
 * VITE_DEMO_MODE=true. Never merged with production API data.
 *
 * Coordinates are real Delhi locations. All values are approximate
 * and exist solely to demonstrate the UI before live reports arrive.
 */

export const DEMO_REPORTS = [
  {
    reportId: 'demo_001',
    status: 'assessed',
    lat: 28.6448, lng: 77.2167,
    wardNo: '80', wardName: 'Chandni Chowk',
    assessment: { depthClass: 'knee',  passable: 'no',      confidence: 0.87, rationale: 'Demo data — not a real report' },
    createdAt: new Date(Date.now() - 4 * 60_000).toISOString(),
    opsStatus: 'open', _demo: true,
  },
  {
    reportId: 'demo_002',
    status: 'assessed',
    lat: 28.6380, lng: 77.2050,
    wardNo: '85', wardName: 'Idgah Road',
    assessment: { depthClass: 'waist', passable: 'no',      confidence: 0.91, rationale: 'Demo data — not a real report' },
    createdAt: new Date(Date.now() - 12 * 60_000).toISOString(),
    opsStatus: 'open', _demo: true,
  },
  {
    reportId: 'demo_003',
    status: 'assessed',
    lat: 28.6512, lng: 77.2310,
    wardNo: '90', wardName: 'Kotwali',
    assessment: { depthClass: 'ankle', passable: 'caution', confidence: 0.71, rationale: 'Demo data — not a real report' },
    createdAt: new Date(Date.now() - 28 * 60_000).toISOString(),
    opsStatus: 'open', _demo: true,
  },
  {
    reportId: 'demo_004',
    status: 'assessed',
    lat: 28.6600, lng: 77.2400,
    wardNo: '72', wardName: 'Seelampur',
    assessment: { depthClass: 'ankle', passable: 'yes',     confidence: 0.65, rationale: 'Demo data — not a real report' },
    createdAt: new Date(Date.now() - 45 * 60_000).toISOString(),
    opsStatus: 'resolved', _demo: true,
  },
  {
    reportId: 'demo_005',
    status: 'analyzing',
    lat: 28.6310, lng: 77.2190,
    wardNo: '83', wardName: 'Bazar Sitaram',
    assessment: null,
    createdAt: new Date(Date.now() - 45_000).toISOString(),
    opsStatus: 'open', _demo: true,
  },
];

/** Risk overrides for specific wards — demo only */
export const DEMO_RISK = [
  { wardNo: '80', band: 'severe',   score: 0.91 },
  { wardNo: '85', band: 'severe',   score: 0.88 },
  { wardNo: '83', band: 'high',     score: 0.72 },
  { wardNo: '90', band: 'moderate', score: 0.48 },
  { wardNo: '72', band: 'low',      score: 0.15 },
];
