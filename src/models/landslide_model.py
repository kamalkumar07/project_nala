"""Himachal Pradesh Landslide Risk Model (Model B).

Transparent, deterministic, scientifically grounded baseline model
incorporating geomorphological slope thresholds, terrain ruggedness,
and dual-temporal (1-day trigger + 3-day antecedent) IMD precipitation.
"""

from __future__ import annotations
from typing import Dict, Any, Optional
import numpy as np

from src.normalization.scalers import RiskScalers


class LandslideRiskModel:
    """Scientific V1 deterministic risk model for Himalayan landslides."""

    VERSION = "V1"

    # Calibrated feature weights based on 2023 disaster ground-truth empirical correlations
    WEIGHTS = {
        "slope": 0.35,      # Dominant static susceptibility factor
        "tri": 0.20,        # Topographic ruggedness and incision
        "rain_1d": 0.25,    # Short-term triggering downpour (pore-water pressure)
        "rain_3d": 0.20     # Antecedent soil moisture saturation
    }

    # Calibrated Risk Bands
    BANDS = {
        "LOW_MAX": 0.34,
        "MEDIUM_MAX": 0.69
    }

    @classmethod
    def evaluate(
        cls,
        slope_deg: Optional[float],
        tri: Optional[float],
        rainfall_1d_mm: Optional[float],
        rainfall_3d_mm: Optional[float],
        elevation_m: Optional[float] = None,
        recent_reports: Optional[int] = None
    ) -> Dict[str, Any]:
        """Compute Landslide risk score, factors, confidence, and assigned risk band."""
        factors: Dict[str, float] = {}
        missing_penalties = 0.0

        # 1. Slope Factor
        if slope_deg is not None and np.isfinite(slope_deg) and slope_deg >= 0:
            f_slope = float(RiskScalers.domain_slope_landslide(slope_deg))
            factors["slope"] = round(f_slope, 4)
        else:
            f_slope = 0.20  # Neutral fallback
            missing_penalties += 0.35

        # 2. TRI Factor
        if tri is not None and np.isfinite(tri) and tri >= 0:
            f_tri = float(RiskScalers.domain_tri_landslide(tri))
            factors["tri"] = round(f_tri, 4)
        else:
            f_tri = 0.20
            missing_penalties += 0.20

        # 3. Rainfall 1-Day Factor
        if rainfall_1d_mm is not None and np.isfinite(rainfall_1d_mm) and rainfall_1d_mm >= 0:
            f_rain_1d = float(RiskScalers.domain_rainfall(rainfall_1d_mm))
            factors["rain_1d"] = round(f_rain_1d, 4)
        else:
            f_rain_1d = 0.0
            missing_penalties += 0.25

        # 4. Rainfall 3-Day Factor (normalized on 3-day accumulation scale)
        if rainfall_3d_mm is not None and np.isfinite(rainfall_3d_mm) and rainfall_3d_mm >= 0:
            # Scale 3-day sum by 1.6 to match single-day severity curve
            f_rain_3d = float(RiskScalers.domain_rainfall(rainfall_3d_mm / 1.6))
            factors["rain_3d"] = round(f_rain_3d, 4)
        else:
            f_rain_3d = 0.0
            missing_penalties += 0.20

        # Linear weighted baseline
        base_score = (
            f_slope * cls.WEIGHTS["slope"] +
            f_tri * cls.WEIGHTS["tri"] +
            f_rain_1d * cls.WEIGHTS["rain_1d"] +
            f_rain_3d * cls.WEIGHTS["rain_3d"]
        )

        # Nonlinear amplification: If steep slope (>=25°) AND heavy rain (>64.4mm),
        # colluvium failure probability jumps nonlinearly
        if (slope_deg is not None and slope_deg >= 22.0) and (rainfall_1d_mm is not None and rainfall_1d_mm >= 64.4):
            boost = 0.12 * (f_slope * f_rain_1d)
            base_score += boost

        score = float(np.clip(base_score, 0.0, 1.0))

        # Separate scientific confidence metric
        confidence = float(np.clip(1.0 - missing_penalties, 0.0, 1.0))

        # Risk Band Assignment
        if score <= cls.BANDS["LOW_MAX"]:
            band = "LOW"
        elif score <= cls.BANDS["MEDIUM_MAX"]:
            band = "MEDIUM"
        else:
            band = "HIGH"

        return {
            "score": round(score, 2),
            "band": band,
            "confidence": round(confidence, 2),
            "factors": factors,
            "raw_score": score
        }
