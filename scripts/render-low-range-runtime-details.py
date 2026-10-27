#!/usr/bin/env python3
"""Add exact step/symbol/hour results to the native self-contained runtime report."""
import datetime
import hashlib
import html
import json
import math
import pathlib
import sys

if len(sys.argv) != 3:
    raise SystemExit("Usage: render-low-range-runtime-details.py STUDY_DIR OUTPUT.html")
root = pathlib.Path(sys.argv[1])
detail = json.loads((root / "runtime-step-detail.json").read_text())
audit = json.loads((root / "audit.json").read_text())
base = json.loads((root / "base-cell-audit.json").read_text())
protocol = json.loads((root / "protocol.json").read_text())
raw = json.loads((root / "raw.json").read_text())
report = json.loads((root / "report/data.json").read_text())
progress_path = root / "progression-audit.json"
progress = json.loads(progress_path.read_text()) if progress_path.exists() else None
if detail.get("status") != "passed" or not audit.get("checksOk") or base.get("status") != "passed":
    raise SystemExit("Completed funded and Base-cell audits are required")
if progress and progress.get("status") != "passed":
    raise SystemExit("A failed progression audit cannot be presented as a passing replay")
if sum(x["settled"] for x in detail["byStep"].values()) != audit["total"]["closes"]:
    raise SystemExit("Step rows do not reconcile to the funded audit")
doc = (root / "report/index.html").read_text()
H = 3_600_000
if detail["endT"] - detail["startT"] != 24 * H:
    raise SystemExit("This renderer requires exactly 24 reporting hours")
empty = {"evaluated": 0, "validated": 0, "historicalPf": None, "validatedPct": None,
         "settled": 0, "long": 0, "short": 0, "wins": 0, "losses": 0, "gp": 0, "gl": 0, "cash": 0, "forwardPf": None}
def pf(x):
    return "no loss" if x == "no-loss" else f"{x:.3f}" if isinstance(x, (int, float)) else "—"
def money(x):
    return f"${x:+.5f}" if x else "—"
def group(g):
    return "Trailing-only · no TP" if g == "noTP" else f"Step {g}"
def time(t):
    return datetime.datetime.fromtimestamp(t / 1000, datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
def results(label, x, show_held=False):
    return (f"<tr><th>{html.escape(label)}</th><td>{x['settled']}</td>"
            f"<td>{x['long']} / {x['short']}</td><td>{x['wins']} / {x['losses']}</td>"
            f"<td>{pf(x.get('forwardPf'))}</td><td>{money(x['cash'])}</td></tr>")
rows = []
for g in detail["groups"]:
    x = detail["byStep"][g]
    pct = f"{x['validatedPct']:.2f}%" if x["validatedPct"] is not None else "—"
    rows.append(f"<tr><th>{group(g)}</th><td>{x['validated']} / {x['evaluated']} ({pct})</td>"
                f"<td>{pf(x['historicalPf'])}</td><td>{x['settled']}</td>"
                f"<td>{x['long']} / {x['short']}</td><td>{pf(x['forwardPf'])}</td><td>{money(x['cash'])}</td></tr>")
heat = ['<tr><th>Step</th>'] + [f"<th>{datetime.datetime.fromtimestamp((detail['startT'] + i * H) / 1000, datetime.timezone.utc):%H}</th>" for i in range(24)] + ['</tr>']
for g in detail["groups"]:
    heat.append(f"<tr><th>{group(g)}</th>")
    for i in range(24):
        t = detail["startT"] + i * H
        x = detail["byStepHour"].get(f"{g}|{t}", empty)
        color = "#244739" if x["cash"] > 0 else "#653039" if x["cash"] < 0 else "#263346"
        title = html.escape(f"{group(g)} · {time(t)} · {x['settled']} closes · PF {pf(x.get('forwardPf'))} · {money(x['cash'])}")
        heat.append(f"<td style='background:{color}' title='{title}'>{x['settled'] or '·'}</td>")
    heat.append("</tr>")
symbol_rows, hour_rows = [], []
for g in detail["groups"]:
    for sym in detail["symbols"]:
        symbol_rows.append(results(f"{group(g)} · {sym}", detail["byStepSymbol"].get(f"{g}|{sym}", empty)))
        for i in range(24):
            t = detail["startT"] + i * H
            hour_rows.append(results(f"{group(g)} · {sym} · {time(t)}", detail["byStepSymbolHour"].get(f"{g}|{sym}|{t}", empty)))
summary = """<thead><tr><th>Target</th><th>Validated / evaluated</th><th>Historical PF</th><th>Settled</th><th>Long / short</th><th>Later PF</th><th>Cash P&amp;L</th></tr></thead>"""
columns = """<thead><tr><th>Target · symbol · UTC</th><th>Settled</th><th>Long / short</th><th>Wins / losses</th><th>Later PF</th><th>Cash P&amp;L</th></tr></thead>"""
passed_base = sum(bool(x.get("passed")) for x in raw["basePairs"])
evaluated_base = len(raw["basePairs"])
start_eval = raw.get("tapeAgg", {}).get("evalStats", {})
ev_n, ev_pass = start_eval.get("evaluated"), start_eval.get("passed")
ev_pct = f"{100 * ev_pass / ev_n:.2f}%" if ev_n and ev_pass is not None else "unavailable"
ev_n_text = f"{ev_n:,}" if ev_n is not None else "unavailable"
ev_pass_text = f"{ev_pass:,}" if ev_pass is not None else "unavailable"
gp = sum(x["historicalGp"] for x in detail["byStep"].values())
gl = sum(x["historicalGl"] for x in detail["byStep"].values())
historical = gp / gl if gl else "no-loss" if gp else None
entry_tactics = html.escape(protocol.get("tacticMode", "unknown"))
book = report.get("total", {})
counts = book.get("fundedCounts", {})
feasibility = (f" INFEASIBLE: modeled margin exceeded equity for {book.get('marginOver', {}).get('minutes', 'unknown')} minutes."
               if book.get("feasible") is False else
               " Modeled margin did not exceed equity." if book.get("feasible") is True else " Feasibility unavailable.")
ownership = (f" Funded-model orders opened / settled / held: {counts.get('openedOrders', '—')} / {counts.get('settledOrders', '—')} / {counts.get('openOrders', '—')}; "
             f"positions opened / closed / held: {counts.get('openedPositions', '—')} / {counts.get('closedPositions', '—')} / {counts.get('openPositions', '—')}.")
if detail.get("zeroAllocated"):
    ownership += f" {detail['zeroAllocated']:,} additional settled candidates had known zero allocation and are excluded from funded PF."
caps = protocol.get("account", {})
cap_note = (f" Allocation caps: {caps['maxPositionX']}× per symbol/side and {caps['maxExposureX']}× gross, based on realized balance."
            if "maxPositionX" in caps and "maxExposureX" in caps else "")
provider = html.escape(str(protocol.get("feed", {}).get("provider", "Feed provider unavailable")))
cost = protocol.get("actualSettings", {}).get("cost")
cost_note = (f" Modeled round-trip position cost: {100 * cost:.3f}%."
             if isinstance(cost, (int, float)) else " Modeled round-trip position cost unavailable.")
venue_note = (" The cached feed is Binance USD-M, while the live executor uses BingX; venue prices, spreads, "
              "orders and fills have not been reconciled in this replay."
              if "binance" in provider.lower() else "")
progress_panel = ""
if progress:
    scale = max(1, *(h["evaluated"] for h in progress["hours"]))
    points = " ".join(f"{20 + 960 * i / max(1, len(progress['hours']) - 1):.1f},{130 - 105 * h['passed'] / scale:.1f}"
                      for i, h in enumerate(progress["hours"]))
    p_rows = []
    for h in progress["hours"]:
        pct = f"{h['validatedPct']:.2f}%" if h["validatedPct"] is not None else "—"
        p_rows.append(f"<tr><th>{time(h['t'])}</th><td>{h['passed']} / {h['evaluated']} ({pct})</td>"
                      f"<td>{pf(h['historicalPf'])}</td><td>{h['gained']} / {h['dropped']}</td>"
                      f"<td>{h['enteredSettled']}</td><td>{h['settled']['n']}</td><td>{pf(h['settled']['pf'])}</td></tr>")
    config_rows = []
    for c in progress["configs"]:
        checks = {q[0]: q[1] for q in c["checks"]}
        timeline = "".join("●" if checks.get(h["t"]) == 1 else "·" if h["t"] in checks else "—"
                           for h in progress["hours"])
        config_rows.append(f"<tr><th>{html.escape(c['id'])}</th><td>{c['passed']} / {c['evaluated']}</td>"
                           f"<td class='timeline'>{timeline}</td><td>{c['settled']['n']}</td><td>{pf(c['settled']['pf'])}</td></tr>")
    progress_panel = f'''<section><h2>Continuous post-Base progression</h2><p>Each point is the number of independently validated configurations at that decision hour; the denominator is the evaluated inventory.
Historical PF pools the passing configuration windows only for that hour, which overlap. It is not the later settled return PF.
The exact per-configuration progression and subsequent settled returns are listed below. Filled dot = passed; dot = did not pass.
Independent scalar rechecks: {progress.get('scalarStepChecks', 0):,}; missing from the recorded tape inventory: {progress.get('missingScalarStepChecks', 'unavailable')}.</p>
<svg viewBox="0 0 1000 150" role="img" aria-label="Validated configurations by hourly decision" style="width:100%;height:160px">
<line x1="20" y1="130" x2="980" y2="130" stroke="#60738e"/><polyline fill="none" stroke="#55d5b0" stroke-width="4" points="{points}"/>
</svg><div class="scroll"><table><thead><tr><th>Decision hour</th><th>Validated / evaluated</th><th>Historical PF</th><th>Gained / dropped</th><th>Entries later settled</th><th>Settled in hour</th><th>Settled PF</th></tr></thead><tbody>{''.join(p_rows)}</tbody></table></div>
<details><summary>Open all {len(config_rows):,} individual configuration progressions</summary><p>Dots are ordered from the first decision hour shown above; a dash is a missing check. Later PF uses that configuration's funded modeled settled orders, including losses.</p>
<div class="scroll"><table><thead><tr><th>Configuration</th><th>Passing / evaluated decisions</th><th>Progression</th><th>Settled</th><th>Later PF</th></tr></thead><tbody>{''.join(config_rows)}</tbody></table></div></details></section>'''
config_hours_path = root / "config-direction-hours.json"
config_hours = json.loads(config_hours_path.read_text()) if config_hours_path.exists() else None
config_panel = """<section><h2>Config × direction · later funded-model hours</h2><p>Per-direction hourly outcomes are unavailable for this report. Run the independent config-hour analyzer before rendering to include them.</p></section>"""
if config_hours:
    if config_hours.get("status") != "passed" or config_hours.get("startT") != detail["startT"] or config_hours.get("endT") != detail["endT"]:
        raise SystemExit("Config-direction result has a failed status or different window")
    prov = config_hours.get("provenance", {})
    if prov.get("sourceSha256") != protocol["source"]["sha256"] or prov.get("protocolSha256") != hashlib.sha256((root / "protocol.json").read_bytes()).hexdigest():
        raise SystemExit("Config-direction result belongs to a different frozen source or protocol")
    if config_hours.get("symbols") != detail["symbols"] or config_hours.get("zeroAllocated") != detail.get("zeroAllocated", 0):
        raise SystemExit("Config-direction symbols or zero-allocation count differ")
    x = config_hours["exploratory"]
    if (x.get("minCloses"), x.get("minActiveHours"), x.get("minHourlyPf")) != (20, 3, 1.1):
        raise SystemExit("Unexpected exploratory rule")
    seen, context_ids, totals, eligible, consistent = set(), {}, [0, 0.0, 0.0, 0.0], 0, 0
    def near(a, b):
        return math.isfinite(a) and math.isfinite(b) and abs(a - b) <= 1e-8 * max(1, abs(b))
    for row in config_hours["rows"]:
        if len(row) != 8:
            raise SystemExit("Malformed config-direction row")
        cfg, side, n, gp, gl, cash, hours, qualifies = row
        if not isinstance(cfg, str) or not cfg or side not in (1, -1) or (cfg, side) in seen or type(n) is not int or n < 0 or type(qualifies) is not bool:
            raise SystemExit("Invalid config-direction identity")
        if not all(isinstance(v, (int, float)) and math.isfinite(v) for v in (gp, gl, cash)) or gp < 0 or gl < 0:
            raise SystemExit("Invalid config-direction return")
        seen.add((cfg, side)); context_ids.setdefault(cfg, set()).add(side)
        h_total, previous, good = [0, 0.0, 0.0, 0.0], -1, True
        for h in hours:
            if len(h) != 5:
                raise SystemExit("Malformed hour")
            i, count, h_gp, h_gl, h_cash = h
            if type(i) is not int or not previous < i < 24 or type(count) is not int or count <= 0 or not all(isinstance(v, (int, float)) and math.isfinite(v) for v in (h_gp, h_gl, h_cash)) or h_gp < 0 or h_gl < 0:
                raise SystemExit("Invalid or duplicated hour")
            previous = i
            for k, v in enumerate((count, h_gp, h_gl, h_cash)):
                h_total[k] += v
            good = good and ((h_gl == 0 and h_gp > 0) or (h_gl > 0 and h_gp / h_gl >= 1.1))
        if h_total[0] != n or not all(near(h_total[k], v) for k, v in enumerate((n, gp, gl, cash))):
            raise SystemExit("Config-direction hours do not reconcile")
        is_eligible = n >= 20 and len(hours) >= 3
        calculated = is_eligible and good
        if calculated != qualifies:
            raise SystemExit("Exploratory row differs from hourly outcomes")
        eligible += is_eligible; consistent += calculated
        for k, v in enumerate((n, gp, gl, cash)):
            totals[k] += v
    expected = (audit["total"]["closes"], audit["total"]["unitGp"], audit["total"]["unitGl"], audit["total"]["sizedNetUsd"])
    if config_hours["contexts"] != len(seen) or any(sides != {1, -1} for sides in context_ids.values()) or totals[0] != expected[0] or not all(near(totals[k], v) for k, v in enumerate(expected)):
        raise SystemExit("Config-direction totals do not reconcile to the funded audit")
    if progress and set(context_ids) != {c["id"] for c in progress["configs"]}:
        raise SystemExit("Config-direction inventory differs from the recorded progression")
    if x["eligible"] != eligible or x["consistent"] != consistent or (eligible and not near(x["percent"], 100 * consistent / eligible)) or (not eligible and x["percent"] is not None):
        raise SystemExit("Exploratory summary does not reconcile")
    percent = f"{x['percent']:.2f}%" if x["percent"] is not None else "unavailable"
    hour_headers = "".join(f"<th scope='col'>{datetime.datetime.fromtimestamp((detail['startT'] + i * H) / 1000, datetime.timezone.utc):%H}:00</th>" for i in range(24))
    payload = json.dumps(config_hours, ensure_ascii=True, separators=(",", ":")).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    config_panel = f'''<section id="lr-config-hours"><h2>Config × direction · later funded-model hours</h2>
<p>Each exact configuration and direction pools its funded-model settled orders across the {len(detail['symbols'])} symbols; empty directions remain visible.
These are later modeled outcomes, not direction-level historical Base validation, actual fills, a holdout or a promotion list.
An hour is assigned by close time; a close exactly on the hour belongs to the hour just completed. Empty = no closes, Flat = only zero returns, No loss = positive returns without losses.</p>
<p><strong>Exploratory hourly consistency: {consistent:,} of {eligible:,} eligible contexts ({percent}).</strong>
Eligibility requires at least 20 settled orders and at least 3 active hours. Every active hour must have PF ≥ 1.1; positive no-loss hours qualify and flat hours do not. This post-hoc screen does not establish persistence.</p>
<div class="lr-config-controls"><label for="lr-config-search">Search configuration</label><input id="lr-config-search" type="search" autocomplete="off"/>
<label for="lr-config-direction">Direction</label><select id="lr-config-direction"><option value="both">Both</option><option value="1">Long</option><option value="-1">Short</option></select>
<label for="lr-config-filter">Show</label><select id="lr-config-filter"><option value="all">All contexts</option><option value="funded">With funded closes</option><option value="eligible">Eligible for exploratory screen</option><option value="consistent">Pass every active hour</option></select></div>
<p id="lr-config-status" role="status" aria-live="polite"></p><div class="scroll"><table aria-label="Later funded-model profit factor by configuration, direction and close hour UTC">
<thead><tr><th scope="col">Exact configuration</th><th scope="col">Direction</th><th scope="col">Settled</th><th scope="col">Later PF</th><th scope="col">Active hours</th>{hour_headers}</tr></thead>
<tbody id="lr-config-body"></tbody></table></div><nav aria-label="Config and direction result pages"><button type="button" id="lr-config-prev" aria-controls="lr-config-body">Previous</button>
<span id="lr-config-page"></span><button type="button" id="lr-config-next" aria-controls="lr-config-body">Next</button></nav>
<noscript>Enable JavaScript to browse the paginated config-direction results in this offline report.</noscript>
<script type="application/json" id="lr-config-hours-data">{payload}</script></section>'''
panel = f'''<style>.lowrange-extra{{max-width:1400px;margin:24px auto;color:#eaf1fa;font:14px/1.5 system-ui,sans-serif}}
.lowrange-extra section,.lowrange-extra aside{{padding:18px 22px;margin:14px 0;border:1px solid #34455d;border-radius:14px;background:#132033}}
.lowrange-extra aside{{border-color:#b98531;background:#302719;color:#ffedc8}}.lowrange-extra h1{{font-size:28px;margin:0 0 8px}}
.lowrange-extra h2{{font-size:20px;margin:0 0 6px}}.lowrange-extra p{{color:#b8c8da}}.lowrange-extra aside p{{color:#ffedc8}}
.lowrange-extra .scroll{{overflow:auto}}.lowrange-extra table{{border-collapse:collapse;min-width:780px;width:100%;font-variant-numeric:tabular-nums}}
.lowrange-extra th,.lowrange-extra td{{padding:8px;border-bottom:1px solid #31415a;text-align:right;white-space:nowrap}}
.lowrange-extra th:first-child{{text-align:left}}.lowrange-extra summary{{cursor:pointer;color:#9edac8;font-weight:700}}.lowrange-extra .timeline{{font-family:monospace;letter-spacing:2px;color:#7bd6b8}}
.lowrange-extra .lr-config-controls{{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin:12px 0}}
.lowrange-extra input,.lowrange-extra select,.lowrange-extra button{{font:inherit;padding:7px 10px;border:1px solid #68809e;border-radius:6px;background:#1d2e43;color:#f0f5fc}}
.lowrange-extra button:disabled{{opacity:.45}}.lowrange-extra nav{{display:flex;align-items:center;gap:12px;margin-top:12px}}
.lowrange-extra .lr-good{{color:#a5f0cc}}.lowrange-extra .lr-bad{{color:#ffa8ad}}.lowrange-extra .lr-neutral{{color:#b8c8da}}
</style><div class="lowrange-extra"><aside><h1>Low-Range Short · runtime replay</h1><p><strong>Retrospective simulation.</strong>
The {len(detail['symbols'])}-symbol {protocol.get('lane', 15)}m replay from {time(detail['startT'])} to {time(detail['endT'])} passed Base for {passed_base} of {evaluated_base} pairs.
At run start, {ev_pass_text} of {ev_n_text} configurations validated ({ev_pct}), historical pooled PF {pf(historical)}.
Later funded-model PF was {pf('no-loss' if audit['total'].get('noLoss') else audit['total'].get('exactPf'))} on {audit['total']['closes']} settled orders. Entry tactics: {entry_tactics}.
{ownership}{cap_note}<strong>{feasibility}</strong> Feed: {provider}.{cost_note}{venue_note}
The runtime caps modeled round-trip cost at 0.15%; higher actual venue costs cannot be represented by increasing this setting.
The input was previously examined retrospective data. These are modeled results, not exchange fills.</p></aside>
{progress_panel}
{config_panel}
<section><h2>Each target step</h2><p>Validation uses the start-of-run historical sample; later PF and cash P&amp;L use settled funded-model orders.
Trailing-only siblings have no TP and may merge across original target steps, so they are shown separately.</p><div class="scroll"><table>{summary}<tbody>{''.join(rows)}</tbody></table></div></section>
<section><h2>Step × hour</h2><p>Cell numbers are settled modeled orders. Green is positive cash P&amp;L, red negative, gray flat or empty. Hover for exact values.</p><div class="scroll"><table>{''.join(heat)}</table></div></section>
<section><h2>All 20 symbols by target</h2><details><summary>Open 120 rows, including trailing-only</summary><div class="scroll"><table>{columns}<tbody>{''.join(symbol_rows)}</tbody></table></div></details></section>
<section><h2>Each symbol and hour</h2><p>Every hour is present, including empty samples. Times are UTC close-hour bins.</p><details><summary>Open all 2,880 target × symbol × hour rows</summary><div class="scroll"><table>{columns}<tbody>{''.join(hour_rows)}</tbody></table></div></details></section></div>'''
anchor = '<main id="app"></main>'
if doc.count(anchor) != 1:
    raise SystemExit("Native report anchor changed")
result = doc.replace(anchor, panel + anchor)
if config_hours:
    if result.count("</body>") != 1:
        raise SystemExit("Native report body anchor changed")
    ui = (pathlib.Path(__file__).parent / "low-range-config-hours-ui.js").read_text()
    result = result.replace("</body>", f'<script id="lr-config-hours-ui">{ui}</script></body>')
pathlib.Path(sys.argv[2]).write_text(result, encoding="utf-8")
print(f"Rendered {len(symbol_rows)} symbol and {len(hour_rows)} symbol-hour rows")
