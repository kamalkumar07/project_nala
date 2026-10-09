"""DEM and Topographic Feature Processor for Himachal Pradesh.

Mosaics CartoDEM 30m tiles, handles NoData (-32768), computes Slope (degrees) via Horn's method,
and computes Terrain Ruggedness Index (TRI, meters) via Riley et al. formula.
Extracts point samples and computes full descriptive statistics.
"""

from __future__ import annotations
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional
import numpy as np
import rasterio
from rasterio.merge import merge
from rasterio.transform import rowcol


class DEMProcessor:
    """Processor for 30m CartoSat/CartoDEM raster tiles."""

    NODATA_VALUE = -32768.0

    def __init__(self, tile_paths: List[str | Path]):
        self.tile_paths = [Path(p) for p in tile_paths]
        for p in self.tile_paths:
            if not p.exists():
                raise FileNotFoundError(f"DEM tile not found: {p}")

    def create_mosaic(self, output_path: str | Path) -> Path:
        """Merge input DEM tiles into a single aligned GeoTIFF mosaic."""
        out_p = Path(output_path)
        out_p.parent.mkdir(parents=True, exist_ok=True)

        src_files = [rasterio.open(p) for p in self.tile_paths]
        try:
            mosaic, out_trans = merge(src_files, nodata=self.NODATA_VALUE)
            out_meta = src_files[0].meta.copy()
            out_meta.update({
                "driver": "GTiff",
                "height": mosaic.shape[1],
                "width": mosaic.shape[2],
                "transform": out_trans,
                "nodata": self.NODATA_VALUE,
                "compress": "deflate"
            })
            with rasterio.open(out_p, "w", **out_meta) as dest:
                dest.write(mosaic)
        finally:
            for s in src_files:
                s.close()

        return out_p

    @staticmethod
    def compute_slope_and_tri(
        dem: np.ndarray,
        res_deg: float,
        mean_lat_deg: float,
        nodata: float = -32768.0
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Compute Slope (degrees) and TRI (meters) using vectorized 3x3 moving window.

        Args:
            dem: 2D array of elevation values in meters.
            res_deg: Pixel resolution in degrees (e.g. 0.0002777778 for 30m).
            mean_lat_deg: Mean latitude for converting degrees to ground meters.
            nodata: Raster NoData value.

        Returns:
            slope_deg: 2D array of slope in degrees.
            tri: 2D array of Terrain Ruggedness Index in meters.
        """
        # Convert degree grid resolution to ground meters
        # 1 degree latitude = ~111,320 m
        dy = res_deg * 111320.0
        # 1 degree longitude = 111,320 * cos(lat) m
        dx = res_deg * 111320.0 * np.cos(np.radians(mean_lat_deg))

        # Output arrays initialized to NaN
        slope_deg = np.full_like(dem, np.nan, dtype=np.float32)
        tri = np.full_like(dem, np.nan, dtype=np.float32)

        valid = (dem != nodata) & np.isfinite(dem)

        # 3x3 neighbor slices
        # z1(top-left), z2(top), z3(top-right)
        # z4(left),     z0(center), z5(right)
        # z6(bottom-left), z7(bottom), z8(bottom-right)
        z1 = dem[:-2, :-2]
        z2 = dem[:-2, 1:-1]
        z3 = dem[:-2, 2:]
        z4 = dem[1:-1, :-2]
        z0 = dem[1:-1, 1:-1]
        z5 = dem[1:-1, 2:]
        z6 = dem[2:, :-2]
        z7 = dem[2:, 1:-1]
        z8 = dem[2:, 2:]

        v1 = valid[:-2, :-2]
        v2 = valid[:-2, 1:-1]
        v3 = valid[:-2, 2:]
        v4 = valid[1:-1, :-2]
        v0 = valid[1:-1, 1:-1]
        v5 = valid[1:-1, 2:]
        v6 = valid[2:, :-2]
        v7 = valid[2:, 1:-1]
        v8 = valid[2:, 2:]

        # All 9 cells in the 3x3 window must be valid
        window_valid = v0 & v1 & v2 & v3 & v4 & v5 & v6 & v7 & v8

        # Horn's formula for slope
        # dz/dx = ((z3 + 2*z5 + z8) - (z1 + 2*z4 + z6)) / (8 * dx)
        # dz/dy = ((z1 + 2*z2 + z3) - (z6 + 2*z7 + z8)) / (8 * dy)
        dz_dx = ((z3 + 2.0 * z5 + z8) - (z1 + 2.0 * z4 + z6)) / (8.0 * dx)
        dz_dy = ((z1 + 2.0 * z2 + z3) - (z6 + 2.0 * z7 + z8)) / (8.0 * dy)

        hypot = np.sqrt(dz_dx**2 + dz_dy**2)
        slope_sub = np.degrees(np.arctan(hypot))
        slope_deg[1:-1, 1:-1][window_valid] = slope_sub[window_valid]

        # Riley et al. TRI formula: sqrt(sum((z_i - z0)^2))
        diff_sq_sum = (
            (z1 - z0)**2 + (z2 - z0)**2 + (z3 - z0)**2 +
            (z4 - z0)**2 + (z5 - z0)**2 +
            (z6 - z0)**2 + (z7 - z0)**2 + (z8 - z0)**2
        )
        tri_sub = np.sqrt(diff_sq_sum)
        tri[1:-1, 1:-1][window_valid] = tri_sub[window_valid]

        return slope_deg, tri

    @staticmethod
    def compute_statistics(values: np.ndarray, label: str = "", nodata: float = -32768.0) -> Dict[str, Any]:
        """Compute full statistical profile for elevation, slope, or TRI."""
        flat = values.flatten()
        total = int(len(flat))
        valid_mask = (flat != nodata) & np.isfinite(flat)
        valid = flat[valid_mask]
        valid_count = int(len(valid))
        nodata_count = total - valid_count

        if valid_count == 0:
            return {
                "label": label,
                "total_pixels": total,
                "valid_pixels": 0,
                "nodata_pixels": nodata_count,
                "nodata_pct": 100.0,
            }

        res: Dict[str, Any] = {
            "label": label,
            "total_pixels": total,
            "valid_pixels": valid_count,
            "nodata_pixels": nodata_count,
            "nodata_pct": float(nodata_count / total * 100),
            "min": float(np.min(valid)),
            "p01": float(np.percentile(valid, 1)),
            "p05": float(np.percentile(valid, 5)),
            "p10": float(np.percentile(valid, 10)),
            "p25": float(np.percentile(valid, 25)),
            "median": float(np.median(valid)),
            "p75": float(np.percentile(valid, 75)),
            "p90": float(np.percentile(valid, 90)),
            "p95": float(np.percentile(valid, 95)),
            "p99": float(np.percentile(valid, 99)),
            "max": float(np.max(valid)),
            "mean": float(np.mean(valid)),
            "std": float(np.std(valid)),
        }

        # Descriptive threshold percentages
        res["pct_le_0m"] = float(np.sum(valid <= 0.0) / valid_count * 100)
        res["pct_le_5m"] = float(np.sum(valid <= 5.0) / valid_count * 100)
        res["pct_le_10m"] = float(np.sum(valid <= 10.0) / valid_count * 100)
        res["pct_le_20m"] = float(np.sum(valid <= 20.0) / valid_count * 100)
        res["pct_le_50m"] = float(np.sum(valid <= 50.0) / valid_count * 100)
        res["pct_le_100m"] = float(np.sum(valid <= 100.0) / valid_count * 100)

        return res
