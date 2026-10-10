# NALA V1 CANONICAL REFERENCE AUDIT REPORT

**Date:** 2026-10-10  
**Status:** COMPLETE / FROZEN  
**Target Architecture:** Mohan Kamal AWS Serverless Backend & Pranad Reference ML Engine  
**Repository:** `https://github.com/kamalkumar07/project_nala.git`  

---

## 1. Executive Summary & Synchronization Audit

An exhaustive audit of remote branches and local reference implementations was executed to freeze the NALA AI/ML V1.0 contract.

### Verified Commit SHAs
- **`origin/feature/nala-ai-ml-v1` (Pranad AI/ML Reference):** `200fd804e74e1b0ece7f8cb5ee574544da5d2ef2` (HEAD updated locally with contract enhancements).
- **`origin/reetu-modeling` (Reetu Scientific Modeling Spec):** `d4c80562a930bae683c34f48b84c0490a54fa1cc`.
- **`origin/kamal-devops` (Kamal AWS Infrastructure & Prototype Lambda):** `1cf657cd21f9d0ee515cefa75422b64d9586b31b`.

### Key Synchronization Findings
1. **Model Formulation:** Reetu's draft specifications (`docs/modeling/v1-mathematical-specification.md`) verified that the mathematical formulas in Python (`src/models/flood_model.py` and `src/models/landslide_model.py`) are the intended V1 algorithms. However, Reetu explicitly emphasized that all weights, breakpoints, and the `1.6` 3-day rainfall divisor are **provisional parameters** awaiting empirical validation.
2. **Lambda Gap Identified & Resolved:** Kamal's devops branch (`origin/kamal-devops`) contained an early prototype Lambda (`engine.mjs`) implementing an uncalibrated 3-way equal-weight average (`1/3 rainfall + 1/3 reports + 1/3 lowness`). This was completely unaligned with the dual-hazard model. A drop-in canonical Node.js reference (`engine_v1.mjs` and `scalers_v1.mjs`) was created, achieving **100% parity across all 16 golden test cases**.
3. **Status Semantics:** Model version is standardized to `V1.0` with explicit `modelStatus: "PROVISIONAL"`.

---

## 2. Canonical Python Reference Inventory

| File Path | Role | Contract Responsibility |
|---|---|---|
| [`src/models/flood_model.py`](file:///D:/projects/isro/src/models/flood_model.py) | Flood & Flash Flood Risk Model (Model A) | Hydrologic valley pooling, IMD rainfall triggers, diagnostic water depth & passability, `evidenceStatus`, `assessmentStatus`. |
| [`src/models/landslide_model.py`](file:///D:/projects/isro/src/models/landslide_model.py) | Landslide Hazard Model (Model B) | Geomorphological slope/TRI failure thresholds, IMD dual-temporal triggers, non-linear colluvium boost, `evidenceStatus`, `assessmentStatus`. |
| [`src/models/risk_engine.py`](file:///D:/projects/isro/src/models/risk_engine.py) | Master Reference Risk Engine | Himachal administrative district resolution, coordinate bounding, dual-hazard aggregation, contract delivery. |
| [`src/normalization/scalers.py`](file:///D:/projects/isro/src/normalization/scalers.py) | Physical Scalers & Breakpoints | Piecewise linear interpolation for IMD precipitation (0–204.4mm), slope (flood & landslide), and TRI. |
| [`src/gis/boundary_lookup.py`](file:///D:/projects/isro/src/gis/boundary_lookup.py) | Spatial District Engine | GeoJSON point-in-polygon verification for all 12 Himachal districts. |

---

## 3. Discrepancy & Gap Analysis

| Attribute | Legacy Prototype (Kamal DevOps) | Reetu Modeling Specification | Final V1 Canonical Engine | Resolution Status |
|---|---|---|---|---|
| **Hazard Outputs** | Single unified `riskScore` | Dual decoupled outputs (Flood & Landslide) | Separate `flood` and `landslide` objects | **RESOLVED & FROZEN** |
| **Model Status** | Unspecified | Stated provisional | Explicit `"modelStatus": "PROVISIONAL"` | **RESOLVED & FROZEN** |
| **Missingness** | Coerced to 0.0 or neutral | Explicit states (`AVAILABLE`, `MISSING`, `UNKNOWN`, `INVALID`) | Dedicated `evidenceStatus` map for each hazard | **RESOLVED & FROZEN** |
| **Data Sufficiency** | Evaluated regardless | Distinguish insufficient data | `assessmentStatus: "INSUFFICIENT_DATA"` when all environmental inputs missing/invalid | **RESOLVED & FROZEN** |
| **Passability** | Not modeled | Noted as unsafe for travel policy without road/flow data | Diagnostic `water_depth` & `passability`; `routePassability: "UNDETERMINED"` | **RESOLVED & FROZEN** |
| **Lambda Code** | 3-factor equal weights | Required golden parity | `engine_v1.mjs` matching Python within `< 0.01` | **RESOLVED & FROZEN** |

---

## 4. Verification and Parity Confirmation

- **Pytest Suite:** 34/34 passing in 1.32s (`tests/test_risk_engine.py` and `tests/integration/test_golden_cases.py`).
- **Lambda Golden Parity:** 16/16 golden test cases passing with `< 0.01` tolerance (`tests/integration/test_lambda_parity.mjs`).
- **Edge Cases Tested:** Valid zero rainfall (0.0mm), invalid negative rainfall (<0.0mm), out-of-range slope (>90°), all-missing inputs, and string `"UNKNOWN"` inputs.

---

## 5. Formal Recommendation

Freeze NALA V1.0 under **Recommendation B: READY WITH DOCUMENTED LIMITATIONS**.
The implementation is mathematically robust, fully tested, and parity-verified, but transparently provisional until post-monsoon field observations and event-polygon calibrations are completed.
