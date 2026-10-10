// Nala Risk Engine V1 — draft JavaScript compatibility implementation.
// Python reference: src/models/risk_engine.py
// Numerical parameters remain provisional pending model-owner confirmation.

const FLOOD_WEIGHTS = {
  rain_1d: 0.30,
  rain_3d: 0.25,
  valley_slope: 0.30,
  floodplain_tri: 0.15
};

const LANDSLIDE_WEIGHTS = {
  slope: 0.35,
  tri: 0.20,
  rain_1d: 0.25,
  rain_3d: 0.20
};

const LOW_MAX = 0.34;
const MEDIUM_MAX = 0.69;

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function roundTo(value, digits) {
  return Number(value.toFixed(digits));
}

// Matches numpy.interp for the scalar inputs used by the Python reference.
function interpolate(value, xp, fp, rightValue) {
  if (value <= xp[0]) return fp[0];

  for (let i = 1; i < xp.length; i += 1) {
    if (value <= xp[i]) {
      const fraction = (value - xp[i - 1]) / (xp[i] - xp[i - 1]);
      return fp[i - 1] + fraction * (fp[i] - fp[i - 1]);
    }
  }

  return rightValue;
}

function isAvailable(value) {
  return value !== null &&
    value !== undefined &&
    Number.isFinite(value) &&
    value >= 0;
}

function normalizeRainfall(value) {
  return interpolate(
    Math.max(0, value),
    [0, 15.5, 64.4, 115.5, 204.4],
    [0, 0.15, 0.45, 0.75, 1],
    1
  );
}

function normalizeFloodSlope(value) {
  return interpolate(
    Math.max(0, value),
    [0, 3, 8, 15],
    [1, 0.70, 0.25, 0],
    0
  );
}

function normalizeLandslideSlope(value) {
  return interpolate(
    Math.max(0, value),
    [0, 10, 20, 32, 42, 60],
    [0, 0.10, 0.35, 0.85, 1, 0.80],
    0.80
  );
}

function normalizeLandslideTri(value) {
  return interpolate(
    Math.max(0, value),
    [0, 5, 20, 40, 60],
    [0, 0.15, 0.45, 0.85, 1],
    1
  );
}

function classifyBand(score) {
  if (score <= LOW_MAX) return "LOW";
  if (score <= MEDIUM_MAX) return "MEDIUM";
  return "HIGH";
}

function classifyWaterDepth(reportedDepth) {
  const validDepths = new Set([
    "NONE",
    "ANKLE",
    "KNEE",
    "WAIST",
    "ABOVE_WAIST",
    "UNKNOWN"
  ]);

  if (typeof reportedDepth === "string") {
    const depth = reportedDepth.trim().toUpperCase();

    if (validDepths.has(depth) && depth !== "UNKNOWN") {
      return {
        water_depth: depth,
        passability: "undetermined"
      };
    }
  }

  return {
    water_depth: "UNKNOWN",
    passability: "undetermined"
  };
}

function assessFlood(input) {
  const factors = {};
  let missingPenalties = 0;

  let slopeFactor;
  if (isAvailable(input.slope_deg)) {
    slopeFactor = normalizeFloodSlope(input.slope_deg);
    factors.valley_slope = roundTo(slopeFactor, 4);
  } else {
    slopeFactor = 0.20;
    missingPenalties += 0.30;
  }

  let triFactor;
  if (isAvailable(input.tri)) {
    triFactor = clamp01(1 - input.tri / 25);
    factors.floodplain_flatness = roundTo(triFactor, 4);
  } else {
    triFactor = 0.20;
    missingPenalties += 0.15;
  }

  let rain1Factor;
  if (isAvailable(input.rainfall_1d_mm)) {
    rain1Factor = normalizeRainfall(input.rainfall_1d_mm);
    factors.rain_1d = roundTo(rain1Factor, 4);
  } else {
    rain1Factor = 0;
    missingPenalties += 0.30;
  }

  let rain3Factor;
  if (isAvailable(input.rainfall_3d_mm)) {
    rain3Factor = normalizeRainfall(input.rainfall_3d_mm / 1.6);
    factors.rain_3d = roundTo(rain3Factor, 4);
  } else {
    rain3Factor = 0;
    missingPenalties += 0.25;
  }

  let score =
    rain1Factor * FLOOD_WEIGHTS.rain_1d +
    rain3Factor * FLOOD_WEIGHTS.rain_3d +
    slopeFactor * FLOOD_WEIGHTS.valley_slope +
    triFactor * FLOOD_WEIGHTS.floodplain_tri;

  if (
    isAvailable(input.slope_deg) &&
    input.slope_deg <= 6 &&
    isAvailable(input.rainfall_1d_mm) &&
    input.rainfall_1d_mm >= 64.4
  ) {
    score += 0.15 * slopeFactor * rain1Factor;
  }

  score = clamp01(score);

  const depth = classifyWaterDepth(input.reported_water_depth);

  return {
    score: roundTo(score, 2),
    band: classifyBand(score),
    confidence: roundTo(clamp01(1 - missingPenalties), 2),
    water_depth: depth.water_depth,
    passability: depth.passability,
    factors
  };
}

function assessLandslide(input) {
  const factors = {};
  let missingPenalties = 0;

  let slopeFactor;
  if (isAvailable(input.slope_deg)) {
    slopeFactor = normalizeLandslideSlope(input.slope_deg);
    factors.slope = roundTo(slopeFactor, 4);
  } else {
    slopeFactor = 0.20;
    missingPenalties += 0.35;
  }

  let triFactor;
  if (isAvailable(input.tri)) {
    triFactor = normalizeLandslideTri(input.tri);
    factors.tri = roundTo(triFactor, 4);
  } else {
    triFactor = 0.20;
    missingPenalties += 0.20;
  }

  let rain1Factor;
  if (isAvailable(input.rainfall_1d_mm)) {
    rain1Factor = normalizeRainfall(input.rainfall_1d_mm);
    factors.rain_1d = roundTo(rain1Factor, 4);
  } else {
    rain1Factor = 0;
    missingPenalties += 0.25;
  }

  let rain3Factor;
  if (isAvailable(input.rainfall_3d_mm)) {
    rain3Factor = normalizeRainfall(input.rainfall_3d_mm / 1.6);
    factors.rain_3d = roundTo(rain3Factor, 4);
  } else {
    rain3Factor = 0;
    missingPenalties += 0.20;
  }

  let score =
    slopeFactor * LANDSLIDE_WEIGHTS.slope +
    triFactor * LANDSLIDE_WEIGHTS.tri +
    rain1Factor * LANDSLIDE_WEIGHTS.rain_1d +
    rain3Factor * LANDSLIDE_WEIGHTS.rain_3d;

  if (
    isAvailable(input.slope_deg) &&
    input.slope_deg >= 22 &&
    isAvailable(input.rainfall_1d_mm) &&
    input.rainfall_1d_mm >= 64.4
  ) {
    score += 0.12 * slopeFactor * rain1Factor;
  }

  score = clamp01(score);

  return {
    score: roundTo(score, 2),
    band: classifyBand(score),
    confidence: roundTo(clamp01(1 - missingPenalties), 2),
    factors
  };
}

export function assessRiskV1(input) {
const latitude = Number(input.latitude);
const longitude = Number(input.longitude);

if (
!Number.isFinite(latitude) ||
latitude < -90 ||
latitude > 90 ||
!Number.isFinite(longitude) ||
longitude < -180 ||
longitude > 180
) {
throw new TypeError("Valid latitude and longitude are required");
}

const environmentalInputs = [
input.slope_deg,
input.tri,
input.rainfall_1d_mm,
input.rainfall_3d_mm
];

const availableInputs = environmentalInputs.filter(isAvailable).length;

let assessmentStatus;

if (availableInputs === 0) {
assessmentStatus = "INSUFFICIENT_DATA";
} else if (availableInputs < environmentalInputs.length) {
assessmentStatus = "PARTIAL_DATA";
} else {
assessmentStatus = "INPUTS_AVAILABLE";
}

const flood = assessFlood(input);
const landslide = assessLandslide(input);

if (assessmentStatus === "INSUFFICIENT_DATA") {
  flood.score = null;
  flood.band = null;
  flood.water_depth = "UNKNOWN";
  flood.passability = "undetermined";

  landslide.score = null;
  landslide.band = null;
}

return {
  location: {
    latitude: roundTo(latitude, 6),
    longitude: roundTo(longitude, 6),
    district: input.district ?? "Outside_Himachal_Pradesh"
  },
  flood,
  landslide,
  modelVersion: "V1",
  assessmentStatus
};
}
