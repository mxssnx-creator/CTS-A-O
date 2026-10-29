#!/usr/bin/env python3
"""Render the bounded kernel audit without external assets or dependencies."""
import html
import json
from pathlib import Path
import sys

folder = Path(sys.argv[1])
data = json.loads((folder / "execution-audit.json").read_text())
esc = html.escape


def pf(row):
    return f'{row["pf"]:.4f}' if row["pf"] is not None else "no losses" if row["noLoss"] else "unavailable"


def tone(row):
    return "unknown" if row["pf"] is None else "good" if row["pf"] >= 1.05 else "warn" if row["pf"] >= 1 else "bad"


kinds = list(dict.fromkeys(row["kind"] for row in data["rows"]))
cells = {(row["kind"], row["tf"]): row for row in data["rows"]}
heatmap = []
for kind in kinds:
    values = []
    for tf in (1, 5, 15, 30):
        row = cells[kind, tf]
        values.append(f'<td class="{tone(row)}"><b>{pf(row)}</b><small>{row["closed"]:,} closes</small></td>')
    heatmap.append(f'<tr><th scope="row">{esc(kind)}</th>{"".join(values)}</tr>')

context_rows = []
for row in data["contexts"]:
    exits = ", ".join(f"{key}: {value}" for key, value in sorted(row["exits"].items())) or "none"
    context_rows.append(
        f'<tr data-symbol="{esc(row["symbol"])}" data-kind="{esc(row["kind"])}" data-tf="{row["tf"]}">'
        f'<td>{esc(row["symbol"])}</td><td>{esc(row["kind"])}</td><td>{row["tf"]}m</td>'
        f'<td>{"Long" if row["side"] == 1 else "Short"}</td><td>{row["closed"]}</td>'
        f'<td>{row["held"]}</td><td>{row["pending"]}</td><td class="{tone(row)}">{pf(row)}</td>'
        f'<td>{esc(exits)}</td></tr>'
    )

options = lambda values: ''.join(f'<option>{esc(str(x))}</option>' for x in values)
closed = sum(row["closed"] for row in data["rows"])
held = sum(row["held"] for row in data["rows"])
pending = sum(row["pending"] for row in data["rows"])
page = f'''<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>CTS-A-O minute-cap execution audit</title>
<style>
body{{font:15px/1.5 system-ui,sans-serif;background:#f5f6f8;color:#18212f;margin:0}}
main{{max-width:1260px;margin:auto;padding:32px 20px}} h1{{font-size:30px;margin:4px 0 12px}}
p{{max-width:100ch}} section{{margin:24px 0;padding:20px;background:white;border:1px solid #d6dce3;border-radius:10px}}
.bad{{background:#ffe4e1}}.warn{{background:#fff3cd}}.good{{background:#d5f3e3}}.unknown{{background:#edf0f4}}
table{{border-collapse:collapse;width:100%}}th,td{{padding:9px 12px;text-align:left;border-bottom:1px solid #d6dce3;white-space:nowrap}}
thead{{background:#eef2f6}}small{{display:block;color:#445;white-space:nowrap}}.scroll{{overflow:auto}}
label{{display:inline-block;margin:0 20px 12px 0}}select{{padding:6px;margin-left:8px;max-width:220px}}
.metrics{{display:flex;flex-wrap:wrap;gap:24px}}.metrics b{{font-size:25px;display:block}}
code{{overflow-wrap:anywhere}}a{{color:#0755a5}}[hidden]{{display:none}}
@media(max-width:600px){{main{{padding:16px 10px}}section{{padding:12px}}h1{{font-size:24px}}}}
</style><main>
<p>CTS-A-O · 29 October 2026</p><h1>Minute-cap execution audit</h1>
<p><strong>Raw model execution. No Base/Main/Real qualification or exchange fills are claimed.</strong>
This audit tests exact minute expiry and matching Base/execution prices. Raw PF includes every modeled loss;
it is not the validated-set PF shown in the application.</p>
<section><div class="metrics"><div><b>72 hours</b>6 Oct 12:00 – 9 Oct 12:00 UTC; warmup included</div>
<div><b>20 symbols</b>1 / 5 / 15 / 30 minute indication clocks</div>
<div><b>{data["milliseconds"] / 1000:.3f}s</b>calculation time, including input loading</div>
<div><b>{data["peakSampledHeapBytes"] / 1048576:.1f} MiB</b>sampled heap; max RSS {data["maxRssBytes"] / 1048576:.1f} MiB</div></div>
<p>640 tapes · 1,280 independent symbol/type/timeframe/side contexts · 240 exact Base/execution checks ·
{closed:,} closed orders · {held} held · {pending} unfilled intents. Maximum hold: 15 minutes.
Cost: 0.15% round trip, applied by each kernel to its actual legs. Execution prices: own-symbol completed minute bars.</p>
<p><a href="execution-audit.json">Complete JSON</a> · <a href="orders.csv.gz">Every closed order, held mark and pending intent (CSV.gz)</a></p></section>
<section><h2>Raw return PF by type and indication clock</h2>
<p>Green ≥ 1.05; amber 1–1.05; red below 1. These colors do not grant validation. A positive sample with no losses has no finite measured PF.</p>
<div class="scroll"><table><thead><tr><th>Type</th><th>1m</th><th>5m</th><th>15m</th><th>30m</th></tr></thead>
<tbody>{''.join(heatmap)}</tbody></table></div></section>
<section><h2>Independent context listings</h2>
<label>Symbol<select id="symbol"><option value="">All</option>{options(data["symbols"])}</select></label>
<label>Type<select id="kind"><option value="">All</option>{options(kinds)}</select></label>
<label>Clock<select id="tf"><option value="">All</option>{options([1, 5, 15, 30])}</select></label>
<p id="count" aria-live="polite">1,280 contexts</p><div class="scroll"><table id="contexts"><thead>
<tr><th>Symbol</th><th>Type</th><th>Clock</th><th>Side</th><th>Closed</th><th>Held</th><th>Intents</th><th>Raw PF</th><th>Exit reasons</th></tr>
</thead><tbody>{''.join(context_rows)}</tbody></table></div></section>
<section><h2>Separate, unchanged stage-performance evidence</h2>
<p>20-symbol Low-Range step3 Micro, Normal/Trailing, 1/5/15m indications and minute execution;
8 Oct 12:00 – 9 Oct 12:00 UTC with 24h prehistory, historical PF1.1 policy.
Base passed 10/4,800 (0.20833%); historical passed PF 1.2052315. Subsequent Main PF 0.6173283;
positions opened/closed/held 307/305/2; orders 1,585/1,583/2. Real passed 0/1,585 (0%).
Active PF and venue/funded results are unavailable. This audit does not establish stable high forward PF.
The persistent new stage adapter remains disabled.</p>
<p>Input SHA-256: <code>{data["feedSha256"]}</code><br>Closed-order checksum: <code>{data["checksum"]}</code></p></section>
</main><script>
const filters = ['symbol','kind','tf'].map(id => document.getElementById(id));
const rows = [...document.querySelectorAll('#contexts tbody tr')];
function apply() {{let count=0; for(const row of rows){{row.hidden=filters.some(f=>f.value&&row.dataset[f.id]!==f.value);if(!row.hidden)count++;}}
document.getElementById('count').textContent=count.toLocaleString()+' contexts';}}
for(const filter of filters)filter.addEventListener('change',apply);
</script></html>'''
(folder / "execution-audit.html").write_text(page)
print(f"Rendered {len(context_rows)} independent contexts and {len(heatmap)} heatmap rows")
