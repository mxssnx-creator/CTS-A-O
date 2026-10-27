#!/usr/bin/env python3
"""Make an empty Exit cohort unmistakable in a completed native report."""
import datetime
import html
import json
import pathlib
import sys

if len(sys.argv) != 3:
    raise SystemExit("Usage: render-mixed-exit-summary.py STUDY_DIR OUTPUT.html")
root = pathlib.Path(sys.argv[1])
s = json.loads((root / "mixed-summary.json").read_text())
a = json.loads((root / "audit.json").read_text())
if not s.get("checks") or not a.get("checksOk"):
    raise SystemExit("A completed and reconciled session is required")
e, c, t = s["exit"], s["ordinary"], s["total"]
counts = t["fundedCounts"]
def when(ms):
    return datetime.datetime.fromtimestamp(ms / 1000, datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
def value(x):
    return "unavailable" if x is None else f"{x:.3f}"
ordinary_pct = f"{100 * c['passed'] / c['evaluated']:.2f}%" if c["evaluated"] else "unavailable"
exit_text = ("No Exit configuration reached post-Base validation or execution; its post-Base PF and validation percentage are unavailable."
             if not e["basePassed"] else
             "Inspect the independent Exit section below for its own post-Base and execution evidence.")
panel = f'''<div style="max-width:1240px;margin:24px auto;padding:22px;border:1px solid #bd8a35;border-radius:14px;background:#302719;color:#fff0cd;font:15px/1.5 system-ui,sans-serif">
<h1 style="font-size:26px;margin:0 0 8px">Independent Exit · 150-hour history audit</h1>
<p>{len(s['symbols'])} symbols; {when(s['window']['startT'])} to {when(s['window']['endT'])}; retrospective simulation with 150 hours of evaluated history and default tactics.</p>
<p><strong>Historic Exit:</strong> {e['basePassed']} / {e['baseEvaluated']} source pairs passed their own Base gate. {html.escape(exit_text)}</p>
<p><strong>Ordinary configurations:</strong> {c['passed']:,} / {c['evaluated']:,} validated ({ordinary_pct}) at the start, historical PF {value(c['historicalPf'])}.
Their later modeled settled PF was {value(t['exactPf'])} on {counts['settledOrders']:,} orders; orders opened / settled / held were {counts['openedOrders']:,} / {counts['settledOrders']:,} / {counts['openOrders']:,},
and positions opened / closed / held were {counts['openedPositions']} / {counts['closedPositions']} / {counts['openPositions']}.</p>
<p>The later result is a separate settled sample and leaves open positions. These are modeled allocations, not venue fills or proof of future profitability.</p></div>'''
doc = (root / "report/index.html").read_text()
anchor = '<main id="app"></main>'
if doc.count(anchor) != 1:
    raise SystemExit("Native report anchor changed")
pathlib.Path(sys.argv[2]).write_text(doc.replace(anchor, panel + anchor), encoding="utf-8")
print("Rendered independent Exit and ordinary-cohort summary")
