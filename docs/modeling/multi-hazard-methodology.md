# Himachal multi-hazard methodology

Status: initial proposal for Himachal Disaster Intelligence. This document defines modeling concepts, not production implementation or a validated model.

## Scope and spatial hierarchy

- **Geography:** Himachal Pradesh.
- **Hierarchy:** `Report/Assessment → Coordinate-based Hotspot → District`.
- A report or assessment is the evidence-bearing observation. A coordinate-based hotspot is a reproducible spatial grouping around observations. A district is an administrative aggregation across its assigned hotspots.
- Hotspot construction, spatial assignment, district boundary version, and aggregation rules are **PENDING EVIDENCE**. No hotspot radius, grid size, or other spatial constant is defined.

## Candidate hazard components

Maintain separate candidate components for:

- `flood_risk_score`: flooding evidence and context;
- `flash_flood_risk_score`: rapid-onset flooding evidence and context;
- `landslide_risk_score`: landslide susceptibility, triggering conditions, and observations.

Whether flood and flash-flood remain separate in the V1 product is **PENDING EVIDENCE**. They may share some inputs, but their mechanisms, timing, spatial patterns, labels, and validation should not be assumed identical.

Do not create an overall disaster-risk score yet. A generic weighted sum would impose unsupported tradeoffs between hazards and could hide which hazard drives an assessment. An overall score, if later needed, requires a separately defined purpose, normalization, aggregation policy, and evidence.

## Risk semantics

Each hazard score is a relative risk index in `[0,1]`, not a probability. Probability interpretation requires later labeled-data calibration and evaluation against a defined outcome. No numerical weights, normalization constants, thresholds, or category boundaries are assigned here.

Risk, confidence, and passability remain distinct:

- **Risk:** relative hazard index for the relevant component.
- **Confidence:** support and reliability of the assessment evidence. It is not risk and is not assumed to be a probability of correctness. Its representation and calibration are **PENDING EVIDENCE**.
- **Passability:** a travel decision, applicable only where a road/route and travel mode are defined. It must not be inferred from an arbitrary hazard-score cutoff. Unsupported passability is `UNKNOWN`.

Missing evidence is not evidence of safety. Use explicit `MISSING`, `UNKNOWN`, and `INVALID` states, and do not silently convert them to zero, low risk, or passable.

## Static context and current triggers

Separate:

- **Static susceptibility/context:** terrain and hazard layers that describe relatively persistent conditions, including elevation, slope, aspect, TRI, and available flood or landslide susceptibility layers.
- **Current/near-current trigger evidence:** time-dependent rainfall, current hazard observations, historical-event context where temporally relevant, and citizen reports/photos.

Static susceptibility does not establish that an event is occurring now. A current trigger does not by itself replace terrain or susceptibility context. The time basis, freshness, and combination rules for each hazard are **PENDING EVIDENCE**.

## Shared and hazard-specific evidence

Shared conceptual evidence includes location, assessment time, district/hotspot association, provenance, data quality, rainfall where available, terrain context, and evidence availability. Sharing an input does not imply that its effect, timing, or usefulness is the same for every hazard.

Hazard-specific evidence includes:

- flood: flood observations, water-depth class where available, flood hazard context, and relevant rainfall/terrain relationships;
- flash flood: rapid-onset observations, drainage/channel or terrain context where available, and relevant rainfall timing;
- landslide: landslide observations, susceptibility/hazard context, slope/aspect/TRI/elevation relationships, and relevant rainfall triggers.

Citizen reports are observations, not independent labels by default. Distance and recency may modify relevance once their definitions are agreed. Water-depth class is flood severity evidence and should not be transferred to landslide severity. Bedrock confidence expresses uncertainty in image interpretation, not direct hazard evidence or overall confidence.

Avoid double-counting a report, its image, its Bedrock-derived interpretation, and related duplicates as independent evidence.

## Unresolved decisions

The following remain **PENDING EVIDENCE**: dataset coverage and units; rainfall sources, windows, latency, and spatial support; flood versus flash-flood separation; hotspot definition and district aggregation; hazard-specific feature transformations; report taxonomies and labels; handling of conflicting or duplicated reports; confidence representation and calibration; passability scope and policy; score normalization; weights; thresholds; category boundaries; reference outcomes; and whether any score can be calibrated as a probability.

Pranad's EDA and modeling results are required for feature distributions, missingness, redundancy, labels, and candidate model behavior. Kamal's GIS/infrastructure work is required for layer provenance, CRS/resolution metadata, extraction feasibility, and deployment constraints.
