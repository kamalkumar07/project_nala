# NALA RISK ENGINE V1 — BACKEND INTEGRATION CHECKLIST

**Target:** Cloud / Backend / API Implementation Team (Kamal Kumar & Team)  
**Contract Version:** `V1`  
**Target Geography:** Himachal Pradesh  

Use this checklist during backend integration to verify that the deployed API service matches the frozen local reference engine specifications exactly.

---

### 1. Contract Compliance
- [ ] **Flood Contract Implemented:** Endpoints adhere to `contracts/flood_v1_contract.json`.
- [ ] **Landslide Contract Implemented:** Endpoints adhere to `contracts/landslide_v1_contract.json`.
- [ ] **Decoupled Risk Output Schema:** The API response contains both `flood` and `landslide` objects independently.
- [ ] **Model Version:** Output explicitly includes `"modelVersion": "V1"`.

### 2. Input Validation
- [ ] **Coordinates Validated:** `latitude` and `longitude` are required float fields bounded by `[-90.0, 90.0]` and `[-180.0, 180.0]`.
- [ ] **Himachal Scope Resolution:** Valid coordinates inside the state resolve to one of the 12 administrative districts; out-of-state coordinates resolve to `"Outside_Himachal_Pradesh"`.
- [ ] **Numeric Ranges Validated:** Unrealistic values (e.g. `rainfall < 0`, `slope < 0`) are sanitized or rejected.
- [ ] **Missing Fields Handled:** `None` / `null` values for optional fields (`slope_deg`, `tri`, `rainfall_1d_mm`, `rainfall_3d_mm`, `elevation_m`) trigger neutral fallbacks rather than crashing.

### 3. Model Physics & Logic
- [ ] **Hazard Separation:** Slope inversely drives flood risk ($\le 3^\circ$ maximum) but directly drives landslide risk ($20^\circ - 42^\circ$ maximum).
- [ ] **Piecewise Normalization:** IMD precipitation breakpoints ($15.5\text{ mm}$, $64.4\text{ mm}$, $115.5\text{ mm}$, $204.4\text{ mm}$) and geomorphic slope intervals match `src/normalization/scalers.py`.
- [ ] **Weights Verified:**
  - Flood: `rain_1d: 0.30`, `rain_3d: 0.25`, `valley_slope: 0.30`, `floodplain_tri: 0.15`.
  - Landslide: `slope: 0.35`, `tri: 0.20`, `rain_1d: 0.25`, `rain_3d: 0.20`.
- [ ] **Nonlinear Amplification Rules:**
  - Flood: $+0.15 \times (f_{\text{slope}} \times f_{\text{rain}})$ if $\text{slope} \le 6.0^\circ$ and $\text{rain\_1d} \ge 64.4\text{ mm}$.
  - Landslide: $+0.12 \times (f_{\text{slope}} \times f_{\text{rain}})$ if $\text{slope} \ge 22.0^\circ$ and $\text{rain\_1d} \ge 64.4\text{ mm}$.
- [ ] **Decoupled Confidence:** Evaluated strictly on observational data completeness ($1.0 - \sum \text{penalties}$).
- [ ] **Risk Bands:** Strictly assigned as `LOW (0.00 - 0.34)`, `MEDIUM (0.35 - 0.69)`, `HIGH (0.70 - 1.00)`.

### 4. Error Handling
- [ ] **Invalid Coordinates:** Malformed numbers or out-of-globe coordinates return HTTP 400 with descriptive error.
- [ ] **Missing Required Fields:** Requests missing `latitude` or `longitude` return HTTP 400.
- [ ] **NaN / Infinite Inputs:** Handled without uncaught server exceptions.
- [ ] **Unknown District:** Handled gracefully without database or spatial index failure.

### 5. Verification Against Golden Test Cases
- [ ] **12 Golden Cases Executed:** Test payload from `integration/golden_cases.json` executed against backend service.
- [ ] **Numerical Outputs Match:** Output scores match golden reference values within $\pm 0.01$ rounding tolerance.
- [ ] **Risk Bands Match:** Band assignments (`LOW`, `MEDIUM`, `HIGH`) match golden reference.
- [ ] **Confidence Matches:** Confidence scores match golden reference.

### 6. Performance & Footprint
- [ ] **Inference Latency Checked:** Microservice response time $< 5\text{ ms}$ excluding network overhead.
- [ ] **Memory Consumption Checked:** Lambda memory allocated at standard 128 MB or 256 MB is sufficient ($< 25\text{ MB}$ used).
- [ ] **Cold Start Optimized:** Zero heavy machine learning frameworks (no TensorFlow, PyTorch) required at inference time.
