"""IMD Gridded Rainfall Processor for Himachal Pradesh and National Domain.

Processes IMD 0.25° x 0.25° daily gridded binary rainfall files (.grd).
Computes 1-day rainfall, 3-day rolling accumulation, and spatial/temporal statistics.
Enforces strict scientific missing-data policies:
- NoData (-999.0) is never converted to 0.0.
- 3-day rolling window requires all 3 consecutive days to be valid.
"""

from __future__ import annotations
from pathlib import Path
from typing import Dict, Any, Tuple, Optional
import numpy as np


class IMDRainfallProcessor:
    """Processor for IMD 0.25° gridded daily precipitation data."""

    # IMD 0.25 degree national coordinate grid specifications
    LAT_MIN = 6.5
    LAT_MAX = 38.5
    LAT_STEP = 0.25
    LAT_COUNT = 129

    LON_MIN = 66.5
    LON_MAX = 100.0
    LON_STEP = 0.25
    LON_COUNT = 135

    NODATA_VALUE = -999.0

    def __init__(self, data_dir: str | Path):
        self.data_dir = Path(data_dir)
        self.lats = np.arange(self.LAT_MIN, self.LAT_MAX + self.LAT_STEP / 2, self.LAT_STEP)
        self.lons = np.arange(self.LON_MIN, self.LON_MAX + self.LON_STEP / 2, self.LON_STEP)
        assert len(self.lats) == self.LAT_COUNT, f"Lat count mismatch: {len(self.lats)} != {self.LAT_COUNT}"
        assert len(self.lons) == self.LON_COUNT, f"Lon count mismatch: {len(self.lons)} != {self.LON_COUNT}"

    @staticmethod
    def is_leap_year(year: int) -> bool:
        """Determine if a year has 366 days."""
        return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)

    def get_file_path(self, year: int) -> Path:
        """Resolve path to IMD annual grid file."""
        return self.data_dir / f"ind{year}_rfp25.grd"

    def load_year(self, year: int) -> np.ndarray:
        """Load annual rainfall grid as float32 array shaped (days, 129, 135)."""
        file_path = self.get_file_path(year)
        if not file_path.exists():
            raise FileNotFoundError(f"IMD rainfall file not found: {file_path}")

        days = 366 if self.is_leap_year(year) else 365
        raw = np.fromfile(file_path, dtype=np.float32)
        expected_size = days * self.LAT_COUNT * self.LON_COUNT
        if raw.size != expected_size:
            raise ValueError(
                f"File size mismatch for year {year}: expected {expected_size} floats, got {raw.size}"
            )
        return raw.reshape(days, self.LAT_COUNT, self.LON_COUNT)

    def compute_3day_rolling(self, rain_data: np.ndarray) -> np.ndarray:
        """Compute 3-day rolling accumulation with strict missing-data policy.

        Returns array of shape (days, 129, 135) where day t (t >= 2) is sum of day t, t-1, t-2.
        Days 0 and 1 are NaN. Any window containing NoData (-999) evaluates to NaN.
        """
        days, n_lat, n_lon = rain_data.shape
        rain_3d = np.full((days, n_lat, n_lon), np.nan, dtype=np.float32)

        # Mask of valid daily observations
        valid_mask = (rain_data != self.NODATA_VALUE) & np.isfinite(rain_data)

        # Vectorized 3-day rolling computation
        for t in range(2, days):
            # All 3 consecutive days must be valid
            window_valid = valid_mask[t] & valid_mask[t - 1] & valid_mask[t - 2]
            sum_3d = rain_data[t] + rain_data[t - 1] + rain_data[t - 2]
            rain_3d[t, window_valid] = sum_3d[window_valid]

        return rain_3d

    def get_grid_indices(self, lat: float, lon: float) -> Tuple[int, int]:
        """Find nearest IMD grid cell indices (lat_idx, lon_idx)."""
        lat_idx = int(np.argmin(np.abs(self.lats - lat)))
        lon_idx = int(np.argmin(np.abs(self.lons - lon)))
        return lat_idx, lon_idx

    def get_himachal_grid_mask(
        self,
        lat_min: float = 30.37,
        lat_max: float = 33.26,
        lon_min: float = 75.59,
        lon_max: float = 79.01,
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Return boolean mask and coordinate bounding slices for Himachal Pradesh."""
        lat_mask = (self.lats >= lat_min) & (self.lats <= lat_max)
        lon_mask = (self.lons >= lon_min) & (self.lons <= lon_max)
        grid_2d_mask = np.outer(lat_mask, lon_mask)
        return grid_2d_mask, lat_mask, lon_mask

    def compute_statistics(self, values: np.ndarray, label: str = "") -> Dict[str, Any]:
        """Compute comprehensive descriptive statistics on valid observations."""
        flat = values.flatten()
        nodata_count = int(np.sum((flat == self.NODATA_VALUE) | np.isnan(flat)))
        valid_mask = (flat != self.NODATA_VALUE) & np.isfinite(flat)
        valid = flat[valid_mask]
        total = int(len(flat))
        valid_count = int(len(valid))

        if valid_count == 0:
            return {
                "label": label,
                "total_count": total,
                "valid_count": 0,
                "nodata_count": nodata_count,
                "nodata_pct": 100.0,
            }

        zero_count = int(np.sum(valid == 0.0))
        positive_count = int(np.sum(valid > 0.0))

        return {
            "label": label,
            "total_count": total,
            "valid_count": valid_count,
            "nodata_count": nodata_count,
            "nodata_pct": float(nodata_count / total * 100),
            "zero_count": zero_count,
            "zero_pct_of_valid": float(zero_count / valid_count * 100),
            "positive_count": positive_count,
            "positive_pct_of_valid": float(positive_count / valid_count * 100),
            "mean": float(np.mean(valid)),
            "std": float(np.std(valid)),
            "min": float(np.min(valid)),
            "median": float(np.median(valid)),
            "p01": float(np.percentile(valid, 1)),
            "p05": float(np.percentile(valid, 5)),
            "p10": float(np.percentile(valid, 10)),
            "p25": float(np.percentile(valid, 25)),
            "p75": float(np.percentile(valid, 75)),
            "p90": float(np.percentile(valid, 90)),
            "p95": float(np.percentile(valid, 95)),
            "p99": float(np.percentile(valid, 99)),
            "max": float(np.max(valid)),
        }
