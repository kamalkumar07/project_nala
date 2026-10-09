"""Himachal Pradesh District and State Boundary Spatial Lookup Engine.

Uses GeoPandas and Shapely STRtree for ultra-fast, vectorized point-in-polygon
district matching and boundary validation.
"""

from __future__ import annotations
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List
import geopandas as gpd
from shapely.geometry import Point


class HimachalBoundaryEngine:
    """Fast spatial index for Himachal Pradesh district and state boundary lookups."""

    def __init__(
        self,
        districts_geojson: str | Path = "data/raw/himachal/districts.geojson",
        state_geojson: str | Path = "data/raw/himachal/state.geojson"
    ):
        self.districts_path = Path(districts_geojson)
        self.state_path = Path(state_geojson)

        if not self.districts_path.exists():
            raise FileNotFoundError(f"Districts file not found: {self.districts_path}")
        if not self.state_path.exists():
            raise FileNotFoundError(f"State file not found: {self.state_path}")

        self.districts_gdf = gpd.read_file(self.districts_path)
        self.state_gdf = gpd.read_file(self.state_path)

        # Enforce EPSG:4326
        if self.districts_gdf.crs != "EPSG:4326":
            self.districts_gdf = self.districts_gdf.to_crs("EPSG:4326")
        if self.state_gdf.crs != "EPSG:4326":
            self.state_gdf = self.state_gdf.to_crs("EPSG:4326")

        # Extract statewide bounding box
        self.state_bounds: Tuple[float, float, float, float] = tuple(self.state_gdf.total_bounds)  # type: ignore
        self.state_geom = self.state_gdf.geometry.union_all()

        # Build spatial index for districts
        self.sindex = self.districts_gdf.sindex

    def is_in_himachal(self, lat: float, lon: float) -> bool:
        """Check if point falls within Himachal Pradesh state boundary."""
        pt = Point(lon, lat)
        return bool(self.state_geom.contains(pt))

    def lookup_district(self, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        """Find the matching Himachal district for a given coordinate."""
        pt = Point(lon, lat)
        # Spatial index candidate query
        candidate_idxs = list(self.sindex.query(pt, predicate="contains"))
        if not candidate_idxs:
            # Fallback to intersects
            candidate_idxs = list(self.sindex.query(pt, predicate="intersects"))

        if not candidate_idxs:
            return None

        matched_row = self.districts_gdf.iloc[candidate_idxs[0]]
        return {
            "district": str(matched_row["district"]),
            "district_code": str(matched_row.get("district_code", "")),
            "district_lgd": int(matched_row.get("district_lgd", 0)),
            "state": "Himachal Pradesh"
        }

    def get_all_districts(self) -> List[str]:
        """Return list of all 12 valid district names."""
        return sorted(self.districts_gdf["district"].unique().tolist())
