/**
 * Physical Normalization and Piecewise Scalers for Nala V1 (Himachal Pradesh).
 * Strictly mirrors `src/normalization/scalers.py`.
 */

export function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

/**
 * 1D Linear interpolation strictly mirroring numpy.interp(x, xp, fp) with constant boundary extrapolation.
 */
function interp(x, xp, fp) {
  if (x <= xp[0]) return fp[0];
  const n = xp.length;
  if (x >= xp[n - 1]) return fp[n - 1];

  for (let i = 0; i < n - 1; i++) {
    if (x >= xp[i] && x <= xp[i + 1]) {
      const dx = xp[i + 1] - xp[i];
      if (dx === 0) return fp[i];
      const t = (x - xp[i]) / dx;
      return fp[i] + t * (fp[i + 1] - fp[i]);
    }
  }
  return fp[n - 1];
}

/**
 * Piecewise physical scaling based on IMD meteorological rainfall categories.
 * Breakpoints:
 * [0.0, 15.5, 64.4, 115.5, 204.4] -> [0.0, 0.15, 0.45, 0.75, 1.0]
 */
export function domainRainfall(rainMm) {
  const safe = Math.max(0.0, rainMm);
  const xp = [0.0, 15.5, 64.4, 115.5, 204.4];
  const fp = [0.0, 0.15, 0.45, 0.75, 1.0];
  return interp(safe, xp, fp);
}

/**
 * Piecewise physical scaling for Landslide susceptibility based on Himalayan geomorphology.
 * Breakpoints:
 * [0.0, 10.0, 20.0, 32.0, 42.0, 60.0] -> [0.0, 0.10, 0.35, 0.85, 1.00, 0.80]
 */
export function domainSlopeLandslide(slopeDeg) {
  const safe = Math.max(0.0, slopeDeg);
  const xp = [0.0, 10.0, 20.0, 32.0, 42.0, 60.0];
  const fp = [0.0, 0.10, 0.35, 0.85, 1.00, 0.80];
  if (safe > 60.0) return 0.80;
  return interp(safe, xp, fp);
}

/**
 * Piecewise physical scaling for Flood susceptibility (inverted slope accumulation).
 * Breakpoints:
 * [0.0, 3.0, 8.0, 15.0] -> [1.0, 0.70, 0.25, 0.0]
 */
export function domainSlopeFlood(slopeDeg) {
  const safe = Math.max(0.0, slopeDeg);
  const xp = [0.0, 3.0, 8.0, 15.0];
  const fp = [1.0, 0.70, 0.25, 0.0];
  if (safe > 15.0) return 0.0;
  return interp(safe, xp, fp);
}

/**
 * Piecewise scaling for Terrain Ruggedness Index in landslide models.
 * Breakpoints:
 * [0.0, 5.0, 20.0, 40.0, 60.0] -> [0.0, 0.15, 0.45, 0.85, 1.00]
 */
export function domainTriLandslide(triM) {
  const safe = Math.max(0.0, triM);
  const xp = [0.0, 5.0, 20.0, 40.0, 60.0];
  const fp = [0.0, 0.15, 0.45, 0.85, 1.00];
  return interp(safe, xp, fp);
}
