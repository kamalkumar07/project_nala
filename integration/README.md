# NALA Risk Engine V1 — Backend Integration Package

This package contains the minimal, complete specification and test fixtures required by Kamal Kumar and the backend/cloud engineering team to integrate the **NALA V1 Risk Engine** for Himachal Pradesh.

---

### 1. Package Contents

- `golden_cases.json`: 12 deterministic golden test cases covering all edge cases, missing data combinations, and risk bands.
- `example_request.json`: Canonical input payload for testing.
- `example_response.json`: Frozen reference response payload.
- `requirements.txt`: Minimal Python runtime dependencies if executing the engine in Python.
- `BACKEND_INTEGRATION_CHECKLIST.md`: Step-by-step verification checklist for backend engineers.
- `README.md`: This integration guide.

---

### 2. How the Model is Invoked

#### Python (Reference Implementation):
```python
from src.models.risk_engine import NalaRiskEngine

engine = NalaRiskEngine()
result = engine.assess_risk(
    latitude=31.1048,
    longitude=77.1734,
    slope_deg=28.0,
    tri=42.0,
    rainfall_1d_mm=95.0,
    rainfall_3d_mm=140.0,
    elevation_m=2205.0
)
```

#### TypeScript / JavaScript (Lambda Microservice Port):
The model uses standard deterministic arithmetic (piecewise linear interpolation, weighting, clamping) and can be ported directly into Node.js Lambda functions with zero external C-extensions.

---

### 3. Required Inputs, Units & Valid Ranges

| Field Name | Type | Unit | Range | Required? | Default / Missing Behavior |
|---|---|---|---|---|---|
| `latitude` | `float` | degrees N | `30.3773` to `33.2564` | **Yes** | Must be provided; raises `ValueError` if outside `[-90, 90]`. |
| `longitude` | `float` | degrees E | `75.5946` to `79.0089` | **Yes** | Must be provided; raises `ValueError` if outside `[-180, 180]`. |
| `slope_deg` | `float` | degrees | `0.0` to `90.0` | No | Fallback = `0.20`, confidence reduced by `0.35` (LS) / `0.30` (FL). |
| `tri` | `float` | meters | `0.0` to `500.0` | No | Fallback = `0.20`, confidence reduced by `0.20` (LS) / `0.15` (FL). |
| `rainfall_1d_mm` | `float` | mm | `0.0` to `500.0` | No | Fallback = `0.0`, confidence reduced by `0.25` (LS) / `0.30` (FL). |
| `rainfall_3d_mm` | `float` | mm | `0.0` to `1000.0` | No | Fallback = `0.0`, confidence reduced by `0.20` (LS) / `0.25` (FL). |
| `elevation_m` | `float` | meters | `0.0` to `7000.0` | No | Informational; does not penalize confidence if omitted. |
| `recent_reports`| `int` | count | $\ge 0$ | No | Default = `0`. |

---

### 4. Output Schema

```json
{
  "location": {
    "latitude": 31.1048,
    "longitude": 77.1734,
    "district": "Shimla"
  },
  "flood": {
    "score": 0.31,
    "band": "LOW",
    "confidence": 1.0,
    "factors": {
      "valley_slope": 0.0,
      "floodplain_flatness": 0.0,
      "rain_1d": 0.63,
      "rain_3d": 0.5843
    }
  },
  "landslide": {
    "score": 0.81,
    "band": "HIGH",
    "confidence": 1.0,
    "factors": {
      "slope": 0.675,
      "tri": 0.865,
      "rain_1d": 0.63,
      "rain_3d": 0.5843
    }
  },
  "modelVersion": "V1"
}
```

---

### 5. Error Behavior

1. **Invalid Coordinates:** Latitude or longitude outside global geometric bounds (`-90 <= lat <= 90`, `-180 <= lon <= 180`) raises a `ValueError` (HTTP 400 Bad Request).
2. **Outside Himachal Pradesh:** Coordinates outside the Himachal boundary polygon are assigned `"district": "Outside_Himachal_Pradesh"`. Scoring proceeds with available terrain inputs.
3. **Missing Optional Fields:** Evaluated gracefully with confidence penalty.

---

### 6. Dependencies & Performance

- **Inference Latency:** `0.23 ms` per evaluation.
- **Throughput:** `4,366 queries/sec` (single CPU core).
- **RAM Footprint:** `< 25 MB`.
- **Zero Heavy ML Dependencies:** Runs purely on vectorized linear algebra.
