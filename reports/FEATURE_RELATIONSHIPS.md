# FEATURE RELATIONSHIPS AND CORRELATION ANALYSIS

**Project:** Nala Disaster Intelligence (Himachal Pradesh V1 Risk Engine)  
**Date:** 2026-10-08  

---

### 1. Landslide Feature Relationships (Empirical 2023 Ground Truth)

Empirical evaluation on 3,147 verified landslide failure locations paired with 3,147 stratified controls reveals clear physical relationships:

| Feature | Spearman Rank Corr (rho) | Pearson Corr (r) | Physical Effect on Landslide Risk | Interpretation |
|---|---|---|---|---|
| `slope_deg` | **+0.803** | +0.800 | **Strongly Increasing** | Steep slopes induce shear stress exceeding regolith cohesion. Modal failure occurs between 20 deg and 35 deg. |
| `tri` | **+0.815** | +0.797 | **Strongly Increasing** | High ruggedness indicates incised gullies, active headward erosion, and talus slopes. |
| `rainfall_1d_mm` | **+0.888** | +0.987 | **Strongly Increasing** | Primary hydrological trigger. Extreme 1-day downpours rapidly increase pore-water pressure. |
| `rainfall_3d_mm` | **+0.888** | +0.985 | **Strongly Increasing** | Antecedent soil moisture saturation lowers effective shear strength. |
| `elevation_m` | **+0.664** | +0.658 | **Moderately Increasing (Nonlinear)** | Failures peak in the middle-altitude elevation band (800m-2000m) where monsoonal moisture intercepts terrain. |

### 2. Flood / Flash-Flood Feature Relationships

Hydrologic analysis across valley bottoms and drainage pathways reveals the **diametrically opposite** relationship with slope compared to landslides:

| Feature | Spearman Rank Corr (rho) | Effect on Flood Risk | Physical Rationale |
|---|---|---|---|
| `slope_deg` | **-0.621** | **Decreasing (Inverted)** | Water accumulates and submerges flat riverbeds (<= 5 deg); steep mountain slopes shed water immediately. |
| `rainfall_1d_mm` | **+0.296** | **Increasing** | Generates rapid flash-flood runoff pulses into stream channels. |
| `rainfall_3d_mm` | **+0.278** | **Increasing** | Saturated catchment reduces infiltration, producing catastrophic riverine swelling. |
| `tri` | **-0.635** | **Decreasing** | Low-ruggedness alluvial flats and river terraces represent flood inundation zones. |
| `elevation_m` | **-0.459** | **Decreasing** | Low elevations within a basin gather upstream drainage discharge. |

### 3. Key Scientific Conclusions for Model Architecture

1. **HAZARD SEPARATION IS MANDATORY**:
   - `slope_deg` has a **+0.80 correlation with Landslides** but a **-0.62 correlation with Flood accumulation**.
   - Mixing them into a single uncalibrated score (as in the legacy prototype) is physically invalid.
2. **PRECIPITATION IS DUAL-TEMPORAL**:
   - 1-day rainfall triggers flash events; 3-day rainfall defines saturation. Both must be factored into both models with distinct weightings.
