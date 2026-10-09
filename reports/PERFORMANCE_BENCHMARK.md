# PERFORMANCE AND COMPUTATIONAL BENCHMARK REPORT

**Project:** Nala Disaster Intelligence (Himachal Pradesh V1 Risk Engine)  
**Date:** 2026-10-08  
**Architecture:** Python 3.13 / NumPy 2.5 Vectorized / Rasterio Windowed  

---

### 1. Latency & Throughput Benchmarks

| Component | Benchmark Metric | Result | Operational Assessment |
|---|---|---|---|
| **Single-Point Inference** | Latency per query | **0.22906 ms** | Sub-millisecond; easily runs inside standard 128MB AWS Lambda without timeout. |
| **Single-Point Inference** | Throughput | **4,366 queries/sec** | Single CPU core handles massive real-time user request spikes. |
| **Vectorized Batch Scoring** | Throughput | **13,308,668 points/sec** | Can score 100,000 spatial grid cells across entire state in **7.5 ms**. |
| **Topographic Derivative Engine** | Slope + TRI Generation | **10,100,887 pixels/sec** | Fast raster preprocessing; can re-generate derived layers in seconds. |

### 2. Storage & Memory Footprint

| Layer / Artifact | Storage Format | Size |
|---|---|---|
| Himachal Districts (`districts.geojson`) | GeoJSON | 4.17 MB |
| 2023 Ground Truth (`landslide_training_points_2023.csv`) | CSV | 0.39 MB |
| Himachal DEM Mosaic (`elevation_hp_mosaic.tif`) | GeoTIFF (Deflate) | 162.49 MB |
| Slope Raster (`slope_hp_mosaic.tif`) | GeoTIFF (Deflate) | 178.72 MB |
| TRI Raster (`tri_hp_mosaic.tif`) | GeoTIFF (Deflate) | 177.86 MB |
| Landslide Feature Matrix (`landslide_features.parquet`) | Apache Parquet | 0.36 MB |
| Flood Feature Matrix (`flood_features.parquet`) | Apache Parquet | 0.04 MB |

### 3. Optimization Summary

1. **NumPy Vectorization**: Avoided nested Python pixel loops. Array slicing for 3x3 moving window provides ~50x speedup over iterative methods.
2. **Deflate Raster Compression**: Compressed GeoTIFF mosaics reduce storage by >60% while retaining instant windowed random access.
3. **Parquet Columnar Intermediate**: Feature matrices load in <10ms with zero memory bloat compared to uncompressed CSVs.
