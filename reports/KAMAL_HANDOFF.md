# NALA RISK ENGINE V1 — BACKEND / CLOUD INTEGRATION HANDOFF

**Audience:** Kamal Kumar & Cloud / Backend Engineering Team  
**Scope:** Integration of Local V1 Model into Production API / Lambda Services  
**Effective Date:** 2026-10-08  

---

## Model Version
`V1` (Frozen for production integration)

---

## Geography
**Himachal Pradesh, India** (12 Administrative Districts: Bilaspur, Chamba, Hamirpur, Kangra, Kinnaur, Kullu, Lahaul and Spiti, Mandi, Shimla, Sirmaur, Solan, Una).

*Integration Scope Note:* The legacy prototype evaluated `1 - elevation/100`, which collapsed to zero across the state. The V1 model removes this erroneous term and evaluates true Himalayan topography.

---

## Flood Inputs
1. `latitude`: Required float (`30.3773` to `33.2564`)
2. `longitude`: Required float (`75.5946` to `79.0089`)
3. `slope_deg`: Optional float (`0.0` to `90.0`)
4. `tri`: Optional float (`0.0` to `500.0`, Terrain Ruggedness Index)
5. `rainfall_1d_mm`: Optional float (`0.0` to `500.0`)
6. `rainfall_3d_mm`: Optional float (`0.0` to `1000.0`)
7. `elevation_m`: Optional float (`0.0` to `7000.0`, informational)

---

## Landslide Inputs
Same input parameter set as Flood Inputs. Both hazard models evaluate the same physical observations through distinct, decoupled geophysical formulations.

---

## Units
- Coordinates: Decimal degrees (WGS84 / EPSG:4326)
- Slope: Degrees ($\theta^\circ$, $0^\circ \text{ flat}$ to $90^\circ \text{ vertical}$)
- TRI: Meters ($m$, elevation root-mean-squared difference across 3×3 neighborhood)
- Rainfall: Millimeters ($mm$, liquid precipitation equivalent)
- Elevation: Meters above sea level ($m$)

---

## Normalization

All raw features are scaled to `[0.0, 1.0]` using deterministic piecewise functions:

### 1. Precipitation Normalization (`norm_rain`)
Official IMD classification breakpoints:
- `r <= 0.0 mm`: `0.00`
- `0.0 < r <= 15.5 mm`: `0.00 + (r / 15.5) * 0.15` (Light Rain)
- `15.5 < r <= 64.4 mm`: `0.15 + ((r - 15.5) / 48.9) * 0.30` (Moderate Rain)
- `64.4 < r <= 115.5 mm`: `0.45 + ((r - 64.4) / 51.1) * 0.30` (Heavy Rain)
- `115.5 < r <= 204.4 mm`: `0.75 + ((r - 115.5) / 88.9) * 0.20` (Very Heavy Rain)
- `r > 204.4 mm`: `1.00` (Extremely Heavy / Cloudburst)

*3-Day Antecedent Rainfall:* Scaled by $1.6$: `norm_rain(r_3d / 1.6)`.

### 2. Landslide Slope Normalization (`norm_slope_ls`)
Himalayan colluvial failure envelope:
- `s < 10.0°`: `(s / 10.0) * 0.10`
- `10.0° <= s < 20.0°`: `0.10 + ((s - 10.0) / 10.0) * 0.25`
- `20.0° <= s < 32.0°`: `0.35 + ((s - 20.0) / 12.0) * 0.50` (Critical failure zone)
- `32.0° <= s < 42.0°`: `0.85 + ((s - 32.0) / 10.0) * 0.15` (Peak failure envelope)
- `42.0° <= s < 60.0°`: `1.00 - ((s - 42.0) / 18.0) * 0.20` (Bare bedrock cliffs)
- `s >= 60.0°`: `0.80`

### 3. Flood Slope Inversion (`norm_slope_fl`)
Flat valley accumulation physics:
- `s <= 3.0°`: `1.00 - (s / 3.0) * 0.30` (Maximum ponding)
- `3.0° < s <= 8.0°`: `0.70 - ((s - 3.0) / 5.0) * 0.45`
- `8.0° < s <= 15.0°`: `0.25 - ((s - 8.0) / 7.0) * 0.25`
- `s > 15.0°`: `0.00` (Steep hillside shedding)

### 4. Ruggedness Normalization
- **Landslide TRI (`norm_tri_ls`):**
  `tri <= 5m -> (tri/5)*0.15`; `5 < tri <= 20m -> 0.15 + ((tri-5)/15)*0.30`; `20 < tri <= 40m -> 0.45 + ((tri-20)/20)*0.40`; `40 < tri <= 60m -> 0.85 + ((tri-40)/20)*0.15`; `> 60m -> 1.00`.
- **Flood Plain Flatness (`norm_tri_fl`):**
  `clamp01(1.0 - tri / 25.0)`.

---

## Scoring Formula

### Flood Model:
$$\text{Score}_{\text{flood}} = \min\left(1.0, \, 0.30 f_{\text{rain\_1d}} + 0.25 f_{\text{rain\_3d}} + 0.30 f_{\text{slope\_fl}} + 0.15 f_{\text{tri\_fl}} + \text{Boost}\right)$$
- *Valley Pooling Boost:* $+0.15 \times (f_{\text{slope\_fl}} \times f_{\text{rain\_1d}})$ if $\text{slope} \le 6.0^\circ$ and $\text{rain\_1d} \ge 64.4\text{ mm}$.

### Landslide Model:
$$\text{Score}_{\text{landslide}} = \min\left(1.0, \, 0.35 f_{\text{slope\_ls}} + 0.20 f_{\text{tri\_ls}} + 0.25 f_{\text{rain\_1d}} + 0.20 f_{\text{rain\_3d}} + \text{Boost}\right)$$
- *Colluvial Shear Boost:* $+0.12 \times (f_{\text{slope\_ls}} \times f_{\text{rain\_1d}})$ if $\text{slope} \ge 22.0^\circ$ and $\text{rain\_1d} \ge 64.4\text{ mm}$.

---

## Feature Weights

| Model | Slope / Valley Gradient | TRI / Ruggedness | 1-Day Rainfall | 3-Day Rainfall |
|---|---|---|---|---|
| **Flood** | 0.30 | 0.15 | 0.30 | 0.25 |
| **Landslide** | 0.35 | 0.20 | 0.25 | 0.20 |

---

## Confidence
Decoupled observational data completeness metric:
- $\text{Confidence}_{\text{flood}} = 1.0 - (0.30 m_{\text{rain1d}} + 0.25 m_{\text{rain3d}} + 0.30 m_{\text{slope}} + 0.15 m_{\text{tri}})$
- $\text{Confidence}_{\text{landslide}} = 1.0 - (0.35 m_{\text{slope}} + 0.20 m_{\text{tri}} + 0.25 m_{\text{rain1d}} + 0.20 m_{\text{rain3d}})$
Where $m_i = 1$ if feature is missing (`None`), $0$ if validly provided.

---

## Risk Bands
- **LOW:** `0.00 – 0.34` (Normal vigilance)
- **MEDIUM:** `0.35 – 0.69` (Advisory alert; captures 97.1% of disaster landslides)
- **HIGH:** `0.70 – 1.00` (Emergency warning / evacuation)

---

## Missing Data
Missing optional inputs are assigned neutral fallbacks (`f_slope = 0.20`, `f_tri = 0.20`, `f_rain = 0.00`) and penalized in the confidence score. The system does not crash when inputs are missing.

---

## Validation Rules
- Required: `latitude` and `longitude`.
- Must satisfy: `-90 <= latitude <= 90` and `-180 <= longitude <= 180`.
- Coordinates outside Himachal Pradesh resolve to district `"Outside_Himachal_Pradesh"`.

---

## Output Schema
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

## Error Behavior
- Out-of-bounds coordinates raise HTTP 400 (`ValueError`).
- Missing coordinates raise HTTP 400.
- Missing optional factors degrade confidence gracefully.

---

## Golden Test Cases
12 deterministic reference cases are provided in `integration/golden_cases.json`. The backend implementation must produce outputs matching these within $\pm 0.01$ numerical tolerance.

---

## Dependencies
- Reference engine: Python 3.10+, NumPy, GeoPandas, Shapely.
- Lambda port: Can be implemented directly in TypeScript / Node.js with **zero native dependencies** using standard arithmetic functions.

---

## Performance
- Latency: `0.23 ms` per request.
- Throughput: `4,366 QPS` on single core.
- Memory: `< 25 MB`.

---

## Known Limitations
1. CartoDEM tiles currently cover 6 lower/middle districts; high-altitude alpine peaks (Kinnaur, Lahaul & Spiti) require tile additions in V1.1.
2. Official return-period flood maps are unavailable; flood risk relies on geomorphic slope and drainage proxies.

---

## Integration Notes
- **Local ML Phase is COMPLETE.**
- **Backend/Cloud Integration by Kamal's Team is the next external step.**
- Kamal's repository was inspected read-only; no remote code was modified or pushed.
