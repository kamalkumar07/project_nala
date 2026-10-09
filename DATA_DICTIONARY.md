# NALA — HIMACHAL PRADESH DATA DICTIONARY

| Feature Name | Description | Source | Unit | Resolution | CRS | Valid Min | Valid Max | Missing % | Processing Method |
|---|---|---|---|---|---|---|---|---|---|
| `location_id` | Unique spatial observation identifier | Generated identifier | string | point | EPSG:4326 | N/A | N/A | 0.0% | Deterministic indexing |
| `latitude` | Latitude of point in decimal degrees | WGS84 Coordinates | degrees_north | point | EPSG:4326 | 30.3773 | 33.2564 | 0.0% | Direct lookup |
| `longitude` | Longitude of point in decimal degrees | WGS84 Coordinates | degrees_east | point | EPSG:4326 | 75.5946 | 79.0089 | 0.0% | Direct lookup |
| `district` | Administrative district name (12 official districts) | Himachal Pradesh District Boundaries (districts.geojson) | categorical | polygon | EPSG:4326 | N/A | N/A | 0.0% | Point-in-polygon STRtree spatial query |
| `elevation_m` | Terrain elevation above mean sea level | ISRO CartoDEM 30m Tiles | meters | 30m | EPSG:4326 | 93.73 | 3503.67 | 0.0% | Bilinear/nearest sampling from mosaic |
| `slope_deg` | Topographic slope in degrees via Horn's formula | Derived from CartoDEM 30m | degrees | 30m | EPSG:4326 | 0.0 | 76.91 | 0.05% | Vectorized 3x3 moving window with latitude meter correction |
| `tri` | Terrain Ruggedness Index via Riley et al. formula | Derived from CartoDEM 30m | meters | 30m | EPSG:4326 | 0.02 | 327.35 | 0.05% | Vectorized 3x3 root sum of squared elevation differences |
| `rainfall_1d_mm` | Daily precipitation accumulation | IMD 0.25° Gridded Daily Rainfall | mm | 0.25 deg (~27km) | EPSG:4326 | 0.0 | 283.01 | 2.38% | IMD binary grid extraction; missing cells preserved as NaN |
| `rainfall_3d_mm` | 3-day rolling antecedent precipitation accumulation | IMD 0.25° Gridded Daily Rainfall | mm | 0.25 deg (~27km) | EPSG:4326 | 0.0 | 602.23 | 2.92% | Sum of days t, t-1, t-2 with strict valid-window requirement |
| `hazard_label` | Binary ground-truth failure indicator (1 = verified landslide, 0 = stable control) | 2023 Monsoon Ground Truth Landslides + Stratified Controls | binary | event point | EPSG:4326 | 0 | 1 | 0.0% | Empirical survey linkage |