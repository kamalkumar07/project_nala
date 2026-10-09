# NALA — HIMACHAL PRADESH V1 RISK MODEL CONTRACT & SPECIFICATION

**Document Version:** 1.0.0  
**Status:** Approved Local Reference Implementation  
**Geographic Domain:** Himachal Pradesh (12 Administrative Districts)  
**Authors:** Pranad (AI/ML + GIS Engineering), Reetu (Mathematical Modeling & Validation)

---

### 1. Architectural Principles

1. **Hazard Decoupling:** Floods and Landslides are treated as physically distinct hazards. Combining them into an ambiguous blended score is explicitly forbidden due to contradictory physical drivers (e.g. slope).
2. **Deterministic & Interpretable:** The V1 reference implementation uses deterministic physical formulations with zero runtime stochasticity, allowing complete auditability, instant execution, and zero machine learning model drift.
3. **Decoupled Confidence:** Confidence is defined strictly by observational completeness and spatial-temporal validity, decoupled from the predicted risk magnitude.
4. **Calibrated Operational Bands:**
   - **LOW:** `0.00 – 0.34`
   - **MEDIUM:** `0.35 – 0.69`
   - **HIGH:** `0.70 – 1.00`

---

### 2. Standardized Output Schema

```json
{
  "location": {
    "latitude": 31.1048,
    "longitude": 77.1734,
    "district": "Shimla"
  },
  "flood": {
    "score": 0.18,
    "band": "LOW",
    "confidence": 1.0,
    "factors": {
      "rain_1d": 0.15,
      "rain_3d": 0.12,
      "valley_slope": 0.0,
      "floodplain_flatness": 0.0
    }
  },
  "landslide": {
    "score": 0.82,
    "band": "HIGH",
    "confidence": 1.0,
    "factors": {
      "slope": 0.85,
      "tri": 0.78,
      "rain_1d": 0.75,
      "rain_3d": 0.68
    }
  },
  "modelVersion": "V1"
}
```

---

### 3. Model Specifications

#### 3.1 Model A: Flood / Flash-Flood (`FloodRiskModel`)
- **Formula:**
  $$\text{Score}_{\text{flood}} = \min\left(1.0, \, 0.30 f_{\text{rain\_1d}} + 0.25 f_{\text{rain\_3d}} + 0.30 f_{\text{slope\_fl}} + 0.15 f_{\text{tri\_fl}} + \text{Amplification}\right)$$
- **Slope Inversion ($f_{\text{slope\_fl}}$):**
  - $\le 3^\circ \to 1.00 - 0.70$
  - $3^\circ - 8^\circ \to 0.70 - 0.25$
  - $8^\circ - 15^\circ \to 0.25 - 0.00$
  - $> 15^\circ \to 0.00$
- **Floodplain Flatness ($f_{\text{tri\_fl}}$):** $\text{clamp}_{0,1}(1.0 - \text{TRI} / 25.0)$
- **Amplification:** $+0.15 \times (f_{\text{slope\_fl}} \times f_{\text{rain\_1d}})$ if $\text{slope} \le 6^\circ$ and $\text{rain\_1d} \ge 64.4\text{ mm}$.

#### 3.2 Model B: Landslide (`LandslideRiskModel`)
- **Formula:**
  $$\text{Score}_{\text{landslide}} = \min\left(1.0, \, 0.35 f_{\text{slope\_ls}} + 0.20 f_{\text{tri\_ls}} + 0.25 f_{\text{rain\_1d}} + 0.20 f_{\text{rain\_3d}} + \text{Amplification}\right)$$
- **Geomorphological Slope ($f_{\text{slope\_ls}}$):**
  - $< 10^\circ \to 0.00 - 0.10$
  - $10^\circ - 20^\circ \to 0.10 - 0.35$
  - $20^\circ - 32^\circ \to 0.35 - 0.85$ (Critical Himalayan colluvial mantle threshold)
  - $32^\circ - 42^\circ \to 0.85 - 1.00$ (Peak failure frequency)
  - $\ge 45^\circ \to 0.80$ (Steep bedrock cliffs)
- **Topographic Ruggedness ($f_{\text{tri\_ls}}$):**
  - $\le 5\text{ m} \to 0.00 - 0.15$
  - $5 - 20\text{ m} \to 0.15 - 0.45$
  - $20 - 40\text{ m} \to 0.45 - 0.85$
  - $> 40\text{ m} \to 0.85 - 1.00$
- **Amplification:** $+0.12 \times (f_{\text{slope\_ls}} \times f_{\text{rain\_1d}})$ if $\text{slope} \ge 22^\circ$ and $\text{rain\_1d} \ge 64.4\text{ mm}$.
