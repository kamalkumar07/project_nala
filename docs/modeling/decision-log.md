# Himachal Disaster Intelligence decision log

Status: initial modeling decisions and open evidence requests. Numerical parameters remain intentionally unset.

## Recorded decisions

| Decision | Status | Rationale / dependency |
|---|---|---|
| Migrate scope from Delhi urban flood monitoring to Himachal Disaster Intelligence | DECIDED | Modeling geography is Himachal Pradesh; prior urban flood-only assumptions are no longer sufficient. |
| Use `Report/Assessment → Coordinate-based Hotspot → District` hierarchy | DECIDED IN PRINCIPLE | Supports local evidence, spatial aggregation, and district reporting. Hotspot construction and aggregation remain **PENDING EVIDENCE**. |
| Preserve the distinction between static context/susceptibility and current/near-current triggers | DECIDED | Prevents terrain or susceptibility layers from being interpreted as proof of an active event. Hazard-specific timing remains **PENDING EVIDENCE**. |
| Avoid a generic multi-hazard weighted sum for now | DECIDED | Flood, flash-flood, and landslide mechanisms, labels, scales, and outcomes are not yet shown to be commensurable. No overall disaster score is created. |
| Define separate candidate flood, flash-flood, and landslide risk scores | DECIDED IN PRINCIPLE | Keeps hazard drivers and explanations visible. Whether flood and flash flood remain separate is **PENDING EVIDENCE**. |
| Treat scores as relative indices in `[0,1]`, not probabilities | DECIDED | Probability interpretation requires later labeled-data calibration and evaluation. |
| Preserve missing/`UNKNOWN`/`INVALID` states | DECIDED PRINCIPLE | Missing evidence is not evidence of safety; do not coerce it to zero, low risk, or passable. |
| Keep confidence separate from risk | DECIDED PRINCIPLE | Confidence describes evidence support/quality, not hazard magnitude. Representation and calibration remain **PENDING EVIDENCE**. |
| Avoid duplicate evidence counting | DECIDED PRINCIPLE | A report, image, derived interpretation, and related duplicate should not be treated as independent confirmations by default. |

## Available GIS foundation

The currently identified foundation is Copernicus GLO-30 DEM (approximately 30 m), projected DEM, elevation, slope, aspect, TRI, Himachal state boundary, and 12 district boundaries. Exact CRS, datum, versions, derivation parameters, nodata handling, and extraction conventions remain **PENDING EVIDENCE**.

## Open decisions and evidence owners

| Open decision | Status | Responsible dependency |
|---|---|---|
| Rainfall datasets, units, windows, latency, spatial support | **PENDING EVIDENCE** | Pranad: EDA/feature feasibility; Kamal: ingestion and infrastructure constraints |
| Landslide susceptibility/hazard data and historical landslide events | **PENDING EVIDENCE** | Pranad: modeling suitability and labels; Kamal: access, provenance, and processing feasibility |
| Flood/flash-flood hazard data and historical events | **PENDING EVIDENCE** | Pranad: labels/EDA; Kamal: data access and integration constraints |
| Whether flood and flash flood remain separate | **PENDING EVIDENCE** | Pranad's EDA, mechanism/label review, and validation results |
| Hazard-specific report/photo taxonomy and Bedrock interpretation contract | **PENDING EVIDENCE** | Pranad: model output/quality evidence; integration owner: response contract |
| Hotspot definition, radius/grid/association, and district aggregation | **PENDING EVIDENCE** | Pranad: spatial analysis; Kamal: GIS and boundary implementation constraints |
| CRS, resolution, raster extraction, resampling, nodata, and layer versions | **PENDING EVIDENCE** | Kamal: GIS foundation/provenance; Pranad: feature extraction feasibility |
| Feature transformations, interactions, and usefulness by hazard | **PENDING EVIDENCE** | Pranad's EDA, experiments, and validation |
| Confidence representation and calibration | **PENDING EVIDENCE** | Pranad's labeled evaluation and reliability analysis |
| Risk normalization, weights, thresholds, category boundaries, and probability calibration | **PENDING EVIDENCE** | Pranad's results plus agreed reference outcomes; no values may be invented |
| Passability scope, travel mode, policy, and reference outcomes | **PENDING EVIDENCE** | Product/field requirements and independently checked outcomes; Pranad integration |
| Spatial, district, and historical-event holdout design | **PENDING EVIDENCE** | Pranad: sample/label feasibility; Kamal: geographic data constraints |
| Need for any overall disaster score | **PENDING EVIDENCE** | Product decision after hazard-specific validation; no generic sum now |

## Next review gate

Revisit this log after Pranad's EDA and Kamal's GIS/provenance handoff. Freeze only decisions supported by data, labels, and implementation constraints. Until then, all numerical and calibration choices remain **PENDING EVIDENCE**.
