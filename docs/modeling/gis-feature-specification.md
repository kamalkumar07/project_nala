# Himachal GIS feature specification

Status: inventory and conceptual specification. It does not claim predictive importance and does not define production preprocessing.

## Geography and available foundation

The modeling geography is Himachal Pradesh. The currently available GIS foundation is:

- Copernicus GLO-30 DEM at approximately 30 m;
- projected DEM;
- elevation;
- slope;
- aspect;
- Terrain Ruggedness Index (TRI);
- Himachal Pradesh state boundary;
- 12 district boundaries.

These layers provide spatial context and candidate explanatory features. Availability does not establish that a feature is predictive, sufficient, or appropriate for every hazard.

## Possible feature meaning

| Feature/layer | Possible meaning | Constraints and open decisions |
|---|---|---|
| GLO-30 DEM | Elevation surface and source terrain context | Vertical datum, coverage, version, voids, and quality: **PENDING EVIDENCE** |
| Projected DEM | DEM in a projected coordinate system for spatial operations | CRS, transformation method, distortion, and relationship to source DEM: **PENDING EVIDENCE** |
| Elevation | Absolute or local terrain height | Vertical reference, neighborhood definition, and hazard-specific usefulness: **PENDING EVIDENCE** |
| Slope | Rate of terrain change; potentially relevant to runoff and slope instability | Derivation, units, resampling, scale, and predictive usefulness: **PENDING EVIDENCE** |
| Aspect | Directional orientation of terrain | Encoding of circular direction, flat-slope handling, scale, and usefulness: **PENDING EVIDENCE** |
| TRI | Local terrain ruggedness/roughness context | Formula/window, scale, units, and usefulness: **PENDING EVIDENCE** |
| State boundary | Himachal Pradesh geographic scope and clipping/coverage check | Boundary version and treatment of edge cells: **PENDING EVIDENCE** |
| District boundaries | District assignment and district aggregation | Version, identifiers, edge cases, and aggregation rule: **PENDING EVIDENCE** |

Possible interpretations are hypotheses. No feature is assigned a direction, weight, threshold, or predictive ranking here.

## CRS, resolution, provenance, and extraction requirements

Every GIS-derived value should retain or be traceable to:

- source dataset and version/date;
- CRS, including horizontal and vertical reference where applicable;
- nominal and effective resolution;
- raster extent, nodata/void handling, and resampling method;
- derivation method and parameters for projected DEM, elevation, slope, aspect, and TRI;
- extraction location, spatial support, and boundary version;
- processing timestamp and methodology version.

Only the approximate GLO-30 resolution and the named layer inventory are currently known from project context. Exact CRS, datum, versions, derivation parameters, nodata handling, resampling, and extraction conventions are **PENDING EVIDENCE** and must be confirmed by Kamal/Pranad before implementation.

Coordinate-to-raster extraction, hotspot aggregation, district aggregation, and cross-boundary behavior are **PENDING EVIDENCE**. No hotspot radius, grid size, neighborhood/window, normalization constant, or rainfall window is specified.

## Hazard use and limits

Terrain features may contribute to flood, flash-flood, or landslide components differently. Static GIS context must remain distinguishable from current trigger evidence such as rainfall and citizen observations. Flood/flash-flood and landslide hazard or susceptibility layers are additional datasets pending availability and metadata review.

Feature usefulness, transformations, interactions, scale selection, missing-data behavior, and hazard-specific inclusion are **PENDING EVIDENCE** from EDA, labels, and validation. The presence of a layer is not evidence of predictive importance.
