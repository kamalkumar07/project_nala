# NORMALIZATION METHODOLOGY COMPARISON REPORT

**Project:** Nala Disaster Intelligence (Himachal Pradesh V1 Risk Engine)  
**Author:** AI/ML + GIS Engineering Team (Pranad, Reetu)  
**Date:** 2026-10-08  

---

### Executive Summary

In response to the limitations of the provisional cloud risk model (`1 - elevation/100`), candidate normalization methods were evaluated across physical features (`rainfall_1d_mm`, `rainfall_3d_mm`, `slope_deg`, `elevation_m`, and `tri`):

1. **Standard Linear Min-Max Scaling**
2. **Empirical Percentile Scaling (P01-P99)**
3. **Logarithmic Scaling (log1p)**
4. **Empirical CDF (ECDF)**
5. **Domain-Based Piecewise Physical Scaling**

### Comparison Matrix

| Normalization Method | Outlier Sensitivity | Monotonicity | Distribution Spread | Interpretability | Physical Realism | Verdict |
|---|---|---|---|---|---|---|
| **Linear Min-Max (0 to Max)** | Very High (distorted by cloudburst peaks) | Strict | Heavy right skew; >80% collapsed near zero | Medium | Poor for non-linear physical hazards | **Rejected** for operational scoring |
| **Percentile Scaling (P05 to P95)** | Low | Strict | Uniform spread across training quantiles | Low (bounds lack physical meaning) | Moderate | Useful for uncalibrated EDA |
| **Log-Transformed Scaling** | Very Low | Strict | Compresses extreme tail; balances moderate rains | Low | Moderate | Acceptable secondary baseline |
| **Domain-Based Piecewise Physical Scaling** | **Zero** (bounded by physical saturation) | **Strict** | **Reflects true operational danger thresholds** | **Highest** (directly maps to IMD / Geological standards) | **Highest** | **RECOMMENDED V1 WINNER** |

### Recommended Normalization Functions for V1 Engine

#### 1. Precipitation Normalization (`norm_rain_1d`, `norm_rain_3d`)
- **Method:** Piecewise Domain Scaling based on official IMD precipitation classification thresholds:
  - `r <= 0.0 mm -> 0.00` (No Rain)
  - `0 < r <= 15.5 mm -> 0.00 - 0.15` (Light Rain)
  - `15.5 < r <= 64.4 mm -> 0.15 - 0.45` (Moderate Rain)
  - `64.4 < r <= 115.5 mm -> 0.45 - 0.75` (Heavy Rain)
  - `115.5 < r <= 204.4 mm -> 0.75 - 0.95` (Very Heavy Rain)
  - `r > 204.4 mm -> 1.00` (Extremely Heavy Rain / Cloudburst)

#### 2. Landslide Slope Normalization (`norm_slope_ls`)
- **Method:** Piecewise Geomorphological Scaling reflecting shear stress on Himalayan slopes:
  - `theta < 10 deg -> 0.00 - 0.10` (Negligible failure probability)
  - `10 deg <= theta < 20 deg -> 0.10 - 0.35` (Moderate stability)
  - `20 deg <= theta < 35 deg -> 0.35 - 0.85` (Critical failure envelope; colluvial mantle threshold)
  - `35 deg <= theta < 45 deg -> 0.85 - 1.00` (Maximum failure frequency)
  - `theta >= 45 deg -> 0.80` (Steep bedrock / bare rock escarpments with reduced loose regolith)

#### 3. Flood Slope Normalization (`norm_slope_fl`)
- **Method:** Inverted Low-Slope Valley Scaling (Flash flood accumulation requires low gradients):
  - `theta <= 3 deg -> 1.00 - 0.70` (River terraces, alluvial fans, high ponding)
  - `3 deg < theta <= 8 deg -> 0.70 - 0.25` (Valley bottom transition)
  - `8 deg < theta <= 15 deg -> 0.25 - 0.00` (Fast transit, no ponding)
  - `theta > 15 deg -> 0.00` (Mountain hillsides, zero flood accumulation)

#### 4. Terrain Ruggedness Normalization (`norm_tri`)
- **Method:** Continuous piecewise mapping of TRI:
  - `TRI <= 5 m -> 0.00 - 0.15`
  - `5 < TRI <= 20 m -> 0.15 - 0.45`
  - `20 < TRI <= 40 m -> 0.45 - 0.85` (Empirical landslide mean = 37.95 m)
  - `TRI > 40 m -> 0.85 - 1.00`
