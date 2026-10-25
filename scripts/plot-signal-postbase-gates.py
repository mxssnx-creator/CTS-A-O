"""Plot all twelve reporting hours from the audited frozen before/after cohorts."""
import json
from pathlib import Path
import sys
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

before, after, out = map(Path, sys.argv[1:4])
fig, axes = plt.subplots(2, 2, figsize=(12, 7.5), constrained_layout=True)
colors = ['#64748b', '#087e8b']
for row, case in enumerate(['control-0', 'control-12']):
    for root, label, color, style in zip([before, after], ['Before', 'Corrected'], colors, ['--', '-']):
        s = json.loads((root/case/'session.json').read_text())
        assert len(s['hours']) == 12
        h = s['hours']; x = range(1, 13)
        # No-loss and empty prefixes have no finite PF; retain them as gaps rather than invent a score.
        pf = [z['cumGpR']/z['cumGlR'] if z['cumGlR'] is not None and z['cumGlR'] > 0 else float('nan') for z in h]
        axes[row, 0].plot(x, pf, style, color=color, marker='o', markersize=3, label=label)
        axes[row, 1].plot(x, [(z['eqEnd']/10-1)*100 for z in h], style, color=color,
                          marker='o', markersize=3, label=label)
    title = 'Original 12-hour window' if row == 0 else 'Following 12-hour window'
    axes[row, 0].set_title(title+' · cumulative settled PF', loc='left', weight='bold')
    axes[row, 1].set_title(title+' · equity change', loc='left', weight='bold')
    axes[row, 0].axhline(1, color='#b45309', linewidth=1, label='PF 1 neutral')
    axes[row, 1].axhline(0, color='#b45309', linewidth=1)
    axes[row, 0].set_ylabel('Unit-return PF')
    axes[row, 1].set_ylabel('Change from initial equity (%)')
for ax in axes.flat:
    ax.set_xticks(range(1, 13)); ax.set_xlabel('Completed simulated hour')
    ax.grid(alpha=.15); ax.spines[['top', 'right']].set_visible(False)
    ax.legend(frameon=False, fontsize=9)
fig.suptitle('Post-Base execution · 0.15% modeled round-trip costs once', fontsize=16, weight='bold')
out.parent.mkdir(parents=True, exist_ok=True)
fig.savefig(out, dpi=170)
plt.close(fig)
