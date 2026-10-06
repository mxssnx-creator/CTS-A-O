# 24 h simulation — signals with a lean engine, 30 symbols (6 Oct 2026)

Simulated trading only (public BingX 1m klines, nothing live). Code: `claude/sim3h-fixes` at 3cf45d9 + docs (all 70
test files pass; the 6 Oct fixes included). Window 5 Oct 15:00 → 6 Oct 15:00 UTC, 24 h pre-history.

Settings: the desk of the 3 h brief (`docs/sims/sim3h-2026-10-06/desk.json`) with
`{"signals":{"count":0},"grid":{"minimal":false,"minimalPlus":{"enabled":false}}}` and `toggles.axis false`
(operator, 6 Oct: signals with the most symbols that fit, Micro on). Signal confirmation stays on (a positive
coordination), so the engine runs Micro / Short / General / Long Normal and Trailing beside the signals.

## Result

| balance | PF $ | PF unit | orders | green hours | equity max DD | checks | peak RSS |
|---|---:|---:|---:|---:|---:|---|---:|
| $10.00 → $11.13 (+11.26 %) | 1.33 | 1.19 | 10,425 | 16 / 24 | 14.75 % | 49 / 49 | 5.2 GB |

| part | orders | PF $ | net |
|---|---:|---:|---:|
| **Signals** | 400 | **8.26** | **+$0.77** |
| Engine | 10,025 | 1.11 | +$0.36 |
| Micro | 1,573 | 0.35 | −$0.10 |
| Short | 5,111 | 1.11 | +$0.25 |
| General | 1,648 | 1.32 | +$0.09 |
| Long | 1,693 | 1.22 | +$0.12 |
| long side / short side | 5,802 / 4,623 | 3.46 / 0.34 | +$2.68 / −$1.56 |

Signals: 68 % of the profit from 4 % of the orders, every one of them long (the signal direction acceptance held the
short signals back: 1,851 skips, in a window where shorts lost). 87,553 signal candidates still fell outside the
active set with `count 0` — the validation filters (net > 0, 60 % positive 4 h blocks, net ÷ drawdown²) keep most
signals inactive.

## Variants on the same tapes (PF unit, net Σ trade %)

| variant | orders | PF unit | net |
|---|---:|---:|---:|
| baseline (as above) | 10,425 | 1.19 | +8,556 |
| signals off | 10,025 | 1.13 | +5,231 |
| signal ranking `net` | 11,309 | 1.48 | +23,330 |
| signal ranking `drawdown` | 10,745 | 1.47 | +21,598 |
| signals' own last-N off | 12,296 | 1.41 | +19,633 |
| signal confirmation off | 10,658 | 1.23 | +10,342 |
| engine direction acceptance on | 5,660 | 2.59 | +23,268 |
| conflict block on | 6,147 | 1.90 | +16,926 |
| validation last 50 | 6,230 | 1.61 | +13,515 |
| Block off | 10,425 | 1.42 | +4,669 |

One window. Engine direction acceptance won this window (PF 2.59) and lost the 5 Oct 3 h one (0.57 → 0.54); the
signal ranking (`lowdd` → `net` / `drawdown`) won here and was neutral on 6 Oct 10–13 (0.38 → 0.39). Defaults stay;
a second 24 h window decides (docs/positive-coordinations.md).

Files: `s24.html` (full report), `s24.md` (write-up).
