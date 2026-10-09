"""Master Local Reference Risk Engine for Himachal Pradesh (Nala V1).

Integrates:
- Himachal boundary validation & district lookup
- Independent FloodRiskModel evaluation
- Independent LandslideRiskModel evaluation
- Strict input validation and range checking
- Structured, production-oriented JSON output contract
"""

from __future__ import annotations
from typing import Dict, Any, Optional
import numpy as np

from src.gis.boundary_lookup import HimachalBoundaryEngine
from src.models.flood_model import FloodRiskModel
from src.models.landslide_model import LandslideRiskModel


class NalaRiskEngine:
    """Master production-oriented Local Risk Engine for Himachal Pradesh."""

    MODEL_VERSION = "V1"

    def __init__(self):
        self.boundary_engine = HimachalBoundaryEngine()

    def assess_risk(
        self,
        latitude: float,
        longitude: float,
        slope_deg: Optional[float] = None,
        tri: Optional[float] = None,
        rainfall_1d_mm: Optional[float] = None,
        rainfall_3d_mm: Optional[float] = None,
        elevation_m: Optional[float] = None,
        recent_reports: Optional[int] = None,
        reported_water_depth: Optional[str] = None
    ) -> Dict[str, Any]:
        """Perform comprehensive, dual-hazard risk assessment for a geographic location.

        Returns structured contract dictionary matching Nala V1 Specification.
        """
        # 1. Coordinate Validation
        try:
            lat = float(latitude)
            lon = float(longitude)
        except (ValueError, TypeError):
            raise ValueError(f"Invalid coordinate format: lat={latitude}, lon={longitude}")

        if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
            raise ValueError(f"Coordinates out of bounds: lat={lat}, lon={lon}")

        # 2. Administrative District Resolution
        district_info = self.boundary_engine.lookup_district(lat, lon)
        if district_info:
            district_name = district_info["district"]
        else:
            # Check if point is outside state boundary
            district_name = "Outside_Himachal_Pradesh"

        # 3. Evaluate Independent Hazard Models
        flood_res = FloodRiskModel.evaluate(
            slope_deg=slope_deg,
            tri=tri,
            rainfall_1d_mm=rainfall_1d_mm,
            rainfall_3d_mm=rainfall_3d_mm,
            elevation_m=elevation_m,
            recent_reports=recent_reports,
            reported_water_depth=reported_water_depth
        )

        landslide_res = LandslideRiskModel.evaluate(
            slope_deg=slope_deg,
            tri=tri,
            rainfall_1d_mm=rainfall_1d_mm,
            rainfall_3d_mm=rainfall_3d_mm,
            elevation_m=elevation_m,
            recent_reports=recent_reports
        )

        # 4. Construct Final Structured Output
        return {
            "location": {
                "latitude": round(lat, 6),
                "longitude": round(lon, 6),
                "district": district_name
            },
            "flood": {
                "score": flood_res["score"],
                "band": flood_res["band"],
                "confidence": flood_res["confidence"],
                "water_depth": flood_res["water_depth"],
                "passability": flood_res["passability"],
                "factors": flood_res["factors"]
            },
            "landslide": {
                "score": landslide_res["score"],
                "band": landslide_res["band"],
                "confidence": landslide_res["confidence"],
                "factors": landslide_res["factors"]
            },
            "modelVersion": self.MODEL_VERSION
        }
