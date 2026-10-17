# Exit validation: correctness passes; consistent profitability is unproven

These are retrospective replays of reused cached public candles, with no network requests, account allocation or venue orders. The fixed inventory is BTC, ETH, SOL and XRP; Follow/Revert × EMA 9/21 and RSI momentum 14/20 × independent 1/5/15/30-minute lanes: 16 pairs. All three Exit config sets and both directions retain separate identities and evaluations. The trading window is **2026-10-17 15:00–21:00 UTC**. Modeled round-trip cost remains **0.20%**. PF and minimum-count gates were preserved.

| Frozen attempt | Evaluated prehistory | Holdout-qualified configs | Initial seat-qualified configs | Settled orders | Settled unit-return result |
|---|---:|---:|---:|---:|---|
| Original, before entry-scope correction | 6 h | 0 | 0 | 0 | Empty |
| Corrected unrestricted Exit entries | 6 h | 0 | 0 | 0 | Empty |
| Corrected, default Exit lookback adequacy check | 168 h | 28 | 6 | 2 | Two wins, +0.0268 unit-return percentage points; no losing close in this tiny sample |

The six-hour attempts have insufficient completed fit entries for the unchanged default **30 entries per pair and direction**. The registry definitions exist and signals are non-null. A separate inventory records raw onsets, globally filtered onsets and completed fit excursions for each symbol. The original attempt also exposed inherited global entry tactics; the corrected production source implements the user's requested unrestricted Exit indication scope. Its dedicated PF, minimum-close and drawdown qualification remains active. This correction preceded the corrected attempt's protocol freeze.

The longer check uses the existing **168-hour default Exit lookback** to answer the concrete sample-adequacy question, with the same six trading hours, symbols, indications, parameter formulas, costs and gates. Seventy-two older hours initialize indicators behind `evaluationFromT` in every attempt and provide no evaluated entries. The longer window was separately sealed before scoring; no OOS outcome selected a parameter or removed a losing config.

**The longer replay does not support a positive total performance claim.** Four orders remained open at the endpoint with modeled marks totaling **−1.6944 unit-return points**. Settled closes plus these separate endpoint marks total **−1.6676 points**, with a marked diagnostic PF of **0.015815**. These marks are unrealized model estimates, distinct from settled return PF. One of six settled hours was positive and five had no closes. The observed order count is small. The runtime's no-loss qualification score of 4 is a sentinel, not an exact measured finite PF.

The longer fit evaluated 176 candidates: 50 had insufficient validation closes, 77 failed positive-net/PF, 21 failed DDR, and 28 qualified. The independent qualified sets were 2 static-SL short, 12 adaptive-SL short and 14 trailing short; no long config qualified. At the trading boundary, 6 retained configs passed their own seat gates; the other 22 failed last-N (4), DDR (4), PF (3), DDT (7), or positive net (4). Passing seat PFs ranged from 1.734 to 4.510 on their own prior history. Two independent config orders settled during the run: one adaptive-SL short and one trailing short. Losing, empty and insufficient outcomes remain in the evidence.

All three runs passed applicable source/settings validation, production lane normalization, frozen WF/settings gate and cost parity, truncated-prehistory versus future-present fit/holdout parity, range exclusion, side identity, unique exact config/entry identity, evaluation-entry boundaries, and hourly/family settled-return reconciliation. The zero-order runs make their order-specific checks vacuous; the longer run exercises actual modeled entries. The longest process used **158.5 MiB maximum RSS** and **2.065 seconds**, with one process and no worker fan-out. Separate project tests cover worker parallelism, held-position control and execution ownership; this bounded replay does not establish those exchange behaviors.

The current corrected source can reproduce both corrected attempts from their committed bounded public input:

```sh
node --max-old-space-size=768 --experimental-strip-types --no-warnings scripts/exit-validation-20261017-attempt.mjs --attempt corrected-6h --run
node --max-old-space-size=768 --experimental-strip-types --no-warnings scripts/exit-validation-20261017-attempt.mjs --attempt default168h --run
```

Protocols contain complete settings and source hashes; changed sources stop scoring. The original attempt is retained as evidence of the earlier source and requires that source snapshot for reproduction.

| Attempt | Protocol SHA-256 |
|---|---|
| Original 6 h | `26341ddcc00c6990d91c02c048f2e6a9d0fd45905d856bdd0c2caf172025e6bd` |
| Corrected 6 h | `d7fbb10e90998d58596f1a8ea8fa284d50a4b6c51cb39fea40fa16cdfdb21491` |
| Corrected 168 h | `7a1247f9f5eaadf3d663ef7333b78076361b4c069f63c493a3af66f75e88c09d` |

Each matching result JSON includes all six independent set/direction slices per hour, initial per-config seat evaluations, every modeled settled order, open endpoint marks and rejection diagnostics. Public input provenance is inherited from the existing cached feed and is not an independent audit of its original venue collection. These reused short forward windows cannot establish durable or consistently positive market returns.
