# Trade sim performance: 768cd0d (6 Oct, v3b) vs main d5dac9a, and the first fix 7b32e4a

Operator, 7 Oct: "Trade sim is very slow.. previous ones were faster.. find the performance bugs".

**Answer.** On the same desk, window and machine, main (d5dac9a) took **1,218 s** against **1,006 s** for 768cd0d (+21 %;
+24 % against the unprofiled-worker A run, 980 s). All of the extra time is in **Base**: worker CPU in Base rose
from 1,006 s to 1,684 s (+67 %), and the last compute's Base phase from 141 s to 237 s. Tapes did not get slower.
The cause is the long / short side split, a02b343 ("Long and short run independently", #108 / ab46639). It reached the
v3b line in merge **1c94cb3** (first parent 768cd0d) and main's first-parent history in **716976d** (#110). Both of
those are already slow (1,183 s / 1,196 s). In the hot Base loop, every combo × symbol builds two new Int8Array copies
of its signal (`sideSignal`), scans the signal (`splitSides`), runs `simulate` twice over every bar, then merges and
re-sorts the trades. The first fix **7b32e4a** (C) brings the run to **899 s**, 11 % faster than A, with the same
executed book as B.

## Setup

- Machine: `nproc` 4, 16,094 MB RAM, no swap. Node v22.22.0. One run at a time (see "run hygiene" below).
- Desk: `bench-desk.json` in this folder. The task prompt carried a placeholder instead of the desk; the parent session
  sent this JSON (the v3 desk: x01 v2 settings, 30 symbols, `wf.entryCrowd {"mc": 3}`, Axis on, Block off).
- Command, from each commit's worktree root (`tools/runbench.sh`):
  `MALLOC_ARENA_MAX=2 MALLOC_MMAP_THRESHOLD_=1048576 CTS_CORE_COMPARE=0 CTS_CORE_VARIANTS=0 CTS_CORE_WORKERS=3
  /usr/bin/time -v node --max-old-space-size=7168 --expose-gc --experimental-strip-types --no-warnings
  [--cpu-prof --cpu-prof-dir=… --import tools/preload.mjs] scripts/core-session.mjs --symbols 30 --pre 24 --run 24
  --focus all --desk bench-desk.json --max-wait-min 300 --end-at 2026-10-06T15:00:00Z --out … --html … --writeup …
  --dump …`. Every commit accepted every flag.
- Worker profiles: the pool spawns workers with a fixed `execArgv` (`src/core/server/pool.server.ts:51`), so
  `--cpu-prof` alone profiles only the main thread. `tools/preload.mjs` (loaded with `--import`, no source change)
  appends `--cpu-prof` to each worker's execArgv. A, B and C were all run this way. The first A run (980 s) had a
  main-thread profile only; its result book is identical to the second A run's.
- Data: BingX public 1m klines, fetched live by each run (the backfill is about 30 s per compute in every run).

## Runs

Wall, CPU and RSS come from `/usr/bin/time -v`. "Compute #4" is the session's own `[core-v2] compute #4 done in` line;
the phase split of that last compute comes from the dump's `engine.phases` (ms, with the main-thread wall share in
brackets). Per-phase seconds over all computes come from the `[N s]` progress lines. They are sampled every 30 s, so
each value is ±30 s.

| run | commit | wall | user / sys CPU | max RSS | computes | compute #4 | Base (last) | Tapes (last) | Simulation (last) | checks |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| A | 768cd0d (v3b line, 6 Oct) | **1,006 s** (16:46) | 2,809 / 136 s | 5,613 MB | 4 | 295 s | 140.6 s | 126.1 s | 22.4 s | 50 / 51 |
| A (main-thread profile only) | 768cd0d | 980 s (16:21) | 2,720 / 94 s | 5,654 MB | 4 | 287 s | 142.1 s | 118.5 s | 21.0 s | 50 / 51 |
| B | d5dac9a (main) | **1,218 s** (20:18) | 3,399 / 195 s | 4,693 MB | 4 | 379 s | 236.8 s | 118.1 s | 16.9 s | 53 / 55 (exit 1) |
| C | 7b32e4a (main + Base fix) | **899 s** (14:59) | 2,478 / 127 s | 4,787 MB | 4 | 263 s | 136.0 s | 103.5 s | 16.6 s | 54 / 55 (exit 1) |
| bisect | 1c94cb3 (768cd0d + main #108, #111) | 1,183 s (19:43) | 3,252 / 74 s | 4,476 MB | 4 | 368 s | 227.1 s | 110.9 s | – | 50 / 51 (exit 1) |
| bisect | 716976d (#110, main's first merge containing A) | 1,196 s (19:56) | 3,258 / 75 s | 4,461 MB | 4 | 374 s | 232.7 s | 111.7 s | – | 50 / 51 (exit 1) |

Base on 3 cores, 25,098 combos in every run. Tape pairs per compute: A 1,304 / 1,386 / 1,135 / 1,257; B 1,072 / 1,194
/ 1,056 / 1,184; C 1,071 / 1,192 / 1,056 / 1,184.

Per-compute phase seconds (progress lines, ±30 s):

| run | compute 1 Base / Tapes | 2 Base / Tapes | 3 Base / Tapes | 4 Base / Tapes | Base total | Tapes total | backfill |
|---|---|---|---|---|---:|---:|---:|
| A | 60 / 61 | 90 / 121 | 121 / 90 | 151 / 121 | 422 | 393 | ~90 |
| B | 90 / 60 | 121 / 120 | 181 / 90 | 241 / 90 | **633** | 360 | 90 |
| C | 60 / 30 | 60 / 91 | 90 / 90 | 120 / 91 | 330 | 302 | 91 |
| 1c94cb3 | 60 / 60 | 120 / 91 | 181 / 92 | 211 / 121 | 572 | 364 | 90 |
| 716976d | 60 / 61 | 121 / 91 | 181 / 91 | 240 / 91 | 602 | 334 | 90 |

Signals, Real and Paper are each ≤ 31 s per compute in every run (one progress sample or less). The 6 Oct v3b report
(883 s on 2 cores) is a different machine and desk file, so it is quoted only for reference.

**B and C exit with status 1** because the report's own checks fail:
- B: "config sets: every built config kept or dropped for too few closes" and "execution: strategy type axis executed
  orders".
- C: only the axis check fails. C's commit fixes the config-set record ("counts held-only builds under their filter").
- A fails the same axis check (50 / 51), but its script still exits 0.

## Bisect

`git log --first-parent 768cd0d..d5dac9a` lists 23 merges. 768cd0d is on the branch that 716976d (#110) merges. The
three earlier merges in that list (ab46639 #108, 40771b2 #111, 0eaf3d9) are not descendants of A.

| step | commit | wall | Base (last compute) | verdict |
|---|---|---:|---:|---|
| A | 768cd0d | 1,006 s | 141 s | fast |
| 1 | 1c94cb3 = merge of main (#108, #111) into the v3b branch; first parent 768cd0d | 1,183 s | 227 s | **slow: first slow merge after A** |
| 2 | 716976d = #110, first first-parent merge on main that contains A | 1,196 s | 233 s | slow |
| B | d5dac9a | 1,218 s | 237 s | slow |

1c94cb3's only parents are A and main at 0eaf3d9, so the slowdown comes from main's side of that merge: #108
(ab46639). The profile diff below names only functions from a02b343, the #108 commit "Long and short run
independently". A direct commit-level check, a02b343 against its parent 1251c57, was still running when this README
was committed (see the end of this file).

## Profiles

Summaries: `profiles/<run>.txt` (top 25 self and top 15 inclusive per thread kind), `profiles/<run>.json` (top 60 /
40), `profiles/<run>-worker-phases.md` (worker self time split into Base, under `baseRuns`, and Tapes, under
`buildTapesGen`), `profiles/diff-A-B.md`, `profiles/diff-A-C.md`. Tools: `tools/profsum.mjs`, `tools/profdiff.mjs`,
`tools/profphase.mjs`, `tools/phases.mjs`, `tools/compare.mjs`.

Thread totals (ms sampled; the main thread mostly waits on the workers):

| | A | B | C |
|---|---:|---:|---:|
| main sampled / idle | 1,005,278 / 801,685 | 1,216,767 / 1,052,026 | 898,190 / 747,046 |
| main GC | 52,761 (5.2 %) | 39,066 (3.2 %) | 36,713 (4.1 %) |
| workers (3) sampled / idle | 2,926,563 / 642,107 | 3,566,631 / 634,557 | 2,608,902 / 574,743 |
| workers GC | 189,967 (6.5 %) | 196,140 (5.5 %) | 213,968 (8.2 %) |
| **worker CPU in Base** (`baseRuns`) | **1,005,854** | **1,684,036** | **922,888** |
| worker CPU in Tapes (`buildTapesGen`) | 1,004,877 | 977,995 | 827,132 |
| worker CPU elsewhere (signal tapes, messaging) | 273,724 | 270,044 | 284,138 |

### Workers: top self time

| # | A (768cd0d) | ms | B (d5dac9a) | ms | C (7b32e4a) | ms |
|---:|---|---:|---|---:|---|---:|
| 1 | simulate backtest.ts:78 | 538,550 | simulate backtest.ts:78 | 676,815 | simulate backtest.ts:78 | 277,202 |
| 2 | buildTapesGen walkforward.ts:1162 | 257,059 | buildTapesGen walkforward.ts:1339 | 238,106 | simulateAxisDesk axis.ts:353 | 223,019 |
| 3 | simulateAxisDesk axis.ts:353 | 217,132 | simulateAxisDesk axis.ts:353 | 225,116 | (garbage collector) | 213,968 |
| 4 | (garbage collector) | 189,967 | **splitSides backtest.ts:277** | 201,662 | buildTapesGen walkforward.ts:1339 | 196,197 |
| 5 | simulateAxis axis.ts:77 | 124,215 | (garbage collector) | 196,140 | simulateAxis axis.ts:77 | 124,331 |
| 6 | research2.ts:543 (value area) | 75,670 | **sideSignal backtest.ts:267** | 185,697 | runComboSteps pipeline.ts:801 | 101,837 |
| 7 | runComboSteps pipeline.ts:796 | 71,858 | simulateAxis axis.ts:77 | 128,803 | research2.ts:543 (value area) | 82,831 |
| 8 | htfBars cache.ts:171 | 58,385 | runComboSteps pipeline.ts:801 | 119,422 | htfBars cache.ts:171 | 62,142 |
| 9 | hourlyNet stats.ts:46 | 57,451 | research2.ts:543 | 81,392 | (program) | 41,179 |
| 10 | statsOf stats.ts:64 | 52,182 | hourlyNet stats.ts:46 | 63,722 | makeTape walkforward.ts:879 | 40,516 |
| 11 | makeTape walkforward.ts:831 | 51,891 | htfBars cache.ts:171 | 59,892 | symStat pipeline.ts:322 | 38,854 |
| 12 | (program) | 51,148 | statsOf stats.ts:64 | 58,117 | memo cache.ts:28 | 37,308 |
| 13 | memo cache.ts:28 | 37,137 | memo cache.ts:28 | 50,355 | bots.ts:145 | 29,363 |
| 14 | symStat pipeline.ts:317 | 33,908 | pipeline.ts:852 | 46,019 | statsOf stats.ts:64 | 28,133 |
| 15 | pipeline.ts:829 | 33,528 | (program) | 42,249 | simulateDca dca.ts:23 | 25,723 |

Main thread top 25 self / top 15 inclusive per run are in `profiles/*.txt`. The main thread does not explain the
regression: its busy time is about 205 s (A), 165 s (B) and 151 s (C), led by `selectFixedGen` (walkforward.ts, about
13–14 s), `postMessage` (10–12 s), `seatKey` (about 6 s) and core-session `unit` (about 5.5 s).

### Diff A → B (workers; `profiles/diff-A-B.md`)

| function (B file:line) | A self ms | B self ms | Δ ms | × |
|---|---:|---:|---:|---:|
| `splitSides` src/core/sim/backtest.ts:277 (only B) | 0 | 201,662 | +201,662 | new |
| `sideSignal` src/core/sim/backtest.ts:267 (only B) | 0 | 185,697 | +185,697 | new |
| `simulate` src/core/sim/backtest.ts:78 | 538,550 | 676,815 | +138,265 | 1.26 |
| `runComboSteps` src/core/pipeline/pipeline.ts:801 | 71,858 | 119,422 | +47,564 | 1.66 |
| `mergeSideTrades` src/core/sim/backtest.ts:293 (only B) | 0 | 26,906 | +26,906 | new |
| pipeline.ts:852 (anonymous) | 36,029 | 51,628 | +15,599 | 1.43 |
| `memo` src/core/indications/cache.ts:28 | 37,137 | 50,355 | +13,218 | 1.36 |
| backtest.ts:297 (mergeSideTrades sort comparator, only B) | 0 | 11,895 | +11,895 | new |
| `hourlyNet` + `statsOf` src/core/metrics/stats.ts:46 / :64 | 109,633 | 121,839 | +12,206 | 1.11 |
| `bothSides` src/core/sim/backtest.ts:288 (only B) | 0 | 4,779 | +4,779 | new |
| `laneOf` src/core/indications/registry.ts:1032 | 3,245 | 7,228 | +3,983 | 2.23 |

Present only in B: `splitSides`, `sideSignal`, `mergeSideTrades` and its comparator, `bothSides` (all from a02b343),
`statOf` / `statKept` (walkforward.ts:1372 / 1379, 3.8 s). Together the side-split functions add about **+616 s of
worker CPU**, or about 205 s of wall over 3 workers. That matches B − A = +212 s wall and +96 s on the last compute's
Base phase.

## Diagnosis (B, d5dac9a)

The hot path is Base: `baseRuns` → `rangeBaseStats` (pipeline.ts:723) → `runCombo` → `runComboSteps`
(pipeline.ts:801). It runs for 25,098 combos × every protect cell of their ranges × 30 symbols, four times a session.
Inclusive time under `rangeBaseStats` went from 646 s (A) to 1,276 s (B).

1. **`splitSides` / `sideSignal` — a full signal copy per combo × cell × symbol** (`src/core/sim/backtest.ts:267–285`,
   called by `bothSides` at pipeline.ts:824). For every combo × protect cell × symbol, the signal is scanned for both
   sides. When it has both, it is copied twice into new `Int8Array(sig.length)` arrays (1m bars × 48 h+). The signal
   is the same cached array for every protect cell and range of the pair, so this is per-step work that used to be
   per-pair (zero before). It costs 387 s of worker CPU in self time alone and also adds allocation pressure.
2. **`simulate` runs twice over every bar** (`backtest.ts:78`, +138 s, ×1.26). Each direction's run walks the whole
   series, including all the flat bars between entries, so a two-sided signal costs two full passes.
3. **Merge and re-split of the trades** (`mergeSideTrades` backtest.ts:293 + comparator :297, +39 s). The two runs'
   trades are concatenated and sorted per symbol. For signal indications the merged list is then filtered again per
   side (`symTrades.filter((x) => x.side === sd)`, pipeline.ts:838–845), part of `runComboSteps` +48 s and the
   pipeline.ts:852 closure +16 s.
4. **Per-call hour map** (`hourlyNet` stats.ts:46, called from `statsOf` for every combo × symbol stat). It is not new,
   but the doubled stats calls push it to 64 s, and it allocates a Map of hour objects per call.

GC is not the cause: worker GC is 6.5 % (A) against 5.5 % (B). Tapes did not regress: worker CPU in `buildTapesGen`
was 1,005 s in A and 978 s in B. Main-thread work fell slightly from A to B.

## C (7b32e4a): the fix, and what remains

C memoizes `splitSides` per signal array, has `simulate` jump from one entry to the next while flat
(`nextEntryIndex`), tallies hourly net inline in `statsOf`, and uses each direction's own run for the per-side
stats.
- Worker CPU in Base: 1,684 s → 923 s (−45 %, and 8 % below A's 1,006 s).
- `simulate`: 677 s → 277 s. `splitSides` + `sideSignal`: 387 s → 27 s. `hourlyNet`: 64 s → 0.
- Wall: 1,218 s → 899 s (−26 %; −11 % against A).
- Same-result check:
  - Executed book identical to B: 8,766 orders, unit PF 5.31, net and every per-range, per-type and per-side row
    below.
  - Pool differs slightly: 174,942 vs 174,902 tapes; 153,089 vs 153,049 configs evaluated; General "why not
    executed" 2,175 vs 2,176. C's commit changes the config-set record, but this is not certainly a code effect:
    A's two runs also differ by 20 tapes in the pool (182,820 vs 182,840) with identical books.

**Where C's time goes now** (worker self time per phase, `profiles/C-7b32e4a-worker-phases.md`):

| Base (923 s worker CPU) | self ms | share | Tapes (827 s worker CPU) | self ms | share |
|---|---:|---:|---|---:|---:|
| simulate backtest.ts:78 | 239,638 | 26.0 % | simulateAxisDesk axis.ts:353 | 222,980 | 27.0 % |
| runComboSteps pipeline.ts:801 | 101,837 | 11.0 % | buildTapesGen walkforward.ts:1339 | 196,197 | 23.7 % |
| research2.ts:543 (value-area indication) | 69,490 | 7.5 % | simulateAxis axis.ts:77 | 124,315 | 15.0 % |
| htfBars cache.ts:171 | 50,964 | 5.5 % | makeTape walkforward.ts:879 | 40,446 | 4.9 % |
| pipeline.ts:854 (per-symbol closure) | 45,087 | 4.9 % | simulate backtest.ts:78 | 37,498 | 4.5 % |
| symStat pipeline.ts:322 | 38,854 | 4.2 % | simulateDca dca.ts:23 | 25,703 | 3.1 % |
| statsOf stats.ts:64 | 28,133 | 3.0 % | research2.ts:543 | 13,341 | 1.6 % |
| memo cache.ts:28 | 26,452 | 2.9 % | htfBars cache.ts:171 | 11,178 | 1.4 % |
| mergeSideTrades backtest.ts:323 | 24,961 | 2.7 % | memo cache.ts:28 | 10,856 | 1.3 % |
| bots.ts:145 (comboSignal) | 24,395 | 2.6 % | cache.ts:129 (htf memo) | 6,991 | 0.8 % |
| nextEntryIndex backtest.ts:305 | 19,811 | 2.1 % | mk indicators.ts:348 | 6,489 | 0.8 % |

Worker GC in C is 214 s (8.2 %). Main-thread top in C: `selectFixedGen` walkforward.ts:2476 12.9 s, `postMessage`
10.2 s, `seatKey` walkforward.ts:2050 5.9 s, core-session `unit` 5.5 s, `signals.ts:442 fill` 4.4 s.

Leads for the next fixes (not changed here):
- **Axis in Tapes** (`simulateAxisDesk` + `simulateAxis`, 347 s, 42 % of Tapes). Axis executed 0 orders in every run
  here; that is the failing "strategy type axis executed orders" check.
- **`buildTapesGen` self, 196 s.**
- **research2.ts:543 value-area indication.** For each bar it rescans `look` (up to 192) bars twice and allocates a
  Float64Array of up to 400 bins, an O(n × look) cost per series, 83 s overall.
- **`htfBars`, 62 s.** It runs under a memo (`SeriesCache.htf`, cache.ts:129), so either the memo is cleared between
  combos (`forgetSuffix` / keep trims at cache.ts:15–27) or many distinct series reach it. Worth checking.
- **`mergeSideTrades` still sorts** where a two-way merge of two exit-ordered lists would do (25 s + 11 s comparator).

## Trading results A vs B vs C (same window and desk: a causal code comparison)

Operator: "working like earlier with positive high PF and orders". On this window and desk, **PF is not lower on
main; it is higher**. Unit PF is 4.11 in A and 5.31 in B. As sized, PF $ is 4.28 → 4.72 and the balance $10.00 →
$14.09 (A) vs → $14.83 (B). What fell is the **engine's order count**: 4,408 → 2,530 non-signal orders (−43 %).
Signal orders rose by 311 and their PF rose. Unit = one order at one unit after the 0.20 % cost; "incl. open" adds
the open-at-end positions marked to market.

Engine stages per range (Base evaluated / passed; seated = configs that took a seat over the run):

| range | A Base | B Base | C Base | A seated | B seated | C seated |
|---|---:|---:|---:|---:|---:|---:|
| Micro | 5,900 / 105 | 5,900 / 106 | 5,900 / 106 | 1,690 | 1,695 | 1,695 |
| Short | 8,176 / 651 | 8,176 / 627 | 8,176 / 627 | 2,350 | 2,334 | 2,334 |
| General | 8,176 / 550 | 8,176 / 537 | 8,176 / 537 | 818 | 847 | 847 |
| Long | 8,176 / 708 | 8,176 / 668 | 8,176 / 668 | 1,344 | 1,438 | 1,438 |
| Wide | 19,072 / 264 | 19,072 / 269 | 19,072 / 269 | 315 | 316 | 316 |
| Signals | 126 / 126 | 126 / 126 | 126 / 126 | 2,500 | 2,417 | 2,417 |
| total | 25,098 / 1,342 | 25,098 / 1,277 | 25,098 / 1,277 | Real 7,760, main pairs 1,257 | Real 7,712, main pairs 1,184 | Real 7,712, main pairs 1,184 |

Executed book per range:

| range | A orders | A PF | A PF incl. open | A net | B orders | B PF | B PF incl. open | B net | C |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 124 | 0.53 | 0.51 | −0.27 | 108 | 0.50 | 0.49 | −0.26 | = B |
| Short | 2,406 | 2.84 | 2.81 | 28.37 | 1,324 | 2.71 | 2.66 | 17.29 | = B |
| General | 799 | 2.20 | 2.45 | 9.58 | 508 | 2.13 | 2.39 | 6.26 | = B |
| Long | 1,079 | 2.74 | 3.40 | 23.16 | 590 | 2.40 | 3.09 | 11.81 | = B |
| Wide | 0 | – | – | – | 0 | – | – | – | = B |
| Signals | 5,925 | 6.40 | 2.21 | 130.85 | 6,236 | 8.66 | 2.81 | 162.50 | = B |
| **total** | **10,333** | **4.11** | **2.45** | **191.68** | **8,766** | **5.31** | **2.78** | **197.61** | = B |

Per strategy type:

| type | A orders | A PF | A PF incl. open | A net | B orders | B PF | B PF incl. open | B net |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal | 2,186 | 2.28 | 2.37 | 28.17 | 1,330 | 1.99 | 2.08 | 14.56 |
| Trailing | 2,222 | 3.12 | 3.69 | 32.67 | 1,200 | 3.09 | 3.65 | 20.54 |
| Signal · Normal | 1,341 | 4.97 | 2.22 | 33.80 | 1,406 | 6.44 | 2.54 | 38.90 |
| Signal · Trailing | 4,584 | 7.17 | 2.21 | 97.05 | 4,830 | 9.79 | 2.91 | 123.60 |
| Axis | 0 | – | – | – | 0 | – | – | – |

Per side:

| side | A orders | A PF | A PF incl. open | A net | B orders | B PF | B PF incl. open | B net |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| long | 10,289 | 4.13 | 2.45 | 191.92 | 8,721 | 5.53 | 2.85 | 199.33 |
| short | 44 | 0.26 | 0.26 | −0.23 | 45 | 0.06 | 0.04 | −1.72 |

Biggest differences A → B:
- **Short range:** orders 2,406 → 1,324 (−45 %), net 28.4 → 17.3 units.
- **Long range:** 1,079 → 590 (−45 %), net 23.2 → 11.8.
- **General range:** 799 → 508 (−36 %).
- **By type:** Normal 2,186 → 1,330 (PF 2.28 → 1.99), Trailing 2,222 → 1,200.
- **Base and seating:** Base passes fewer engine pairs (1,342 → 1,277; Short −24, Long −40), and main pairs fall
  1,257 → 1,184, but seated engine configs barely change (Long even +94). So the order loss happens after seating,
  at entry gating in the run.
- **Signals:** more orders and higher PF (6.40 → 8.66).
- **Short side:** 44 → 45 orders, but PF 0.26 → 0.06 (net −0.23 → −1.72 units).

**C equals B** on every row (orders, PF, net, open-at-end).

## Run hygiene note

An earlier C attempt overlapped with a duplicate C run started by a stale queue script. Its numbers (1,467 s, 6 worker
profiles) were discarded and both runs were repeated alone. A and B never overlapped with another run.

## Commit-level check a02b343 vs 1251c57

Pending at the time of this commit; see the update below.
