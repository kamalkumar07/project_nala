# NALA — HIMACHAL PRADESH DISASTER INTELLIGENCE
## LOCAL DATASET INVENTORY

**Inventory Date:** 2026-10-08  
**Scope:** Local Datasets (`d:\projects\isro`) and Read-Only Reference Snapshot (`project_nala-kamal-devops.zip`)

---

### 1. Meteorological / Rainfall Datasets

#### 1.1 IMD Daily Gridded Rainfall Archive (1951–2025)
- **Path:** `all data/imdRainfall/IMD_Rainfall_Data/`
- **Filename(s):** `ind<YEAR>_rfp25.grd` (e.g., `ind2025_rfp25.grd`, `ind2023_rfp25.grd`)
- **Format:** Binary direct-access float32 (.grd)
- **File Count:** 73 files (1951 to 2025)
- **Size per File:** ~25.43 MB (non-leap: 365 days) / ~25.50 MB (leap: 366 days). Total: ~1.85 GB.
- **CRS:** Geographic WGS84 (EPSG:4326 grid representation)
- **Resolution:** 0.25° × 0.25° (~27 km grid cell)
- **Dimensions:** `(Days, 129, 135)` = `(365 or 366, Latitudes, Longitudes)`
- **Spatial Bounds:**
  - Latitude: 6.5°N to 38.5°N (129 points at 0.25° increments)
  - Longitude: 66.5°E to 100.0°E (135 points at 0.25° increments)
- **Bands:** Daily temporal slices (365 or 366 bands equivalent)
- **Data Type:** Float32 (little-endian)
- **NoData Value:** `-999.0`
- **Temporal Coverage:** 1951-01-01 to 2025-12-31 (continuous daily)
- **Coverage over Himachal:**
  - Full statewide coverage across all 12 districts (~14 × 15 grid points).
- **Verified Statistics (2025):**
  - Total observations: 6,356,475
  - Spatial NoData (-999): 4,544,615 (71.50%)
  - Valid observations: 1,811,860 (28.50%)
  - Zero rainfall: 1,259,972 (69.54% of valid)
  - Mean of valid: 3.474 mm
  - Max: 469.21 mm | P90: 10.01 mm | P95: 20.57 mm | P99: 54.08 mm
- **Flood Relevance:** **CRITICAL PRIMARY DRIVER**. Flash floods are triggered by 1-day extreme rainfall and sustained 3-day multi-day rainfall accumulation.
- **Landslide Relevance:** **CRITICAL PRIMARY TRIGGER**. Landslides in the Western Himalayas are predominantly triggered by pore-water pressure spikes from intense 1-day downpours and preceding 3-day soil saturation.

---

### 2. Digital Elevation Models (DEM) & Topography

#### 2.1 CartoDEM 30m Northern / Himachal Foothills & Valleys
- **Path:** `all data/imdRainfall/elevation/`
- **Format:** GeoTIFF (.tif)
- **Data Type:** Float32
- **CRS:** EPSG:4326 (WGS 84 geographic 2D)
- **Resolution:** 0.0002777777777778° (~30 meters at equator; ~26m zonal in HP)
- **NoData Value:** `-32768.0`
- **Tile Breakdown:**

| Tile Identifier | Latitude Range | Longitude Range | Dimensions | Min Elev (m) | Max Elev (m) | Mean Elev (m) | HP Districts Intersected |
|---|---|---|---|---|---|---|---|
| `P5_PAN_CD_N30_000_E075_000` | 30.00°–31.00°N | 75.00°–76.00°E | 3600 × 3600 | 152.2 m | 233.7 m | 180.1 m | Border plains / Punjab |
| `P5_PAN_CD_N30_000_E076_000` | 30.00°–31.00°N | 76.00°–77.00°E | 3600 × 3600 | 179.2 m | 1,881.6 m | 247.0 m | Solan (18.2%), Sirmaur |
| `P5_PAN_CD_N31_000_E075_000` | 31.00°–32.00°N | 75.00°–76.00°E | 3600 × 3600 | 150.9 m | 683.6 m | 207.9 m | Una (3.4%), Kangra (2.5%) |
| `P5_PAN_CD_N31_000_E076_000` | 31.00°–32.00°N | 76.00°–77.00°E | 3600 × 3600 | 93.7 m | 3,503.7 m | 655.8 m | Bilaspur (100%), Hamirpur (100%), Una (96.6%), Solan (53.2%), Mandi (48.8%), Kangra (23.3%) |

- **Suspicious Negative Elevation Audit:**
  - Evaluated on all 4 tiles: **0.00% negative elevation**. All values are valid terrestrial terrain elevations.
- **Coverage Gap:** Upper Himalayan high-altitude alpine terrain (>3,500m in Kinnaur, Lahaul & Spiti, northern Kullu/Chamba) tiles are not present locally.
- **Flood Relevance:** **HIGH**. Elevation defines gravitational flow accumulation, low-lying drainage basins, and valley flash-flood channels.
- **Landslide Relevance:** **HIGH**. Base layer for computing Slope and Terrain Ruggedness Index (TRI).

---

### 3. Administrative Boundaries

#### 3.1 Himachal Pradesh District Boundaries
- **Source:** Reference snapshot (`project_nala-kamal-devops.zip` -> `infrastructure/data/himachal/boundaries/districts.geojson`)
- **Format:** GeoJSON (FeatureCollection)
- **Features:** 12 districts:
  `Bilaspur`, `Chamba`, `Hamirpur`, `Kangra`, `Kinnaur`, `Kullu`, `Lahaul and Spiti`, `Mandi`, `Shimla`, `Sirmaur`, `Solan`, `Una`
- **CRS:** EPSG:4326
- **Attributes:** `district`, `district_lgd`, `district_code`, `state`, `state_lgd`
- **Flood & Landslide Relevance:** **CRITICAL**. Defines spatial aggregation, regional policy routing, and administrative reporting.

#### 3.2 Himachal Pradesh State Boundary
- **Source:** Reference snapshot (`project_nala-kamal-devops.zip` -> `infrastructure/data/himachal/boundaries/state.geojson`)
- **Format:** GeoJSON (FeatureCollection, 1 feature)
- **CRS:** EPSG:4326
- **Bounds:** `[75.5946, 30.3773, 79.0089, 33.2564]`
- **Flood & Landslide Relevance:** Geographic boundary clipping and state-level masking.

---

### 4. Hazard & Ground Truth Event Datasets

#### 4.1 Himachal 2023 Monsoon Landslide Training Points
- **Source:** Reference snapshot (`project_nala-kamal-devops.zip` -> `infrastructure/data/himachal/events/landslide-training-points-2023.csv`)
- **Format:** CSV
- **Rows:** 3,147 verified landslide occurrence points
- **Columns:**
  - `latitude` (30.81° to 31.15°N)
  - `longitude` (76.91° to 77.23°E)
  - `elevation_m` (688.2 m to 2,158.9 m)
  - `slope_deg` (0.50° to 56.49°)
  - `tri_m` (3.87 m to 104.15 m)
  - `max_daily_rainfall_2023_mm` (74.27 mm to 169.65 mm)
  - `landslide` (Binary label: 1 for all rows)
  - `rainfall_available` (1: 2,714 rows, 0: 433 rows)
  - `area` (landslide polygon area)
  - `category` (Natural: 1,729, Anthropogenic: 1,418)
- **Flood Relevance:** Informative for co-occurring debris flow / landslide damming risks.
- **Landslide Relevance:** **GOLD STANDARD GROUND TRUTH**. Provides empirical feature distributions of real Himalayan slope failures.

#### 4.2 Shimla Landslide Polygons & Points
- **Source:** Reference snapshot (`project_nala-kamal-devops.zip` -> `infrastructure/data/himachal/hazards/landslides/landslides-shimla-himachal.geojson` & `...points-himachal.geojson`)
- **Format:** GeoJSON (3,147 features)
- **CRS:** EPSG:4326
- **Landslide Relevance:** Spatial polygon representation corresponding to the 2023 landslide training points.

#### 4.3 Flood Hazard Zonation Layer
- **Status:** `BLOCKED — REQUIRED INPUT NOT AVAILABLE`
- **Notes:** No official flood hazard zonation map (e.g. CWC return-period flood zones or NDMA flood polygons) is currently present in the local repository or reference snapshot.
- **Engineering Strategy:** For Flood V1, we compute hydrologic terrain susceptibility proxies (low-elevation pooling, low slope valleys, convergence) combined with 1-day and 3-day precipitation accumulations.
