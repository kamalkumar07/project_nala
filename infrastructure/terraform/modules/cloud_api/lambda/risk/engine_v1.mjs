/**
 * Nala V1 Canonical Risk Engine for AWS Lambda (Node.js/ESM).
 * Strictly mirrors `src/models/flood_model.py`, `src/models/landslide_model.py`,
 * and `src/models/risk_engine.py`.
 */

import {
  clamp01,
  domainRainfall,
  domainSlopeFlood,
  domainSlopeLandslide,
  domainTriLandslide
} from "./scalers_v1.mjs";

export const MODEL_VERSION = "V1.0";
export const MODEL_STATUS = "PROVISIONAL";

export const FLOOD_CONFIG = {
  weights: {
    rain_1d: 0.30,
    rain_3d: 0.25,
    valley_slope: 0.30,
    floodplain_tri: 0.15
  },
  bands: {
    lowMax: 0.34,
    mediumMax: 0.69
  }
};

export const LANDSLIDE_CONFIG = {
  weights: {
    slope: 0.35,
    tri: 0.20,
    rain_1d: 0.25,
    rain_3d: 0.20
  },
  bands: {
    lowMax: 0.34,
    mediumMax: 0.69
  }
};

/**
 * Classify feature input state into AVAILABLE, MISSING, UNKNOWN, or INVALID.
 */
export function evaluateFeatureState(val, minVal = 0.0, maxVal = null) {
  if (val === null || val === undefined) {
    return "MISSING";
  }
  if (typeof val === "string") {
    if (val.trim().toUpperCase() === "UNKNOWN") {
      return "UNKNOWN";
    }
    return "INVALID";
  }
  const num = Number(val);
  if (!Number.isFinite(num)) {
    return "INVALID";
  }
  if (num < minVal) {
    return "INVALID";
  }
  if (maxVal !== null && num > maxVal) {
    return "INVALID";
  }
  return "AVAILABLE";
}

/**
 * Classify water depth category and passability directive.
 */
export function classifyWaterDepthAndPassability(reportedWaterDepth = null, floodScore = null) {
  const validDepths = new Set(["NONE", "ANKLE", "KNEE", "WAIST", "ABOVE_WAIST", "UNKNOWN"]);
  if (reportedWaterDepth !== null && reportedWaterDepth !== undefined) {
    const depthClean = String(reportedWaterDepth).trim().toUpperCase();
    if (validDepths.has(depthClean)) {
      if (depthClean === "NONE" || depthClean === "ANKLE") {
        return { water_depth: depthClean, passability: "passable" };
      } else if (["KNEE", "WAIST", "ABOVE_WAIST"].includes(depthClean)) {
        return { water_depth: depthClean, passability: "not passable" };
      } else {
        return { water_depth: "UNKNOWN", passability: "undetermined" };
      }
    }
  }

  if (floodScore === null || floodScore === undefined) {
    return { water_depth: "UNKNOWN", passability: "undetermined" };
  }

  if (floodScore <= 0.20) {
    return { water_depth: "NONE", passability: "passable" };
  } else if (floodScore <= 0.40) {
    return { water_depth: "ANKLE", passability: "passable" };
  } else if (floodScore <= 0.65) {
    return { water_depth: "KNEE", passability: "not passable" };
  } else if (floodScore <= 0.85) {
    return { water_depth: "WAIST", passability: "not passable" };
  } else {
    return { water_depth: "ABOVE_WAIST", passability: "not passable" };
  }
}

/**
 * Evaluate Flood Risk (Model A).
 */
export function evaluateFloodRisk(params) {
  const {
    slope_deg = null,
    tri = null,
    rainfall_1d_mm = null,
    rainfall_3d_mm = null,
    reported_water_depth = null
  } = params;

  const factors = {};
  let missingPenalties = 0.0;

  const s_state = evaluateFeatureState(slope_deg, 0.0, 90.0);
  const t_state = evaluateFeatureState(tri, 0.0, null);
  const r1_state = evaluateFeatureState(rainfall_1d_mm, 0.0, null);
  const r3_state = evaluateFeatureState(rainfall_3d_mm, 0.0, null);

  const evidenceStatus = {
    valley_slope: s_state,
    floodplain_tri: t_state,
    rain_1d: r1_state,
    rain_3d: r3_state
  };

  let f_slope = 0.20;
  if (s_state === "AVAILABLE") {
    f_slope = domainSlopeFlood(Number(slope_deg));
    factors.valley_slope = Number(f_slope.toFixed(4));
  } else {
    missingPenalties += 0.30;
  }

  let f_tri = 0.20;
  if (t_state === "AVAILABLE") {
    f_tri = clamp01(1.0 - Number(tri) / 25.0);
    factors.floodplain_flatness = Number(f_tri.toFixed(4));
  } else {
    missingPenalties += 0.15;
  }

  let f_rain_1d = 0.0;
  if (r1_state === "AVAILABLE") {
    f_rain_1d = domainRainfall(Number(rainfall_1d_mm));
    factors.rain_1d = Number(f_rain_1d.toFixed(4));
  } else {
    missingPenalties += 0.30;
  }

  let f_rain_3d = 0.0;
  if (r3_state === "AVAILABLE") {
    f_rain_3d = domainRainfall(Number(rainfall_3d_mm) / 1.6);
    factors.rain_3d = Number(f_rain_3d.toFixed(4));
  } else {
    missingPenalties += 0.25;
  }

  let baseScore =
    f_rain_1d * FLOOD_CONFIG.weights.rain_1d +
    f_rain_3d * FLOOD_CONFIG.weights.rain_3d +
    f_slope * FLOOD_CONFIG.weights.valley_slope +
    f_tri * FLOOD_CONFIG.weights.floodplain_tri;

  if (s_state === "AVAILABLE" && Number(slope_deg) <= 6.0 && r1_state === "AVAILABLE" && Number(rainfall_1d_mm) >= 64.4) {
    const boost = 0.15 * (f_slope * f_rain_1d);
    baseScore += boost;
  }

  const rawScore = clamp01(baseScore);
  const confidence = clamp01(1.0 - missingPenalties);

  let band = "HIGH";
  if (rawScore <= FLOOD_CONFIG.bands.lowMax) {
    band = "LOW";
  } else if (rawScore <= FLOOD_CONFIG.bands.mediumMax) {
    band = "MEDIUM";
  }

  const { water_depth, passability } = classifyWaterDepthAndPassability(reported_water_depth, rawScore);

  const allMissingOrInvalid = [s_state, t_state, r1_state, r3_state].every(
    st => st === "MISSING" || st === "INVALID" || st === "UNKNOWN"
  );
  const assessmentStatus = allMissingOrInvalid ? "INSUFFICIENT_DATA" : "ASSESSED";

  return {
    score: Number(rawScore.toFixed(2)),
    band,
    confidence: Number(confidence.toFixed(2)),
    assessmentStatus,
    water_depth,
    passability,
    routePassability: "UNDETERMINED",
    evidenceStatus,
    factors,
    raw_score: rawScore
  };
}

/**
 * Evaluate Landslide Risk (Model B).
 */
export function evaluateLandslideRisk(params) {
  const {
    slope_deg = null,
    tri = null,
    rainfall_1d_mm = null,
    rainfall_3d_mm = null
  } = params;

  const factors = {};
  let missingPenalties = 0.0;

  const s_state = evaluateFeatureState(slope_deg, 0.0, 90.0);
  const t_state = evaluateFeatureState(tri, 0.0, null);
  const r1_state = evaluateFeatureState(rainfall_1d_mm, 0.0, null);
  const r3_state = evaluateFeatureState(rainfall_3d_mm, 0.0, null);

  const evidenceStatus = {
    slope: s_state,
    tri: t_state,
    rain_1d: r1_state,
    rain_3d: r3_state
  };

  let f_slope = 0.20;
  if (s_state === "AVAILABLE") {
    f_slope = domainSlopeLandslide(Number(slope_deg));
    factors.slope = Number(f_slope.toFixed(4));
  } else {
    missingPenalties += 0.35;
  }

  let f_tri = 0.20;
  if (t_state === "AVAILABLE") {
    f_tri = domainTriLandslide(Number(tri));
    factors.tri = Number(f_tri.toFixed(4));
  } else {
    missingPenalties += 0.20;
  }

  let f_rain_1d = 0.0;
  if (r1_state === "AVAILABLE") {
    f_rain_1d = domainRainfall(Number(rainfall_1d_mm));
    factors.rain_1d = Number(f_rain_1d.toFixed(4));
  } else {
    missingPenalties += 0.25;
  }

  let f_rain_3d = 0.0;
  if (r3_state === "AVAILABLE") {
    f_rain_3d = domainRainfall(Number(rainfall_3d_mm) / 1.6);
    factors.rain_3d = Number(f_rain_3d.toFixed(4));
  } else {
    missingPenalties += 0.20;
  }

  let baseScore =
    f_slope * LANDSLIDE_CONFIG.weights.slope +
    f_tri * LANDSLIDE_CONFIG.weights.tri +
    f_rain_1d * LANDSLIDE_CONFIG.weights.rain_1d +
    f_rain_3d * LANDSLIDE_CONFIG.weights.rain_3d;

  if (s_state === "AVAILABLE" && Number(slope_deg) >= 22.0 && r1_state === "AVAILABLE" && Number(rainfall_1d_mm) >= 64.4) {
    const boost = 0.12 * (f_slope * f_rain_1d);
    baseScore += boost;
  }

  const rawScore = clamp01(baseScore);
  const confidence = clamp01(1.0 - missingPenalties);

  let band = "HIGH";
  if (rawScore <= LANDSLIDE_CONFIG.bands.lowMax) {
    band = "LOW";
  } else if (rawScore <= LANDSLIDE_CONFIG.bands.mediumMax) {
    band = "MEDIUM";
  }

  const allMissingOrInvalid = [s_state, t_state, r1_state, r3_state].every(
    st => st === "MISSING" || st === "INVALID" || st === "UNKNOWN"
  );
  const assessmentStatus = allMissingOrInvalid ? "INSUFFICIENT_DATA" : "ASSESSED";

  return {
    score: Number(rawScore.toFixed(2)),
    band,
    confidence: Number(confidence.toFixed(2)),
    assessmentStatus,
    evidenceStatus,
    factors,
    raw_score: rawScore
  };
}

/**
 * Calculate Dual-Hazard Risk for Nala V1 (Master Entrypoint).
 */
export function calculateRiskV1(input, district = null) {
  const floodRes = evaluateFloodRisk({
    slope_deg: input.slope_deg,
    tri: input.tri,
    rainfall_1d_mm: input.rainfall_1d_mm,
    rainfall_3d_mm: input.rainfall_3d_mm,
    reported_water_depth: input.reported_water_depth
  });

  const landslideRes = evaluateLandslideRisk({
    slope_deg: input.slope_deg,
    tri: input.tri,
    rainfall_1d_mm: input.rainfall_1d_mm,
    rainfall_3d_mm: input.rainfall_3d_mm
  });

  return {
    location: {
      latitude: Number(Number(input.latitude).toFixed(6)),
      longitude: Number(Number(input.longitude).toFixed(6)),
      district: district || "Unknown"
    },
    flood: {
      score: floodRes.score,
      band: floodRes.band,
      confidence: floodRes.confidence,
      assessmentStatus: floodRes.assessmentStatus,
      water_depth: floodRes.water_depth,
      passability: floodRes.passability,
      routePassability: floodRes.routePassability,
      evidenceStatus: floodRes.evidenceStatus,
      factors: floodRes.factors
    },
    landslide: {
      score: landslideRes.score,
      band: landslideRes.band,
      confidence: landslideRes.confidence,
      assessmentStatus: landslideRes.assessmentStatus,
      evidenceStatus: landslideRes.evidenceStatus,
      factors: landslideRes.factors
    },
    modelVersion: MODEL_VERSION,
    modelStatus: MODEL_STATUS
  };
}
