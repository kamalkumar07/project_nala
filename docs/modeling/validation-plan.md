# V1 modeling validation plan

Scope: qualitative behavior, data suitability, and a small sensitivity review for a four-day hackathon. Reetu defines expectations and interprets results; Pranad implements checks and supplies EDA, predictions, and experiment results.

## Qualitative scenarios

Use controlled comparisons that hold unrelated inputs fixed. These expectations are proposed acceptance criteria, not demonstrated model performance.

| Scenario | Expected qualitative behavior | Evidence or agreement needed |
|---|---|---|
| Low evidence / no reports | Do not interpret report absence as confirmed dry conditions. Distinguish successful empty retrieval from unavailable retrieval. Return unknown outputs when evidence is insufficient. | Minimum evidence and retrieval coverage: **PENDING EVIDENCE** |
| Missing inputs | Preserve missing states; do not replace missing rainfall, terrain, depth, or confidence with zero. Make limitations visible. | Permitted partial assessments/fallbacks: **PENDING EVIDENCE** |
| Fresh vs stale reports | Under the proposed recency assumption, an otherwise identical older report should not gain relevance. Staleness alone must not establish that flooding has cleared. | Observation-age distribution and recency function: **PENDING EVIDENCE** |
| Near vs distant reports | Under the proposed spatial assumption, an otherwise identical distant report should not gain relevance. Association must respect the agreed location/segment rule. | Distance metric, geography, and relevance function: **PENDING EVIDENCE** |
| Duplicate reports | Repeating the same evidence must not count as independent corroboration or increase confidence merely through duplication. | Duplicate patterns and detection feasibility: **PENDING EVIDENCE** |
| Conflicting depth reports | Preserve disagreement and its context; do not silently choose or average classes. Conflict should be visible in assessment support/explanations. | Class definitions and conflict-resolution policy: **PENDING EVIDENCE** |
| High depth with low Bedrock confidence | Retain potentially severe evidence with explicit interpretation uncertainty. Do not treat weak confidence as evidence of shallow water or passability. | Confidence reliability and uncertainty handling: **PENDING EVIDENCE** |
| Rainfall/report disagreement | Expose disagreement; neither absent/weak rainfall nor absent reports should automatically erase the other evidence. Check timing and spatial alignment. | Source coverage, timing, and reconciliation method: **PENDING EVIDENCE** |
| Invalid inputs | Flag malformed timestamps, unknown units, invalid coordinates, and unsupported classes. Do not silently score unusable inputs. Handling of observation timestamps later than `assessment_time`, including clock skew, ingestion delay, and timestamp semantics, remains **PENDING EVIDENCE / CONTRACT DECISION**. | Coordinate/timestamp conventions and rejection policy require agreement; plausible measurement ranges: **PENDING EVIDENCE** |
| Values near future risk-level boundaries | Once boundaries exist, test just below, at, and above them. Verify deterministic boundary inclusion, explain category changes, and inspect sensitivity. Do not invent boundaries for this test. | Boundaries and meaningful perturbations: **PENDING EVIDENCE** |

## Evidence and evaluation

Request a compact handoff from Pranad: source definitions and units, coverage, missingness, feature distributions, duplicate patterns, report times/locations, depth taxonomy, confidence provenance, available reference labels, and baseline predictions. All are **PENDING EVIDENCE**.

- Agree on the reference outcome and assessment unit before measuring performance.
- Use independently checked outcomes where available. Do not use an input report as the sole ground truth for its own assessment.
- Keep duplicates and related observations from the same event together when separating development and evaluation data. Feasible event/location separation and sample counts are **PENDING EVIDENCE**.
- If labels support evaluation, report errors and sample counts by available outcome and evidence conditions. Exact metrics depend on the agreed target and label coverage: **PENDING EVIDENCE**.
- Passability requires its own travel-mode-specific evidence and decision policy. Risk-index checks do not validate passability.
- Synthetic cases establish behavior only. Without suitable labels, report scenario results and limitations; do not claim predictive accuracy or probability calibration.

## Sensitivity review

After a baseline exists, ask Pranad to vary one input or parameter at a time, remove each evidence group in turn, and compare score ordering, risk-level changes, confidence, passability, and explanations. Check duplicate invariance and behavior under missing inputs.

Numerical weights, perturbation ranges, distance/recency parameters, and acceptable instability are **PENDING EVIDENCE**. Ground ranges in observed variability or documented measurement uncertainty; record any provisional assumptions. Prioritize failures that turn uncertain or conflicting evidence into an unsupported passability decision.

## Four-day handoff

1. **Day 1:** Agree on target, proposed contract, unknown states, and qualitative expectations.
2. **Day 2:** Review Pranad's EDA; resolve only supported choices and specify one transparent baseline.
3. **Day 3:** Review scenario results, available labeled evaluation, and sensitivity findings; prioritize fixes.
4. **Day 4:** Freeze the documented V1 assumptions and summarize passed/failed checks, remaining evidence gaps, and improvement recommendations.

Completion means a traceable specification and honest validation summary. Any unavailable empirical results remain **PENDING EVIDENCE**.
