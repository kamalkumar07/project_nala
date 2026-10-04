export function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

export function normalizeRainfall(rainfall) {
  // Provisional V1 normalization.
  // Final thresholds should come from Reetu/Pranad calibration.
  const value = Number(rainfall);

  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return clamp01(value / 100);
}

export function normalizeReports(recentReports) {
  // Provisional V1 normalization.
  // Final report aggregation/normalization is pending calibration.
  const value = Number(recentReports);

  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return clamp01(value / 10);
}

export function normalizeLowness(elevation) {
  // Provisional V1 normalization.
  // Final terrain/lowness calculation will use the calibrated elevation model.
  const value = Number(elevation);

  if (!Number.isFinite(value)) {
    return 0;
  }

  return clamp01(1 - value / 100);
}
