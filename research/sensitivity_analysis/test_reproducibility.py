"""Lightweight regression checks for generated sensitivity-analysis outputs."""
from __future__ import annotations
import csv, math
from pathlib import Path

from run_analysis import evaluate

ROOT = Path(__file__).parent

def rows(name):
    with (ROOT / name).open(newline="") as f:
        return list(csv.DictReader(f))

def check():
    feature = rows("feature_sensitivity.csv")
    assert len(feature) == 70
    missing = rows("missing_data.csv")
    all_rows = [r for r in missing if r["missing"] == "all"]
    assert len(all_rows) == 2
    expected = {"slope": None, "tri": None, "rain_1d": None, "rain_3d": None}
    for r in all_rows:
        out = evaluate(r["model"], expected["slope"], expected["tri"], expected["rain_1d"], expected["rain_3d"])
        assert float(r["confidence"]) == out["confidence"]
        assert float(r["score"]) == out["score"]
        assert r["band"] == out["band"]
        assert float(r["score"]) != float(next(x for x in missing if x["model"] == r["model"] and x["missing"] == "none")["score"])
    interactions = rows("interaction_thresholds.csv")
    assert len(interactions) == 12
    for r in interactions:
        for key in ["slope", "tri", "rainfall_1d", "rainfall_3d"]:
            assert key in r
        out = evaluate(r["model"], float(r["slope"]), float(r["tri"]), float(r["rainfall_1d"]), float(r["rainfall_3d"]))
        assert math.isclose(float(r["raw"]), out["raw"], rel_tol=0, abs_tol=1e-12)
        assert float(r["score"]) == out["score"]
        assert r["band"] == out["band"]
    weights = rows("weight_sensitivity.csv")
    for r in weights:
        vals = [float(r[f"w{i}"]) for i in range(1,5)]
        assert all(v >= 0 for v in vals)
        assert math.isclose(sum(vals), 1.0, rel_tol=0, abs_tol=1e-12)
    assert len(weights) == 8
    return "PASS"

if __name__ == "__main__":
    print(check())
