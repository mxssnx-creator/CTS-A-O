# Earlier replay comparison audit — 17 October 2026

This read-only audit inspected saved reports, normalized settings and raw
session artifacts. It ran no market replay or exchange request and selected
no new config. Return PF below means canonical unit net returns on funded
settled simulated closes; sized-dollar PF is a separate diagnostic. Previously
scored windows are development evidence and must not become untouched tests.

## Comparable Break reference

The corrected matched reference is
`runs/break-post-fix-9x12-20261017/corrected-12h-{old,new}.{json,md}`,
with `protocol-corrected-12h.json`. The preserved launcher is
`runs/break-9x12-review-20261017/corrected-12h.mjs`.

Both arms use BTC/ETH/SOL/XRP/BNB/DOGE/ADA/AVAX/LINK against USDT,
history 2026-10-14 04:00–16:00 UTC and trading 16:00–2026-10-15 04:00 UTC;
Micro on its eligible 5m lane, Signals off, $1,000, 2% equity sizing, 10×
leverage and 0.20% round-trip cost. The launcher explicitly sets
`--pre 12 --run 12 --selection-hours 12`, evaluation/end boundaries, saved
old/new settings, one worker and the offline transport guard. Runtime
preflight verifies actual `preH=simH=longH=12` before scoring.

| Measure | Legacy 4 IDs | Updated 60 IDs |
|---|---:|---:|
| Micro Base pairs passed | 4 / 12 | 4 / 60 |
| Micro configs validated | 696 / 3,128 | 728 / 2,176 |
| Pooled historical validation PF | 4.104 | 10.345 |
| Funded settled orders | 1,563 | 726 |
| Executed Return PF | 0.342 | 3.272 |
| Closed net | −$18.768 | +$5.201 |
| Positive / flat / negative hours | 3 / 3 / 6 | 3 / 6 / 3 |

The update improved aggregate PF while reducing orders. Updated negative
hours were 18:00, 19:00 and 23:00 UTC; six hours had no closes. In its saved
raw report, 56/60 Micro pairs first fail the Base close minimum and 44 fail
only that gate. Config first failures are 1,344 net, 96 DDT and eight PF;
728 pass. Execution records 188 symbol-PF skips. These are measured gate
outcomes, not permission to relax them.

Only Balanced 5m Donchian and Donchian8 with DD24/DD48 pass here. Each
DD24/DD48 pair has identical realized totals, so more independent config
identities do not imply more independent evidence. The legacy raw Base
Micro floor is 1.00 and updated is 1.10 despite the protocol's common 1.10
description; all four passing legacy pairs have no loss, so that discrepancy
does not change membership on this sample. Both config-evaluation floors
are 1.10. Preserve the actual applied floor in future comparisons.

## History and cohort differences in earlier results

`docs/sims/systemwide-pf-volume-audit-20261016.md` records 792 funded orders,
PF 2.374852, +$4.418713 and four positive hours out of six. It uses four
symbols, 15m trading, $1,000 and 336h config selection. It cannot establish
a regression against the later nine-symbol, multiple-lane, $10 replay with
explicit 6h selection in
`docs/simulations/systemwide-postbase-6h-20261017/report.json`. That later
sample has 7,946 funded orders, PF 1.899553, sized-dollar PF 0.750517 and
−$0.171267, with two positive and four negative hours. The trade window is
the same Oct14 22:00–Oct15 04:00 UTC; the evaluated cohort and settings differ.

The old 12h replay draft also inherited 336h selection; its corrected 12h
replacement above supersedes it for that experiment. The ignored
`runs/break-9x24-review-20261017/run.mjs` likewise omits `--selection-hours`.
All inspected 24h raw artifacts record `tapeAgg.evalRule.preH=336` while
their protocol says `preH=24`. They are not a bounded 24h-selection test.

| Existing 24h trade window | Arm | Orders | Return PF | Net | Positive / negative / flat |
|---|---|---:|---:|---:|---:|
| Oct12 00:00–Oct13 00:00 UTC | legacy | 1,593 | 0.173949 | −$39.873 | 6 / 13 / 5 |
| Same | updated | 11,851 | 0.446943 | −$43.096 | 6 / 16 / 2 |
| Oct13 00:00–Oct14 00:00 UTC | updated | 31,149 | 0.324630 | +$44.368 | 7 / 17 / 0 |

These values come from `old.json`, `new.json` and
`adjacent/trade-2026-10-13/new.json`, with matching `raw*.json`. Adjacent
Oct11 and trailing-off sensitivities were also scored. Neither these windows
nor their sensitivities are untouched evidence for pruning or tuning. A new
study must seal actual selection hours, costs, sizing and chronological
selection rules before scoring.

## Correction to the archived lower-cost comparison

Additional artifacts reside in the separate existing checkout
`/workspace/scratch/ff6263fe65f6/cts-ao-trailing`. Its tracked
`docs/simulations/cost-015-and-positive-replay-audit-20261017.md` says only
cost changed, but the exact referenced JSON settings contradict that claim:

| Artifact under `runs/positive-24h-pf-recalc-20261017/` | Cost | Equity sizing | Funded orders | Return PF | Sized-dollar PF | Net |
|---|---:|---:|---:|---:|---:|---:|
| `matched-focus/html/data.json` | 0.20% | 2% | 572 | 0.483424 | 0.600055 | −$0.295683 |
| `cost015-matched37-capped-html/data.json` | 0.15% | 0.1% | 1,327 | 0.712008 | 1.391965 | +$0.093060 |

Both use ATOM/APT/NEAR/DOT, history Oct11 21:00–Oct13 21:00 UTC,
trading Oct13 21:00–Oct14 21:00 UTC, 48h selection, focus 37 and the same
0.75× position / 7× gross caps. The twentyfold sizing change affects funding
and therefore the scored cohort. This is a combined cost/sizing policy
comparison; a cost-only claim requires identical sizing. The 0.15% sample's
unit PF remains below one despite its positive sized cash net.

`positive-historical-corrected-html/data.json` in that directory reproduces
2,184 funded orders, PF 4.723109, sized-dollar PF 2.024519 and +$0.445260,
with 14 positive / four negative / six flat hours. It contains 2,169 engine
orders and 15 Signal orders (Signal PF 0.030867). The earlier summary with
43 Signals at PF 51.27 describes a different 2,212-close cohort. Do not join
those headlines. The archived positive Base applied floors are 1.00 across
ranges; current matched settings use Micro 1.05, Minimal/Short 1.10, General
1.20 and Long 1.30, and explicitly set `longH=48`. Older coordinator and
selection provenance also differ. Restoring the old counts would not itself
prove correctness under current gates.

## Cost source implementation status at inspection

The separate cost checkout is on
`integration/trailing-range-configs-20261017`, committed HEAD
`2860c3fd8ce6e5a277e7d164453e10fe0ba6eef1` (the replay audit documentation).
At inspection it contains an active, uncommitted source patch: new
`src/core/model-cost.ts` exports `RT_COST=0.0015`; `config.ts` imports and
re-exports it, with default per-side slippage 0.00025 instead of 0.0005.
Related uncommitted changes include runtime migration v34, cost propagation,
fixed range-distance construction, and
`src/core/server/cost-default-runtime.test.ts`.

Thus an actual source implementation exists, but the docs HEAD is not its
implementation commit. Its broad worktree is owned by another active task;
coordinate with that owner and integrate a validated committed checkpoint.
This audit did not validate or copy that patch. Earlier reports saying the
cost change was replay-only describe their recorded checkpoint, not this
later uncommitted work.

Verification for this report: inspected saved JSON settings/cohort totals and
launcher arguments, checked the separate checkout's Git state and source
diff, and ran `git diff --check`. No profitability or live result is claimed.
