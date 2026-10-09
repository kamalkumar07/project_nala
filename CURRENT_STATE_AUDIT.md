# NALA — HIMACHAL PRADESH AI/ML + RISK MODEL
## CURRENT STATE AUDIT

**Audit Date:** 2026-10-08  
**Scope:** Local Workspace (`d:\projects\isro`) & Reference Artifacts  
**Author / Role:** Senior AI/ML + GIS Engineer (Pair programming with Pranad & Reetu)  
**Execution Mode:** LOCAL ONLY (No commits, no pushes, no PRs, no AWS deployment, no remote repository modifications)

---

### Executive Summary

A comprehensive, non-destructive audit of the local environment (`d:\projects\isro`), adjacent directories, and the reference snapshot (`C:\Users\Pranad\Downloads\project_nala-kamal-devops.zip`) was completed.

1. **Active Core Geography:** Shifted from legacy Delhi wards to **Himachal Pradesh (12 districts)**.
2. **Rainfall Foundation:** 73 years (1951–2025) of IMD daily gridded rainfall (0.25° × 0.25°) are available locally on disk. Nationwide and regional statistics were validated against Section 8/9 requirements.
3. **Terrain Foundation:** 4 CartoDEM 30m tiles covering the lower, middle, and foothill districts of Himachal Pradesh (Bilaspur 100%, Hamirpur 100%, Una 96.6%, Solan 53.2%, Mandi 48.8%, Kangra 23.3%) are present. Suspicions regarding negative elevations were investigated: negative elevations occurred in legacy coastal Vizag tiles over the ocean; Himachal tiles are strictly positive terrain (93.7 m to 3,503.7 m).
4. **Ground Truth Data:** 3,147 landslide event points from the devastating 2023 monsoon season in Himachal Pradesh (Shimla/Solan region) with validated coordinates, elevation, slope, TRI, and rainfall are present in the reference snapshot.
5. **Missing / Blocked Elements:** Dedicated Himachal flood hazard zonation maps and CartoDEM tiles for upper Himalayan districts (Kinnaur, Lahaul & Spiti) are not present. External flood hazard layer is marked `BLOCKED — REQUIRED INPUT NOT AVAILABLE`.
6. **Provisional Cloud Risk Model:** The existing cloud Lambda risk model (`lambda/risk/engine.mjs`) is an uncalibrated 3-variable equal-weight (1/3, 1/3, 1/3) prototype with linear clamp normalization (`rain/100`, `reports/10`, `1 - elevation/100`), which fails completely in Himachal where elevations exceed 100 m.

---

### 1. DONE (Completed Work)

- [x] **IMD Rainfall Ingestion Logic:** Mathematical grid coordinate mapping (`np.arange(6.5, 38.75, 0.25)`, `np.arange(66.5, 100.25, 0.25)`) verified in `google earth/verify_imd_coordinates.py`.
- [x] **IMD 2025 Data Verification:** Exact validation of 2025 daily rainfall stats matching Section 8:
  - Total grid observations: 6,356,475
  - Spatial NoData (-999): 4,544,615 (71.50%)
  - Valid observations: 1,811,860 (28.50%)
  - Zero rainfall: 1,259,972 (69.54% of valid)
  - Positive rainfall: 551,888 (30.46% of valid)
  - Mean of valid: 3.474 mm (verifying that the prior ~0.99 mm figure was an artifact of including spatial NoData as zeros)
  - Max: 469.21 mm | P90: 10.01 mm | P95: 20.57 mm | P99: 54.08 mm
- [x] **Local Python Virtual Environment:** Located at `all data/imdRainfall/.venv` with Python 3.13.14, NumPy 2.5.3, Pandas 3.0.6, Rasterio 1.5.2, GeoPandas 1.2.0, Shapely 2.1.2, Scikit-learn 1.9.1, Scipy 1.18.1, Matplotlib 3.11.2, and PyOGRio 0.13.0.
- [x] **CartoDEM Tile Validation:** Verification of 4 local Himachal foothill/mid-altitude tiles confirming EPSG:4326, 30m resolution, float32 dtype, and NoData = -32768.0.
- [x] **Himachal Administrative GeoJSON Inspection:** Confirmed 12 districts in `districts.geojson` and state boundary in `state.geojson` from the reference snapshot.

---

### 2. IN PROGRESS

- [ ] Structuring the production-oriented local package (`src/`, `data/`, `configs/`, `contracts/`, `reports/`, `tests/`).
- [ ] Staging reference Himachal boundaries and 2023 landslide event datasets into local `data/raw/himachal/`.
- [ ] CartoDEM mosaic creation for the available Himachal tiles (`N30_E75`, `N30_E76`, `N31_E75`, `N31_E76`).

---

### 3. MISSING

- [ ] **Parquet library:** `pyarrow` is not installed in `.venv`. Must be installed (`pip install pyarrow`) to generate `flood_features.parquet` and `landslide_features.parquet`.
- [ ] **CartoDEM Full Coverage for Upper Himalayas:** High-altitude tiles covering northern/eastern Himachal (Chamba, Lahaul & Spiti, Kinnaur, northern Kullu). Available tiles cover the lower-to-middle elevations where the majority of population and recorded 2023 landslides reside.
- [ ] **Landslide Background / Negative Samples:** `landslide-training-points-2023.csv` contains only positive occurrences (`landslide = 1`, 3,147 points). Negative (pseudo-absence) samples across stable terrain must be generated for ML baseline validation (ROC-AUC, PR-AUC, confusion matrix).
- [ ] **Formal Model Contracts & Reference Engine:** `contracts/flood_v1_contract.json`, `contracts/landslide_v1_contract.json`, and local `src/models/risk_engine.py`.

---

### 4. BROKEN / UNCALIBRATED

- [!] **Kamal's Provisional Cloud Risk Model:**
  - File: `infrastructure/terraform/modules/cloud_api/lambda/risk/engine.mjs` and `normalize.mjs`
  - Formula: `risk = 1/3 * (rainfall/100) + 1/3 * (reports/10) + 1/3 * (1 - elevation/100)`
  - Flaws:
    1. Linear normalization `1 - elevation/100` collapses to `0.0` for any elevation >= 100 m. Himachal elevation ranges from 93.7 m up to >3,500 m (and over 6,000 m in the peaks), meaning terrain lowness factor is permanently 0 across the entire state!
    2. Combines Flood and Landslide into one single generic risk score, violating fundamental geophysical modeling principles (high slope increases landslide risk but decreases flood accumulation risk).
    3. No confidence metric.
- [!] **Legacy Delhi Hardcoded Dependencies:**
  - Scripts in `google earth/` contain hardcoded paths to Delhi wards (`public/geojson/delhi-wards-2022.geojson`) and coastal Vizag DEM (`P5_PAN_CD_N17_000_E083_000_DEM_30m.tif`).
- [!] **Elevation Negative Value Myth:**
  - Early scripts flagged negative elevations down to -498.6 m in `rainfall_elevation_aligned.csv`. Investigation proved this was exclusively due to testing a coastal tile (Vizag N17 E83) over the Bay of Bengal ocean.
  - Across all Himachal Pradesh DEM tiles, negative elevation percentage is **0.00%**.

---

### 5. BLOCKED

- **BLOCKER 1: Flood Hazard Zonation Layer:**
  - Status: `BLOCKED — REQUIRED INPUT NOT AVAILABLE`
  - Explanation: No official flood hazard layer (e.g. CWC / NDMA / State Disaster Management flood inundation maps) for Himachal Pradesh exists locally or in the reference repository.
  - Mitigation / Workaround: For Model A (Flood / Flash-flood), the baseline model will rely strictly on physical hydrologic terrain proxies (Elevation, Slope, Topographic Ruggedness Index, and multi-day IMD precipitation accumulation) rather than an unverified external hazard layer.
- **BLOCKER 2: Remote / Cloud Deployment Actions:**
  - Status: `BLOCKED BY USER MANDATE` (Strictly local execution; no Terraform apply, no AWS calls, no Git push/commit).

---

### 6. NEEDS VALIDATION

- [?] **Multi-day Rainfall Missingness Policy:** When computing 3-day rolling accumulation, define whether a single missing day (-999) results in NaN/NoData or a conservative imputation policy. (Recommended: Strict valid-window policy — requires all 3 days valid to produce a valid 3-day accumulation).
- [?] **DEM Vertical Datum & Units:** CartoSat CartoDEM tiles are in ellipsoidal or orthometric (EGM96) heights in meters with float32 precision. Values range logically from 93.7 m to 3,503.7 m.
- [?] **Slope & TRI Window Scale:** Determine optimal window size for slope and TRI computation on 30m DEM (standard 3×3 window corresponds to ~90m neighborhood).
- [?] **Confidence Formulation:** Must be rigorously separated from risk score, reflecting data completeness and evidence agreement.

---

### 7. SAFE TO REUSE

- `all data/imdRainfall/IMD_Rainfall_Data/*.grd`: Complete 73-year daily rainfall archive (1951–2025).
- `all data/imdRainfall/elevation/P5_PAN_CD_N30_000_E076_000_30m/`: Valid CartoDEM tile (Solan / Sirmaur / Shimla border).
- `all data/imdRainfall/elevation/P5_PAN_CD_N31_000_E076_000_30m/`: Valid CartoDEM tile (Bilaspur, Hamirpur, Una, Solan, Mandi, Kangra).
- `all data/imdRainfall/elevation/P5_PAN_CD_N31_000_E075_000_30m/`: Valid CartoDEM tile (Kangra / Una western extent).
- `all data/imdRainfall/elevation/P5_PAN_CD_N30_000_E075_000_30m/`: Valid CartoDEM tile (Southwestern plain/foothill border).
- `project_nala-kamal-devops.zip` (Read-only extraction of data assets):
  - `districts.geojson`: 12 Himachal Pradesh districts.
  - `state.geojson`: Himachal Pradesh boundary.
  - `landslide-training-points-2023.csv`: 3,147 ground-truth landslide event centroids.
  - `landslides-shimla-himachal.geojson`: 3,147 landslide polygons.
- Coordinate calculation formulas from `google earth/verify_imd_coordinates.py`.

---

### 8. DO NOT RECREATE / AVOID

- **DO NOT** recreate or modify anything in `neer-vazhvu/` (independent project).
- **DO NOT** reuse Delhi ward GeoJSONs or Delhi DEM tiles for Himachal Pradesh models.
- **DO NOT** port the provisional `1 - elevation/100` normalization from Kamal's Lambda.
- **DO NOT** rewrite working IMD binary grid reading logic from scratch; vectorize using existing NumPy indexing patterns.

---

### 9. RECOMMENDED NEXT STEPS (Phase 1 → Phase 2)

1. **Install Missing Python Library:** Install `pyarrow` in `.venv` for efficient Parquet generation.
2. **Setup Local Clean Project Scaffolding:** Create `data/raw/himachal/`, `data/interim/`, `data/processed/`, `src/`, `contracts/`, `reports/`, and `tests/`.
3. **Stage Himachal Data Assets:** Extract read-only reference files (`districts.geojson`, `state.geojson`, `landslide-training-points-2023.csv`, `landslides-shimla-himachal.geojson`) from the local zip into `data/raw/himachal/`.
4. **Execute Phase 2 (GIS Processing):**
   - Create Himachal DEM mosaic (`elevation_hp_mosaic.tif`) from the 4 tiles.
   - Generate Slope raster (`slope_hp_30m.tif`) using Horn's algorithm.
   - Generate TRI raster (`tri_hp_30m.tif`) using Riley's ruggedness algorithm.
   - Extract 1-day and 3-day IMD rainfall for Himachal coordinates for 2023 and 2025.
   - Export comprehensive statistical profiles (`FEATURE_STATISTICS.json`, `FEATURE_STATISTICS.csv`).
