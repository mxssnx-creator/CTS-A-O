"""Report frozen Exit studies without changing qualification or selecting configurations."""
import json
import pathlib
import sys
from datetime import datetime, timezone
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

root = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
names = ['control-0', 'expanded-0', 'control-12', 'expanded-12']
results = []
for name in names:
    p = root / name / name
    detail = json.loads((p / 'details.json').read_text())
    coverage = json.loads((p / 'coverage.json').read_text())
    metrics = json.loads((p / 'process-metrics.json').read_text())
    assert coverage['ok'] and detail['checksOk'] and metrics['exitCode'] == 0
    assert detail['sourceSha256'] == metrics['sourceSha256'] == coverage['sourceSha256']
    assert coverage['catalog']['missingConfiguredCells'] == 0
    assert coverage['catalog']['expectedExit'] == coverage['catalog']['builtExit']
    exit_row = next(r for r in detail['ranges'] if r['range'] == 'Exit')
    results.append(dict(scenario=name, window=detail['window'], sourceSha256=detail['sourceSha256'],
        total=detail['total'], exit=exit_row, ranges=detail['ranges'], hours=detail['hours'],
        ledger=coverage['ledger'], catalog=coverage['catalog'], metrics=metrics,
        coverage=[g for g in coverage['groups'] if g['dimension'] in ['type', 'strategyRange', 'lane', 'symbol']], initialCoverage=coverage['hourly'][0]))
    (out / f'{name}-details.json').write_text(json.dumps(detail, indent=2)+'\n')
    (out / f'{name}-process-metrics.json').write_text(json.dumps(metrics, indent=2)+'\n')
(out / 'comparison.json').write_text(json.dumps(results, indent=2)+'\n')

def counts(row):
    return f"{row['openedOrders']}/{row['settledOrders']}/{row['openOrders']}"
def positions(row):
    return f"{row['openedPositions']}/{row['closedPositions']}/{row['openPositions']}"
def pf(row):
    return f"{row['pf']:.4f}" if row['pf'] is not None else row['pfState']

lines = ['# Exit comparison results — 25 October 2026 UTC', '',
    'Four audited 12-hour replays, each with 12 symbols, 150h fitting history, 1/5/15m lanes and minute pricing. These are funded modeled executions, not venue fills. Original and expanded policies share neutral sizing and admission gates. Expanded fits remain optional: they lost in both windows. Original Exit settled 14 winning orders across the windows, but most tactics lack settled samples and the account lost in the later window. This does not establish stable profitability.', '',
    'Order counts are opened / settled / held; position counts are opened / closed / held. Positions can overlap across ranges or tactics and must not be added across groups. Loss-free Exit samples have no finite PF; they are not the report display sentinel 4.', '',
    '| Scenario | Account PF | Equity DD | Account orders | Account positions | Exit PF | Exit orders | Exit positions | Wall seconds | Peak MiB |',
    '|---|---:|---:|---|---|---:|---|---|---:|---:|']
for r in results:
    t, e, m = r['total'], r['exit'], r['metrics']
    lines.append(f"| {r['scenario']} | {t['pf']:.4f} | {100*t['equityMaxDdPct']:.4f}% | {counts(t['fundedCounts'])} | {positions(t['fundedCounts'])} | {pf(e)} | {counts(e)} | {positions(e)} | {m['wallSeconds']:.1f} | {m['childPeakRssMiB']:.1f} |")
lines += ['', '![Performance and allocation counts](comparison.svg)', '', '![Hourly account equity](hourly-equity.svg)', '',
    'Hourly results below use settled-close reporting bins; calculations still use minute prices. Cohort-boundary holdings are included by the independent position/order ledger. The coverage archive counts both directions for every config, including the ineligible opposite side of side-specific Exit IDs; those all-orientation percentages must not be presented as eligible-side percentages.', '']
sets = ['static-sl','adaptive-sl','trailing','breakeven','trailing-only']
for r in results:
    lines += [f"## {r['scenario']}", '',
        '| Exit tactic | Orders | Positions | PF | Gross unit gain | Gross unit loss |',
        '|---|---|---|---:|---:|---:|']
    for name in sets:
        row = next((x for x in r['exit']['types'] if x['type'] == 'exit:'+name), None)
        lines.append(f"| {name} | {counts(row)} | {positions(row)} | {pf(row)} | {row['gp']:.6f} | {row['gl']:.6f} |" if row else f'| {name} | 0/0/0 | 0/0/0 | empty | 0 | 0 |')
    lines += ['', '| Range/type | Configs | Sources | Symbols | Configs with any Last-4 at start | All-orientation contexts Last-4 | Max SL/TP | Min trail gap |', '|---|---:|---:|---:|---:|---:|---:|---:|']
    for g in r['coverage']:
        if g['dimension'] not in ['strategyRange', 'type', 'lane']: continue
        s = g['start']; risk = g['protection']
        ratio = risk.get('slToTp', {}).get('max'); gap = risk.get('trailGapFraction', {}).get('min')
        lines.append(f"| {g['dimension']}: {g['label']} | {g['configs']} | {g['sources']} | {g['symbols']} | {100*s['configsLastNReady']/s['configs']:.2f}% | {s['lastNReadyPct']:.2f}% | {ratio if ratio is not None else '—'} | {gap if gap is not None else '—'} |")
    lines += ['', '| Hour UTC | Orders | Positions | Settled PF | Equity | Max DD so far | Exit settled |', '|---|---|---|---:|---:|---:|---:|']
    for ledger, hour, exit_hour in zip(r['ledger']['hourly'], r['hours'], r['exit']['hours']):
        assert ledger['t'] == hour['t'] == exit_hour['t']
        label = datetime.fromtimestamp(hour['t']/1000, timezone.utc).strftime('%m-%d %H:%M')
        gain, loss = hour['gpR'], hour['glR']
        hp = f'{gain/loss:.4f}' if loss else 'no-loss' if gain else 'empty'
        lines.append(f"| {label} | {counts(ledger)} | {positions(ledger)} | {hp} | {hour['equity']:.6f} | {100*hour['maxDdPctSoFar']:.4f}% | {exit_hour['settledOrders']} |")
    lines.append('')
(out / 'RESULTS.md').write_text('\n'.join(lines).rstrip()+'\n')
plt.rcParams.update({'font.size': 10, 'svg.fonttype': 'none'})
fig, axes = plt.subplots(1, 3, figsize=(15, 4), layout='constrained')
colors = ['#137c8b','#da743d','#137c8b','#da743d']
axes[0].bar(names, [r['total']['pf'] for r in results], color=colors)
axes[0].axhline(1, color='black', linewidth=1, linestyle='--');axes[0].set_title('Account unit-return PF')
axes[1].bar(names, [r['exit']['gp']-r['exit']['gl'] for r in results], color=colors)
axes[1].axhline(0, color='black', linewidth=1);axes[1].set_title('Exit settled net unit returns')
axes[2].bar(names,[r['exit']['settledOrders'] for r in results],label='Settled',color='#137c8b')
axes[2].bar(names,[r['exit']['openOrders'] for r in results],bottom=[r['exit']['settledOrders'] for r in results],label='Held',color='#d0d5dd')
axes[2].set_title('Exit orders');axes[2].legend()
for ax in axes: ax.tick_params(axis='x',rotation=30);ax.grid(axis='y',alpha=.2)
fig.savefig(out/'comparison.svg');plt.close(fig)
fig, axes = plt.subplots(1, 2, figsize=(12,4), layout='constrained')
for i, offset in enumerate([0,12]):
    for r in results:
        if not r['scenario'].endswith('-'+str(offset)):continue
        axes[i].plot(range(1,13),[h['equity'] for h in r['hours']],marker='.',label=r['scenario'])
    axes[i].set_title(f'Window {i+1}: hourly endpoint equity');axes[i].set_xlabel('Elapsed hours');axes[i].set_ylabel('Account equity');axes[i].legend();axes[i].grid(alpha=.2)
fig.savefig(out/'hourly-equity.svg');plt.close(fig)
print(out/'RESULTS.md')

# Keep generated text artifacts free of trailing whitespace.
for path in out.glob('*.svg'):
    path.write_text('\n'.join(line.rstrip() for line in path.read_text().splitlines())+'\n')
