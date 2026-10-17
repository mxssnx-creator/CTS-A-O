# Exit validation: correctness passes; consistent profitability is unproven

These are retrospective replays of reused cached public candles, with no network requests, account allocation or venue orders. BTC, ETH, SOL and XRP remain fixed. The first three attempts use 16 Follow/Revert × EMA/RSI × independent timeframe pairs and trade **2026-10-17 15:00–21:00 UTC**. The later coverage check uses all **794 actual default configured pairs**, including combined lanes, and trades **2026-10-16 21:00–2026-10-17 21:00 UTC**. All three Exit config sets and both directions retain separate identities and evaluations. Modeled round-trip cost remains **0.20%**. PF and minimum-count gates were preserved.

| Frozen attempt | Evaluated prehistory | Holdout-qualified configs | Initial seat-qualified configs | Settled orders | Settled unit-return result |
|---|---:|---:|---:|---:|---|
| Original, before entry-scope correction | 6 h | 0 | 0 | 0 | Empty |
| Corrected unrestricted Exit entries | 6 h | 0 | 0 | 0 | Empty |
| Corrected, default Exit lookback adequacy check | 168 h | 28 | 6 | 2 | Two wins, +0.0268 unit-return percentage points; no losing close in this tiny sample |
| Corrected, all 794 configured pairs, 24 h trading | 168 h | 1,236 | 132 | 109 | Settled PF 19.554; +39.158 unit-return points |

The six-hour attempts have insufficient completed fit entries for the unchanged default **30 entries per pair and direction**. The registry definitions exist and signals are non-null. A separate inventory records raw onsets, globally filtered onsets and completed fit excursions for each symbol. The original attempt also exposed inherited global entry tactics; the corrected production source implements the user's requested unrestricted Exit indication scope. Its dedicated PF, minimum-close and drawdown qualification remains active. This correction preceded the corrected attempt's protocol freeze.

The longer check uses the existing **168-hour default Exit lookback** to answer the concrete sample-adequacy question, with the same six trading hours, symbols, indications, parameter formulas, costs and gates. Seventy-two older hours initialize indicators behind `evaluationFromT` in every attempt and provide no evaluated entries. The longer window was separately sealed before scoring; no OOS outcome selected a parameter or removed a losing config.

**The 168h/6h, 16-pair replay does not support a positive total performance claim.** Four orders remained open at the endpoint with modeled marks totaling **−1.6944 unit-return points**. Settled closes plus these separate endpoint marks total **−1.6676 points**, with a marked diagnostic PF of **0.015815**. These marks are unrealized model estimates, distinct from settled return PF. One of six settled hours was positive and five had no closes. The observed order count is small. The runtime's no-loss qualification score of 4 is a sentinel, not an exact measured finite PF.

**The broader 794-pair, 24-hour check also has losing total endpoint performance.** Its 109 settled orders have unit-return PF **19.554**, but **206 open marks total −53.574 return points**. Settled closes plus those marks total **−14.416 points**, with marked diagnostic PF **0.774226**. Eight settled hours are positive, 16 are flat and none are negative; this settled-close view omits unrealized losses and cannot establish positive hourly equity. The run evaluated 5,488 candidates, with 553 pairs insufficient to fit, 964 candidates lacking validation closes, 2,540 PF/net rejects, and 748 DDR rejects. Every rejected and losing outcome remains recorded. All 1,236 qualified tapes were retained through 16-pair fit/build chunks with memo release, then evaluated by one unified default WF with unchanged caps, portfolio and ranking. Exit-only strategy isolation and explicit window overrides are recorded in its protocol.

The longer fit evaluated 176 candidates: 50 had insufficient validation closes, 77 failed positive-net/PF, 21 failed DDR, and 28 qualified. The independent qualified sets were 2 static-SL short, 12 adaptive-SL short and 14 trailing short; no long config qualified. At the trading boundary, 6 retained configs passed their own seat gates; the other 22 failed last-N (4), DDR (4), PF (3), DDT (7), or positive net (4). Passing seat PFs ranged from 1.734 to 4.510 on their own prior history. Two independent config orders settled during the run: one adaptive-SL short and one trailing short. Losing, empty and insufficient outcomes remain in the evidence.

All four original runs passed applicable source/settings validation, production lane normalization, frozen WF/settings gate and cost parity, truncated-prehistory versus future-present fit/holdout parity, range exclusion, side identity, unique exact config/entry identity, evaluation-entry boundaries, and hourly/family settled-return reconciliation. The zero-order runs make their order-specific checks vacuous; the longer runs exercise actual modeled entries. The original full 794-pair process used **243.4 MiB maximum RSS** and **44.7 seconds**, with one process and no worker fan-out. Separate project tests cover worker parallelism, held-position control and execution ownership; these bounded replays do not establish those exchange behaviors.

These original runs require the exact source hashes recorded in each frozen protocol. Subsequent cache-fingerprint and saved-preset corrections change source provenance; the original launchers deliberately reject that changed source. Their protocols and results remain preserved. Commands for reproducing the original source snapshots are:

```sh
node --max-old-space-size=768 --experimental-strip-types --no-warnings scripts/exit-validation-20261017-attempt.mjs --attempt corrected-6h --run
node --max-old-space-size=768 --experimental-strip-types --no-warnings scripts/exit-validation-20261017-attempt.mjs --attempt default168h --run
node --expose-gc --max-old-space-size=512 --experimental-strip-types --no-warnings scripts/exit-validation-20261017-default24h.mjs --run
```

Protocols contain complete settings and source hashes; changed sources stop scoring. The original attempt is retained as evidence of the earlier source and requires that source snapshot for reproduction.

**The preceding cache/preset checkpoint regression passed exact economic equality.** It repeats the same reused 794-pair, 24-hour sample after the cache-fingerprint, bounded-cache-cleanup and saved-preset Exit correctness fixes. It is not an additional alpha sample. Every settled trade, open mark, per-config/per-step check, hourly/family return, skip and qualification diagnostic matches the original exactly. Only timing/provenance metadata is excluded. Both canonical economic hashes are `cebdce48a2ca9c9876c014485ac4630118f34468693bd35ef18caf1e83ad08c3`. The losing endpoint result remains **PF 0.774226, −14.416 return points**. Model time was **38.1 seconds**, model maximum RSS **246.5 MiB**, and maximum RSS including the full exact comparison **297.9 MiB**.

That regression protocol permits exactly two changed production source files and archives their exact checkpoint content. The unchanged original runner is reused through declared infrastructure-only source bindings. Runtime cache invalidation and saved-preset enrollment are established by their separate focused tests; the direct replay verifies unchanged economics under their imported source. Reproducing the preceding checkpoint requires its recorded hashes and uses:

```sh
node --expose-gc --max-old-space-size=512 --experimental-strip-types --no-warnings scripts/exit-validation-20261017-cache-regression.mjs --run
```

Its full report is `exit-validation-20261017-cache-regression.md`, with a matching protocol, exact comparison JSON, lossless result gzip and compressed changed-source archive. Every original frozen protocol/result remains unchanged.

A separate `exit-validation-20261018-runtime-regression` wrapper is prepared for the later completed-flat-bar `runtime.tick` correction. It is not yet sealed or scored. The direct replay does not execute the live runtime tick path; the actual-tick regression covers that fix. The new replay will check unchanged economic results under the newly frozen imported runtime source, preserving every preceding source-bound artifact.

| Attempt | Protocol SHA-256 |
|---|---|
| Original 6 h | `26341ddcc00c6990d91c02c048f2e6a9d0fd45905d856bdd0c2caf172025e6bd` |
| Corrected 6 h | `d7fbb10e90998d58596f1a8ea8fa284d50a4b6c51cb39fea40fa16cdfdb21491` |
| Corrected 168 h | `7a1247f9f5eaadf3d663ef7333b78076361b4c069f63c493a3af66f75e88c09d` |
| Corrected default 794 pairs, 24 h trading | `679862904ce7f5197a8ce9ce998dfb876f5162b3723bd128973b9f427fe896cf` |
| Preceding cache/preset source regression of the same 794-pair sample | `57d220904b462fe4457068012e719eb61e48f82c3087742a3be7faa26fc36d34` |

Each matching result JSON includes all six independent set/direction slices per hour, initial per-config seat evaluations, every modeled settled order, open endpoint marks and rejection diagnostics. The 794-pair result also has a lossless `.json.gz` equivalent for compact persistence. Public input provenance is inherited from the existing cached feed and is not an independent audit of its original venue collection. These reused short forward windows cannot establish durable or consistently positive market returns.
