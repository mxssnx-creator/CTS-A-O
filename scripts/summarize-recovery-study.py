"""Summarize complete frozen recovery receipts; retain every losing/empty cohort and pending arm."""
import json
import gzip
from datetime import datetime, timezone
from pathlib import Path
import sys

out = Path(sys.argv[1])
roots = [Path(x) for x in sys.argv[2:]]
assert roots, "Provide one or more receipt roots"
expected = [f"{profile}-{offset}" for profile in
            ["control", "dca-unit", "dca-weighted", "dca-active", "dca-block"] for offset in [0, 12]]
cases = {}
for root in roots:
    for name in expected:
        case = root / name
        if not (case / "coverage.json").exists():
            continue
        load = lambda filename: json.loads((case / filename).read_text())
        coverage, session = load("coverage.json"), load("session.json")
        assert coverage["ok"] and coverage["exactTape"]["ok"], f"Incomplete audit: {case}"
        assert coverage["account"]["unknownAllocations"] == 0
        admission = load("admission-trace.json")
        account = session["total"]
        counts = account["fundedCounts"]
        assert counts["openedOrders"] == counts["settledOrders"] + counts["openOrders"]
        assert counts["openedPositions"] == counts["closedPositions"] + counts["openPositions"]
        data = {"case": name, "status": "audited", "sourceSha256": coverage["sourceSha256"],
                "protocolSha256": coverage["protocolSha256"], "window": coverage["window"],
                "symbols": coverage["symbols"], "catalog": coverage["catalog"], "account": account,
                "groups": coverage["groups"], "hourly": session["hours"],
                "hourlyQualification": coverage["hourly"], "exactTape": coverage["exactTape"],
                "audit": coverage["audit"], "timing": load("process-metrics.json"),
                "computeMs": coverage["engine"]["computeMs"],
                "admission": {k: admission[k] for k in ["scope", "total", "reasons"]},
                "origin": str(case)}
        extra = case / "admission-trace-entry.json"
        if extra.exists():
            data["admission"]["entryActivation"] = json.loads(extra.read_text())
        if name in cases:
            old = cases[name]
            # Timing and protocol creation metadata may differ; economics and all gate/group counts may not.
            for key in ["sourceSha256", "window", "symbols", "catalog", "groups", "exactTape"]:
                assert old[key] == data[key], f"Different {name} evidence: {key}"
            for key in ["pf", "gpR", "glR", "fundedCounts", "openEnd"]:
                assert old["account"][key] == account[key], f"Different {name} account: {key}"
            data["replicaTiming"] = old.get("replicaTiming", []) + [old["timing"]]
            if "entryActivation" in old["admission"]:
                data["admission"]["entryActivation"] = old["admission"]["entryActivation"]
        cases[name] = data

assert cases
assert len({x["sourceSha256"] for x in cases.values()}) == 1, "Do not combine economic revisions"
result = {"schema": "cts-recovery-summary-v1", "at": datetime.now(timezone.utc).isoformat(),
          "scope": "Retrospective funded modeled post-Base execution; no venue profitability claim",
          "roundTripCost": .0015, "pfNeutral": 1,
          "sourceSha256": next(iter(cases.values()))["sourceSha256"],
          "cases": [cases.get(name, {"case": name, "status": "pending"}) for name in expected],
          "ordinary": "Eight broad ordinary arms remain separate; no completion claimed here"}
out.mkdir(parents=True, exist_ok=True)
encoded = (json.dumps(result, indent=2) + "\n").encode()
(out / "financial-results.json").write_bytes(encoded)
(out / "financial-results.json.gz").write_bytes(gzip.compress(encoded, mtime=0))

def f(value, digits=4):
    return "unavailable" if value is None else f"{value:.{digits}f}"

def pf(x):
    if not x.get("n", x.get("orders", 0)):
        return "empty"
    if x.get("pfState") == "no-loss" or x.get("noLoss"):
        return "no losses (no finite ratio)"
    return f(x.get("pf"))

def triple(c, keys):
    return " / ".join(str(c[k]) for k in keys)

order_keys = ["openedOrders", "settledOrders", "openOrders"]
position_keys = ["openedPositions", "closedPositions", "openPositions"]
md = ["# Frozen recovery comparison", "", result["scope"] + ". PF 1 is neutral; modeled costs are 0.15% once. "
      "Losses and endpoint holdings are retained. The two reused windows are not untouched forward evidence.", "",
      "Source: `" + result["sourceSha256"] + "`. " + result["ordinary"] + ".", "",
      "| Case | Settled unit PF | Orders opened / settled / held | Positions opened / closed / held | Peak equity DD % | Ending equity change % | Native wall s / peak child MiB |",
      "|---|---:|---|---|---:|---:|---|"]
for name in expected:
    if name not in cases:
        md.append(f"| {name} | pending | — | — | — | — | — |")
        continue
    x = cases[name]
    a, c, t = x["account"], x["account"]["fundedCounts"], x["timing"]
    md.append(f"| {name} | {pf(a)} | {triple(c,order_keys)} | {triple(c,position_keys)} | "
              f"{f(a['equityMaxDdPct']*100)} | {f((a['equityEnd']/10-1)*100)} | "
              f"{f(t['wallSeconds'],1)} / {f(t['childPeakRssMiB'],1)} |")
md += ["", "Counts are modeled funded configuration orders and overlapping symbol/direction position episodes. "
       "Native runtime plus export timing is host dependent; these timings do not establish a controlled speedup.", ""]
for name in expected:
    if name not in cases:
        continue
    x = cases[name]
    cat, a = x["catalog"], x["account"]
    md += [f"## {name}", "", f"{len(x['symbols'])} symbols; {cat['sources']} sources; {cat['sourceLanes']} source/lane pairs; "
           f"{cat['builtConfigs']:,} configs; {cat['closes']:,} historical closes; {cat['missingConfiguredCells']} missing configured cells. "
           f"{x['exactTape']['matched']} exact settled matches, zero missing/mismatched returns. "
           f"{x['audit']['comparisons']:,} scalar comparisons. Green/red/flat hours: "
           f"{a['greenHours']}/{a['redHours']}/{a['flatHours']}. Endpoint held MTM: {f(a['openEnd']['mtm'],6)}.", "",
           "Last-4 percentages below are endpoint readiness, before the remaining PF/sample gates. "
           "Exact contexts count every config × symbol × direction; any-context configs have at least one ready context. "
           "Qualified history PF and later settled execution PF have different cohorts.", "",
           "| Dimension | Type / range | Configs | Last-4 exact contexts % | Any-context configs % | Contexts passing all evaluation gates | Qualified historical PF | Executed settled PF | Orders opened / settled / held | Positions opened / closed / held |",
           "|---|---|---:|---:|---:|---:|---:|---:|---|---|"]
    for g in x["groups"]:
        if g["dimension"] not in ["type", "strategyRange", "parameterRange", "lane"]:
            continue
        e, ex = g["end"], g["execution"]
        md.append(f"| {g['dimension']} | {g['label']} | {g['configs']} | {f(e['lastNReadyPct'],2)} | "
                  f"{f(100*e['configsLastNReady']/g['configs'],2)} | {e['passed']} | "
                  f"{pf(e['qualifiedHistory'])} | {pf(ex)} | {triple(ex['counts'],order_keys)} | "
                  f"{triple(ex['counts'],position_keys)} |")
    md += ["", "Group position episodes overlap; do not sum them into the account's position count.", "",
           "| UTC hour start | Settled PF | Orders opened / settled / held | Positions opened / closed / held | End equity | Minute peak equity DD % |",
           "|---|---:|---|---|---:|---:|"]
    for h in x["hourly"]:
        stamp = datetime.fromtimestamp(h["t"]/1000, timezone.utc).strftime("%m-%d %H:%M")
        md.append(f"| {stamp} | {pf(h)} | {triple(h['fundedCounts'],order_keys)} | "
                  f"{triple(h['fundedCounts'],position_keys)} | {f(h['eqEnd'],6)} | {f(h['maxDdPct']*100)} |")
    md += ["", "Earlier-snapshot reasons for independently valid but unselected candidates: `" +
           json.dumps(x["admission"]["reasons"]) + "`. This is an admission diagnostic, not permission to bypass later gates.", ""]
    entry = x["admission"].get("entryActivation")
    if entry:
        md += ["Own activation reasons at the exact entry: `" + json.dumps(entry["entryActivationReasons"]) + "`. "
               "The hourly selection delay remains a separate unresolved behavior; successful activation alone is not complete funded execution proof.", ""]
md += ["Complete per-source/symbol/type/range details, protection limits and all hourly qualification totals are in [financial-results.json.gz](financial-results.json.gz). "
       "No profitable-default or X02 release decision follows from an empty, partial or losing arm.", ""]
(out / "RESULTS.md").write_text("\n".join(md))
print(json.dumps({"complete": len(cases), "pending": len(expected)-len(cases), "source": result["sourceSha256"]}))
