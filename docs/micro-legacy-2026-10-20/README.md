# Recovered earlier result and identical-input comparison

The original nine-symbol feed was recovered and all 3,330 saved minute marks match. Window: **14 October 22:00–15 October 04:00 UTC**, with 24h evaluated prehistory and the original 97 focused pairs. These are previously examined historical simulations.

| Source / modeled round-trip cost | Funded simulated closes | Unit PF | Ordinary closes / PF | Exit closes / PF |
|---|---:|---:|---:|---:|
| Archived original / 0.20% | 483 | 3.536442206 | 439 / 3.869447445 | 44 / 1.696686737 |
| Reconstructed earlier checkpoint / 0.15% | 1,038 | 1.898224227 | 968 / 1.939280194 | 70 / 1.372068598 |
| Current comparison checkpoint / 0.15% | 1,082 | 1.829613562 | 962 / 1.919733686 | 120 / 1.118746065 |

Both paired runs pass 56/56 report checks. Shared exact trades retain identical unit returns. All 1,082 current entries pass their own config and context checks. Of six removed ordinary trades, two have retained current tape evidence showing failure of the current entry-time LCB check; four have no retained current tape and their specific rejection is not certified. Exit discovery and qualification also changed independently. Lower modeled costs alter net-cost target discovery and therefore the selected cohort; they do not guarantee a monotonically higher aggregate PF.

The original report has no source manifest. Checkpoint `15c31e5` is reconstructed from its handoff, so it is not authentication of every original source byte. The current paired checkpoint has source manifest `3b6b05207292a9fc625fabeae7bd4e06260f8854e474d62d6d78620c2e26146a`; the later runtime audit-only guard does not change its signals, gates or trade calculations. See [comparison.json](comparison.json) for hashes, exact cohort counts and limitations.

The original uncapped 2% sizing was retained for this comparison. Margin exceeds equity in these simulations. A positive six-hour PF does not certify feasible sizing, hourly profitability, later-window profit or venue fills. No production settings or exchange orders changed.

The separate archived 20-symbol / 12h sample has 49,259 closes at PF 0.218922909. Its exact source-tape and simulated-execution PF agree, including each hour and range; see [simulation-parity.json](../micro-2026-10-20/simulation-parity.json).
