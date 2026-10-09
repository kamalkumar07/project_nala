# Himachal multi-hazard validation plan

Status: initial plan for qualitative checks and evidence-led evaluation. It defines no performance targets and no production test implementation.

## Separate validation tracks

Run separate tracks for flood, flash flood, and landslide. Whether flood and flash flood remain separate is **PENDING EVIDENCE**, but their initial checks should remain distinguishable. Evaluate hazard-specific scores and explanations independently; do not validate an overall disaster score because one is not defined.

Validate at the available hierarchy levels: report/assessment, coordinate-based hotspot, and district. Spatial assignment, hotspot construction, district aggregation, and appropriate sample sizes are **PENDING EVIDENCE**.

## Qualitative scenarios

For each hazard, hold unrelated inputs fixed and test intended behavior without assigning arbitrary scores:

- low evidence, no reports, and unavailable retrieval;
- missing rainfall, terrain, hazard layers, or reports;
- fresh versus stale observations;
- near versus distant reports after a spatial rule exists;
- duplicate reports and repeated images;
- contradictory reports or hazard classifications;
- high apparent severity with low Bedrock interpretation confidence;
- disagreement between rainfall and citizen evidence;
- invalid coordinates, timestamps, CRS, units, classes, and nodata values;
- assessments near future risk-level boundaries, once boundaries are supported;
- no silent conversion of missing/unknown evidence to zero, low risk, or passable.

Expected behavior is to preserve uncertainty, provenance, disagreement, and hazard identity. Synthetic scenarios validate intended behavior only; they are not predictive accuracy evidence.

## Static susceptibility versus current triggers

Test static GIS context separately from current/near-current trigger evidence:

- static terrain or susceptibility alone must not imply that an event is occurring now;
- current rainfall or reports must not erase relevant terrain/susceptibility context;
- a missing trigger should remain distinct from a low trigger;
- a static susceptibility layer and a current hazard observation should be evaluated for the correct hazard and time basis.

Flood, flash-flood, and landslide trigger semantics, timing, and reference labels are **PENDING EVIDENCE**.

## Sensitivity and ablation

After a transparent baseline exists, vary one input or agreed parameter at a time and inspect score ordering, hazard level, confidence, passability where applicable, and explanations. Remove each evidence group and each GIS feature group in turn. Check duplicate invariance, missing-data behavior, spatial extraction sensitivity, and district aggregation sensitivity.

Numerical weights, perturbation ranges, acceptable instability, and feature-usefulness claims are **PENDING EVIDENCE**. Ground any ranges in observed variability or documented measurement uncertainty. Do not infer predictive importance from ablation without suitable labels and a defined evaluation design.

## Holdout and historical-event design

- Use spatial holdouts by coordinate/hotspot and, where data permits, district-aware holdouts to test geographic transfer.
- Use event-aware temporal holdouts for historical flood, flash-flood, and landslide events where event records permit.
- Keep duplicate and related reports from the same event together across splits.
- Avoid using an input citizen report as the sole ground truth for its own assessment.
- Compare performance and error patterns by hazard, district, evidence availability, and static-versus-trigger evidence condition when sample sizes support it.

Reference labels, event identifiers, feasible district/event splits, sample counts, and metrics are **PENDING EVIDENCE**. No performance target is set.

## Evidence dependencies

Pranad must provide EDA, feature coverage/missingness, label availability, baseline predictions, and experiment results. Kamal must confirm GIS provenance, CRS/resolution, extraction feasibility, boundary versions, and relevant infrastructure constraints. Historical hazard datasets and citizen-report review determine whether empirical validation or only qualitative validation is possible.
