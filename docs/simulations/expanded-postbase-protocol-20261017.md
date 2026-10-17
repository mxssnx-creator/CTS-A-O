# Expanded post-Base study protocol — 2026-10-17

This protocol is written before the expanded market results are scored. The
study checks correctness, hourly behavior, order activity and resource use. A
positive historical result does not establish future or venue execution PF.

## Chronological windows

| Role | Symbols | Evaluated history (UTC) | Trading (UTC) | Indicator-only warmup |
|---|---:|---|---|---:|
| Development comparison | First 20 frozen symbols | Oct 14 21:00–Oct 15 21:00 | Oct 15 21:00–Oct 16 21:00 | 205 hours before evaluated history |
| Final validation comparison | All 22 frozen symbols | Oct 15 21:00–Oct 16 21:00 | Oct 16 21:00–Oct 17 21:00 | 205 hours before evaluated history |

The complete source cache spans 397 hours, but each engine input is physically
cut to its own 253-hour window. Older candles initialize indicators only. Base
and config selection both use exactly 24 evaluated hours. Ranking tickers are
rebuilt from the preceding evaluated day, never the later validation day.

The frozen universe is AVAX, LINK, LTC, SUI, NEAR, DOT, ATOM, APT, BTC, ETH, SOL,
XRP, BNB, DOGE, ADA, BCH, TRX, ETC, OP, ARB, FIL and UNI, all USDT contracts.
The original acquisition failed on unavailable TON-USDT. Its protocol, failure
and request log are retained; ETC replaces it using contract availability and
listing age alone, before strategy scoring. Seventeen existing public caches
are reused and revalidated. No missing candles are filled.

## Frozen settings and variants

- Modeled round-trip cost is 0.15%, taker fee 0.05% per side and modeled
  slippage 0.025% per side. This is an explicit replay setting; it does not
  certify actual venue slippage or a separate production migration.
- Every arm uses the same $1,000 starting balance, 0.1% balance-based order
  unit, 10× leverage, and current configured account/range factors and caps.
  The runtime settings, sizing report and derived walk-forward settings must
  agree exactly. A change in sizing cannot be labeled a cost-only comparison.
- Baseline uses the current default focus, including the existing 60 Micro
  Break identities. The candidate adds the 12 optional reclaim8 identities.
  Existing PF, minimum sample, last-N, DDT, DDR, range, trend and activity
  thresholds remain unchanged. Each identity qualifies independently.
- Reclaim8 uses a completed candle's wick through the prior 8-bar channel,
  a close back inside the channel, a directional body and a close in the
  outer 35% of the candle. Penetration must be positive and no more than
  1.5 times the preceding ATR. The mirrored long/short formulas use the
  existing independent trend subsets, activity profiles and 24/48-bar
  drawdown calculations. New identities remain opt-in in production defaults.
- Sources, settings, complete grids, feed and commands are hashed before
  scoring. Failed or partial attempts are preserved and never scored as
  complete. Runs are serial with one compute worker and no network access.
- Every arm preloads its complete offline universe before its first compute,
  through the regular bounded history loader. Ordinary live startup retains
  its progressive loading. The v1 interrupted attempt predates this correction
  and is excluded. All four arms require a newly sealed source protocol.
- Admission requires at least 4,096 MiB of measured host/cgroup headroom,
  crediting only measured inactive file cache. Unknown readings or a held
  shared compute lock reject the attempt. Runtime memory protections remain
  enabled; no timeout bypass or lighter fallback qualifies as a complete run.
- Untagged DCA/Axis ladders retain their configured independent admission:
  with Axis per-range off, an actually Base-qualified pair can build these
  ladders for their own config validation; with it on, Wide must qualify.
  Diagnostic-only pairs cannot acquire this eligibility. Plain and trailing
  ranges and tagged ladders retain their exact range qualification.

## Required observations

Primary PF uses settled, actually allocated modeled orders from configs that
passed their own Base pair/range and later gates. Virtual accepted orders,
candidate tapes, cash-weighted outcomes and endpoint marks retain separate
samples. Every UTC trading hour is reported, including empty and losing hours.
No-loss samples disclose that convention rather than claiming a finite ratio.

Record Base evaluated/passed pairs and range reasons, diagnostic-only rows,
config construction and validation counts, current last-N eligibility, entry
rejections, executed configs/orders, direction/range/type/indication outcomes,
hourly PF, cash/equity drawdown, compute time and peak RSS. A memory fallback,
partial universe, missing hour, changed source or inconsistent settings makes
the attempt incomplete.

## Removal rule, applied only after the full 22-symbol evaluation

No indication, config or range is removed before that evaluation. A candidate
for disabling must have at least 50 funded settled closes and six active hours
in **each** chronological window, complete known unit-return evidence, PF
below 1 in both windows, and negative return in at least two-thirds of its
active hours in both windows. Exact identities and scopes must match; empty,
insufficient and correlated copies are not counted as independent proof.

Any resulting removal list is a configuration for the next prospective replay.
The already scored final day cannot serve as independent validation of that
newly selected list. Report whether a removed scope had positive contributions
in portfolio losing hours, and preserve held-position protection. If the
minimum evidence or completeness conditions are not met, publish the failure
or insufficiency and do not manufacture a passing or pruned result.
