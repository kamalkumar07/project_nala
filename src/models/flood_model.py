"""Himachal Pradesh Flood / Flash-Flood Risk Model (Model A).

Transparent, deterministic, scientifically grounded baseline model
incorporating hydrologic valley-ponding susceptibility, flat drainage
terraces, and dual-temporal IMD precipitation triggers.
"""

from __future__ import annotations
from typing import Dict, Any, Optional
import numpy as np

from src.normalization.scalers import RiskScalers


class FloodRiskModel:
    """Scientific V1 deterministic risk model for Himalayan flood and flash-floods."""

    VERSION = "V1.0"
    STATUS = "PROVISIONAL"

    # Calibrated feature weights for hydrologic valley flooding
    WEIGHTS = {
        "rain_1d": 0.30,       # Runoff pulse triggering flash surges
        "rain_3d": 0.25,       # Catchment soil saturation & river swelling
        "valley_slope": 0.30,  # Low-slope accumulation susceptibility (inverted)
        "floodplain_tri": 0.15 # Low-ruggedness alluvial terrace (inverted)
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
    def classify_water_depth_and_passability(
        cls,
        reported_water_depth: Optional[str] = None,
        flood_score: Optional[float] = None
    ) -> tuple[str, str]:
        """Classify water depth category and route passability.

        Standard Water Depth Levels:
        - NONE, ANKLE -> passable
        - KNEE, WAIST, ABOVE_WAIST -> not passable
        - UNKNOWN -> undetermined
        """
        valid_depths = {"NONE", "ANKLE", "KNEE", "WAIST", "ABOVE_WAIST", "UNKNOWN"}
        if reported_water_depth is not None:
            depth_clean = str(reported_water_depth).strip().upper()
            if depth_clean in valid_depths:
                if depth_clean in {"NONE", "ANKLE"}:
                    return depth_clean, "passable"
                elif depth_clean in {"KNEE", "WAIST", "ABOVE_WAIST"}:
                    return depth_clean, "not passable"
                else:
                    return "UNKNOWN", "undetermined"

        # If reported water depth is not provided, estimate from hydrological score
        if flood_score is None:
            return "UNKNOWN", "undetermined"

        if flood_score <= 0.20:
            return "NONE", "passable"
        elif flood_score <= 0.40:
            return "ANKLE", "passable"
        elif flood_score <= 0.65:
            return "KNEE", "not passable"
        elif flood_score <= 0.85:
            return "WAIST", "not passable"
        else:
            return "ABOVE_WAIST", "not passable"

    @classmethod
    def evaluate(
        cls,
        slope_deg: Optional[float],
        tri: Optional[float],
        rainfall_1d_mm: Optional[float],
        rainfall_3d_mm: Optional[float],
        elevation_m: Optional[float] = None,
        recent_reports: Optional[int] = None,
        reported_water_depth: Optional[str] = None
    ) -> Dict[str, Any]:
        """Compute Flood risk score, factors, confidence, water depth, and passability."""
        factors: Dict[str, float] = {}
        missing_penalties = 0.0

        # Evaluate feature availability states
        s_state = cls.evaluate_feature_state(slope_deg, val_min=0.0, val_max=90.0)
        t_state = cls.evaluate_feature_state(tri, val_min=0.0)
        r1_state = cls.evaluate_feature_state(rainfall_1d_mm, val_min=0.0)
        r3_state = cls.evaluate_feature_state(rainfall_3d_mm, val_min=0.0)

        evidence_status = {
            "valley_slope": s_state,
            "floodplain_tri": t_state,
            "rain_1d": r1_state,
            "rain_3d": r3_state
        }

        # 1. Valley Slope Factor (Inverted: low slope = high accumulation)
        if s_state == "AVAILABLE":
            f_slope = float(RiskScalers.domain_slope_flood(slope_deg))
            factors["valley_slope"] = round(f_slope, 4)
        else:
            f_slope = 0.20
            missing_penalties += 0.30

        # 2. Floodplain Flatness / TRI Factor (Inverted: low TRI = flat floodplain)
        if t_state == "AVAILABLE":
            # Low TRI (<= 5m) gets high score (1.0), high TRI (>= 25m) drops to 0.0
            f_tri = float(np.clip(1.0 - tri / 25.0, 0.0, 1.0))
            factors["floodplain_flatness"] = round(f_tri, 4)
        else:
            f_tri = 0.20
            missing_penalties += 0.15

        # 3. Rainfall 1-Day Factor
        if r1_state == "AVAILABLE":
            f_rain_1d = float(RiskScalers.domain_rainfall(rainfall_1d_mm))
            factors["rain_1d"] = round(f_rain_1d, 4)
        else:
            f_rain_1d = 0.0
            missing_penalties += 0.30

        # 4. Rainfall 3-Day Factor
        if r3_state == "AVAILABLE":
            f_rain_3d = float(RiskScalers.domain_rainfall(rainfall_3d_mm / 1.6))
            factors["rain_3d"] = round(f_rain_3d, 4)
        else:
            f_rain_3d = 0.0
            missing_penalties += 0.25

        # Linear weighted baseline
        base_score = (
            f_rain_1d * cls.WEIGHTS["rain_1d"] +
            f_rain_3d * cls.WEIGHTS["rain_3d"] +
            f_slope * cls.WEIGHTS["valley_slope"] +
            f_tri * cls.WEIGHTS["floodplain_tri"]
        )

        # Hydrologic Amplification: If gentle valley floor (<= 5°) experiences severe rain (>64.4mm),
        # flash-flood pooling surges nonlinearly
        if (s_state == "AVAILABLE" and slope_deg <= 6.0) and (r1_state == "AVAILABLE" and rainfall_1d_mm >= 64.4):
            boost = 0.15 * (f_slope * f_rain_1d)
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

        # Water depth & passability classification
        depth_category, passability = cls.classify_water_depth_and_passability(
            reported_water_depth=reported_water_depth,
            flood_score=score
        )

        # Assessment Status: If all environmental features are missing/invalid, report INSUFFICIENT_DATA
        if all(st in {"MISSING", "INVALID", "UNKNOWN"} for st in [s_state, t_state, r1_state, r3_state]):
            assessment_status = "INSUFFICIENT_DATA"
        else:
            assessment_status = "ASSESSED"

        return {
            "score": round(score, 2),
            "band": band,
            "confidence": round(confidence, 2),
            "assessmentStatus": assessment_status,
            "water_depth": depth_category,
            "passability": passability,
            "routePassability": "UNDETERMINED",
            "evidenceStatus": evidence_status,
            "factors": factors,
            "raw_score": score
        }
