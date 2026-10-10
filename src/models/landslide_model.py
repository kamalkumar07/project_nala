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

    VERSION = "V1.0"
    STATUS = "PROVISIONAL"

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

    @staticmethod
    def evaluate_feature_state(val: Any, val_min: float = 0.0, val_max: Optional[float] = None) -> str:
        """Classify feature input state into AVAILABLE, MISSING, UNKNOWN, or INVALID."""
        if val is None:
            return "MISSING"
        if isinstance(val, str):
            if val.strip().upper() == "UNKNOWN":
                return "UNKNOWN"
            return "INVALID"
        if not (isinstance(val, (int, float, np.floating, np.integer)) and np.isfinite(val)):
            return "INVALID"
        fval = float(val)
        if fval < val_min:
            return "INVALID"
        if val_max is not None and fval > val_max:
            return "INVALID"
        return "AVAILABLE"

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
        """Compute Landslide risk score, factors, confidence, evidenceStatus, and assessmentStatus."""
        factors: Dict[str, float] = {}
        missing_penalties = 0.0

        # Evaluate feature availability states
        s_state = cls.evaluate_feature_state(slope_deg, val_min=0.0, val_max=90.0)
        t_state = cls.evaluate_feature_state(tri, val_min=0.0)
        r1_state = cls.evaluate_feature_state(rainfall_1d_mm, val_min=0.0)
        r3_state = cls.evaluate_feature_state(rainfall_3d_mm, val_min=0.0)

        evidence_status = {
            "slope": s_state,
            "tri": t_state,
            "rain_1d": r1_state,
            "rain_3d": r3_state
        }

        # 1. Slope Factor
        if s_state == "AVAILABLE":
            f_slope = float(RiskScalers.domain_slope_landslide(slope_deg))
            factors["slope"] = round(f_slope, 4)
        else:
            f_slope = 0.20  # Neutral fallback
            missing_penalties += 0.35

        # 2. TRI Factor
        if t_state == "AVAILABLE":
            f_tri = float(RiskScalers.domain_tri_landslide(tri))
            factors["tri"] = round(f_tri, 4)
        else:
            f_tri = 0.20
            missing_penalties += 0.20

        # 3. Rainfall 1-Day Factor
        if r1_state == "AVAILABLE":
            f_rain_1d = float(RiskScalers.domain_rainfall(rainfall_1d_mm))
            factors["rain_1d"] = round(f_rain_1d, 4)
        else:
            f_rain_1d = 0.0
            missing_penalties += 0.25

        # 4. Rainfall 3-Day Factor (normalized on 3-day accumulation scale)
        if r3_state == "AVAILABLE":
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

        # Nonlinear amplification: If steep slope (>=22°) AND heavy rain (>=64.4mm),
        # colluvium failure probability jumps nonlinearly
        if (s_state == "AVAILABLE" and slope_deg >= 22.0) and (r1_state == "AVAILABLE" and rainfall_1d_mm >= 64.4):
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

        # Assessment Status: If all environmental features are missing/invalid/unknown, report INSUFFICIENT_DATA
        if all(st in {"MISSING", "INVALID", "UNKNOWN"} for st in [s_state, t_state, r1_state, r3_state]):
            assessment_status = "INSUFFICIENT_DATA"
        else:
            assessment_status = "ASSESSED"

        return {
            "score": round(score, 2),
            "band": band,
            "confidence": round(confidence, 2),
            "assessmentStatus": assessment_status,
            "evidenceStatus": evidence_status,
            "factors": factors,
            "raw_score": score
        }
