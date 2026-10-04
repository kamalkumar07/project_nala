import { RISK_CONFIG } from "./config.mjs";
import {
  normalizeRainfall,
  normalizeReports,
  normalizeLowness
} from "./normalize.mjs";

export function calculateRisk(input) {
  const rain = normalizeRainfall(input.rainfall);
  const reports = normalizeReports(input.recentReports);
  const lowness = normalizeLowness(input.elevation);

  const { rain: rainWeight, reports: reportsWeight, lowness: lownessWeight } =
    RISK_CONFIG.weights;

  const riskScore = Math.max(
    0,
    Math.min(
      1,
      rain * rainWeight +
        reports * reportsWeight +
        lowness * lownessWeight
    )
  );

  const riskBand =
    riskScore <= RISK_CONFIG.bands.lowMax
      ? "LOW"
      : riskScore <= RISK_CONFIG.bands.mediumMax
        ? "MEDIUM"
        : "HIGH";

  return {
    riskScore: Number(riskScore.toFixed(2)),
    riskBand,
    riskFactors: {
      rain: Number(rain.toFixed(2)),
      reports: Number(reports.toFixed(2)),
      lowness: Number(lowness.toFixed(2))
    }
  };
}
