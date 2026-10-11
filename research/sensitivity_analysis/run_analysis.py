"""Deterministic analytical replica of Pranad's committed Python formulas.

Source: origin/feature/nala-ai-ml-v1 at the commit recorded in config.json.
This is an analysis adapter, not the canonical production Risk Engine.
It uses only the Python standard library so the workflow is lightweight.
"""
from __future__ import annotations
import csv, json, math, subprocess
from pathlib import Path

ROOT = Path(__file__).parent
CFG = json.loads((ROOT / "config.json").read_text())

def clamp(x): return max(0.0, min(1.0, x))
def interp(x, points):
    x = max(0.0, x)
    if x >= points[-1][0]: return points[-1][1]
    for (x0,y0),(x1,y1) in zip(points, points[1:]):
        if x <= x1:
            return y0 + (x-x0)*(y1-y0)/(x1-x0)
    return points[-1][1]
def rain(x): return interp(x, CFG["rainfall_breakpoints"])
def slope_flood(x): return interp(x, [(0,1),(3,.70),(8,.25),(15,0)]) if x is not None else .20
def slope_ls(x): return interp(x, [(0,0),(10,.10),(20,.35),(32,.85),(42,1),(60,.80)]) if x is not None else .20
def tri_ls(x): return interp(x, [(0,0),(5,.15),(20,.45),(40,.85),(60,1)]) if x is not None else .20
def valid(x): return x is not None and math.isfinite(x) and x >= 0

def evaluate(kind, slope, tri, r1, r3):
    miss = {"slope": not valid(slope), "tri": not valid(tri), "rain_1d": not valid(r1), "rain_3d": not valid(r3)}
    if kind == "flood":
        fs = slope_flood(slope) if miss["slope"] is False else .20
        ft = clamp(1 - tri/25) if not miss["tri"] else .20
        f1 = rain(r1) if not miss["rain_1d"] else 0.0
        f3 = rain(r3/1.6) if not miss["rain_3d"] else 0.0
        raw = .30*f1 + .25*f3 + .30*fs + .15*ft
        boost = .15*fs*f1 if slope is not None and slope <= 6 and r1 is not None and r1 >= 64.4 else 0.0
        conf = clamp(1-.30*miss["slope"]-.15*miss["tri"]-.30*miss["rain_1d"]-.25*miss["rain_3d"])
    else:
        fs = slope_ls(slope) if not miss["slope"] else .20
        ft = tri_ls(tri) if not miss["tri"] else .20
        f1 = rain(r1) if not miss["rain_1d"] else 0.0
        f3 = rain(r3/1.6) if not miss["rain_3d"] else 0.0
        raw = .35*fs + .20*ft + .25*f1 + .20*f3
        boost = .12*fs*f1 if slope is not None and slope >= 22 and r1 is not None and r1 >= 64.4 else 0.0
        conf = clamp(1-.35*miss["slope"]-.20*miss["tri"]-.25*miss["rain_1d"]-.20*miss["rain_3d"])
    raw += boost
    score = clamp(raw)
    band = "LOW" if score <= .34 else "MEDIUM" if score <= .69 else "HIGH"
    return {"raw": score, "score": round(score,2), "band": band, "confidence": round(conf,2), "boost": boost}

def write_csv(name, rows, fields):
    with (ROOT/name).open("w", newline="") as f:
        w=csv.DictWriter(f, fieldnames=fields); w.writeheader(); w.writerows(rows)

def svg_line(name, rows, xkey, ykey, title):
    W,H=760,430; ml,mt,mr,mb=70,35,25,55; pw,ph=W-ml-mr,H-mt-mb
    xs=[float(r[xkey]) for r in rows]; ys=[float(r[ykey]) for r in rows]; xmin,xmax=min(xs),max(xs); ymin,ymax=0,1
    def px(x): return ml+(x-xmin)/(xmax-xmin or 1)*pw
    def py(y): return mt+(1-y)*ph
    pts=' '.join(f'{px(x):.1f},{py(y):.1f}' for x,y in zip(xs,ys))
    lines=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}"><rect width="100%" height="100%" fill="white"/>',f'<text x="{W/2}" y="22" text-anchor="middle" font-size="16">{title}</text>',f'<line x1="{ml}" y1="{mt}" x2="{ml}" y2="{mt+ph}" stroke="black"/><line x1="{ml}" y1="{mt+ph}" x2="{ml+pw}" y2="{mt+ph}" stroke="black"/>',f'<polyline points="{pts}" fill="none" stroke="#1f77b4" stroke-width="2"/>']
    for y in [0,.34,.69,1]: lines.append(f'<line x1="{ml}" y1="{py(y)}" x2="{ml+pw}" y2="{py(y)}" stroke="#cccccc" stroke-dasharray="4,4"/><text x="{ml-8}" y="{py(y)+4}" text-anchor="end" font-size="11">{y:.2f}</text>')
    lines += [f'<text x="{W/2}" y="{H-10}" text-anchor="middle" font-size="12">{xkey}</text>',f'<text transform="translate(15,{H/2}) rotate(-90)" text-anchor="middle" font-size="12">{ykey}</text>','</svg>']
    (ROOT/name).write_text('\n'.join(lines))

def main():
    base={"slope":25.0,"tri":35.0,"rain_1d":50.0,"rain_3d":80.0}
    features={"rain_1d": [0,15.5,30,64.4,80,115.5,150,204.4,250], "rain_3d":[0,24.8,48.9,103.04,128,184.8,240,327.04,400], "slope":[0,3,6,10,20,22,25,32,42,60], "tri":[0,5,20,35,40,60,100]}
    rows=[]
    for kind in ["flood","landslide"]:
      for feat, vals in features.items():
       for v in vals:
        p=base.copy(); p[feat]=v; out=evaluate(kind,p["slope"],p["tri"],p["rain_1d"],p["rain_3d"]); rows.append({"model":kind,"feature":feat,"value":v,**out})
    write_csv("feature_sensitivity.csv",rows,["model","feature","value","raw","score","band","confidence","boost"])
    for kind in ["flood","landslide"]:
      for feat, vals in features.items():
        rr=[r for r in rows if r["model"]==kind and r["feature"]==feat]
        svg_line(f"{kind}_{feat}.svg",rr,"value","raw",f"{kind}: {feat} sensitivity")
    thresholds=[]
    threshold_cases=[
      ("flood","slope",[5.999999,6,6.000001],{"rain_1d":80.0}),
      ("flood","rain_1d",[64.399999,64.4,64.400001],{"slope":2.0}),
      ("landslide","slope",[21.999999,22,22.000001],{"rain_1d":80.0}),
      ("landslide","rain_1d",[64.399999,64.4,64.400001],{"slope":30.0})]
    for kind, feature, vals, overrides in threshold_cases:
      for v in vals:
       p=base.copy(); p.update(overrides); p[feature]=v; o=evaluate(kind,p["slope"],p["tri"],p["rain_1d"],p["rain_3d"]); thresholds.append({"model":kind,"feature":feature,"value":v,"slope":p["slope"],"tri":p["tri"],"rainfall_1d":p["rain_1d"],"rainfall_3d":p["rain_3d"],**o})
    write_csv("interaction_thresholds.csv",thresholds,["model","feature","value","slope","tri","rainfall_1d","rainfall_3d","raw","score","band","confidence","boost"])
    missing=[]
    for kind in ["flood","landslide"]:
      for miss in ["none","rain_1d","rain_3d","slope","tri","rain_1d+rain_3d","slope+tri","all"]:
       p=base.copy()
       if miss == "all":
           for f in ["slope", "tri", "rain_1d", "rain_3d"]: p[f] = None
       else:
           for f in miss.split('+') if miss != "none" else []: p[f] = None
       o=evaluate(kind,p["slope"],p["tri"],p["rain_1d"],p["rain_3d"]); missing.append({"model":kind,"missing":miss,**o})
    write_csv("missing_data.csv",missing,["model","missing","raw","score","band","confidence","boost"])
    weights=[]
    for kind in ["flood","landslide"]:
      vectors=([("implemented",[.30,.25,.30,.15]),("rain1_plus_10pct",[.33,.25,.27,.15]),("terrain_plus_10pct",[.27,.25,.33,.15]),("equal",[.25,.25,.25,.25])] if kind=="flood" else
               [("implemented",[.35,.20,.25,.20]),("rain1_plus_10pct",[.35,.20,.28,.17]),("terrain_plus_10pct",[.38,.17,.25,.20]),("equal",[.25,.25,.25,.25])])
      for name,w in vectors:
       p=base; fs=slope_flood(p["slope"]) if kind=="flood" else slope_ls(p["slope"]); ft=clamp(1-p["tri"]/25) if kind=="flood" else tri_ls(p["tri"]); f1=rain(p["rain_1d"]); f3=rain(p["rain_3d"]/1.6); factors=[f1,f3,fs,ft] if kind=="flood" else [fs,ft,f1,f3]; boost=evaluate(kind,**{}) if False else 0
       if name=="implemented": boost=evaluate(kind,p["slope"],p["tri"],p["rain_1d"],p["rain_3d"])["boost"]
       raw=clamp(sum(a*b for a,b in zip(w,factors))+boost); weights.append({"model":kind,"vector":name,"w1":w[0],"w2":w[1],"w3":w[2],"w4":w[3],"raw":raw,"score":round(raw,2),"band":"LOW" if raw<=.34 else "MEDIUM" if raw<=.69 else "HIGH"})
    write_csv("weight_sensitivity.csv",weights,["model","vector","w1","w2","w3","w4","raw","score","band"])
    parity="NOT_EXECUTED: canonical Python dependencies/source are on remote branch; adapter parity was not claimed. Golden-case parity requires running the canonical engine against integration/golden_cases.json."
    (ROOT/"PARITY_STATUS.txt").write_text(parity+"\n")
    summary={"reference_commit":CFG["reference_commit"],"files":["feature_sensitivity.csv","interaction_thresholds.csv","missing_data.csv","weight_sensitivity.csv"],"parity":parity}
    (ROOT/"results.json").write_text(json.dumps(summary,indent=2)+"\n")

if __name__ == "__main__": main()
