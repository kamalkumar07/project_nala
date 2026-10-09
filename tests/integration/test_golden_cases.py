"""Integration Golden Test Cases for Nala Himachal Pradesh Risk Engine V1.

Verifies that the reference Python implementation matches the frozen
golden reference outputs in integration/golden_cases.json exactly.
"""

from __future__ import annotations
import json
from pathlib import Path
import pytest

from src.models.risk_engine import NalaRiskEngine


@pytest.fixture(scope="module")
def golden_cases():
    golden_path = Path("integration/golden_cases.json")
    assert golden_path.exists(), "integration/golden_cases.json must exist"
    with open(golden_path, "r", encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture(scope="module")
def engine():
    return NalaRiskEngine()


def test_golden_cases_count(golden_cases):
    """Verify that all 12 golden test cases are present."""
    assert len(golden_cases) == 12


def test_golden_cases_execution(golden_cases, engine):
    """Verify that each golden test input matches the frozen expected output exactly."""
    for case in golden_cases:
        case_id = case["id"]
        inp = case["input"]
        expected = case["expected_output"]

        actual = engine.assess_risk(**inp)

        # 1. Location
        assert actual["location"]["district"] == expected["location"]["district"], f"District mismatch in {case_id}"
        assert actual["location"]["latitude"] == expected["location"]["latitude"], f"Latitude mismatch in {case_id}"
        assert actual["location"]["longitude"] == expected["location"]["longitude"], f"Longitude mismatch in {case_id}"

        # 2. Flood
        assert actual["flood"]["score"] == expected["flood"]["score"], f"Flood score mismatch in {case_id}"
        assert actual["flood"]["band"] == expected["flood"]["band"], f"Flood band mismatch in {case_id}"
        assert actual["flood"]["confidence"] == expected["flood"]["confidence"], f"Flood confidence mismatch in {case_id}"

        # 3. Landslide
        assert actual["landslide"]["score"] == expected["landslide"]["score"], f"Landslide score mismatch in {case_id}"
        assert actual["landslide"]["band"] == expected["landslide"]["band"], f"Landslide band mismatch in {case_id}"
        assert actual["landslide"]["confidence"] == expected["landslide"]["confidence"], f"Landslide confidence mismatch in {case_id}"

        # 4. Model Version
        assert actual["modelVersion"] == "V1"


def test_golden_case_invalid_coordinate(engine):
    """Test that out-of-range coordinates raise ValueError."""
    with pytest.raises(ValueError):
        engine.assess_risk(latitude=120.0, longitude=77.0)
