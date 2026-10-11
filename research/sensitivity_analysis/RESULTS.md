# Sensitivity analysis results — Nala V1

## A. Executive summary

This workflow evaluates the existing deterministic Python equations without changing them. It uses a standard-library analytical replica, deterministic synthetic scenarios, and the parameters recorded in `config.json`.

The experiments show the mathematical effects of the current normalization, weights, missing-data fallbacks, and interaction conditions. They do not establish predictive accuracy, calibration, physical validity, or replacement parameters.

## B. Reference model and commit

- Source: `origin/feature/nala-ai-ml-v1`
- Reference commit: `200fd804e74e1b0ece7f8cb5ee574544da5d2ef2`
- Canonical source files reviewed: `src/models/flood_model.py`, `src/models/landslide_model.py`, `src/normalization/scalers.py`
- Adapter: `run_analysis.py`; explicitly an analytical replica, not the production engine.

## C. Experimental methodology

Baseline synthetic scenario:

```text
slope = 25 degrees
TRI = 35 m
1-day rainfall = 50 mm
3-day rainfall = 80 mm
```

Feature sensitivity varied one feature at a time over the implemented breakpoints and broad valid-domain values while holding the others fixed. Interaction experiments tested values immediately below, at, and above the existing activation conditions. Missing-data experiments set selected inputs to `None` and applied the existing fallbacks. Weight experiments used non-negative, sum-to-one vectors and are labeled experimental rather than production parameters.

Outputs:

- `feature_sensitivity.csv`
- `interaction_thresholds.csv`
- `missing_data.csv`
- `weight_sensitivity.csv`
- `results.json`
- eight feature SVG plots, one per model/feature pair
- `PARITY_STATUS.txt`
- `test_reproducibility.py`

## D. Feature sensitivity findings

### Verified mathematical behavior

- Rainfall changes follow the piecewise rainfall mapping and the 3-day `/1.6` transformation.
- Flood slope decreases the flood factor as slope increases; landslide slope follows its non-linear piecewise curve.
- Landslide TRI increases through the implemented TRI curve.
- Flood TRI uses the separate `clip01(1 - TRI/25)` mapping.
- The score is clipped to `[0,1]` and the displayed score is rounded to two decimals.

### Synthetic experiment result

The generated curves and CSV tables show that the current score response is controlled by both normalization and the fixed weights. They should be read as mathematical behavior of the implementation, not evidence that these relationships predict real events.

The curves also expose piecewise slope/plateau behavior: changing a feature inside a linear segment produces a smooth response, while breakpoint regions change slope. Feature influence cannot be ranked globally from these scenarios because it depends on the baseline state, the active interaction condition, and the hazard model.

## E. Interaction discontinuity findings

The activation conditions are inclusive in the committed Python code.

Interaction experiments use the following complete fixed environments (only the named threshold feature is perturbed):

| Model / threshold | slope | TRI | rainfall_1d | rainfall_3d |
|---|---:|---:|---:|---:|
| Flood slope 6° | perturbed | 35 | 80 | 80 |
| Flood rainfall 64.4 mm | 2 | 35 | perturbed | 80 |
| Landslide slope 22° | perturbed | 35 | 80 | 80 |
| Landslide rainfall 64.4 mm | 30 | 35 | perturbed | 80 |

The generated `interaction_thresholds.csv` records all four environmental inputs for every row.

| Model / threshold | Below | At | Above | Observed effect |
|---|---:|---:|---:|---|
| Flood slope 6° | 0.4168219 | 0.4168219 | 0.3818896 | Boost disappears immediately above 6°; band remains MEDIUM in this scenario |
| Flood 1-day rainfall 64.4 mm | 0.4654141 | 0.5194141 | 0.5194141 | Boost activates at the threshold; band remains MEDIUM |
| Landslide slope 22° | 0.5093942 | 0.5375567 | 0.5375567 | Boost activates at the threshold; band remains MEDIUM |
| Landslide 1-day rainfall 64.4 mm | 0.6031646 | 0.6445646 | 0.6445646 | Boost activates at the threshold; band remains MEDIUM |

These are **SYNTHETIC EXPERIMENT RESULTS**. The apparent jumps are properties of the implemented conditional rules. Rounding to two decimals can hide or soften small changes. No threshold was changed.

## F. Weight sensitivity findings

The experiments used the following alternatives only for analysis:

- flood: implemented `[0.30, 0.25, 0.30, 0.15]`, rainfall-shift `[0.33, 0.25, 0.27, 0.15]`, terrain-shift `[0.27, 0.25, 0.33, 0.15]`, equal `[0.25, 0.25, 0.25, 0.25]`;
- landslide: implemented `[0.35, 0.20, 0.25, 0.20]`, rainfall-shift `[0.35, 0.20, 0.28, 0.17]`, terrain-shift `[0.38, 0.17, 0.25, 0.20]`, equal `[0.25, 0.25, 0.25, 0.25]`.

At the baseline scenario, flood scores ranged from approximately `0.18` to `0.21` across the experimental vectors and remained LOW. Landslide scores ranged from approximately `0.50` to `0.51` and remained MEDIUM. These results are synthetic mathematical sensitivity results, not recommendations. They do not establish that any alternative vector is better.

## G. Feature redundancy limitations

The formulas create mathematical overlap between 1-day and 3-day rainfall because the latter is a transformed accumulation containing related temporal information. Slope and TRI are both terrain descriptors and may overlap conceptually.

No paired observational feature table was used here, so this workflow does not estimate empirical correlations, collinearity, or predictive redundancy. The repository's positive event data and generated controls are not sufficient to establish statewide correlation or independent feature contribution. This section is **PENDING VALIDATION**.

## H. Missing-data and confidence findings

At the baseline scenario, the current implementation produced:

| Model | Missing inputs | Score | Band | Confidence |
|---|---|---:|---|---:|
| Flood | none | 0.20 | LOW | 1.00 |
| Flood | 1-day rainfall | 0.09 | LOW | 0.70 |
| Flood | 3-day rainfall | 0.11 | LOW | 0.75 |
| Flood | slope + TRI | 0.29 | LOW | 0.55 |
| Flood | all four environmental inputs | 0.09 | LOW | 0.00 |
| Landslide | none | 0.51 | MEDIUM | 1.00 |
| Landslide | 1-day rainfall | 0.42 | MEDIUM | 0.75 |
| Landslide | slope + TRI | 0.27 | LOW | 0.45 |
| Landslide | all four environmental inputs | 0.11 | LOW | 0.00 |

The all-missing rows now set `slope`, `TRI`, `rainfall_1d`, and `rainfall_3d` to unavailable simultaneously. The existing fallback factors produce flood score `0.09`, LOW, confidence `0.00`, and landslide score `0.11`, LOW, confidence `0.00`. These values verify the current fallback and completeness-penalty behavior. The confidence output measures feature completeness under the implemented rule; it is not predictive accuracy, probability of correctness, or calibrated uncertainty.

## I. Implications for the V1 mathematical specification

- Keep the Python equations and constants unchanged for this analysis baseline.
- Preserve the distinction between score, confidence, and passability.
- Document the inclusive interaction conditions and full-precision band assignment.
- Keep the `/1.6` rainfall transformation, breakpoints, weights, and boosts explicitly provisional.
- Do not infer physical safety or calibrated probability from these scores.
- Treat report aggregation, empirical redundancy analysis, and calibration as unresolved.

## J. Recommendations requiring Pranad's approval

1. Confirm that the Python implementation and parameter set are the intended canonical V1 reference.
2. Confirm whether the current sensitivity workflow should be extended with canonical-engine execution for golden cases.
3. Confirm the acceptable status of current weights, breakpoints, interaction boosts, and confidence penalties.
4. Provide or identify independent negative/background observations and event IDs for spatial/event-aware validation.
5. Confirm whether flood and flash-flood remain one output and whether citizen reports enter V1 scoring.

## Golden-case parity status

Exact analytical-replica parity against the canonical Python engine was **not established**. The canonical implementation is on the remote reference branch and its runtime dependencies are not available in this workspace. `PARITY_STATUS.txt` records this limitation. Kamal separately reported successful Lambda golden-case tests; those Lambda results were not independently verified by this research workflow. Neither result changes the fact that synthetic sensitivity analysis does not establish predictive accuracy or scientific calibration. A future parity run should execute the canonical Python engine against `integration/golden_cases.json`, then compare both flood and landslide outputs, bands, confidence, rounding, and boundary-adjacent cases.

## Classification

- **VERIFIED MATHEMATICAL BEHAVIOR:** formula evaluation, normalization shape, clipping, interaction inclusivity, fallback penalties, and rounding as replicated from the committed source.
- **SYNTHETIC EXPERIMENT RESULT:** all numeric tables and curves generated by this workflow.
- **EMPIRICAL EVIDENCE:** none generated by this workflow; no new observational correlation or performance claim is made.
- **PENDING VALIDATION:** predictive accuracy, calibration, feature redundancy, statewide transfer, report aggregation, and confidence reliability.
