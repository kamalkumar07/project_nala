# NALA V1 CONTRACT FREEZE SPECIFICATION

**Contract Version:** `V1.0`  
**Model Status:** `PROVISIONAL`  
**Target Architecture:** AWS API Gateway + Lambda (`risk-engine`) + Client Apps  
**Schema Definition:** [`contracts/risk_response.schema.json`](file:///D:/projects/isro/contracts/risk_response.schema.json)  

---

## 1. Input Contract Specification

The engine accepts a JSON POST payload representing an assessment query at a geographic point.

### Schema Table

| Field Name | Type | Valid Range / Allowed Values | Default / Fallback | Unit | Description |
|---|---|---|---|---|---|
| `latitude` | `float` | `[-90.0, 90.0]` | Required | degrees | WGS-84 Latitude |
| `longitude` | `float` | `[-180.0, 180.0]` | Required | degrees | WGS-84 Longitude |
| `slope_deg` | `float` or `"UNKNOWN"` | `[0.0, 90.0]` | `null` (`MISSING`) | degrees | Topographic slope from CartoDEM |
| `tri` | `float` or `"UNKNOWN"` | `[0.0, ∞)` | `null` (`MISSING`) | meters | Terrain Ruggedness Index |
| `rainfall_1d_mm` | `float` or `"UNKNOWN"` | `[0.0, ∞)` | `null` (`MISSING`) | mm | 24-hour accumulated IMD precipitation |
| `rainfall_3d_mm` | `float` or `"UNKNOWN"` | `[0.0, ∞)` | `null` (`MISSING`) | mm | 72-hour antecedent IMD precipitation |
| `elevation_m` | `float` | `[-500.0, 9000.0]` | `null` | meters | DEM Elevation (optional contextual) |
| `recent_reports` | `integer` | `[0, ∞)` | `null` | count | Citizen crowd-reports count |
| `reported_water_depth` | `string` | `"NONE"`, `"ANKLE"`, `"KNEE"`, `"WAIST"`, `"ABOVE_WAIST"`, `"UNKNOWN"` | `null` | category | Direct ground observation of water depth |

---

## 2. Output Contract Specification

The engine returns an authoritative, decoupled assessment response.

```json
{
  "location": {
    "latitude": 31.1048,
    "longitude": 77.1734,
    "district": "Shimla"
  },
  "flood": {
    "score": 0.34,
    "band": "LOW",
    "confidence": 1.0,
    "assessmentStatus": "ASSESSED",
    "water_depth": "NONE",
    "passability": "passable",
    "routePassability": "UNDETERMINED",
    "evidenceStatus": {
      "valley_slope": "AVAILABLE",
      "floodplain_tri": "AVAILABLE",
      "rain_1d": "AVAILABLE",
      "rain_3d": "AVAILABLE"
    },
    "factors": {
      "valley_slope": 0.0,
      "floodplain_flatness": 0.0,
      "rain_1d": 0.6296,
      "rain_3d": 0.5856
    }
  },
  "landslide": {
    "score": 0.74,
    "band": "HIGH",
    "confidence": 1.0,
    "assessmentStatus": "ASSESSED",
    "evidenceStatus": {
      "slope": "AVAILABLE",
      "tri": "AVAILABLE",
      "rain_1d": "AVAILABLE",
      "rain_3d": "AVAILABLE"
    },
    "factors": {
      "slope": 0.6833,
      "tri": 0.865,
      "rain_1d": 0.6296,
      "rain_3d": 0.5856
    }
  },
  "modelVersion": "V1.0",
  "modelStatus": "PROVISIONAL"
}
```

---

## 3. Evidence Quality & Assessment Status Semantics

### `evidenceStatus` Enumeration
- **`AVAILABLE`**: Valid numeric input received within physical bounds (including legitimate `0.0` rainfall). Factor computed and present in `factors`.
- **`MISSING`**: Field was `null` or omitted. Missingness penalty applied to `confidence`. Neutral fallback factor used.
- **`UNKNOWN`**: Caller explicitly passed `"UNKNOWN"`. Treated identically to `MISSING` regarding penalty and fallback, but preserved in evidence tracking.
- **`INVALID`**: Input failed validation (e.g. negative rainfall `< 0.0`, slope `> 90.0`, non-numeric string). Treated as absent and penalized.

### `assessmentStatus` Enumeration
- **`ASSESSED`**: At least one primary environmental feature was `AVAILABLE`. The model produces an index based on available physical evidence.
- **`INSUFFICIENT_DATA`**: All four environmental inputs (`slope`, `tri`, `rain_1d`, `rain_3d`) are in `{MISSING, INVALID, UNKNOWN}`. The returned score is purely fallback neutral, confidence is `0.0`, and clients must flag this as unassessed.

---

## 4. Water Depth and Passability Semantics

- **Diagnostic Water Depth (`water_depth`):** Inferred from flood score or passed by direct citizen observation (`NONE`, `ANKLE`, `KNEE`, `WAIST`, `ABOVE_WAIST`).
- **Water Level Passability (`passability`):** Direct vehicular heuristic (`NONE`/`ANKLE` -> `"passable"`, `KNEE`+ -> `"not passable"`).
- **Route Passability Directive (`routePassability`):** Frozen strictly to `"UNDETERMINED"`. The engine does not evaluate culvert damage, mud velocity, bridge collapse, or live road blockages. Client apps must not guarantee travel safety based on hydrological models alone.

---

## 5. Frozen Mathematical Weights & Thresholds

### Flood Model Weights
- `rain_1d`: 0.30
- `rain_3d`: 0.25 (scaled by 1.6)
- `valley_slope`: 0.30 (inverted domain scaling)
- `floodplain_tri`: 0.15 (inverted `1.0 - tri/25.0`)
- **Nonlinear Boost:** `+0.15 * (slope * rain_1d)` when slope ≤ 6.0° and rain_1d ≥ 64.4mm.

### Landslide Model Weights
- `slope`: 0.35 (domain geomorphological curve peaking at 42°)
- `tri`: 0.20 (domain ruggedness curve)
- `rain_1d`: 0.25
- `rain_3d`: 0.20 (scaled by 1.6)
- **Nonlinear Boost:** `+0.12 * (slope * rain_1d)` when slope ≥ 22.0° and rain_1d ≥ 64.4mm.

### Risk Bands
- `LOW`: Score ∈ `[0.00, 0.34]`
- `MEDIUM`: Score ∈ `(0.34, 0.69]`
- `HIGH`: Score ∈ `(0.69, 1.00]`
