# NALA — Himachal Pradesh Flood & Landslide Risk Engine (V1)

**Production Version:** `V1` (Frozen for Backend / Cloud Integration)  
**Geographic Scope:** Himachal Pradesh, India (12 Administrative Districts)  
**Target Environment:** Python 3.10+ / Node.js Lambda Microservice Compatible  

---

## 1. Overview

Project NALA provides deterministic, interpretable, dual-hazard early warning intelligence for disaster risk mitigation in Himachal Pradesh. The system decouples natural hazards into two physically distinct assessments:
1. **Flood / Flash-Flood Risk Model (`FloodRiskModel`):** Evaluates hydrologic valley ponding, floodplain flatness, and precipitation accumulation.
2. **Landslide Risk Model (`LandslideRiskModel`):** Evaluates gravitational shear stress, topographic ruggedness, short-term triggering downpours, and antecedent soil moisture saturation.

Both models evaluate the same geographic observations through independent physical formulations, outputting normalized risk scores, actionable risk bands, decoupled observational confidence, water depth classifications, and road passability directives.

---

## 2. Geographic Target: Himachal Pradesh

The engine operates over the 12 administrative districts of Himachal Pradesh:
- **Districts:** Bilaspur, Chamba, Hamirpur, Kangra, Kinnaur, Kullu, Lahaul & Spiti, Mandi, Shimla, Sirmaur, Solan, Una.
- **Bounding Box:** Latitude `30.3773°N` to `33.2564°N`, Longitude `75.5946°E` to `79.0089°E` (EPSG:4326).
- **Out-of-State Behavior:** Coordinates outside the state boundary are cleanly assigned to `"district": "Outside_Himachal_Pradesh"` while scoring proceeds using available terrain inputs.

---

## 3. Hazard Model Architecture

```
                    NALA RISK ENGINE V1
                             |
              +--------------+--------------+
              |                             |
              v                             v
       FLOOD RISK MODEL            LANDSLIDE RISK MODEL
              |                             |
   - Inverted Slope Physics      - Geomorphic Failure Envelope
   - Floodplain Flatness (TRI)   - Incision Ruggedness (TRI)
   - 1-Day Flash Downpour        - 1-Day Shear Trigger
   - 3-Day Saturated Drainage    - 3-Day Soil Saturation
   - Valley Pooling Surge Boost  - Colluvial Shear Surge Boost
              |                             |
              +--------------+--------------+
                             |
                             v
               DECOUPLED CONFIDENCE ENGINE
          (Observational Data Completeness: 0.0–1.0)
                             |
                             v
               WATER DEPTH & PASSABILITY
         (NONE / ANKLE / KNEE / WAIST / ABOVE_WAIST)
                             |
                             v
               STRUCTURED JSON RESPONSE
```

### 3.1 Flood / Flash-Flood Model (`FloodRiskModel`)
- **Valley Slope Inversion ($f_{\text{slope\_fl}}$):** Low gradients maximize water accumulation. Slopes $\le 3^\circ$ receive high susceptibility ($1.00 - 0.70$), decaying to $0.00$ for slopes $> 15^\circ$.
- **Floodplain Flatness ($f_{\text{tri\_fl}}$):** $\text{clamp}_{0,1}(1.0 - \text{TRI} / 25.0)$.
- **Feature Weights:**
  - `valley_slope`: `0.30`
  - `floodplain_tri`: `0.15`
  - `rain_1d`: `0.30`
  - `rain_3d`: `0.25`
- **Valley Pooling Surge Boost:** $+0.15 \times (f_{\text{slope}} \times f_{\text{rain}})$ when $\text{slope} \le 6^\circ$ and $\text{rain\_1d} \ge 64.4\text{ mm}$.

### 3.2 Landslide Risk Model (`LandslideRiskModel`)
- **Geomorphic Slope Envelope ($f_{\text{slope\_ls}}$):**
  - $< 10^\circ \to 0.00 - 0.10$ (Negligible failure)
  - $10^\circ - 20^\circ \to 0.10 - 0.35$ (Moderate stability)
  - $20^\circ - 32^\circ \to 0.35 - 0.85$ (Critical colluvial mantle envelope)
  - $32^\circ - 42^\circ \to 0.85 - 1.00$ (Peak failure zone, modal road cuts)
  - $\ge 45^\circ \to 0.80$ (Steep bedrock / thin regolith)
- **Topographic Ruggedness ($f_{\text{tri\_ls}}$):** Evaluates gully incision and headward erosion.
- **Feature Weights:**
  - `slope`: `0.35`
  - `tri`: `0.20`
  - `rain_1d`: `0.25`
  - `rain_3d`: `0.20`
- **Colluvial Shear Surge Boost:** $+0.12 \times (f_{\text{slope}} \times f_{\text{rain}})$ when $\text{slope} \ge 22^\circ$ and $\text{rain\_1d} \ge 64.4\text{ mm}$.

---

## 4. Normalization & IMD Standards

Continuous variables are normalized to `[0.0, 1.0]` using piecewise physical breakpoints:
- **Precipitation (`norm_rain`):** Matches official India Meteorological Department (IMD) categories:
  - $\le 0.0\text{ mm} \to 0.00$
  - $0.1 - 15.5\text{ mm} \to 0.00 - 0.15$ (Light Rain)
  - $15.6 - 64.4\text{ mm} \to 0.15 - 0.45$ (Moderate Rain)
  - $64.5 - 115.5\text{ mm} \to 0.45 - 0.75$ (Heavy Rain)
  - $115.6 - 204.4\text{ mm} \to 0.75 - 0.95$ (Very Heavy Rain)
  - $> 204.4\text{ mm} \to 1.00$ (Extremely Heavy / Cloudburst)
- **3-Day Antecedent Rainfall:** Scaled by factor $1.6$ prior to normalization: `norm_rain(r_3d / 1.6)`.

---

## 5. Risk Bands, Confidence & Passability

### 5.1 Operational Risk Bands
- **LOW:** `0.00 – 0.34` (Normal vigilance; routine conditions)
- **MEDIUM:** `0.35 – 0.69` (Advisory alert; monitor vulnerable stream banks and road cuts)
- **HIGH:** `0.70 – 1.00` (Emergency warning; evacuations and highway closures initiated)

*Calibration Benchmark:* At threshold `0.35` (MEDIUM), the model captures **97.1%** of all 3,147 verified 2023 disaster landslide events.

### 5.2 Decoupled Confidence
Confidence represents **observational data completeness**, completely independent of risk magnitude:
$$\text{Confidence} = 1.0 - \sum w_i \cdot \mathbb{I}(\text{feature}_i \text{ is missing})$$
A location can be 100% confident with LOW risk, or 40% confident with HIGH risk.

### 5.3 Water Depth & Passability Mapping
- **Water Depth Levels:** `NONE`, `ANKLE`, `KNEE`, `WAIST`, `ABOVE_WAIST`, `UNKNOWN`
- **Passability Policy:**
  - `NONE` / `ANKLE` $\to$ `passable`
  - `KNEE` / `WAIST` / `ABOVE_WAIST` $\to$ `not passable`
  - `UNKNOWN` $\to$ `undetermined`

---

## 6. Installation & Environment

### Prerequisites
- Python 3.10, 3.11, 3.12, or 3.13
- Virtual environment recommended:

```bash
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate
```

### Installation
```bash
pip install -r requirements.txt
```

---

## 7. How to Run Locally & Run Tests

### Running the Python Entrypoint
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
    elevation_m=2205.0,
    reported_water_depth="NONE"
)
print(result)
```

### Running Tests
Execute the full test suite (34 unit, integration, and golden tests):
```bash
python -m pytest
```

---

## 8. API Input / Output Schemas

### Input Schema (`examples/request.json`)
```json
{
  "latitude": 31.1048,
  "longitude": 77.1734,
  "slope_deg": 28.0,
  "tri": 42.0,
  "rainfall_1d_mm": 95.0,
  "rainfall_3d_mm": 140.0,
  "elevation_m": 2205.0,
  "reported_water_depth": "NONE"
}
```

### Output Schema (`examples/response.json`)
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
    "water_depth": "NONE",
    "passability": "passable",
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
    "factors": {
      "slope": 0.6833,
      "tri": 0.865,
      "rain_1d": 0.6296,
      "rain_3d": 0.5856
    }
  },
  "modelVersion": "V1"
}
```

---

## 9. Performance & Backend Portability

- **Inference Latency:** `0.23 ms` per request (`4,366 queries/sec` single CPU core).
- **Vectorized Batch Scoring:** `13.3 Million points/sec` (100,000 points scored in `7.5 ms`).
- **Memory Footprint:** `< 25 MB` resident RAM.
- **Portability:** Mathematical formulations rely strictly on standard arithmetic (`min`, `max`, `clamp`, linear interpolation), allowing direct transcription to TypeScript/Node.js for serverless Lambda execution with zero heavy native dependencies.

---

## 10. Known Limitations & Data Requirements

1. **Topographic DEM Tile Coverage:** Local CartoDEM 30m tiles cover lower, foothill, and mid-altitude districts (Bilaspur 100%, Hamirpur 100%, Una 96.6%, Solan 53.2%, Mandi 48.8%, Kangra 23.3%). High-altitude alpine peaks in Kinnaur and Lahaul & Spiti require supplementary tiles in V1.1.
2. **External Flood Layer:** Statewide return-period flood inundation polygons remain unreleased nationally; the flood model evaluates geomorphic valley-pooling proxies and precipitation.
3. **IMD Spatial Grid:** Precipitation is drawn from the 0.25° (~27 km) IMD grid. Hyper-local convective cloudbursts between grid points are subject to spatial averaging.

---

## 11. Reproducibility Instructions

All data pipelines, correlation matrices, and model benchmarks are fully reproducible:
1. Re-run GIS pipeline: `python -m src.gis.run_gis_pipeline`
2. Re-run feature analysis & Parquet build: `python -m src.features.run_feature_analysis`
3. Re-run model validation & ROC curves: `python -m src.validation.model_validator`
4. Re-run computational benchmarks: `python -m src.utils.benchmark`
5. Run test suite: `python -m pytest`
