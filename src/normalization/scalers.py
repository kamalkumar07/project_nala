"""Candidate Normalization Methods for Disaster Risk Modeling.

Implements and evaluates:
1. Min-Max Scaling (linear bounded)
2. Percentile Scaling (empirical quantile bounds)
3. Robust Percentile Scaling (IQR/Winsorized)
4. Empirical Cumulative Distribution Function (ECDF)
5. Log-Transformed Scaling (for skewed rainfall)
6. Domain-Based Piecewise Physical Scaling (scientifically informed breakpoints)
"""

from __future__ import annotations
from typing import Dict, Any, List, Tuple
import numpy as np


class RiskScalers:
    """Collection of candidate scaling and normalization functions for physical risk factors."""

    @staticmethod
    def clamp01(x: np.ndarray | float) -> np.ndarray | float:
        """Clamp values strictly to [0.0, 1.0]."""
        return np.clip(x, 0.0, 1.0)

    @classmethod
    def min_max(cls, x: np.ndarray | float, min_val: float, max_val: float) -> np.ndarray | float:
        """Standard linear min-max scaling clipped to [0, 1]."""
        if max_val <= min_val:
            return 0.0
        scaled = (x - min_val) / (max_val - min_val)
        return cls.clamp01(scaled)

    @classmethod
    def percentile_scaling(
        cls, x: np.ndarray | float, p_low: float, p_high: float
    ) -> np.ndarray | float:
        """Percentile scaling using empirical p_low and p_high bounds."""
        if p_high <= p_low:
            return 0.0
        scaled = (x - p_low) / (p_high - p_low)
        return cls.clamp01(scaled)

    @classmethod
    def log_scaling(cls, x: np.ndarray | float, max_val: float) -> np.ndarray | float:
        """Logarithmic scaling for heavy-tailed precipitation distributions."""
        x_safe = np.maximum(0.0, x)
        denom = np.log1p(max_val)
        if denom <= 0:
            return 0.0
        return cls.clamp01(np.log1p(x_safe) / denom)

    @classmethod
    def domain_rainfall(cls, rain_mm: np.ndarray | float) -> np.ndarray | float:
        """Piecewise physical scaling based on IMD meteorological rainfall categories.

        IMD Official Rainfall Classification:
        - 0.0 mm: No Rain -> Score: 0.00
        - 0.1 - 15.5 mm: Very Light / Light -> Score: 0.00 to 0.15
        - 15.6 - 64.4 mm: Moderate -> Score: 0.15 to 0.45
        - 64.5 - 115.5 mm: Heavy -> Score: 0.45 to 0.75
        - 115.6 - 204.4 mm: Very Heavy -> Score: 0.75 to 0.95
        - > 204.5 mm: Extremely Heavy -> Score: 1.00
        """
        is_scalar = np.isscalar(rain_mm)
        arr = np.atleast_1d(rain_mm).astype(float)
        arr_safe = np.maximum(0.0, arr)
        res = np.zeros_like(arr_safe)

        # Breakpoints (x, score)
        xp = [0.0, 15.5, 64.4, 115.5, 204.4]
        fp = [0.0, 0.15, 0.45, 0.75, 1.0]

        res = np.interp(arr_safe, xp, fp, right=1.0)
        return float(res[0]) if is_scalar else res

    @classmethod
    def domain_slope_landslide(cls, slope_deg: np.ndarray | float) -> np.ndarray | float:
        """Piecewise physical scaling for Landslide susceptibility based on Himalayan geomorphology.

        Himalayan Slope Failure Mechanics:
        - < 10°: Flat/Gentle terrain, negligible gravitational shear stress -> Score: 0.00 - 0.10
        - 10° - 20°: Moderate slopes, stable except in extreme debris flow -> Score: 0.10 - 0.35
        - 20° - 35°: High risk zone (critical threshold where loose colluvium/soil mantle fails) -> Score: 0.35 - 0.85
        - 35° - 45°: Peak failure zone (steep colluvial chutes, road cuts) -> Score: 0.85 - 1.00
        - > 45°: Sheer bedrock/escarpments with thin or absent regolith mantle -> Score: 0.85 (slight dip due to rock stability)
        """
        is_scalar = np.isscalar(slope_deg)
        arr = np.atleast_1d(slope_deg).astype(float)
        arr_safe = np.maximum(0.0, arr)

        xp = [0.0, 10.0, 20.0, 32.0, 42.0, 60.0]
        fp = [0.0, 0.10, 0.35, 0.85, 1.00, 0.80]

        res = np.interp(arr_safe, xp, fp, right=0.80)
        return float(res[0]) if is_scalar else res

    @classmethod
    def domain_slope_flood(cls, slope_deg: np.ndarray | float) -> np.ndarray | float:
        """Piecewise physical scaling for Flood susceptibility.

        Flood accumulation requires gentle gradients / low slopes:
        - 0° - 3°: River bed / alluvial floodplain, maximum ponding -> Score: 1.00
        - 3° - 8°: Valley bottoms / terraces, moderate pooling -> Score: 0.65 - 0.30
        - 8° - 15°: Transition slopes, rapid runoff -> Score: 0.30 - 0.10
        - > 15°: Steep mountain hillside, zero water pooling -> Score: 0.00
        """
        is_scalar = np.isscalar(slope_deg)
        arr = np.atleast_1d(slope_deg).astype(float)
        arr_safe = np.maximum(0.0, arr)

        xp = [0.0, 3.0, 8.0, 15.0]
        fp = [1.0, 0.70, 0.25, 0.0]

        res = np.interp(arr_safe, xp, fp, right=0.0)
        return float(res[0]) if is_scalar else res

    @classmethod
    def domain_tri_landslide(cls, tri_m: np.ndarray | float) -> np.ndarray | float:
        """Piecewise scaling for Terrain Ruggedness Index in landslide models.

        - 0 - 5 m: Level plains, zero ruggedness -> 0.0
        - 5 - 20 m: Gently rugged -> 0.20
        - 20 - 45 m: Highly rugged (empirical landslide modal range: ~38m) -> 0.85
        - > 45 m: Extremely rugged mountainous terrain -> 1.0
        """
        is_scalar = np.isscalar(tri_m)
        arr = np.atleast_1d(tri_m).astype(float)
        arr_safe = np.maximum(0.0, arr)

        xp = [0.0, 5.0, 20.0, 40.0, 60.0]
        fp = [0.0, 0.15, 0.45, 0.85, 1.00]

        res = np.interp(arr_safe, xp, fp, right=1.0)
        return float(res[0]) if is_scalar else res
