/**
 * hpSampleData.js — demonstration data for Himachal Pradesh hazard monitoring.
 *
 * Rules:
 *   • Gated strictly behind ?demo=1 or VITE_DEMO_MODE=true
 *   • Eight distinct Himachal Pradesh districts with fresh relative timestamps
 *   • Plausible but clearly sample values
 *   • Marked with _isSample: true
 */

const ALL_HP_SAMPLE_HOTSPOTS = [
  {
    hotspotId: 'sample_shimla_mall',
    district: 'Shimla',
    wardId: 'ward_shimla_04',
    wardNo: '4',
    wardName: 'Mall Road Lower Bazaar',
    lat: 31.1048,
    lng: 77.1734,
    riskScore: 88,
    riskBand: 'SEVERE',
    reportCount: 9,
    activeReports: 5,
    lastUpdated: new Date(Date.now() - 4 * 60000).toISOString(),
    riskFactors: {
      rainfall: 0.92,
      slope: 0.74,
      water_accumulation: 0.88,
      drainage_load: 0.85,
    },
    _isSample: true,
  },
  {
    hotspotId: 'sample_kullu_beas',
    district: 'Kullu',
    wardId: 'ward_kullu_02',
    wardNo: '2',
    wardName: 'Beas Riverfront Bypass',
    lat: 31.9566,
    lng: 77.1095,
    riskScore: 74,
    riskBand: 'HIGH',
    reportCount: 7,
    activeReports: 3,
    lastUpdated: new Date(Date.now() - 11 * 60000).toISOString(),
    riskFactors: {
      rainfall: 0.78,
      water_accumulation: 0.76,
      slope: 0.62,
    },
    _isSample: true,
  },
  {
    hotspotId: 'sample_mandi_victoria',
    district: 'Mandi',
    wardId: 'ward_mandi_07',
    wardNo: '7',
    wardName: 'Victoria Bridge Embankment',
    lat: 31.7082,
    lng: 76.9318,
    riskScore: 56,
    riskBand: 'MODERATE',
    reportCount: 4,
    activeReports: 2,
    lastUpdated: new Date(Date.now() - 28 * 60000).toISOString(),
    riskFactors: {
      rainfall: 0.58,
      slope: 0.44,
      soil_moisture: 0.64,
    },
    _isSample: true,
  },
  {
    hotspotId: 'sample_chamba_ravi',
    district: 'Chamba',
    wardId: 'ward_chamba_03',
    wardNo: '3',
    wardName: 'Ravi River Valley Approach',
    lat: 32.5534,
    lng: 76.1258,
    riskScore: 68,
    riskBand: 'HIGH',
    reportCount: 5,
    activeReports: 3,
    lastUpdated: new Date(Date.now() - 18 * 60000).toISOString(),
    riskFactors: {
      rainfall: 0.72,
      slope: 0.82,
      water_accumulation: 0.65,
    },
    _isSample: true,
  },
  {
    hotspotId: 'sample_kangra_bhagsu',
    district: 'Kangra',
    wardId: 'ward_kangra_09',
    wardNo: '9',
    wardName: 'Bhagsunag Stream Crossing',
    lat: 32.2426,
    lng: 76.3312,
    riskScore: 32,
    riskBand: 'LOW',
    reportCount: 2,
    activeReports: 1,
    lastUpdated: new Date(Date.now() - 52 * 60000).toISOString(),
    riskFactors: {
      rainfall: 0.35,
      slope: 0.48,
    },
    _isSample: true,
  },
  {
    hotspotId: 'sample_solan_saproon',
    district: 'Solan',
    wardId: 'ward_solan_05',
    wardNo: '5',
    wardName: 'Saproon Valley Culvert',
    lat: 30.9045,
    lng: 77.0967,
    riskScore: 48,
    riskBand: 'MODERATE',
    reportCount: 3,
    activeReports: 2,
    lastUpdated: new Date(Date.now() - 34 * 60000).toISOString(),
    riskFactors: {
      rainfall: 0.52,
      drainage_load: 0.58,
    },
    _isSample: true,
  },
  {
    hotspotId: 'sample_sirmaur_giri',
    district: 'Sirmaur',
    wardId: 'ward_sirmaur_01',
    wardNo: '1',
    wardName: 'Giri River Lowland Corridor',
    lat: 30.5985,
    lng: 77.2950,
    riskScore: 22,
    riskBand: 'LOW',
    reportCount: 1,
    activeReports: 1,
    lastUpdated: new Date(Date.now() - 75 * 60000).toISOString(),
    riskFactors: {
      rainfall: 0.28,
    },
    _isSample: true,
  },
  {
    hotspotId: 'sample_bilaspur_govind',
    district: 'Bilaspur',
    wardId: 'ward_bilaspur_02',
    wardNo: '2',
    wardName: 'Govind Sagar Shoreline',
    lat: 31.3360,
    lng: 76.7565,
    riskScore: 44,
    riskBand: 'MODERATE',
    reportCount: 3,
    activeReports: 2,
    lastUpdated: new Date(Date.now() - 38 * 60000).toISOString(),
    riskFactors: {
      rainfall: 0.48,
      slope: 0.35,
    },
    _isSample: true,
  },
  {
    hotspotId: 'sample_una_swan',
    district: 'Una',
    wardId: 'ward_una_04',
    wardNo: '4',
    wardName: 'Swan River Flood Basin',
    lat: 31.4685,
    lng: 76.2711,
    riskScore: 52,
    riskBand: 'MODERATE',
    reportCount: 4,
    activeReports: 2,
    lastUpdated: new Date(Date.now() - 42 * 60000).toISOString(),
    riskFactors: {
      rainfall: 0.54,
      water_accumulation: 0.56,
    },
    _isSample: true,
  },
  {
    hotspotId: 'sample_hamirpur_anu',
    district: 'Hamirpur',
    wardId: 'ward_hamirpur_01',
    wardNo: '1',
    wardName: 'Anu Nullah Causeway',
    lat: 31.6840,
    lng: 76.5230,
    riskScore: 26,
    riskBand: 'LOW',
    reportCount: 1,
    activeReports: 1,
    lastUpdated: new Date(Date.now() - 65 * 60000).toISOString(),
    riskFactors: {
      rainfall: 0.30,
    },
    _isSample: true,
  },
  {
    hotspotId: 'sample_kinnaur_peo',
    district: 'Kinnaur',
    wardId: 'ward_kinnaur_03',
    wardNo: '3',
    wardName: 'Reckong Peo Scree Slope',
    lat: 31.5408,
    lng: 78.2750,
    riskScore: 71,
    riskBand: 'HIGH',
    reportCount: 5,
    activeReports: 3,
    lastUpdated: new Date(Date.now() - 22 * 60000).toISOString(),
    riskFactors: {
      rainfall: 0.75,
      slope: 0.88,
    },
    _isSample: true,
  },
  {
    hotspotId: 'sample_lahual_keylong',
    district: 'Lahaul & Spiti',
    wardId: 'ward_lahual_02',
    wardNo: '2',
    wardName: 'Keylong Bhaga River Runoff',
    lat: 32.5710,
    lng: 77.0320,
    riskScore: 18,
    riskBand: 'LOW',
    reportCount: 1,
    activeReports: 1,
    lastUpdated: new Date(Date.now() - 90 * 60000).toISOString(),
    riskFactors: {
      rainfall: 0.22,
    },
    _isSample: true,
  },
];

const DEMO_DISTRICT_ORDER = [
  'Kangra',
  'Shimla',
  'Kullu',
  'Mandi',
  'Chamba',
  'Solan',
  'Una',
  'Sirmaur',
];

export const HP_SAMPLE_HOTSPOTS = DEMO_DISTRICT_ORDER
  .map((district, index) => {
    const hotspot = ALL_HP_SAMPLE_HOTSPOTS.find((item) => item.district === district);
    if (!hotspot) {
      throw new Error(`Missing sample hotspot for ${district}.`);
    }
    return {
      ...hotspot,
      lastUpdated: new Date(Date.now() - (index + 1) * 2 * 60000).toISOString(),
    };
  });

export function getFreshHpSampleHotspots(now = Date.now()) {
  return HP_SAMPLE_HOTSPOTS.map((hotspot, index) => ({
    ...hotspot,
    lastUpdated: new Date(now - (index + 1) * 2 * 60000).toISOString(),
  }));
}

/**
 * Scripted Demo Story Target Data (Kangra District turns HIGH)
 */
export const DEMO_STORY_DATA = {
  initialDistrictBand: 'LOW',
  targetDistrict: 'Kangra',
  coords: { lat: 32.2190, lng: 76.3230 },
  placeName: 'Dharamshala Bypass, Kangra',
  hotspot: {
    hotspotId: 'demo_story_kangra_hotspot',
    district: 'Kangra',
    wardId: 'ward_kangra_dharamshala_01',
    wardNo: '1',
    wardName: 'Dharamshala Bypass Sector',
    lat: 32.2190,
    lng: 76.3230,
    riskScore: 96,
    riskBand: 'HIGH',
    reportCount: 6,
    activeReports: 4,
    lastUpdated: new Date().toISOString(),
    riskFactors: {
      rainfall: 0.88,
      water_accumulation: 0.82,
      slope: 0.71,
      drainage_load: 0.79,
    },
    _isSample: true,
    _isDemoStory: true,
  },
  report: {
    reportId: 'demo_story_kangra_rep',
    hotspotId: 'demo_story_kangra_hotspot',
    district: 'Kangra',
    wardId: 'ward_kangra_dharamshala_01',
    wardNo: '1',
    wardName: 'Dharamshala Bypass Sector',
    lat: 32.2190,
    lng: 76.3230,
    hazardType: 'flood',
    note: 'Rapid mountain runoff submerging roadway at Dharamshala bypass junction.',
    createdAt: new Date().toISOString(),
    assessment: {
      depthClass: 'knee',
      passable: 'no',
      confidence: 0.92,
      rationale: 'Water level reaches car wheel hubs. Pedestrian and two-wheeler passage impassable.',
    },
    _isSample: true,
    _isDemoStory: true,
  },
};

export const HP_SAMPLE_REPORTS = [
  {
    reportId: 'sample_rep_01',
    hotspotId: 'sample_shimla_mall',
    wardId: 'ward_shimla_04',
    wardNo: '4',
    wardName: 'Mall Road Lower Bazaar',
    lat: 31.1048,
    lng: 77.1734,
    hazardType: 'flood',
    note: 'Rapid storm runoff overflowing down pedestrian steps towards Cart Road.',
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
    assessment: {
      depthClass: 'waist',
      passable: 'no',
      confidence: 0.94,
      rationale: 'Deep turbulent storm water visible reaching waist height on shop barriers.',
    },
    _isSample: true,
  },
  {
    reportId: 'sample_rep_02',
    hotspotId: 'sample_kullu_beas',
    wardId: 'ward_kullu_02',
    wardNo: '2',
    wardName: 'Beas Riverfront Bypass',
    lat: 31.9566,
    lng: 77.1095,
    hazardType: 'flood',
    note: 'River swell submerging lower shoulder of vehicular bypass.',
    createdAt: new Date(Date.now() - 14 * 60000).toISOString(),
    assessment: {
      depthClass: 'knee',
      passable: 'caution',
      confidence: 0.88,
      rationale: 'Water levels reaching above car rims; strong current along river embankment.',
    },
    _isSample: true,
  },
];

let simCounter = 1;

/**
 * Generate a new simulated report pin for live filming demo.
 */
export function createSimulatedReport(referenceCoords = null) {
  simCounter += 1;
  const targetLat = referenceCoords?.lat ?? (31.1048 + (Math.random() - 0.5) * 0.02);
  const targetLng = referenceCoords?.lng ?? (77.1734 + (Math.random() - 0.5) * 0.02);

  const reportId = `sim_report_${Date.now().toString().slice(-4)}_${simCounter}`;
  const hotspotId = `sim_hotspot_${Date.now().toString().slice(-4)}`;

  const depths = ['waist', 'knee', 'ankle'];
  const depth = depths[simCounter % depths.length];
  const band = depth === 'waist' ? 'SEVERE' : (depth === 'knee' ? 'HIGH' : 'MODERATE');
  const score = depth === 'waist' ? 89 : (depth === 'knee' ? 76 : 54);

  return {
    hotspot: {
      hotspotId,
      district: 'Shimla',
      wardId: 'ward_shimla_sim',
      wardNo: '3',
      wardName: `Simulated Hazard Incident #${simCounter}`,
      lat: Number(targetLat.toFixed(5)),
      lng: Number(targetLng.toFixed(5)),
      riskScore: score,
      riskBand: band,
      reportCount: 1,
      activeReports: 1,
      lastUpdated: new Date().toISOString(),
      riskFactors: {
        rainfall: 0.85,
        water_accumulation: 0.8,
      },
      _isSample: true,
      _isSimulated: true,
    },
    report: {
      reportId,
      hotspotId,
      lat: Number(targetLat.toFixed(5)),
      lng: Number(targetLng.toFixed(5)),
      hazardType: 'flood',
      note: 'Live simulated flash flooding observation captured for filming.',
      createdAt: new Date().toISOString(),
      assessment: {
        depthClass: depth,
        passable: depth === 'waist' ? 'no' : 'caution',
        confidence: 0.91,
        rationale: 'Multimodal AI detected rising flood level against roadside masonry.',
      },
      _isSample: true,
    },
  };
}
