# MV5 — Micro switch, last-N validation 5 (two windows)

Desk: `docs/sims/micro-2026-10-08/desks/MV5.json`, used as is. It is the V3 base (`MB.json`) with one switch:
`wf.validLastN` **5** (MB: 15). A `diff` of the two desk files shows that line and nothing else.

Two windows, run one after the other with `scripts/core-session.mjs` (20 symbols, 24 h pre, 12 h run, focus all,
balance $20, `--max-wait-min 300`, `CTS_CORE_COMPARE=0`, `CTS_CORE_VARIANTS=0`, `CTS_CORE_WORKERS=3`).

| window | folder | run (UTC) | end-at |
|---|---|---|---|
| w-latest | `MV5/w-latest/` | 7 Oct 12:00 → 8 Oct 00:00 | 2026-10-08T00:00:00Z |
| w-rally | `MV5/w-rally/` | 5 Oct 15:00 → 6 Oct 03:00 | 2026-10-06T03:00:00Z |

Figures come from each window's `session.md` and `raw.json`. "PF" is the engine's PF in trade units (sum of
winning r ÷ |sum of losing r|, every order at one unit). The report's PF $ (sized by volume) is quoted beside it.
"Incl. open" adds the open orders' mark r (`openEnd[].mtmR`) to the closed r. Net is the sum of r in trade units.
The report gives no per-range PF incl. open, so it is computed from raw.json (the per-range closed counts and PF
reconcile to the report's ranges table: Micro 19 / Short 925 / General 259 / Long 138 / Wide 31 / Signals 1,117).

## w-latest (7 Oct 12:00 → 8 Oct 00:00 UTC)

**(a) Micro, per-range table**

| orders closed | PF closed (unit) | PF $ (report) | open at end | PF incl. open | net closed (r) | net incl. open (r) | net closed $ (report) |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 19 | 0.124 (report 0.12) | 0.96 | 3 | 0.119 | −0.227 | −0.238 | −$0.00 |

**(b) Why candidates did not execute, per range — Micro:** crowd 1132 · lastN 689 · engineSide 250 · symPf 23
(2,094 skipped).

**(c) Micro Base and seats:** Base evaluated 5,900, passed 220 (median PF of the passed 2.26). Seated Micro configs
2,992 (normal 2,160, trailing 832); seat evaluation 68,918 evaluated, 2,992 passed.

**(d) Whole book:** 2,489 closed + 2,956 open = **5,445 orders**; PF closed 0.357; **PF incl. open 0.238**;
net incl. open −102.12 r (trade units).

**(e) Checks:** `checks: 55/55 ok`.

## w-rally (5 Oct 15:00 → 6 Oct 03:00 UTC)

**(a) Micro, per-range table**

| orders closed | PF closed (unit) | PF $ (report) | open at end | PF incl. open | net closed (r) | net incl. open (r) | net closed $ (report) |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 36 | 1.005 (report 1.00) | 0.32 | 6 | 0.786 | +0.001 | −0.033 | −$0.03 |

**(b) Why candidates did not execute, per range — Micro:** crowd 2192 · engineSide 638 · lastN 189 · duplicate 84 ·
symPf 42 (3,145 skipped).

**(c) Micro Base and seats:** Base evaluated 5,900, passed 65 (median PF of the passed 2.47). Seated Micro configs
1,301 (normal 682, trailing 619); seat evaluation 17,998 evaluated, 1,301 passed.

**(d) Whole book:** 3,577 closed + 4,193 open = **7,770 orders**; PF closed 3.978; **PF incl. open 1.134**;
net incl. open +11.86 r (trade units).

**(e) Checks: `checks: 54/55 ok — FAILED: execution: strategy type axis executed orders`.** This window's report
does not pass its own check. Axis executed no order in this window, closed or open: the Strategies table has Normal
303 and Trailing 435 (738 engine orders) and no Axis row, and raw.json has no axis trade. The desk has Axis on
(`toggles.axis: true`). The window's numbers are reported as they came out; the cause is not diagnosed here.
Per CLAUDE.md and `docs/report-integrity.md`, this report is not a validated report.

## Desk settings (MV5.json)

| setting | value |
|---|---|
| `wf.validLastN` | **5** (MB: 15) — the one switch |
| `wf.lastN` / `wf.signalValidLastN` | 15 / 0 |
| `gates` | `minPf` 1.05; `rangeMinPf` micro, minimal, short, general, long 1.05; `baseSetsMinPf` 1; `lastNFloor` 5; `minDdtH` 18 |
| `wf.normalBaseMinPf` / `wf.symGate` / `wf.seatPer` | 1.05 / `provenSide` / `config` |
| `wf.coord` | enabled; `confirm` true; `hourLock` 0; `cooldown` "off"; `conflict` false |
| `wf.engineSideAccept` | on: PF 1.05, 24 h, 30 trades, per indication `mc` |
| `toggles` | normal on, trailing on, axis on; block, blockActive, dca, dcaActive off |
| `grid.micro` | tp 0.10–0.40 %; slOfTp 1–5; trail 0 / 0.5 / 0.75; `minSl` 0.5 %; `minSlNet` 0.2 % (on) |
| `settings.ranges` | micro, short, general, long true; minimal false; minimalPlus false |
| `grid.rangeGate` | on: lastN 75, minPf 1.05; `minSlEval` 0.5 % |
| `signals` (V3) | enabled; `normal.slOfTp` [1.5, 2, 3]; `holdH` 24; `accept` on (PF 1.3, 48 h, 6 trades); `sideAccept` on (PF 1.3, 24 h, 20 trades); `count` 0; `rank` net; 12 sources true |
| `live` | `ratio` 1, `notionalUsd` 1, `liveLastN` 25, `kinds` ["trailing"], `excludeRanges` ["wide"] (live settings) |
| `forceSymbols` | XRP-USDT, SOL-USDT, BCH-USDT |

Positive coordinations (`docs/positive-coordinations.md`) are all on in MV5, as in MB and V3: signal confirmation, hour
lock off, cooldown off, conflict off, signal acceptance and direction acceptance, signals on own base, volume floor,
engine direction acceptance on, Normal and Trailing on with Block Active off, Axis on, DCA off, `baseSetsMinPf` 1,
warm-up on, `seatPer` config, `baseTargets` (code defaults, not set in the desk file), and the allocator caps
(`MALLOC_ARENA_MAX=2 MALLOC_MMAP_THRESHOLD_=1048576`, set on both runs).

Folders: `w-latest/` and `w-rally/` hold `session.md` and `writeup.md` for each window. HTML and `raw.json` are not
copied here; they stay in the run folder (`runs/MV5-<NAME>/`, not committed).
