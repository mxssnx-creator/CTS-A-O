# Micro and Low-Range ladders, own minimum distances, and where PF drops between stages — 11 November 2026

Operator request (11 Nov): Micro and Low-Range stop ratios 0.2–1.6 step 0.1, thinner trailing, an own set for every
configuration, own minimum SL / trail distances per range, a 50-symbol run on the BingX VST demo (x02, tag `CTSAO_`),
live-vs-simulation comparison, no stranded orders. Source branch `claude/practical-galileo-n3ivbd` (PR #259).
Nothing here is a claim of positive execution PF; the live/venue section states what was and was not measured.

## What changed

| Item | Before | After |
|---|---|---|
| Micro stop ratios (× price target) | 0.25–2.5 step 0.25 (10) | **0.2–1.6 step 0.1 (15)** |
| Micro trailing shares | 0, ¼, ½, ¾ | **0, 0.1 … 0.6 (7)** |
| Low-Range stop ratios / trailing shares | 0.25–2.5 / 0, ¼, ½, ¾ | **0.2–1.6 step 0.1 / 0, 0.1 … 0.6** |
| Low-Range net trail floor | cost + 2 range steps (a trailing cell on the 2-step target equalled its plain sibling) | cost + ½ step |
| Other ranges (Minimal, Short, General, Long, Minimal plus, Signals, DCA, Axis) | unchanged | unchanged |
| Own minimum net stop distance | one global `minSlDistancePct` overwrote every range | `minSlDistancePct` per range **and** for Low-Range (0.1–1 %); unset follows the global value |
| Stored settings | — | once-only, atomic, backed-up migration of ladders still on the former factory values (`fine-ladder-migration.server.ts`); edited ladders, other ranges and owned protection stay |

Cell counts at the default 0.176 % cost (`protectGrid`, 15 m reference): Micro normal/trailing/trailing-only 136/408/408 → 182/1,048/1,036;
Low-Range 200/440/428 → 288/1,676/1,676. The Low-Range protection grid stays opt-in (`enabled: false`).
Every distinct TP × SL × trail × hold cell is its own config id and order key (`fine-ladder-sets.test.ts`); requests that resolve to the
same distances through a floor are one cell, never two ids.

The global stop floor no longer overrides a range's own: tagged range cells were already excluded from the post-config global floors
(`walkforward.ts` adjust step); the grid builders now also use the range's own floor, so the global value is only the default for ranges
that set none. Wide, Axis and DCA keep the global floor.

## Defects found and fixed while doing it

1. **Stop-floor cells never matched their Base proof.** The executable grid re-applied the floor as an unrounded float sum
   (`0.0027600000000000003`) while Base proved the same cell as `0.00276`; the cell key differed, so a floor cell did not
   inherit its Base proof. At the default cost this hit every Micro cell on the floor (162 of 2,266) and Minimal at 0.11 % cost.
   Fixed in `protectGrid.push`. Sweep afterwards: 2,688 combinations (8 costs × 6 minimum distances × trailing-only × trail step × hold
   mode × 7 ranges), 0 mismatches.
2. **One missing venue minute disabled the whole compute.** 3–4 of the first 30 ranked VST symbols have one missing 1m candle
   (e.g. KNTQ-USDT 4 minutes). The minute-execution validator refused the whole universe, Base left the worker pool and ran on the
   main thread (stalls up to 15 s), and every cycle failed. A symbol's base lane now starts after its last missing/invalid bar; nothing is
   invented, other symbols and resampled lanes are untouched, and the cut is reported once per change (event + kv `historyCuts`).
3. **Memory bound.** With every Base-validated pair (`mainTop 0`) the tape stage of 954 pairs on 26 symbols reached 9.6 GB on a 16 GB host and
   the guard aborted the compute. The x02 profile uses `mainTop: 200`.
4. Test fixtures that pinned the old 0.25 minimum (completeness table, Low-Range API save, block-comparison); a test process that ended before an
   intentionally `unref`'d deadline fired (reproduced on the unchanged base commit).

Other places with the same shape were searched: the Base/grid parity sweep above covers every range, trailing-only cells, trail steps and hold modes;
the remaining universe-wide validators in `capped-execution.ts` (duplicate series, missing own prices, stale prices, length mismatch) are structural and
should keep failing loudly. **Open:** the realtime append path (`laneSeriesOf` on the candle tail) now cuts a tail at a gap too; its continuity with the
published tapes was reasoned about, not exercised by a test with a mid-run venue gap.

## Where PF drops between stages — causes and the fixes on record

| Drop | Cause | Fix / rule (where) |
|---|---|---|
| Historical validation PF → funded execution PF (OLD 8–9 Oct cohort: mean 17.4 → 0.273) | Different samples: pre-sizing virtual closes vs funded settled closes; selection on the window it is scored on | Report each stage on its own cohort (`docs/report-integrity.md`); post-Base cohort only; never compare unlike samples |
| Return PF vs cash PF (1.36 vs 0.20) | Unequal order sizes | Return-based PF is primary; cash PF only as a labelled diagnostic |
| Block / coordination volume counted twice | The recorded return already contains the external multiple | Unit-return helpers remove it once (`AGENTS.project.md` unit-basis rules) |
| Cost counted twice or not at all | Model cost vs measured fee/slippage | Modeled round trip deducted once at settlement; measured fee 0.05 % taker on the demo account vs model 0.08 % default (see below); `audit-live-desk.mjs` reports measured fee and slippage beside the model |
| Rejected sibling wins qualifying a losing config | Candidate pool read instead of the processed predecessor | Processed Base → Main → Real (opt-in; persistent adapter still unfinished, TODO kept visible) |
| Floor cell loses its Base proof | Float-sum floor key mismatch (above) | Fixed today |
| Whole compute lost for one symbol | Universe-wide validator (above) | Fixed today |
| **Sample starvation at Main (new finding)** | Main/Base window N = 40 positions per config × symbol × direction; the 48 h history of 30 symbols produced contexts with ≤ 25 closes | See next section |

### Measured today: why the natural gates admitted no orders

Frozen snapshot `runs/x02-ao/core-natural-compute1.sqlite` (30 symbols, 48 h, cost 0.11 %, Micro + Low-Range only, natural gates):
Base 79/1,060 Micro lane pairs and 962/6,770 Low-Range lane pairs passed their PF floors (passed-pair mean PF 1.61 / 1.73, medians of
all evaluated 0.70 / 1.49). Of 3,308 evaluated config × symbol × direction contexts at Main N = 40:
n ≥ 1: 2,582 · n ≥ 8: 127 · n ≥ 12: 12 · n ≥ 20: 4 · **n ≥ 30: 0 · n ≥ 40: 0**. Result: 0 Main passes, 0 simulated orders, so no PF at that stage
is measurable ("unavailable", not 0). The gate is working as designed (history is not waived); the 48 h window simply cannot supply 40 own
closes for configs this selective. Candidate solutions, none applied without evidence:
(a) longer evaluated history for these two ranges only (more closes; costs compute), (b) a Main N the cell can reach (the per-range override
`byRange` already exists; lowering it trades evidence for admission), (c) judging the config across symbols per direction. Each needs a
causal comparison on held-out data before it becomes a default.

## Live (x02, BingX VST demo) — what was measured

- Account reachable, flat at start (≈ 470,900 VST). Account commission rate read from the venue: taker 0.05 %, maker 0.02 %
  (model default 0.08 % / 0.05 %); the x02 profile uses the measured rate (round trip 0.110 % incl. the 10 % slippage allowance).
- Runs so far: all natural-gate attempts placed **no order** (no seat passed the gates); a `probe 20` run (demo-only seating of the best
  configs per range regardless of gates, to exercise the exchange path) was started 20:07 and again 23:29 UTC after a container restart.
  The container restart killed the first probe run during its compute, before any order. State at the restart: 0 own orders, 0 own positions,
  0 stranded orders (`scripts/audit-live-desk.mjs`); 5 positions / 10 orders of another system sit on the same demo account and were not touched.
- **Not yet measured:** live fills, partials, restart/crash continuity with open positions, live-vs-simulation diff, execution PF.
  Those numbers are appended below when the probe run produces them; until then they are unavailable, not zero.

## Survey of other CTS projects (12 Nov, read-only shallow clones of CTS-G, CTS-C, CTS-K-N, CTS-A)

Operator request: add successful indications and strategy types from the other CTS projects. Nothing qualifies, so nothing was added.

- **CTS-G** (same operator, same x02 VST account): its Micro / Low-Range screen of CTS-A-O candidates (30 Oct, 8 symbols) found **0 of 19** with
  prehistory PF >= 1.2 and >= 10 closes; its Signals retrospective (1 Nov) ends **net-positive in 0 of 7 scenarios** (closed-return PF 0.80 / 0.81 /
  0.22; the frozen variants admitted no order). Its x02 probe episodes: return PF 0.265 over 50 episodes. Its own reports say no configuration is promoted.
- **CTS-C**: its indication families (Trend, Trend_ADX, Trend_Efficiency, Trend_Fade, Break, Break_ATR, Break_Volume, Break_Retest, Break_Reversal,
  MA / RSI / MACD / Bollinger variants, Pullback, Tactic, Inverse) all already exist in CTS-A-O (ADX, efficiency, retest, reversal, fade, pullback, volume
  filters were checked by name). Its measured held-out results are negative too: Block PF 0.26, DCA 1.00, Normal 0.47, Main 0.33 / Real 0.32 forward,
  and **zero** of 28 predefined training profiles with >= 20 closes and PF >= 1.1 at all three later stages; validated own-window PF 2.09 against
  0.74 for the closes after validation (the same validation-to-execution drop documented above).
- **CTS-K-N** (Redis/Next.js production system; code search over all CTS repositories for documented forward / held-out results found only its
  documents): DCA historic validation (42 days, 18 symbols) PF 0.51 and 0.80, losing in every weekly fold, even its best-PF buffer; the Special
  indication/strategy found no stable positive configuration under purged walk-forward (Short lane PF 0.54); the one positive result (BTC, 7 out-of-sample
  positions, PF 1.54) is called insufficient for activation by its own document.
- **CTS-A** (sibling of this repository) and the older CTS-* repositories (CTS-X is private and was not opened) were not searched exhaustively;
  the repository-wide search returned no other document reporting a net-positive forward or held-out result.

Porting an unvalidated candidate would add compute (Base cost scales with the catalogue) without evidence, and the project rules forbid promotion without a
causal held-out comparison. Registered as research options they would go through the same independent Base gates; none is a measured winner.

## New short-horizon candidates: web research and a frozen screen (12 Nov)

Operator request: add further working indications / tactics for Low-Range, Micro, Minimal and Short, chosen by execution PF.

**Research** (web search, two queries; the sources are blogs, repositories and preprints, none verified out-of-sample at 1–5 minutes):
- A one-year, eight-symbol, 1-minute VWAP-deviation reversion test reports flat-to-negative forward returns after realistic costs at every threshold
  and exit style ([anomiq](https://anomiq.io/blog/mean-reversion-crypto-backtest/)); a 5-minute BTC RSI(14) reversion rule loses 38 % where the daily version gains
  ([Coinquant](https://www.coinquant.ai/blog/best-timeframe-for-crypto-trading-strategies-1-minute-to-1-month-backtested)).
- Momentum evidence is at 1–12 months ([time-series momentum summary via TapeScript](https://tapescript.io/blog/short-term-mean-reversion-strategy)), short-term reversal
  is documented from 1990 equity work and is eaten by costs when traded often.
- Crypto microstructure: VWAP-to-mid deviations mean-revert as depth replenishes, but as a feature-importance finding, not a tradable return
  ([arXiv 2602.00776](https://arxiv.org/html/2602.00776v1)); order-flow-imbalance alpha does not survive costs
  ([SSRN 7053198](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=7053198)); the quarter-hour effect is real (volatility/volume bursts and return
  predictability in the first seconds after each quarter hour) but "average gains remain far below Binance trading fees"
  ([arXiv 2607.09426](https://arxiv.org/html/2607.09426v2); fees statement from secondary coverage, the full paper was not read).

**Screen** (`scripts/screen-new-candidates-20261112.mjs`, frozen before scoring, standalone, not the Base→Main→Real pipeline): 31 symbols, about 18 days of 1m
candles resampled to completed 5m bars, entry at the next open, TP 0.5 % / SL 0.4 % / 12-bar limit, stop first, 0.11 % modeled round trip deducted once,
first two thirds training and the last third forward, gate: ≥ 30 training closes and PF ≥ 1.2.

| Candidate | Training n / PF | Forward n / PF |
|---|---:|---:|
| VWAP 2σ reclaim | 4,155 / 0.497 | 2,187 / 0.510 |
| VWAP reclaim + 24-bar trend | 57 / 0.362 | 30 / 0.510 |
| Quarter-hour bar, follow prior 3-bar move | 17,124 / 0.495 | 8,533 / 0.488 |
| Quarter-hour bar, fade prior 3-bar move | 16,995 / 0.509 | 8,497 / 0.505 |
| Volume-spike reversal bar | 457 / 0.394 | 263 / 0.370 |
| Band-reclaim (reference for the engine's existing shape) | 4,089 / 0.485 | 2,147 / 0.506 |

**None passes**, and the reference scores the same as the new ideas, so the screen finds no edge in any of them at this exit shape; it cannot say they fail in other
ranges or coordinations (one exit, one timeframe, one 18-day window already seen by earlier studies). Result: **no new indication was registered or added to the
default focus**; adding unvalidated sources would raise Base cost (the catalogue size drove the memory abort above) without evidence. Frozen result:
`micro-low-range-ladders-20261111-evidence-screen-5m.json`. A broader search (other exits, 1m/15m, the engine's own cell grid) would be the next honest step.

## Verification

- Full core suite on the first commit set: 4,914 tests, 4,903 pass, 3 skipped, 1 todo, 4 fail + 3 cancelled in three fixture files — all
  addressed in follow-up commits (the three files pass). Scripts/app stage: 807/816 with one failing fixture (block-comparison ladder pin), fixed.
- New tests: `fine-ladder-sets.test.ts` (own sets, floor-key parity, own minimum distances), `fine-ladder-migration.test.ts`,
  `market/base-history-cut.test.ts`, `scripts/lib/live-desk-audit.test.mjs`.
- CI on PR #259: policy, render and verify green on `4220ea7`; the run on the following head is pending at the time of writing.

## Reproduce

```bash
docs/live-coordination/start-x02-micro-low-range.sh 50 4096 0      # natural gates
docs/live-coordination/start-x02-micro-low-range.sh 50 4096 20     # demo probe
CTS_CORE_LIVE_TAG=CTSAO_ node --experimental-strip-types --no-warnings scripts/audit-live-desk.mjs --db runs/x02-ao/core.sqlite
```
