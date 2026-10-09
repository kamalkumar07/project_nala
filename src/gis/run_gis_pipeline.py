"""Comprehensive Phase 2 GIS & Feature Engineering Pipeline for Himachal Pradesh.

Executes:
1. Himachal boundary validation.
2. CartoDEM mosaicing and validation.
3. Slope (Horn's algorithm) and TRI (Riley et al.) generation.
4. IMD 1-day and 3-day rainfall calculation for 2023 and 2025.
5. Compilation of FEATURE_STATISTICS.json and FEATURE_STATISTICS.csv.
6. Generation of publication-quality distribution figures.
"""

from __future__ import annotations
import json
from pathlib import Path
import numpy as np
import pandas as pd
import rasterio
import matplotlib.pyplot as plt

from src.gis.dem_processor import DEMProcessor
from src.gis.boundary_lookup import HimachalBoundaryEngine
from src.rainfall.imd_processor import IMDRainfallProcessor


def main():
    print("============================================================")
    print("NALA PHASE 2: GIS + FEATURE ENGINEERING PIPELINE")
    print("============================================================")

    reports_dir = Path("reports")
    figures_dir = reports_dir / "figures"
    interim_dir = Path("data/interim")
    reports_dir.mkdir(parents=True, exist_ok=True)
    figures_dir.mkdir(parents=True, exist_ok=True)
    interim_dir.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------
    # 1. BOUNDARY VALIDATION
    # ------------------------------------------------------------
    print("\n--- 1. Validating Himachal Boundaries ---")
    boundary_engine = HimachalBoundaryEngine()
    districts = boundary_engine.get_all_districts()
    print(f"Districts loaded ({len(districts)}): {', '.join(districts)}")
    print(f"Himachal Bounding Box: {boundary_engine.state_bounds}")
    assert len(districts) == 12, f"Expected 12 districts, found {len(districts)}"

    # ------------------------------------------------------------
    # 2. DEM MOSAICING & TOPOGRAPHIC DERIVATION
    # ------------------------------------------------------------
    print("\n--- 2. Processing CartoDEM 30m Rasters ---")
    tile_paths = [
        Path(r"all data/imdRainfall/elevation/P5_PAN_CD_N30_000_E075_000_30m/P5_PAN_CD_N30_000_E075_000_DEM_30m.tif"),
        Path(r"all data/imdRainfall/elevation/P5_PAN_CD_N30_000_E076_000_30m/P5_PAN_CD_N30_000_E076_000_DEM_30m.tif"),
        Path(r"all data/imdRainfall/elevation/P5_PAN_CD_N31_000_E075_000_30m/P5_PAN_CD_N31_000_E075_000_DEM_30m.tif"),
        Path(r"all data/imdRainfall/elevation/P5_PAN_CD_N31_000_E076_000_30m/P5_PAN_CD_N31_000_E076_000_DEM_30m.tif"),
    ]

    dem_proc = DEMProcessor(tile_paths)
    mosaic_path = interim_dir / "elevation_hp_mosaic.tif"

    if not mosaic_path.exists():
        print(f"Creating DEM mosaic at {mosaic_path}...")
        dem_proc.create_mosaic(mosaic_path)
    else:
        print(f"Found existing mosaic at {mosaic_path}")

    # Read mosaic and compute Slope + TRI
    with rasterio.open(mosaic_path) as src:
        dem_data = src.read(1)
        res_deg = src.res[0]
        bounds = src.bounds
        nodata = src.nodata
        meta = src.meta.copy()

    mean_lat = (bounds.bottom + bounds.top) / 2.0
    print(f"Mosaic Bounds: {bounds}")
    print(f"Mosaic Dimensions: {dem_data.shape}, Resolution: {res_deg:.6f} deg, Mean Lat: {mean_lat:.2f} deg")

    slope_path = interim_dir / "slope_hp_mosaic.tif"
    tri_path = interim_dir / "tri_hp_mosaic.tif"

    if not slope_path.exists() or not tri_path.exists():
        print("Computing Slope (Horn's formula) and TRI (Riley et al.)...")
        slope_deg, tri_m = DEMProcessor.compute_slope_and_tri(dem_data, res_deg, mean_lat, nodata)

        meta.update(dtype="float32", nodata=np.nan, compress="deflate")
        with rasterio.open(slope_path, "w", **meta) as dst:
            dst.write(slope_deg, 1)
        with rasterio.open(tri_path, "w", **meta) as dst:
            dst.write(tri_m, 1)
        print(f"Saved slope raster -> {slope_path}")
        print(f"Saved TRI raster -> {tri_path}")
    else:
        print(f"Found existing slope raster at {slope_path}")
        print(f"Found existing TRI raster at {tri_path}")
        with rasterio.open(slope_path) as dst:
            slope_deg = dst.read(1)
        with rasterio.open(tri_path) as dst:
            tri_m = dst.read(1)

    elev_stats = DEMProcessor.compute_statistics(dem_data, label="elevation_m", nodata=nodata)
    slope_stats = DEMProcessor.compute_statistics(slope_deg, label="slope_deg", nodata=np.nan)
    tri_stats = DEMProcessor.compute_statistics(tri_m, label="tri_m", nodata=np.nan)

    # ------------------------------------------------------------
    # 3. IMD RAINFALL (2025 & 2023)
    # ------------------------------------------------------------
    print("\n--- 3. Processing IMD Rainfall (2025 & 2023) ---")
    rain_proc = IMDRainfallProcessor(Path(r"all data/imdRainfall/IMD_Rainfall_Data"))
    hp_mask, _, _ = rain_proc.get_himachal_grid_mask()

    # 2025 stats
    rain_2025 = rain_proc.load_year(2025)
    rain_2025_hp = rain_2025[:, hp_mask]
    rain_1d_2025_hp_stats = rain_proc.compute_statistics(rain_2025_hp, label="rainfall_1d_2025_hp_mm")

    rain_3d_2025 = rain_proc.compute_3day_rolling(rain_2025)
    rain_3d_2025_hp = rain_3d_2025[:, hp_mask]
    rain_3d_2025_hp_stats = rain_proc.compute_statistics(rain_3d_2025_hp, label="rainfall_3d_2025_hp_mm")

    # 2023 stats (disaster monsoon year)
    rain_2023 = rain_proc.load_year(2023)
    rain_2023_hp = rain_2023[:, hp_mask]
    rain_1d_2023_hp_stats = rain_proc.compute_statistics(rain_2023_hp, label="rainfall_1d_2023_hp_mm")

    rain_3d_2023 = rain_proc.compute_3day_rolling(rain_2023)
    rain_3d_2023_hp = rain_3d_2023[:, hp_mask]
    rain_3d_2023_hp_stats = rain_proc.compute_statistics(rain_3d_2023_hp, label="rainfall_3d_2023_hp_mm")

    # ------------------------------------------------------------
    # 4. LANDSLIDE GROUND TRUTH STATS
    # ------------------------------------------------------------
    print("\n--- 4. Profiling 2023 Landslide Ground Truth Events ---")
    ls_csv = Path("data/raw/himachal/landslide_training_points_2023.csv")
    ls_df = pd.read_csv(ls_csv)
    ls_elev_stats = {
        "label": "landslide_groundtruth_elevation_m",
        "count": len(ls_df),
        "mean": float(ls_df["elevation_m"].mean()),
        "std": float(ls_df["elevation_m"].std()),
        "min": float(ls_df["elevation_m"].min()),
        "median": float(ls_df["elevation_m"].median()),
        "p25": float(ls_df["elevation_m"].quantile(0.25)),
        "p75": float(ls_df["elevation_m"].quantile(0.75)),
        "max": float(ls_df["elevation_m"].max()),
    }
    ls_slope_stats = {
        "label": "landslide_groundtruth_slope_deg",
        "count": len(ls_df),
        "mean": float(ls_df["slope_deg"].mean()),
        "std": float(ls_df["slope_deg"].std()),
        "min": float(ls_df["slope_deg"].min()),
        "median": float(ls_df["slope_deg"].median()),
        "p25": float(ls_df["slope_deg"].quantile(0.25)),
        "p75": float(ls_df["slope_deg"].quantile(0.75)),
        "max": float(ls_df["slope_deg"].max()),
    }
    ls_tri_stats = {
        "label": "landslide_groundtruth_tri_m",
        "count": len(ls_df),
        "mean": float(ls_df["tri_m"].mean()),
        "std": float(ls_df["tri_m"].std()),
        "min": float(ls_df["tri_m"].min()),
        "median": float(ls_df["tri_m"].median()),
        "p25": float(ls_df["tri_m"].quantile(0.25)),
        "p75": float(ls_df["tri_m"].quantile(0.75)),
        "max": float(ls_df["tri_m"].max()),
    }
    ls_rain_stats = {
        "label": "landslide_groundtruth_max_rain_2023_mm",
        "count": len(ls_df),
        "mean": float(ls_df["max_daily_rainfall_2023_mm"].mean()),
        "std": float(ls_df["max_daily_rainfall_2023_mm"].std()),
        "min": float(ls_df["max_daily_rainfall_2023_mm"].min()),
        "median": float(ls_df["max_daily_rainfall_2023_mm"].median()),
        "p25": float(ls_df["max_daily_rainfall_2023_mm"].quantile(0.25)),
        "p75": float(ls_df["max_daily_rainfall_2023_mm"].quantile(0.75)),
        "max": float(ls_df["max_daily_rainfall_2023_mm"].max()),
    }

    # ------------------------------------------------------------
    # 5. COMPILE STATISTICS ARTIFACTS
    # ------------------------------------------------------------
    all_stats = {
        "elevation_raster": elev_stats,
        "slope_raster": slope_stats,
        "tri_raster": tri_stats,
        "rainfall_1d_2025_hp": rain_1d_2025_hp_stats,
        "rainfall_3d_2025_hp": rain_3d_2025_hp_stats,
        "rainfall_1d_2023_hp": rain_1d_2023_hp_stats,
        "rainfall_3d_2023_hp": rain_3d_2023_hp_stats,
        "landslide_events_2023": {
            "elevation": ls_elev_stats,
            "slope": ls_slope_stats,
            "tri": ls_tri_stats,
            "rainfall_max_2023": ls_rain_stats,
        }
    }

    # Save FEATURE_STATISTICS.json in root and reports
    for out_p in [Path("FEATURE_STATISTICS.json"), reports_dir / "FEATURE_STATISTICS.json"]:
        with open(out_p, "w", encoding="utf-8") as f:
            json.dump(all_stats, f, indent=2)
    print(f"\nSaved FEATURE_STATISTICS.json")

    # Flatten for CSV
    flat_rows = []
    for k, v in all_stats.items():
        if k == "landslide_events_2023":
            for sub_k, sub_v in v.items():
                flat_rows.append(sub_v)
        else:
            flat_rows.append(v)

    stats_df = pd.DataFrame(flat_rows)
    for out_p in [Path("FEATURE_STATISTICS.csv"), reports_dir / "FEATURE_STATISTICS.csv"]:
        stats_df.to_csv(out_p, index=False)
    print(f"Saved FEATURE_STATISTICS.csv")

    # ------------------------------------------------------------
    # 6. GENERATE VISUALIZATION FIGURES
    # ------------------------------------------------------------
    print("\n--- 6. Generating Visualizations ---")
    plt.style.use("ggplot")

    # Figure 1: Elevation Distribution
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
    valid_elev = dem_data[(dem_data != nodata) & np.isfinite(dem_data)]
    # Subsample for fast plotting
    sample_elev = np.random.choice(valid_elev, size=min(100000, len(valid_elev)), replace=False)
    ax1.hist(sample_elev, bins=50, color="#2b5c8f", edgecolor="black", alpha=0.8)
    ax1.set_title("Himachal CartoDEM Elevation (m)")
    ax1.set_xlabel("Elevation (m)")
    ax1.set_ylabel("Pixel Frequency")

    ax2.boxplot(sample_elev, vert=True, patch_artist=True, boxprops=dict(facecolor="#4b8bbe"))
    ax2.set_title("Elevation Boxplot")
    ax2.set_ylabel("Meters")
    plt.tight_layout()
    plt.savefig(figures_dir / "elevation_distribution.png", dpi=200)
    plt.close()

    # Figure 2: Slope & TRI Distributions
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
    valid_slope = slope_deg[np.isfinite(slope_deg)]
    valid_tri = tri_m[np.isfinite(tri_m)]
    sample_slope = np.random.choice(valid_slope, size=min(100000, len(valid_slope)), replace=False)
    sample_tri = np.random.choice(valid_tri, size=min(100000, len(valid_tri)), replace=False)

    ax1.hist(sample_slope, bins=50, color="#d95f02", edgecolor="black", alpha=0.8)
    ax1.set_title("Terrain Slope Distribution (deg)")
    ax1.set_xlabel("Slope (degrees)")
    ax1.set_ylabel("Pixel Frequency")

    ax2.hist(sample_tri, bins=50, color="#7570b3", edgecolor="black", alpha=0.8)
    ax2.set_title("Terrain Ruggedness Index (TRI, m)")
    ax2.set_xlabel("TRI (m)")
    ax2.set_ylabel("Pixel Frequency")
    plt.tight_layout()
    plt.savefig(figures_dir / "slope_tri_distribution.png", dpi=200)
    plt.close()

    # Figure 3: Rainfall Distributions (1d and 3d)
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
    valid_rain_1d = rain_2023_hp[(rain_2023_hp != -999.0) & (rain_2023_hp > 0.0)]
    valid_rain_3d = rain_3d_2023_hp[np.isfinite(rain_3d_2023_hp) & (rain_3d_2023_hp > 0.0)]

    ax1.hist(valid_rain_1d, bins=40, color="#1b9e77", edgecolor="black", alpha=0.8)
    ax1.set_title("Himachal 2023 Positive 1-Day Rainfall (mm)")
    ax1.set_xlabel("Rainfall 1-Day (mm)")
    ax1.set_ylabel("Observations")

    ax2.hist(valid_rain_3d, bins=40, color="#e7298a", edgecolor="black", alpha=0.8)
    ax2.set_title("Himachal 2023 Positive 3-Day Accumulation (mm)")
    ax2.set_xlabel("Rainfall 3-Day (mm)")
    ax2.set_ylabel("Observations")
    plt.tight_layout()
    plt.savefig(figures_dir / "rainfall_distribution.png", dpi=200)
    plt.close()

    # Figure 4: Landslide Ground Truth Terrain Profiles
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(14, 10))
    ax1.hist(ls_df["slope_deg"].dropna(), bins=35, color="#d95f02", edgecolor="black", alpha=0.8)
    ax1.set_title("2023 Landslide Events: Slope Distribution")
    ax1.set_xlabel("Slope (deg)")

    ax2.hist(ls_df["elevation_m"], bins=35, color="#2b5c8f", edgecolor="black", alpha=0.8)
    ax2.set_title("2023 Landslide Events: Elevation Distribution")
    ax2.set_xlabel("Elevation (m)")

    ax3.hist(ls_df["tri_m"].dropna(), bins=35, color="#7570b3", edgecolor="black", alpha=0.8)
    ax3.set_title("2023 Landslide Events: TRI Distribution")
    ax3.set_xlabel("TRI (m)")

    ax4.hist(ls_df["max_daily_rainfall_2023_mm"], bins=35, color="#1b9e77", edgecolor="black", alpha=0.8)
    ax4.set_title("2023 Landslide Events: Triggering Daily Rainfall (mm)")
    ax4.set_xlabel("Max Daily Rainfall (mm)")
    plt.tight_layout()
    plt.savefig(figures_dir / "landslide_terrain_profiles.png", dpi=200)
    plt.close()

    print(f"Generated 4 figures in {figures_dir}")
    print("\nPhase 2 GIS Pipeline completed successfully!")


if __name__ == "__main__":
    main()
