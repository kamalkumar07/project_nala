# Proposed V1 modeling data contract

Status: proposal for agreement with Pranad and the integration owners. These fields are not an existing API or implemented schema. No external data source, rainfall window, numerical threshold, or measurement unit is selected here.

## Missing and unknown conventions

- Proposed evidence status: `AVAILABLE`, `MISSING`, `UNKNOWN`, or `INVALID`, accompanied by a reason when not available.
- `MISSING`: not supplied; `UNKNOWN`: supplied but unresolved or not interpretable; `INVALID`: fails the agreed contract.
- Missing numeric values use `null`, never zero or a numeric sentinel. Unknown categories use `UNKNOWN`.
- `reports: []` means no reports were returned for a documented retrieval scope. It does not mean no flooding. `reports: null` with a status records unavailable or unresolved retrieval.
- Measurement values are usable only when their required units, time basis, and spatial reference are known. The handling of partial assessments is **PENDING EVIDENCE**; do not silently replace missing inputs.
- Exact serialization, required/optional fields, timestamp format/timezone, and error-response behavior require team agreement.

## Assessment context

| Proposed field | Meaning / proposed representation | Open item |
|---|---|---|
| `assessment_id` | String identifying an assessment | Identifier convention |
| `assessment_time` | Time the assessment describes | Timestamp convention |
| `assessment_location` | Reported street position, with coordinate reference metadata | Coordinate representation/reference system |
| `road_segment_id` | String or `null` if segment association is unknown | Segment source and association rule |
| `assessment_horizon` | `CURRENT_NEAR_CURRENT` for V1 | Permitted observation age: **PENDING EVIDENCE** |
| `methodology_version` | Version of the agreed modeling specification/parameters | Versioning convention |

## Evidence fields

Each evidence group should carry `status`, `status_reason`, source/provenance, and observation/retrieval time where applicable.

| Group / proposed fields | Meaning | Open item |
|---|---|---|
| `rainfall.value`, `rainfall.unit` | Measurement and declared unit, or `null` | Source and units: **PENDING EVIDENCE** |
| `rainfall.window`, `rainfall.observed_at`, `rainfall.spatial_support` | Accumulation period, time, and area represented | Window, time basis, spatial resolution: **PENDING EVIDENCE** |
| `terrain.elevation`, `terrain.unit`, `terrain.vertical_reference` | Elevation with its measurement reference, or `null` | Source, units, datum, resolution: **PENDING EVIDENCE** |
| `terrain.relative_lowness`, `terrain.reference_area`, `terrain.method` | Derived local terrain representation and definition, or `null` | Definition, scale, neighborhood: **PENDING EVIDENCE** |
| `reports_status`, `reports_scope`, `reports` | Retrieval status, documented spatial/time coverage, and report list or `null` | Retrieval scope and availability: **PENDING EVIDENCE** |

### Each citizen report

| Proposed field | Meaning / proposed representation | Open item |
|---|---|---|
| `report_id` | Stable string identifier | Identifier ownership |
| `image_object_key` | Image reference or `null`; may reference the existing S3 upload key | Association with report record |
| `location` | Observation location with coordinate reference, or `null` | Location precision and association: **PENDING EVIDENCE** |
| `observed_at`, `submitted_at` | Separate observation and submission times, or `null` | Timestamp fallback behavior, including whether submission time may substitute for observation time, is **PENDING EVIDENCE / CONTRACT DECISION** |
| `depth_class`, `depth_status` | Bedrock depth category or `UNKNOWN`, plus evidence status | Taxonomy, ordering, unknown handling: **PENDING EVIDENCE** |
| `bedrock_confidence`, `confidence_status` | Raw interpretation-confidence value or `null`, plus status | Type, scale, meaning, and reliability: **PENDING EVIDENCE**; do not assume `[0,1]` |
| `interpretation_provenance` | Model/prompt version and interpretation time, where available | Integration output availability |
| `distance_to_assessment`, `distance_unit`, `distance_method` | Optional derived relevance metadata or `null` | Metric, units, spatial rule: **PENDING EVIDENCE** |
| `report_age`, `age_unit` | Optional derived age relative to assessment time or `null` | Time convention and recency treatment: **PENDING EVIDENCE** |
| `duplicate_group_id` | Shared identifier when duplication is established; otherwise `null` | Detection method: **PENDING EVIDENCE** |

Pranad owns computation of derived fields. `null` duplicate-group membership does not establish that a report is independent.

## Proposed outputs

| Field | Proposed values | Interpretation / unresolved item |
|---|---|---|
| `risk_score` | Number in `[0,1]` or `null` | Relative index, not probability; minimum evidence and scoring rules: **PENDING EVIDENCE** |
| `risk_level` | `LOW`, `MEDIUM`, `HIGH`, `UNKNOWN` | Boundaries: **PENDING EVIDENCE**; may be `UNKNOWN` even with a provisional score |
| `passable` | `true`, `false`, `UNKNOWN` | Conceptual states only; Boolean-or-null serialization is an alternative requiring agreement. Mode and supported policy unresolved |
| `confidence` | `UNKNOWN` until a representation is agreed | Separate assessment-support measure; final representation (numeric, categorical, or nullable), scale, and method: **PENDING EVIDENCE / CONTRACT DECISION** |
| `risk_factors` | List of structured explanations | Proposed entries: `code`, `evidence_refs`, `description`; exact codes require agreement. No unsupported causal or percentage claims |
| `assessment_status` | `ASSESSED`, `INSUFFICIENT_EVIDENCE`, `INVALID_INPUT` | Optional proposed additional field; not part of the frozen contract yet. Eligibility rules: **PENDING EVIDENCE** |
| `status_reasons` | List of reasons for missing, unknown, or invalid outputs | Reason vocabulary requires agreement |

An empty explanation list does not establish low risk. Unknown confidence or passability must remain visible to consumers. Agreement on these states is required before implementation; they must not be coerced to `LOW`, zero, or `true`.
