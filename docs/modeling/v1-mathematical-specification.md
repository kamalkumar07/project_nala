# Nala V1 mathematical modeling specification (draft)

Status: draft for confirmation by Pranad and AWS integration by Kamal. This document records the current Python reference behavior and proposed contract semantics. It does not claim that the current parameters are calibrated or operationally safe.

## 1. Scope and score semantics

The candidate V1 hazards are flood and landslide. The Python reference engine exposes these two outputs independently. Flash floods are not modeled separately; the flood component must not be presented as an independently validated flash-flood predictor. The AWS Lambda currently produces a different generic score, not the Python flood/landslide outputs. There is no overall disaster score.

`score` is a relative hazard-risk index bounded to `[0,1]`. It is not a probability. A probability interpretation requires independently labeled outcomes, valid spatial/event-aware evaluation, and later calibration evidence.

Status: **VERIFIED IMPLEMENTATION** for the Python output behavior; probability calibration is **PENDING EVIDENCE**.

## 2. Python reference equations

Source files: `src/models/flood_model.py` and `src/models/landslide_model.py`.

### Flood / flash-flood component

The current Python implementation computes:

\[
S_f = \operatorname{clip}_{[0,1]}(0.30r_1 + 0.25r_3 + 0.30s_f + 0.15t_f + B_f)
\]

where:

- `r_1` is normalized 1-day rainfall;
- `r_3` is normalized transformed 3-day rainfall;
- `s_f` is the inverted flood slope factor;
- `t_f = clip01(1 - TRI/25)` is the flood flatness factor;
- `B_f = 0.15(s_f r_1)` when slope ≤ `6.0°` and 1-day rainfall ≥ `64.4 mm`, otherwise zero.

This equation is **VERIFIED IMPLEMENTATION**. Its physical and operational validity is **PROVISIONAL PARAMETER / PENDING EVIDENCE**.

### Landslide component

The current Python implementation computes:

\[
S_l = \operatorname{clip}_{[0,1]}(0.35s_l + 0.20t_l + 0.25r_1 + 0.20r_3 + B_l)
\]

where:

- `s_l` is the landslide slope factor;
- `t_l` is the landslide TRI factor;
- `r_1` is normalized 1-day rainfall;
- `r_3` is normalized transformed 3-day rainfall;
- `B_l = 0.12(s_l r_1)` when slope ≥ `22.0°` and 1-day rainfall ≥ `64.4 mm`, otherwise zero.

This equation is **VERIFIED IMPLEMENTATION**. Its physical and operational validity is **PROVISIONAL PARAMETER / PENDING EVIDENCE**.

The Python engine accepts `elevation_m` and `recent_reports`, but neither contributes to these equations. Reported water depth affects flood depth/passability output only.

Input behavior in the current Python implementation is:

- negative rainfall, slope, or TRI values are treated as invalid/missing for that feature;
- non-finite values such as NaN or infinity are treated as invalid/missing;
- latitude and longitude are converted to numbers and checked only against generic `[-90, 90]` and `[-180, 180]` bounds;
- coordinates outside the Himachal boundary receive `Outside_Himachal_Pradesh` from district lookup but are still scored by the Python engine.

These are **VERIFIED IMPLEMENTATION** details. A stricter Himachal-only contract and final invalid-input behavior are **PENDING APPROVAL** by Pranad and Kamal.

## 3. Existing normalization functions and parameters

Source: `src/normalization/scalers.py`.

### Deployed Python mappings

Rainfall uses piecewise linear interpolation:

```text
(0.0 mm, 0.00)
(15.5 mm, 0.15)
(64.4 mm, 0.45)
(115.5 mm, 0.75)
(204.4 mm, 1.00)
```

Values below zero are clipped to zero; values above `204.4 mm` map to `1.0`.

3-day rainfall is transformed as:

```text
domain_rainfall(rainfall_3d_mm / 1.6)
```

The `1.6` factor is an **UNSUPPORTED** implemented assumption pending evidence.

Flood slope uses piecewise interpolation:

```text
(0°, 1.00), (3°, 0.70), (8°, 0.25), (15°, 0.00)
```

Landslide slope uses:

```text
(0°, 0.00), (10°, 0.10), (20°, 0.35),
(32°, 0.85), (42°, 1.00), (60°, 0.80)
```

Landslide TRI uses:

```text
(0 m, 0.00), (5 m, 0.15), (20 m, 0.45),
(40 m, 0.85), (60 m, 1.00)
```

Flood TRI uses a separate mapping in `FloodRiskModel.evaluate()`:

```text
clip01(1 - TRI / 25)
```

The rainfall, slope, and TRI mappings above are actively used by the Python models and are **VERIFIED IMPLEMENTATION**. Their breakpoints and physical interpretation are **PROVISIONAL PARAMETERS / PENDING EVIDENCE**. `min_max()`, `percentile_scaling()`, and `log_scaling()` also exist in `scalers.py`, but are candidate utilities only: they are not used by current production scoring. Selecting any alternative remains **PENDING EVIDENCE**.

## 4. Feature weights and interaction parameters

Current Python weights are:

| Component | Feature | Weight |
|---|---|---:|
| Flood | 1-day rainfall | 0.30 |
| Flood | 3-day rainfall | 0.25 |
| Flood | flood slope factor | 0.30 |
| Flood | flood TRI factor | 0.15 |
| Landslide | slope factor | 0.35 |
| Landslide | TRI factor | 0.20 |
| Landslide | 1-day rainfall | 0.25 |
| Landslide | 3-day rainfall | 0.20 |

Source: `WEIGHTS` constants in `src/models/flood_model.py` and `src/models/landslide_model.py`.

The constants are **VERIFIED IMPLEMENTATION**. The descriptions calling them “calibrated” are not established by the available positive-only event data and generated controls. Their scientific calibration status is **UNSUPPORTED / PENDING EVIDENCE**.

Interaction coefficients and activation conditions:

| Component | Condition | Boost |
|---|---|---|
| Flood | slope ≤ `6.0°` and 1-day rainfall ≥ `64.4 mm` | `0.15 × flood_slope_factor × rain_1d_factor` |
| Landslide | slope ≥ `22.0°` and 1-day rainfall ≥ `64.4 mm` | `0.12 × landslide_slope_factor × rain_1d_factor` |

These are **VERIFIED IMPLEMENTATION** and **PROVISIONAL PARAMETERS**. No independent calibration of coefficients or activation thresholds is demonstrated.

## 5. Risk bands and interpretation

Current Python bands are implemented in both model classes:

```text
LOW    : score <= 0.34
MEDIUM : 0.34 < score <= 0.69
HIGH   : score > 0.69
```

The boundaries are **VERIFIED IMPLEMENTATION** and should remain described as provisional until outcome-based evaluation supports them. Python assigns the band using the full-precision, unrounded score, then returns the score rounded to two decimals. Near `0.34` or `0.69`, a displayed score and its band can therefore appear inconsistent. They are not safety thresholds and do not establish warnings, evacuations, or probability levels.

The score is a relative index. The current implementation must not describe it as calibrated probability, severity in physical units, or a guaranteed safety decision.

## 6. Confidence and data quality

### Current Python confidence formulas

Flood:

```text
clip01(1
  - 0.30*missing_slope
  - 0.15*missing_tri
  - 0.30*missing_rain_1d
  - 0.25*missing_rain_3d)
```

Landslide:

```text
clip01(1
  - 0.35*missing_slope
  - 0.20*missing_tri
  - 0.25*missing_rain_1d
  - 0.20*missing_rain_3d)
```

Invalid or missing slope/TRI use a factor fallback of `0.20`; invalid or missing rainfall uses factor `0.0`. These formulas and fallbacks are **VERIFIED IMPLEMENTATION**. Their interpretation as confidence is **PROVISIONAL**, not calibrated reliability.

Limitations:

- They measure input completeness, not probability of correctness.
- They do not account for source quality, spatial mismatch, recency, disagreement, or label quality.
- Full feature presence yields `1.0` even if the evidence is biased or out of distribution.
- Confidence is separate from risk and must not be interpreted as risk magnitude.

### Proposed V1 evidence semantics

The interface should distinguish, per evidence group:

```text
AVAILABLE   = present, interpretable, and provenance-known
MISSING     = not supplied
UNKNOWN     = supplied or expected, but unresolved/uninterpretable
INVALID     = fails agreed schema, range, CRS, timestamp, or unit checks
```

This is a **PROPOSED V1 DECISION**. Missing evidence must not be converted to zero risk. No reports must be distinguishable from unavailable report retrieval. Final numeric/categorical/null confidence representation is **PENDING EVIDENCE**.

## 7. Citizen-report aggregation proposal

The current Python models do not aggregate citizen reports. The Lambda prototype normalizes a report count as `clamp01(recentReports/10)` and ignores report depth and confidence. Its route also accepts `rainfallWindow`, passes it to `calculateRisk()`, and the current calculation does not use it; this is an existing implementation mismatch.

Proposed hazard-specific structure:

\[
A_h(x,t)=\operatorname{Aggregate}_h(\text{severity}_i,
\text{distance relevance}_i,
\text{recency relevance}_i,
\text{interpretation uncertainty}_i,
\text{independence}_i)
\]

where `h` is the relevant hazard.

Proposed rules:

- flood reports may use water-depth class as severity evidence;
- landslide reports require a separate hazard-specific observation taxonomy;
- Bedrock confidence represents image-interpretation uncertainty, not direct hazard severity;
- duplicate or same-event reports must not count as independent confirmations by default;
- no reports is not confirmed absence of hazard;
- report distance and recency require defined spatial/time semantics before use;
- coverage and retrieval status must be separate from report count;
- conflicting reports should remain visible rather than being silently averaged.

This is a **PROPOSED V1 DECISION** at the conceptual level. Any numerical aggregation, decay, distance function, or confidence adjustment is **PENDING EVIDENCE**.

## 8. Missing and UNKNOWN handling

Proposed V1 behavior:

- preserve `MISSING`, `UNKNOWN`, and `INVALID` states in the contract;
- do not coerce missing rainfall, terrain, reports, or image assessments to zero evidence;
- do not return `passable=true` solely because a depth observation is absent;
- return `UNKNOWN` risk level or passability when a supported decision cannot be made;
- attach status reasons and evidence provenance;
- distinguish an empty, successfully retrieved report set from unavailable report data;
- keep outside-Himachal coordinates as an explicit contract decision rather than assuming they are valid model inputs.

These are **PROPOSED V1 DECISIONS**. They differ from current Python behavior: current missing rainfall factors contribute `0.0`, missing/invalid slope and TRI use their existing `0.20` fallbacks, and completeness penalties reduce confidence. The proposed contract should keep missing data distinguishable from observed zero values and use explicit `UNKNOWN` semantics, subject to team approval. Exact fallback scoring and eligibility rules remain **PENDING EVIDENCE**.

## 9. Passability

Current flood implementation maps explicit recognized water-depth classes as follows:

```text
NONE or ANKLE -> passable
KNEE, WAIST, ABOVE_WAIST -> not passable
```

For an unknown or invalid depth without a usable flood score, the current implementation returns `UNKNOWN` and `undetermined`. If an unknown or invalid depth is supplied while a usable flood score is available, the implementation falls through to score-based depth inference:

```text
score <= 0.20 -> NONE
score <= 0.40 -> ANKLE
score <= 0.65 -> KNEE
score <= 0.85 -> WAIST
score > 0.85  -> ABOVE_WAIST
```

These mappings are **VERIFIED IMPLEMENTATION**, but their use as safety policy is **UNSUPPORTED / PENDING EVIDENCE**. They lack travel-mode, flow-velocity, road-condition, bridge, and independently checked safety outcomes. The proposed safer V1 contract is to keep passability `UNKNOWN` unless an agreed route/travel policy supports a decision; this is not the current fallback behavior.

## 10. Spatial/event-aware validation

The committed landslide CSV contains 3,147 positive event points. It does not contain confirmed negative examples. `src/features/matrix_builder.py` generates pseudo-controls by random sampling around the event cluster, rejecting slopes above `16°`, and drawing synthetic rainfall. These are sampling constructs, not observed stable controls.

Proposed protocol:

1. Preserve source labels: confirmed positive, generated pseudo-control, and unknown.
2. Record event ID/polygon, time, coordinates, CRS, and extraction provenance where available.
3. Group related points from one event or polygon before splitting.
4. Use spatially grouped holdouts so nearby points do not cross train/test partitions.
5. Use event-aware temporal holdouts when multiple events exist.
6. Report district coverage and, where feasible, district-aware holdouts.
7. Fit imputers and transformations on training partitions only.
8. Keep pseudo-control generation out of held-out ground-truth claims, or report it explicitly as synthetic.
9. Evaluate hazard-specific behavior, missingness, ablations, sensitivity, and duplicate invariance.
10. Treat synthetic scenarios as functional/scenario evidence only, not predictive accuracy evidence.
11. Do not claim probability calibration without independent outcome labels and held-out calibration evaluation.

The required spatial grouping rule, event identifiers, independent negatives, metrics, and feasible holdout design are **PENDING EVIDENCE**.

## 11. Python-to-AWS golden-case parity

Kamal's proposed canonical architecture requires the AWS Lambda implementation to match the Python reference engine's golden cases, pending Pranad's confirmation that Python is canonical.

Parity requirements:

- identical input field meanings, units, valid ranges, and missing/unknown behavior;
- identical normalization functions and parameter version;
- identical feature weights, interaction conditions, clipping, rounding, and band assignment;
- identical confidence and passability semantics;
- identical district/location behavior;
- identical model version and configuration identifiers;
- automated comparison against `integration/golden_cases.json` with documented numeric tolerance;
- parity cases immediately below, at, and immediately above both risk-band boundaries, while preserving Python's full-precision band assignment and two-decimal returned score;
- parity for both the flood and landslide outputs, not only a single generic score;
- no Lambda-only generic formula remaining on the canonical path.

Current status: **PENDING EVIDENCE / IMPLEMENTATION CONFIRMATION**. The current Lambda prototype uses equal weights over rainfall, report count, and lowness and is not mathematically equivalent to the Python engine. District lookup is a separate spatial/API concern, and hotspot generation and district aggregation are not implemented in the Python Risk Engine.

## 12. Decisions awaiting Pranad's confirmation

Pranad must confirm:

- whether the Python engine is the canonical V1 implementation;
- whether flood and flash flood remain one output in V1;
- whether current weights, normalization functions, boosts, and bands are placeholders or intended frozen parameters;
- the evidence basis for the 3-day rainfall divisor `1.6`;
- the intended semantics of missing, unknown, and invalid inputs;
- whether current confidence is retained as a completeness indicator or replaced/renamed;
- whether passability remains in the Risk Engine and which policy governs it;
- whether report count, depth, recency, distance, duplicates, and Bedrock confidence will enter V1 scoring;
- whether the positive-only dataset and pseudo-controls are suitable only for exploratory validation;
- what spatial/event-aware validation results are available;
- the exact Python output schema to which Lambda must conform.

## 13. Decisions for Kamal's AWS integration

Kamal needs:

- the confirmed canonical input/output schema;
- versioned parameter/configuration identifiers;
- explicit unknown/missing/error behavior;
- Python-to-Lambda golden-case parity tests;
- district and coordinate semantics;
- dependency and runtime constraints for the parity implementation;
- a clear statement that relative scores are not calibrated probabilities;
- a decision on whether passability is a model output or application policy.

## 14. Classification summary

### VERIFIED IMPLEMENTATION

- Python has separate flood and landslide model classes.
- Current equations, weights, boosts, normalization mappings, clipping, bands, confidence formulas, and depth mappings exist in the cited source files.
- Lambda has a separate three-input equal-weight prototype.

### PROPOSED V1 DECISION

- Use hazard-specific outputs.
- Preserve relative-index semantics.
- Preserve explicit evidence-quality states.
- Keep confidence separate from risk.
- Aggregate citizen evidence by hazard, relevance, uncertainty, and independence.
- Require Python-to-Lambda golden-case parity.

### PROVISIONAL PARAMETER

- Current rainfall, slope, TRI, and risk-band mappings may serve as transparent prototype parameters pending validation.

### UNSUPPORTED

- Claims that current weights and thresholds are calibrated.
- The `1.6` 3-day rainfall divisor as an established scientific conversion.
- Lambda `reports/10` and `1-elevation/100` as valid Himachal hazard normalizations.
- Inferring physical water depth or general safety from abstract flood score.

### PENDING EVIDENCE

- Independent labels and negative/background observations.
- Spatial/event-aware validation results.
- Confidence reliability and calibration.
- Report aggregation parameters.
- Final risk-band and passability policies.
- Canonical Python/Lambda parity confirmation.

### FUTURE ENHANCEMENT

- Separate flash-flood score.
- Official flood/landslide hazard layers.
- Calibrated probabilistic outputs, if labels support them.
- Hotspot and district aggregation.
- Validated citizen-photo/Bedrock evidence integration.
- Quantified uncertainty beyond missingness penalties.
