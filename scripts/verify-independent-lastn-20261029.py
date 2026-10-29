#!/usr/bin/env python3
"""Independent scalar reconciliation against the frozen raw source rows and complete report outputs."""
import bisect
import collections
import json
import math
import sys
from pathlib import Path

raw_path, result_path, receipt_path = map(Path, sys.argv[1:4])
raw = json.loads(raw_path.read_text())
result = json.loads(result_path.read_text())
from_t, start_t = result["study"]["evaluationFrom"], result["study"]["window"]["startT"]
headers, events = {}, collections.defaultdict(list)
for chunk in raw["tapeTradesSidecar"]["chunks"]:
    with (raw_path.parent / chunk["path"]).open() as handle:
        for line in handle:
            record = json.loads(line)
            if record[0] == "t":
                headers[record[1]] = record[2]
            elif record[0] == "r":
                head = headers[record[1]]
                sym, side, entry_t, exit_t, value = record[3]
                if exit_t >= max(from_t, head.get("fromT") or from_t):
                    events[(head["id"], sym, side)].append((exit_t, value, entry_t))
for values in events.values():
    assert all(values[i][0] <= values[i + 1][0] for i in range(len(values) - 1))

def expected(rows, before, n, floor):
    end = bisect.bisect_left([r[0] for r in rows], before)
    recent = [x[1] for x in rows[max(0, end - n):end]]
    if any(x is None or not math.isfinite(x) for x in recent):
        return len(recent), "unknown", None
    if len(recent) < n:
        return len(recent), "insufficient", None
    gains = sum(max(x, 0) for x in recent)
    losses = sum(max(-x, 0) for x in recent)
    if gains == losses == 0:
        return n, "flat", None
    pf = gains / losses if losses else None
    if not all(map(math.isfinite, [gains, losses])) or (pf is not None and not math.isfinite(pf)):
        return n, "unknown", None
    return n, "qualified" if gains > losses and (pf is None or pf >= floor) else "failed", pf

def verify(actual, reference):
    n, state, pf = reference
    assert actual["n"] == n and actual["state"] == state, (actual, reference)
    if pf is None:
        assert actual["pf"] is None
    else:
        assert math.isclose(actual["pf"], pf, rel_tol=1e-12, abs_tol=1e-14), (actual, reference)

contexts = result["contexts"]
assert len(contexts) == 6480 and len(result["orders"]) == 3108
assert len({(c["cfg"], c["sym"], c["side"]) for c in contexts}) == len(contexts)
context_checks = 0
for c in contexts:
    rows = events.get((c["cfg"], c["sym"], c["side"]), [])
    assert c["prehistoryCloses"] == sum(row[0] < start_t for row in rows)
    for n in result["windows"]:
        verify(c["windows"][str(n)], expected(rows, start_t, n, c["floor"]))
        context_checks += 1
order_checks = 0
for order in result["orders"]:
    rows = events.get((order["cfg"], order["sym"], order["side"]), [])
    # Every recorded entry's outcome is reconciled against the exact source identity and one-time-cost return.
    matching = [r for t, r, entry in rows if t == order["exitT"] and entry == order["entryT"]]
    assert any(math.isclose(r, order["unitReturn"], rel_tol=1e-10, abs_tol=1e-10) for r in matching)
    for n in result["windows"]:
        verify(order["windows"][str(n)], expected(rows, order["entryT"], n, order["floor"]))
        order_checks += 1

states = ["qualified", "failed", "insufficient", "flat", "unknown"]
for n in result["windows"]:
    key = str(n)
    stat, rolling = result["byWindow"][key], result["rolling"][key]
    for state in states:
        assert stat[state] == sum(c["windows"][key]["state"] == state for c in contexts)
        assert rolling[state] == sum(o["windows"][key]["state"] == state for o in result["orders"])
    assert sum(stat[s] for s in states) == len(contexts)
    assert sum(rolling[s] for s in states) == len(result["orders"])
    chosen = [o["unitReturn"] for o in result["orders"] if o["windows"][key]["state"] == "qualified"]
    gains, losses = sum(max(x, 0) for x in chosen), sum(max(-x, 0) for x in chosen)
    assert len(chosen) == rolling["laterExistingFunded"]["n"]
    if losses:
        assert math.isclose(gains / losses, rolling["laterExistingFunded"]["pf"], rel_tol=1e-12)
    else:
        assert rolling["laterExistingFunded"]["pf"] is None
receipt = {"ok": True, "contexts": len(contexts), "contextWindowChecks": context_checks,
           "fundedOrders": len(result["orders"]), "entryWindowChecks": order_checks,
           "mismatches": 0, "clock": "strictly earlier completed source close", "source": str(raw_path)}
receipt_path.write_text(json.dumps(receipt, indent=2) + "\n")
print(json.dumps(receipt))
