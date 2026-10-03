# V1 flood-risk methodology

Status: proposed modeling specification for a four-day hackathon. This document does not define a validated flood model. Reetu owns methodology and interpretation; Pranad owns preprocessing, feature implementation, experiments, inference, and packaging.

## Assessment and outputs

- **Unit:** a reported street location/local road segment. Exact segment boundaries and report-to-segment association require team agreement.
- **Horizon:** current/near-current conditions for V1. The allowable observation age is **PENDING EVIDENCE** from Pranad's EDA; V1 does not specify a future forecast horizon.
- **Risk:** `risk_score` is a relative flood-risk index in `[0,1]`. It is **not a probability**. A probability interpretation requires future labeled-data calibration and evaluation against a defined outcome.
- **Confidence:** describes support for the assessment, including evidence availability, quality, relevance, and agreement. It is separate from risk magnitude and is not yet a calibrated probability of correctness.
- **Passability:** a separate decision about travel at the location. Travel mode, supporting evidence, and decision policy are unresolved. Do not infer passability from an arbitrary risk-score cutoff. Use `UNKNOWN` while a supported decision is unavailable.
- **Risk level:** `LOW`, `MEDIUM`, or `HIGH` only when a category policy is agreed and supported; otherwise `UNKNOWN`. Numerical boundaries are **PENDING EVIDENCE**.

## Candidate evidence groups

| Group | Intended role | Unresolved choices |
|---|---|---|
| Rainfall | Environmental evidence relevant to current conditions | Source, units, accumulation windows, transformations, and availability: **PENDING EVIDENCE** |
| Terrain/relative lowness | Local terrain context | Source, units, resolution, reference neighborhood, and usable representation: **PENDING EVIDENCE** |
| Citizen reports | Observations associated with the location | Deduplication, spatial association, recency, conflict handling, and aggregation: **PENDING EVIDENCE** |

Within citizen-report evidence:

- Water-depth class represents reported severity. Class definitions and their ordering require agreement; no conversion to physical depth is assumed.
- Bedrock confidence represents uncertainty about image interpretation. It is not direct flood-risk evidence and is not overall assessment confidence. Its scale, provenance, and empirical reliability are **PENDING EVIDENCE**.
- Distance and recency modify a report's relevance. They are not independent severity measurements. Distance rules, age limits, and decay functions are **PENDING EVIDENCE**.
- A report, its image-derived depth, and its confidence originate from related evidence; their treatment must avoid counting them as independent confirmations.

## Conceptual mathematical structure

For location/segment `x` and assessment time `t`, let `R` be rainfall evidence, `L` terrain evidence, and `A` aggregated citizen-report evidence:

```text
A(x,t) = Aggregate({Severity(depth_i), Relevance(distance_i, age_i),
                   InterpretationUncertainty_i, provenance_i})
S(x,t) = F(R(x,t), L(x), A(x,t); theta), with S in [0,1]
C(x,t) = G(evidence availability, quality, relevance, agreement)
P(x,t) = H(passability evidence, travel mode, agreed decision policy)
```

These are placeholders for relationships, not executable formulas. `theta` has no assigned numerical weights. Aggregation, normalization, interactions, missing-data handling, and the forms of `F`, `G`, and `H` are **PENDING EVIDENCE** and agreement. An unsupported assessment returns missing/unknown outputs rather than an invented zero score.

## Assumptions and unresolved decisions

- **Assumption to validate:** a report that is closer or fresher is at least as relevant, other conditions equal. Geographic barriers and report timing may limit this relationship.
- **Assumption to validate:** stronger credible severity evidence should not reduce risk, other conditions equal. Depth ordering and conflicting observations must first be defined.
- No reports means absent report evidence, not confirmed absence of flooding. Missing rainfall or terrain is not a zero measurement.
- Weak interpretation confidence must not turn a potentially severe observation into evidence of safe conditions. The precise uncertainty treatment is **PENDING EVIDENCE**.
- Pranad's EDA must establish coverage, missingness, distributions, duplicates, source resolution, and available labels before numerical parameters are selected: **PENDING EVIDENCE**.
- Team agreement is needed on the target reference outcome, segment definition, travel mode, explanation codes, and unknown-state presentation.
- For V1, prioritize one transparent baseline, qualitative checks, and sensitivity review. Without suitable independent labels, any later parameter choices remain provisional assumptions; do not claim empirical calibration or predictive accuracy.

See [the proposed contract](data-contract.md) and [validation plan](validation-plan.md).
