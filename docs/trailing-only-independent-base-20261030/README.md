# Independent Trailing-only Base qualification — 30 October 2026

The earlier target-level Base path allowed two different Trailing-only stops to share a TP=0 pass. It could also make a no-TP strategy depend on a Normal representative. The new path calculates each effective no-TP cell on Base history, records its own passed proof and uses that proof at tape construction, seat selection, preset and live/model admission. A no-TP pass does not qualify a Normal, DCA, Axis, Signal or Historic Exit sibling. Changed stops, trail ratios, ceilings, hold limits and feedback need their own proof; a previously held unqualified order is retained only for protection. The proof is copied atomically with the economic cohort and fails closed before the first complete publication. Signal and Historic Exit keep their own separate qualification paths.

Base now reports the no-TP cohort separately by range: distinct effective cells evaluated, passed, unavailable and the pooled gross-return PF of **passed** cells only. The Base representative table still describes the separate representative cohort. The detailed pair listing now retains independently qualified no-TP pairs and Signal-sourced Historic Exit rows, so its Base denominator and passes reconcile to status. The UI check renders PF 1.00 as neutral and displays missing return basis as unavailable.

## Status and limits

**The separate persistent Base → Main → Real processed-history defect remains unresolved.** The controlled conflict reproducer is still one pass and one actually failing expected TODO; the draft stage adapter remains disabled. Normal and TP+trailing paths can still use target-level Base qualification when `grid.baseCells` is off. NoTP Base evidence here is per bot/indication/lane/protection cell, pooled over its contributing symbols and directions; it is not a claim that each symbol/side independently passed Base. Later configured direction/context gates remain separate. Finite `mainTop` settings can still rank pairs by the representative score; the measured desk used `mainTop=0` (unlimited). Do not start x01 on these model results.

## Matched 8-symbol market window

The same frozen public candles cover 8 October 12:00 to 9 October 00:00 UTC prehistory and 9 October 00:00–12:00 UTC trading, 2026: ADA, APT, ARB, ATOM, AVAX, BCH, BNB and BTC USDT. Costs are 0.15% per modeled round trip. It is a previously inspected retrospective window, not a held-out forecast. PF is positive gross unit returns / negative gross unit returns; 1.00 is neutral. No exchange was contacted.

| Cohort | Default settings | Research-only Last-10 and minimum closes 10 |
|---|---:|---:|
| Base pairs passed / evaluated | 132 / 27,242 (0.48%) | 166 / 27,242 (0.61%) |
| Initial post-Base engine configs passed / evaluated | 8 / 251 (3.19%) | 61 / 460 (13.26%) |
| Initial passing finite mean PF | 33.181 across 4 finite sets; 4 no-loss separate | 16.840 across 24 finite sets; 37 no-loss separate |
| Minimal no-TP Base cells passed / evaluated | 35 / 48,024 (0.073%) | 56 / 48,024 (0.117%) |
| Micro no-TP Base cells passed / evaluated | 0 / 9,384 (0%) | 0 / 9,384 (0%) |
| Initially admitted no-TP configs passing post-Base / evaluated | 2 / 35 (5.71%) | 11 / 56 (19.64%) |
| Positions opened / closed / held | 47 / 42 / 5 | 14 / 6 / 8 |
| Orders opened / closed / held | 354 / 336 / 18 | 2,534 / 2,445 / 89 |
| Closed-order model PF | 3.696049 | 3.923037 |
| Trailing-only orders closed / held | 42 / 5 | 455 / 11 |
| Trailing-only closed-order model PF | 4.436781 | 3.632104 |
| Exchange PF | unavailable | unavailable |

The Minimal Base denominator includes 41,600 cells with no usable close sample; all 9,384 Micro cells were unavailable. They are counted in the denominator, not treated as neutral PF. The pooled historical PF of **passed** no-TP Minimal cells was 4.450 for default and 4.232 for the diagnostic. These aggregate historical PFs do not measure later execution.

The Last-10 run also changes the shared `gates.minTrades` from 12 to 10, which affects Base. Everything else in the frozen economic settings is unchanged. It is an experiment, not an approved default change and not evidence that 10 is optimal. All actual no-TP closes in both runs were long Minimal, so this window gives no short-side or other-range performance estimate. The 42 default no-TP closes used 39 trailing exits and 3 stops, no TP; holds ranged from 6 to 210 minutes (mean 52.71). Hours 00–01, 04–05 and 10–11 had no-TP PF below 1. The diagnostic had 432 trailing exits and 23 stops, no TP; three populated hours (08–11 UTC) had PF below 1. Aggregate PF therefore does not establish consistently high hourly or future PF.

Default execution by kind: 184 Wide DCA closes at PF 2.908; 110 Minimal Trailing closes at PF 11.010; 42 Minimal Trailing-only closes at PF 4.437. Other kinds had no closes and no execution PF. The two initial no-TP selections were `revert|r-linreg@m1` with stops 1.2% and 2.4%, 12 Base/post-Base snapshot closes at measured PF 10.555 each; subsequent funded-model results were 21 closes at PF 2.540 and 21 at PF 19.966, respectively. These historical and later cohorts must not be combined as one PF.

All 294 earlier default modeled closes remain present with identical identity, unit return and external multiplier; the independent proof adds 42 no-TP closes and removes none. Positions/holdings can differ when additional orders share an already active position. All 336 default and 2,445 diagnostic funded-model closes reconcile to their exact source tapes and unit returns. The price/cost audit checked 152 and 1,186 ordinary closes respectively; maximum error was 8.2e-8 and 8.9e-8 (compact Float32 prices).

Both runs still fail two coverage checks: 74/76 passed, with 27,284/42,366 requested combinations and 20/21 indication kinds covered. Low-Range was not evaluated and 15m/30m lanes lacked the engine's 120 completed bars within the user-specified 12h prehistory. Default runtime was 19.67 seconds, peak single-child RSS 712,900 KiB and worst Tapes slice 1,819 ms; diagnostic runtime 21.25 seconds, peak child RSS 659,124 KiB and worst slice 1,644 ms. Neither meets the 500 ms foreground target, and RSS is not summed process memory.

## Verification and reproduction

- Six bounded core files: **88 passed**, covering exact sibling isolation, independent no-TP qualification, worker/in-process parity, held-only recovery, feedback, Micro hold, trailing, Low-Range, runtime publication and mocked live promotion.
- **10** audit/report/UI checks passed, including server-rendered Base UI neutral/unknown PF and embedded order/config/heatmap records. No full browser or real venue was exercised. Typecheck and sequential production build passed; database migration was skipped because `DATABASE_URL` was unset.
- The earlier Signal test accidentally ran once with 125 hours of synthetic history despite the three-day limit; it was corrected to 24 hours and passed. The market windows above each use 12h+12h, and the current bounded suites remain within the limit.
- The replay source checkpoint is local `671fb79e3317fe1eec31cd5261b6316a0cfdaff7`; the source inventory SHA-256 is `b403e5daa6020aa8c86f38459febacf996124c83fcbfb441844e689f85361bc1`. The frozen feed SHA-256 is `bd4b66e09c65b990082ccc56dfd2624fd18815d01767a315dc002dfa0f6f02b0` and is stored under `docs/execution-audit-20261030/evidence/`.
- `evidence/replay-records.tar.gz` SHA-256 is `f3677f35f461eb9dec99c4fd1df71315935d1a002f00cc95a9a82d455e86fc10`; it contains both raw dumps, native allocations, referenced sidecars, protocols, audits, commands and resource measurements. The prior baseline records are in `docs/trailing-only-audit-20261030/evidence/replay-records.tar.gz`.

[Default detailed report](report.html) includes 811 config rows, all 336 modeled closes, 18 held orders and hourly heatmaps. [Last-10 diagnostic report](report-n10.html) includes 1,068 configs, all 2,445 modeled closes and 89 held orders. Each supports search and JSONL order export.

After extracting both archives to the same directory, reproduce the close comparison with `node --experimental-strip-types --no-warnings scripts/compare-trailing-base-cohorts.mjs <dir>/trailing-only-final-20261030 <dir>/trailing-base-final-v2-20261030 <dir>/comparison.json`. Rebuild either report with `python scripts/render-execution-audit.py <run-dir> <output.html>`. Logs and the comparison are in `evidence/`.
