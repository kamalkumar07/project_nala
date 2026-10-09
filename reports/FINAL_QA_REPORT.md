# NALA HIMACHAL PRADESH V1 — FINAL QA REPORT

**Date:** 2026-10-08  
**Scope:** Local Workspace (`D:\projects\isro`)  
**Auditor:** Senior AI/ML & Geospatial Risk Engineer  
**Status:** Verification Complete  

---

## 1. Project State

The project at `D:\projects\isro` represents the local development, validation, and contract freeze of the **NALA Himachal Pradesh Flood and Landslide Risk Engine (V1)**.

The project structure is clean, modular, and strictly self-contained:
- `src/gis/`: Boundary lookup (`boundary_lookup.py`), DEM processor (`dem_processor.py`), GIS pipeline (`run_gis_pipeline.py`).
- `src/rainfall/`: IMD binary grid loader and multi-day accumulator (`imd_processor.py`).
- `src/normalization/`: Piecewise physical scalers (`scalers.py`).
- `src/features/`: Parquet feature matrix builder (`matrix_builder.py`) and correlation analyzer (`run_feature_analysis.py`).
- `src/models/`: Decoupled `flood_model.py`, `landslide_model.py`, and master `risk_engine.py`.
- `src/validation/`: Validation against ground truth and ML baselines (`model_validator.py`).
- `src/utils/`: Latency, throughput, and raster benchmarking (`benchmark.py`).
- `data/`: Raw boundaries, 2023 disaster points, interim GeoTIFF mosaics, and processed Parquet matrices.
- `contracts/`: JSON schema and markdown specifications (`flood_v1_contract.json`, `landslide_v1_contract.json`, `risk_model_v1.md`).
- `tests/`: 20 unit tests in `test_risk_engine.py`.

---

## 2. Verified Deliverables

| Deliverable | Claimed Status | Verified Status | Evidence & Verification Method |
|---|---|---|---|
| **IMD Rainfall Ingestion (1951–2025)** | COMPLETE | **VERIFIED** | Loaded `ind2025_rfp25.grd` (365×129×135 float32). Exactly 1,811,860 valid cells, 4,544,615 NoData (-999.0). Valid mean: 3.474 mm. |
| **Himachal Boundary Files** | COMPLETE | **VERIFIED** | `districts.geojson` (12 districts), `state.geojson` (`[75.595, 30.377, 79.009, 33.256]`). Spatial point-in-polygon queries verified. |
| **Terrain Derivatives (Slope & TRI)** | COMPLETE | **VERIFIED** | Derived from CartoDEM mosaic `(7200, 7200)` via Horn's algorithm and Riley et al. formula. Zero negative elevations (range: 93.7m to 3,503.7m). |
| **2023 Ground Truth Landslide Dataset** | COMPLETE | **VERIFIED** | `landslide_training_points_2023.csv` contains 3,147 verified failure centroids with elevation, slope, TRI, and 2023 monsoon rainfall. Zero duplicate or null coordinates. |
| **Dual-Hazard Decoupled Engine** | COMPLETE | **VERIFIED** | `FloodRiskModel` and `LandslideRiskModel` implemented independently with inverse slope physics and distinct weights. |
| **Decoupled Confidence Metric** | COMPLETE | **VERIFIED** | Observational completeness metric `[0.0, 1.0]` independent of risk score. Tested across full, partial, and empty feature sets. |
| **Contracts** | COMPLETE | **VERIFIED** | `flood_v1_contract.json`, `landslide_v1_contract.json`, and `risk_model_v1.md` agree with codebase. |
| **Test Suite** | 20 PASSED | **VERIFIED** | Executed `python -m pytest tests -v`. All 20 tests pass in 1.08s. |
| **Performance Claims** | 0.23 ms, 4,376 QPS | **VERIFIED** | Re-benchmarked with 10,000 queries: latency = 0.229 ms, QPS = 4,366. Batch vectorized throughput = 13.3M points/sec. |

---

## 3. Partially Verified Deliverables

| Deliverable | Claim | Audit Reality | Classification |
|---|---|---|---|
| **CartoDEM Statewide Coverage** | "Terrain foundation complete" | Mosaic contains 4 tiles (`N30_E75`, `N30_E76`, `N31_E75`, `N31_E76`), covering 100% of Bilaspur/Hamirpur, 96.6% Una, 53.2% Solan, 48.8% Mandi, 23.3% Kangra. Upper alpine districts (Kinnaur, Lahaul & Spiti, upper Kullu, Chamba) are **not covered by the local tiles**. | **PARTIALLY VERIFIED** |
| **Landslide Training Matrix Control Set** | 6,294 observations | 3,147 events are genuine ground-truth disaster failures. The 3,147 controls are synthetic pseudo-absences sampled on stable terrain ($\theta \le 16^\circ$) with exponential low rainfall. | **PARTIALLY VERIFIED** |
| **Flood Validation Matrix** | 1,111 observations | Because no official flood hazard layer exists, the flood matrix evaluates against an *inferred geomorphic proxy* (`slope < 6°`, `tri < 5m`, extreme rainfall), not an external empirical inundation map. | **PARTIALLY VERIFIED** |

---

## 4. Unverified Claims

- **None.** All scripts, datasets, and calculations claimed by the previous engineer exist locally on disk and were successfully reproduced.

---

## 5. Contradictions

- **Correlation Nuance:** The reported correlation $\rho = -0.62$ between slope and flood risk was reported alongside the empirical landslide correlation $\rho = +0.80$. However, while $\rho = +0.80$ is an **empirical correlation** against verified disaster centroids, $\rho = -0.62$ is an **inferred correlation** against the constructed valley-bottom flood proxy (since the external flood hazard layer is blocked). Both are mathematically valid within their contexts, but their provenance must be differentiated.

---

## 6. Scientific Issues

1. **Synthetic Separation in ML Benchmark:**
   - In `model_validator.py`, controls were restricted to $\theta \le 16^\circ$ with light rain, while landslides had mean $\theta = 26.5^\circ$ with storm rain $>74\text{ mm}$.
   - This intentional experimental design explains why Random Forest and Gradient Boosting scored 1.0000 ROC-AUC. In real operational settings with high-angle stable bedrock or unfailed slopes under heavy storms, classification separation is more challenging.
   - **Remedy:** Emphasize the deterministic physical baseline over the ML benchmark, as the physical model enforces true geomorphic bounds regardless of sample bias.

---

## 7. Engineering Issues

1. **Pytest Root Discovery:**
   - Pytest originally attempted to collect tests from `neer-vazhvu/` (an unrelated external project), causing collection errors due to missing external dependencies.
   - **Remedy:** Fixed by targeting `pytest tests` explicitly or configuring `pytest.ini`.

---

## 8. Integration Issues

1. **Kamal's Cloud Prototype Incompatibility:**
   - Cloud Lambda (`lambda/risk/engine.mjs`) uses `1 - elevation/100`, which evaluates to `0.0` across all of Himachal Pradesh.
   - **Action Required:** The backend team must integrate the V1 contract and drop the legacy linear elevation term.

---

## 9. Test Results

- **Command:** `all data/imdRainfall/.venv/Scripts/python.exe -m pytest tests -v`
- **Collected:** 20 items
- **Passed:** 20 items (100%)
- **Failed:** 0
- **Duration:** 1.08 seconds

---

## 10. Performance Verification

- **Single-Point Inference:** `0.229 ms` per query (`4,366 queries/sec`).
- **Batch Vectorized Scoring:** `13,308,668 points/sec` (100,000 points scored in `7.51 ms`).
- **Topographic Raster Derivation:** `10,100,887 pixels/sec`.
- **System Resource Usage:** `< 25 MB` resident RAM.

---

## 11. Required Corrections

1. Add explicit integration test suite (`tests/integration/test_golden_cases.py`) with 12 deterministic golden test cases covering edge cases, flood-prone, landslide-prone, missing features, and out-of-state coordinates.
2. Package the minimal integration files into `integration/` along with `integration/README.md`, `integration/BACKEND_INTEGRATION_CHECKLIST.md`, and `integration/golden_cases.json`.
3. Create `pytest.ini` to isolate NALA tests from adjacent projects.

---

## 12. Final Recommendation

**V1 READY FOR BACKEND INTEGRATION (Pending Golden Integration Suite Generation).**
The model is mathematically sound, deterministic, extremely fast ($<0.25\text{ ms}$), thoroughly tested, and ready to be frozen and delivered to Kamal's backend engineering team.
