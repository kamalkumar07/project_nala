"""Feature Matrix Builder for Himachal Pradesh Flood and Landslide Risk Models.

Builds separate, high-performance Parquet datasets:
1. data/processed/flood_features.parquet
2. data/processed/landslide_features.parquet

Combines:
- Verified ground truth landslide events (2023 disaster season)
- Stratified non-landslide background points (pseudo-absence in stable terrain)
- Systematic spatial sampling across Himachal Pradesh districts
- CartoDEM 30m extracted topographic features (elevation, slope, TRI)
- IMD daily and 3-day precipitation features
"""

from __future__ import annotations
import json
from pathlib import Path
from typing import Dict, Any, Tuple
import numpy as np
import pandas as pd
import rasterio
from shapely.geometry import Point

from src.gis.boundary_lookup import HimachalBoundaryEngine
from src.rainfall.imd_processor import IMDRainfallProcessor


class FeatureMatrixBuilder:
    """Builds separate flood and landslide feature matrices."""

    def __init__(
        self,
        mosaic_dem_path: str | Path = "data/interim/elevation_hp_mosaic.tif",
        slope_path: str | Path = "data/interim/slope_hp_mosaic.tif",
        tri_path: str | Path = "data/interim/tri_hp_mosaic.tif",
        landslide_csv_path: str | Path = "data/raw/himachal/landslide_training_points_2023.csv",
        rainfall_dir: str | Path = "all data/imdRainfall/IMD_Rainfall_Data"
    ):
        self.dem_path = Path(mosaic_dem_path)
        self.slope_path = Path(slope_path)
        self.tri_path = Path(tri_path)
        self.ls_csv_path = Path(landslide_csv_path)
        self.rain_proc = IMDRainfallProcessor(rainfall_dir)
        self.boundary_engine = HimachalBoundaryEngine()

    def build_landslide_matrix(self, output_path: str | Path = "data/processed/landslide_features.parquet") -> pd.DataFrame:
        """Construct landslide feature matrix with positive events and stratified negative controls."""
        out_p = Path(output_path)
        out_p.parent.mkdir(parents=True, exist_ok=True)

        # 1. Load positive ground truth events
        pos_df = pd.read_csv(self.ls_csv_path)
        pos_count = len(pos_df)

        # Ensure columns exist
        pos_records = []
        for idx, row in pos_df.iterrows():
            lat = float(row["latitude"])
            lon = float(row["longitude"])
            d_info = self.boundary_engine.lookup_district(lat, lon)
            district = d_info["district"] if d_info else "Solan"  # default to local cluster district if boundary edge

            pos_records.append({
                "location_id": f"ls_pos_{idx:05d}",
                "latitude": lat,
                "longitude": lon,
                "district": district,
                "elevation_m": float(row["elevation_m"]),
                "slope_deg": float(row["slope_deg"]) if pd.notnull(row["slope_deg"]) else 26.5,
                "tri": float(row["tri_m"]) if pd.notnull(row["tri_m"]) else 38.0,
                "rainfall_1d_mm": float(row["max_daily_rainfall_2023_mm"]),
                "rainfall_3d_mm": float(row["max_daily_rainfall_2023_mm"] * 1.65),  # empirical 3d monsoon antecedent ratio
                "hazard_label": 1,
                "category": str(row.get("category", "Verified_Event")),
                "is_ground_truth": True
            })

        pos_features_df = pd.DataFrame(pos_records)

        # 2. Generate stratified negative background points (stable slopes, low TRI)
        np.random.seed(42)
        # Sample within the bounding box of the landslide cluster
        lat_min, lat_max = pos_features_df["latitude"].min(), pos_features_df["latitude"].max()
        lon_min, lon_max = pos_features_df["longitude"].min(), pos_features_df["longitude"].max()

        neg_records = []
        with rasterio.open(self.dem_path) as dem_src, \
             rasterio.open(self.slope_path) as slope_src, \
             rasterio.open(self.tri_path) as tri_src:

            attempts = 0
            while len(neg_records) < pos_count and attempts < pos_count * 10:
                attempts += 1
                cand_lat = float(np.random.uniform(lat_min - 0.1, lat_max + 0.1))
                cand_lon = float(np.random.uniform(lon_min - 0.1, lon_max + 0.1))

                # Check inside raster bounds
                if not (dem_src.bounds.left <= cand_lon <= dem_src.bounds.right and
                        dem_src.bounds.bottom <= cand_lat <= dem_src.bounds.top):
                    continue

                r, c = dem_src.index(cand_lon, cand_lat)
                if r < 0 or r >= dem_src.height or c < 0 or c >= dem_src.width:
                    continue

                elev = float(dem_src.read(1, window=rasterio.windows.Window(c, r, 1, 1))[0, 0])
                slope = float(slope_src.read(1, window=rasterio.windows.Window(c, r, 1, 1))[0, 0])
                tri_val = float(tri_src.read(1, window=rasterio.windows.Window(c, r, 1, 1))[0, 0])

                if not np.isfinite(elev) or elev <= 0 or not np.isfinite(slope) or not np.isfinite(tri_val):
                    continue

                # Stable terrain criteria for pseudo-absence: low-moderate slope, not a sheer active cliff
                # Biased towards stable foothills / plains / flat valleys (< 15 degrees)
                if slope > 16.0:
                    continue

                d_info = self.boundary_engine.lookup_district(cand_lat, cand_lon)
                district = d_info["district"] if d_info else "Solan"

                # Sample non-extreme rainfall
                rain_1d = float(np.random.exponential(scale=6.0))
                rain_3d = float(rain_1d + np.random.exponential(scale=10.0))

                neg_records.append({
                    "location_id": f"ls_neg_{len(neg_records):05d}",
                    "latitude": cand_lat,
                    "longitude": cand_lon,
                    "district": district,
                    "elevation_m": elev,
                    "slope_deg": slope,
                    "tri": tri_val,
                    "rainfall_1d_mm": rain_1d,
                    "rainfall_3d_mm": rain_3d,
                    "hazard_label": 0,
                    "category": "Stable_Terrain_Control",
                    "is_ground_truth": False
                })

        neg_features_df = pd.DataFrame(neg_records)
        combined_df = pd.concat([pos_features_df, neg_features_df], ignore_index=True)
        combined_df.to_parquet(out_p, index=False)
        print(f"Saved Landslide Feature Matrix -> {out_p} ({len(combined_df)} records: {pos_count} pos, {len(neg_records)} neg)")
        return combined_df

    def build_flood_matrix(self, output_path: str | Path = "data/processed/flood_features.parquet") -> pd.DataFrame:
        """Construct flood/flash-flood feature matrix across Himachal Pradesh river basins and valleys."""
        out_p = Path(output_path)
        out_p.parent.mkdir(parents=True, exist_ok=True)

        np.random.seed(101)
        records = []

        # Systematic grid sampling across Himachal districts covered by the DEM mosaic
        with rasterio.open(self.dem_path) as dem_src, \
             rasterio.open(self.slope_path) as slope_src, \
             rasterio.open(self.tri_path) as tri_src:

            b = dem_src.bounds
            # Step size ~ 0.02 degrees (~2.2 km resolution for 5000+ points)
            sample_lons = np.linspace(b.left + 0.05, b.right - 0.05, 75)
            sample_lats = np.linspace(b.bottom + 0.05, b.top - 0.05, 75)

            # Load 2023 disaster monsoon max rain field for realistic storm scenario
            rain_2023 = self.rain_proc.load_year(2023)
            rain_3d_2023 = self.rain_proc.compute_3day_rolling(rain_2023)

            # Find peak monsoon day across Himachal
            hp_mask, _, _ = self.rain_proc.get_himachal_grid_mask()
            hp_rain_day_means = np.nanmean(rain_2023[:, hp_mask], axis=1)
            peak_day = int(np.nanargmax(hp_rain_day_means))

            loc_counter = 0
            for lat in sample_lats:
                for lon in sample_lons:
                    d_info = self.boundary_engine.lookup_district(lat, lon)
                    if not d_info:
                        continue  # Must be inside Himachal Pradesh

                    r, c = dem_src.index(lon, lat)
                    if r < 0 or r >= dem_src.height or c < 0 or c >= dem_src.width:
                        continue

                    elev = float(dem_src.read(1, window=rasterio.windows.Window(c, r, 1, 1))[0, 0])
                    slope = float(slope_src.read(1, window=rasterio.windows.Window(c, r, 1, 1))[0, 0])
                    tri_val = float(tri_src.read(1, window=rasterio.windows.Window(c, r, 1, 1))[0, 0])

                    if not np.isfinite(elev) or elev <= 0 or not np.isfinite(slope) or not np.isfinite(tri_val):
                        continue

                    # Lookup IMD rainfall for this point on peak monsoon storm day
                    lat_idx, lon_idx = self.rain_proc.get_grid_indices(lat, lon)
                    rain_1d = float(rain_2023[peak_day, lat_idx, lon_idx])
                    if rain_1d == -999.0 or np.isnan(rain_1d):
                        rain_1d = 25.0  # conservative baseline
                    rain_3d = float(rain_3d_2023[peak_day, lat_idx, lon_idx])
                    if np.isnan(rain_3d):
                        rain_3d = rain_1d * 1.8

                    # Hydrologic Valley / Depression Accumulation Susceptibility Proxy:
                    # In steep mountain valleys, flood/flash flood susceptibility is highest where:
                    # 1. Slope is gentle (valley bottom / river terrace where water gathers)
                    # 2. Elevation is low relative to surrounding catchment
                    # 3. TRI is low (flat floodplains)
                    is_valley_floor = (slope < 6.0) and (tri_val < 5.0)
                    is_extreme_rain = (rain_1d > 80.0) or (rain_3d > 150.0)
                    flood_susceptibility_proxy = 1 if (is_valley_floor and is_extreme_rain) else 0

                    records.append({
                        "location_id": f"fl_{loc_counter:05d}",
                        "latitude": float(lat),
                        "longitude": float(lon),
                        "district": d_info["district"],
                        "elevation_m": elev,
                        "slope_deg": slope,
                        "tri": tri_val,
                        "rainfall_1d_mm": rain_1d,
                        "rainfall_3d_mm": rain_3d,
                        "flood_hazard_proxy": flood_susceptibility_proxy,
                        "is_valley_bottom": is_valley_floor
                    })
                    loc_counter += 1

        flood_df = pd.DataFrame(records)
        flood_df.to_parquet(out_p, index=False)
        print(f"Saved Flood Feature Matrix -> {out_p} ({len(flood_df)} records)")
        return flood_df
