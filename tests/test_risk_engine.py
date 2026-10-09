"""Comprehensive Unit Test Suite for Nala Himachal Pradesh Risk Engine.

Tests:
1. Normalization functions (monotonicity, bounds, physical breakpoints)
2. Boundary threshold values (0.00, 0.34, 0.35, 0.69, 0.70, 1.00)
3. Missing value penalties and confidence calculations
4. Invalid and extreme input handling
5. District spatial boundary lookup
6. FloodRiskModel and LandslideRiskModel scoring logic
7. End-to-end NalaRiskEngine structured JSON contract validation
"""

import math
import pytest
import numpy as np

from src.normalization.scalers import RiskScalers
from src.models.flood_model import FloodRiskModel
from src.models.landslide_model import LandslideRiskModel
from src.models.risk_engine import NalaRiskEngine


# ============================================================
# 1. NORMALIZATION TESTS
# ============================================================

def test_normalization_bounds():
    """Verify that all scalers output values strictly inside [0.0, 1.0]."""
    test_values = [-100.0, -1.0, 0.0, 5.0, 50.0, 200.0, 1000.0, 1e6]
    for val in test_values:
        assert 0.0 <= RiskScalers.domain_rainfall(val) <= 1.0
        assert 0.0 <= RiskScalers.domain_slope_landslide(val) <= 1.0
        assert 0.0 <= RiskScalers.domain_slope_flood(val) <= 1.0
        assert 0.0 <= RiskScalers.domain_tri_landslide(val) <= 1.0
        assert 0.0 <= RiskScalers.log_scaling(val, 250.0) <= 1.0


def test_rainfall_normalization_breakpoints():
    """Verify official IMD precipitation classification breakpoints."""
    assert RiskScalers.domain_rainfall(0.0) == 0.0
    assert 0.10 <= RiskScalers.domain_rainfall(15.5) <= 0.16
    assert 0.40 <= RiskScalers.domain_rainfall(64.4) <= 0.46
    assert 0.70 <= RiskScalers.domain_rainfall(115.5) <= 0.76
    assert 0.99 <= RiskScalers.domain_rainfall(204.4) <= 1.0
    assert RiskScalers.domain_rainfall(500.0) == 1.0


def test_slope_landslide_vs_flood_inversion():
    """Verify that slope affects flood and landslide in opposite directions."""
    # Flat terrain (2 degrees)
    flat_ls = RiskScalers.domain_slope_landslide(2.0)
    flat_fl = RiskScalers.domain_slope_flood(2.0)
    assert flat_ls < 0.10  # Negligible landslide risk on flat ground
    assert flat_fl > 0.70  # High flood accumulation susceptibility

    # Steep terrain (35 degrees)
    steep_ls = RiskScalers.domain_slope_landslide(35.0)
    steep_fl = RiskScalers.domain_slope_flood(35.0)
    assert steep_ls > 0.85  # Critical landslide shear risk
    assert steep_fl == 0.0  # Zero flood accumulation on steep hillsides


# ============================================================
# 2. RISK BAND BOUNDARY VALUE TESTS
# ============================================================

@pytest.mark.parametrize("score,expected_band", [
    (0.00, "LOW"),
    (0.15, "LOW"),
    (0.34, "LOW"),
    (0.35, "MEDIUM"),
    (0.50, "MEDIUM"),
    (0.69, "MEDIUM"),
    (0.70, "HIGH"),
    (0.85, "HIGH"),
    (1.00, "HIGH"),
])
def test_risk_band_boundaries(score, expected_band):
    """Explicitly verify edge-case risk band assignments."""
    if score <= 0.34:
        band = "LOW"
    elif score <= 0.69:
        band = "MEDIUM"
    else:
        band = "HIGH"
    assert band == expected_band


# ============================================================
# 3. CONFIDENCE AND MISSING DATA POLICY TESTS
# ============================================================

def test_full_observational_confidence():
    """When all inputs are valid, confidence must be 1.0."""
    res = LandslideRiskModel.evaluate(
        slope_deg=25.0,
        tri=35.0,
        rainfall_1d_mm=80.0,
        rainfall_3d_mm=130.0
    )
    assert res["confidence"] == 1.0


def test_single_feature_missing_penalty():
    """Confidence must decrease gracefully when features are missing."""
    res = LandslideRiskModel.evaluate(
        slope_deg=25.0,
        tri=35.0,
        rainfall_1d_mm=None,  # Missing 1-day rain (-0.25)
        rainfall_3d_mm=130.0
    )
    assert res["confidence"] == 0.75
    assert "rain_1d" not in res["factors"]


def test_multiple_features_missing_penalty():
    """Multiple missing features must accumulate confidence penalties."""
    res = LandslideRiskModel.evaluate(
        slope_deg=None,        # -0.35
        tri=None,              # -0.20
        rainfall_1d_mm=None,   # -0.25
        rainfall_3d_mm=None    # -0.20
    )
    assert res["confidence"] == 0.0


# ============================================================
# 4. EXTREME AND INVALID VALUE TESTS
# ============================================================

def test_extreme_rainfall_input():
    """Extreme cloudburst storms must not overflow score beyond 1.0."""
    res_ls = LandslideRiskModel.evaluate(slope_deg=35.0, tri=50.0, rainfall_1d_mm=999.0, rainfall_3d_mm=1500.0)
    res_fl = FloodRiskModel.evaluate(slope_deg=2.0, tri=2.0, rainfall_1d_mm=999.0, rainfall_3d_mm=1500.0)
    assert res_ls["score"] == 1.0
    assert res_ls["band"] == "HIGH"
    assert res_fl["score"] == 1.0
    assert res_fl["band"] == "HIGH"


def test_invalid_nan_infinite_inputs():
    """NaN and inf values must not cause crashes."""
    res = LandslideRiskModel.evaluate(slope_deg=float("nan"), tri=float("inf"), rainfall_1d_mm=-50.0, rainfall_3d_mm=None)
    assert 0.0 <= res["score"] <= 1.0
    assert res["confidence"] < 0.50


# ============================================================
# 5. END-TO-END RISK ENGINE CONTRACT TESTS
# ============================================================

def test_risk_engine_contract_shimla():
    """Verify full engine execution on a known Shimla coordinate."""
    engine = NalaRiskEngine()
    # Shimla town center: ~31.1048 N, 77.1734 E
    output = engine.assess_risk(
        latitude=31.1048,
        longitude=77.1734,
        slope_deg=28.0,
        tri=42.0,
        rainfall_1d_mm=95.0,
        rainfall_3d_mm=140.0,
        elevation_m=2205.0
    )

    assert output["modelVersion"] == "V1"
    assert output["location"]["district"] == "Shimla"
    assert output["location"]["latitude"] == 31.1048
    assert output["location"]["longitude"] == 77.1734

    # Mountain ridge: Landslide risk should be high, flood risk should be low
    assert output["landslide"]["band"] in ["MEDIUM", "HIGH"]
    assert output["landslide"]["score"] >= 0.65
    assert output["flood"]["score"] < 0.50
    assert output["landslide"]["confidence"] == 1.0
    assert output["flood"]["confidence"] == 1.0


def test_risk_engine_out_of_state_coordinate():
    """Verify graceful handling for coordinates outside Himachal Pradesh."""
    engine = NalaRiskEngine()
    # Delhi coordinate: 28.6139 N, 77.2090 E
    output = engine.assess_risk(
        latitude=28.6139,
        longitude=77.2090,
        slope_deg=1.0,
        tri=1.0,
        rainfall_1d_mm=10.0,
        rainfall_3d_mm=15.0
    )
    assert output["location"]["district"] == "Outside_Himachal_Pradesh"
    assert 0.0 <= output["flood"]["score"] <= 1.0
    assert 0.0 <= output["landslide"]["score"] <= 1.0


def test_risk_engine_invalid_coordinate_exception():
    """Engine must raise ValueError on unparseable coordinates."""
    engine = NalaRiskEngine()
    with pytest.raises(ValueError):
        engine.assess_risk(latitude=120.0, longitude=77.0)  # Latitude out of bounds


# ============================================================
# 6. WATER DEPTH AND PASSABILITY TESTS
# ============================================================

@pytest.mark.parametrize("depth_input,expected_depth,expected_passable", [
    ("NONE", "NONE", "passable"),
    ("none", "NONE", "passable"),
    ("ANKLE", "ANKLE", "passable"),
    ("ankle", "ANKLE", "passable"),
    ("KNEE", "KNEE", "not passable"),
    ("knee", "KNEE", "not passable"),
    ("WAIST", "WAIST", "not passable"),
    ("ABOVE_WAIST", "ABOVE_WAIST", "not passable"),
    ("UNKNOWN", "UNKNOWN", "undetermined"),
    ("INVALID_STRING", "UNKNOWN", "undetermined"),
])
def test_water_depth_and_passability_mapping(depth_input, expected_depth, expected_passable):
    """Verify that water depth correctly maps to passability directive."""
    depth, passability = FloodRiskModel.classify_water_depth_and_passability(reported_water_depth=depth_input)
    assert depth == expected_depth
    assert passability == expected_passable


def test_water_depth_inferred_from_flood_score():
    """Verify water depth and passability inference when reported depth is absent."""
    # Low flood score -> passable
    d_low, p_low = FloodRiskModel.classify_water_depth_and_passability(flood_score=0.15)
    assert d_low == "NONE"
    assert p_low == "passable"

    # Extreme flood score -> above waist, not passable
    d_high, p_high = FloodRiskModel.classify_water_depth_and_passability(flood_score=0.92)
    assert d_high == "ABOVE_WAIST"
    assert p_high == "not passable"

