"""Compare frozen before/after admission repairs without confusing historical and forward PF."""
import json
from pathlib import Path
import sys

before, after, out = map(Path, sys.argv[1:4])
cases = sys.argv[4:] or ["control-0", "control-12"]
rows = []
for name in cases:
    read = lambda root, file: json.loads((root / name / file).read_text())
    a, b = read(before, "coverage.json"), read(after, "coverage.json")
    pa, pb = read(before, "protocol.json"), read(after, "protocol.json")
    sa, sb = read(before, "session.json"), read(after, "session.json")
    for key in ["actualSettings", "actualWf", "symbols", "window", "account", "feed"]:
        assert pa[key] == pb[key], f"{name}: frozen input changed: {key}"
    for c in [a, b]:
        assert c["ok"] and c["exactTape"]["ok"] and c["account"]["unknownAllocations"] == 0
        assert all(x["ok"] for x in c["reportChecks"])
    for key in ["catalog", "hourly", "window", "symbols", "entrySelection"]:
        assert a[key] == b[key], f"{name}: own history/selection changed: {key}"
    group = lambda c: {(g["dimension"], g["label"]): g for g in c["groups"]}
    ga, gb = group(a), group(b)
    assert ga.keys() == gb.keys()
    for key in ga:
        for field in ["configs", "symbols", "sources", "start", "end", "protection"]:
            assert ga[key][field] == gb[key][field], f"{name}: own context changed: {key}/{field}"
    for s in [sa, sb]:
        c = s["total"]["fundedCounts"]
        assert c["openedOrders"] == c["settledOrders"] + c["openOrders"]
        assert c["openedPositions"] == c["closedPositions"] + c["openPositions"]
    rows.append({"case": name, "beforeSource": a["sourceSha256"], "afterSource": b["sourceSha256"],
        "sameFrozenInputs": True, "sameOwnHistoryAndQualification": True,
        "sameSelection": True, "exactReturnParity": {"before": a["exactTape"], "after": b["exactTape"]},
        "groupComparisons": len(ga), "before": sa["total"], "after": sb["total"],
        "skipsBefore": a["engine"]["skips"], "skipsAfter": b["engine"]["skips"],
        "hourlyBefore": sa["hours"], "hourlyAfter": sb["hours"],
        "computeMsBefore": a["engine"]["computeMs"], "computeMsAfter": b["engine"]["computeMs"]})
result = {"schema": "cts-signal-postbase-feedback-comparison-v1", "ok": True,
    "scope": "Identical frozen inputs and own qualification; shared admission feedback changed. "
             "Newly admitted orders change the settled cohort. Historical qualifying PF is not forward PF.",
    "roundTripCost": .0015, "pfNeutral": 1, "cases": rows}
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps({"ok": True, "cases": [{"case": x["case"], "pfBefore": x["before"]["pf"],
    "pfAfter": x["after"]["pf"], "ordersBefore": x["before"]["fundedCounts"],
    "ordersAfter": x["after"]["fundedCounts"]} for x in rows]}))
