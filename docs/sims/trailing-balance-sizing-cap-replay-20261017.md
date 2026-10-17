# Balance sizing and cap replay — 2026-10-17

## Scope

Offline replays of two adjacent 24-hour windows from the cached eight-symbol feed, each with 48 hours of prehistory. The windows are 2026-10-13 21:00–2026-10-14 21:00 UTC and 2026-10-12 21:00–2026-10-13 21:00 UTC. Both use the same feed and are not independent holdouts. Signals received no additional warmup. Starting balance was $10, sizing was 0.1% of realized equity per base order unit, leverage 10×, and modeled round-trip costs 0.20% per close. No exchange orders were sent.

The replay uses **unit-return PF** for normalized per-order returns and **cash PF** for balance-sized allocations. The two metrics can differ because caps, compounding, and funded allocations change the cash weights. Net cash and marked equity are reported separately.

## Cap comparison

Only the report-time position and gross caps changed within each window. Both settings applied to the same recorded trades.

| Window | Position / gross cap | Funded closes | Unit-return PF | Cash PF | Net cash | Max equity drawdown | Green / red / flat hours |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Oct 13–14 | 0.75× / 7× | 4,126 | 0.751 | 0.814 | −$0.16659 | $0.85049 (8.48%) | 10 / 10 / 4 |
| Oct 13–14 | **0.25× / 2×** | **4,588** | 0.794 | 1.038 | **+$0.01324** | **$0.20279 (2.03%)** | 10 / 10 / 4 |
| Oct 12–13 | 0.75× / 7× | 25,231 | 0.926 | 0.906 | −$0.32942 | $2.82372 (24.16%) | 7 / 17 / 0 |
| Oct 12–13 | **0.25× / 2×** | **25,446** | 0.942 | 0.974 | **−$0.02970** | **$0.80194 (7.63%)** | 6 / 18 / 0 |

The 0.25× per-position and 2× gross caps were an interim setting: they reduced drawdown versus 0.75× / 7×, but the adjacent day remained negative. The follow-up same-tape search below replaces that interim gross cap with 0.75×. It still does not establish durable profitability or positive returns in every hour.


## Follow-up cap sweep and selected setting

A report-time sizing sweep compared nearby per-position caps (0.15×–0.30× equity) and gross caps (0.5×–2×) on the same recorded trades. The engine did not reselect entries for each cap. The 0.25× / 0.75× setting was the only tested pair with positive ending marked equity on both windows while retaining at least 4,861 and 25,950 funded closes.

| Window | Position / gross cap | Funded closes | Return PF (unit) | Cash PF | Net cash | Balance at end | Marked equity at end | Max equity DD | Green / red / flat hours |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Oct 13–14 | 0.25× / 2× (interim) | 4,588 | 0.794 | 1.038 | +$0.01324 | $10.01324 | $9.91464 | 2.03% | 10 / 10 / 4 |
| Oct 13–14 | **0.25× / 0.75×** | **4,861** | **1.013** | **1.327** | **+$0.05343** | **$10.05343** | **$10.02288** | **0.80%** | **12 / 8 / 4** |
| Oct 12–13 | 0.25× / 2× (interim) | 25,446 | 0.942 | 0.974 | −$0.02970 | $9.97030 | $9.73070 | 7.63% | 6 / 18 / 0 |
| Oct 12–13 | **0.25× / 0.75×** | **25,950** | **0.924** | **1.349** | **+$0.12277** | **$10.12277** | **$10.04716** | **2.09%** | **8 / 16 / 0** |

The cap reduces exposure and improves the modeled balance and end equity on these two windows, but the Oct 12–13 Return PF remains below 1 and 16 hours are red. It is a sizing result on two adjacent days of the same feed, not evidence that every range or hour has an edge. The realized cash PF and marked equity are shown separately because open positions can make end equity lower than balance.

## Evaluation versus simulated execution

The engine's eligible config evaluation and its later funded closes are separate samples. Evaluation PF is the median PF of configs that passed the pre-run checks; executed PF is pooled across funded close slices inside the run. Large differences show that the current evaluation window does not reliably predict the next day's range results.

| Range | Oct 13–14 evaluation: passed / evaluated, passing median PF | Oct 13–14 funded closes: Return PF / cash PF / net | Oct 12–13 evaluation: passed / evaluated, passing median PF | Oct 12–13 funded closes: Return PF / cash PF / net |
| --- | ---: | ---: | ---: | ---: |
| Micro | 1,241 / 12,676; 3.114 | 1,859; 0.837 / 1.450 / +$0.00583 | 1,160 / 16,908; 3.296 | 5,437; 0.750 / 1.478 / +$0.02569 |
| Minimal | 3,482 / 22,006; 2.345 | 2,765; 1.069 / 1.281 / +$0.04054 | 1,897 / 20,412; 2.636 | 16,693; 0.949 / 1.474 / +$0.09244 |
| Short | 1,027 / 4,424; 2.170 | 13; 61.937 / 61.944 / +$0.00031 | 322 / 2,499; 2.305 | 1,565; 2.789 / 2.053 / +$0.01817 |
| General | 959 / 4,786; 1.991 | 3; 0 / 0 / −$0.00047 | 182 / 1,923; 1.908 | 1,028; 0.516 / 0.923 / −$0.00250 |
| Long | 1,387 / 7,104; 1.779 | 16; 0 / 0 / −$0.00549 | 114 / 1,331; 2.359 | 333; 0.310 / 0.403 / −$0.01116 |
| Wide | 40 / 408; 4.000 | 50; 1,218.520 / 328.638 / +$0.00983 | 52 / 384; 4.000 | 305; 0.498 / 0.710 / −$0.00925 |

PFs for Short and Wide in Oct 13–14 have tiny gross-loss denominators and low close counts; they are not stable high-PF evidence. General, Long, and Wide remain weak in Oct 12–13 despite passing evaluation. A targeted 0.5× and 0.25× allocation reduction for General/Long worsened the same-tape cash and marked-equity results, so their volume factors remain neutral rather than being retuned from two days.

Signals use per-unit activity rather than the engine's configEval gate. Both raw sessions recorded 24 hourly Signal progress steps and tracked every requested Signal cell. Oct 13–14 had 100 Signal units active at start, 208 over the run, 413 configs with an active-unit entry, and 155 funded Signal closes (Return PF 7.997; cash PF 10.847). Oct 12–13 had 100 units active at start, 173 over the run, 1,466 configs with an active-unit entry, and 589 funded Signal closes (Return PF 1.226; cash PF 4.982). A 1.5× Short factor or a 0.5× Medium factor did not produce a material cross-window improvement; both Signal factors stay neutral at 1×.

The run's live progress telemetry reported no stalls; its compute-loop p50 was about 27.5 ms and p99 about 64–66 ms. Runtime tests separately assert monotonic progress through each stage, correct compute-before-paper event order, and a completed Realtime stage at 100%.

The uncapped comparison on Oct 12–13 ended at balance $4.83 and marked equity $1.97, with a 93.35% equity drawdown and 1,381 minutes above available equity. The old uncapped summary mixed unit-return PF with cash/equity outcomes; the reports now name the bases separately.

## Volume-factor checks

The base order unit is already balance-relative: 0.1% of realized equity, not a fixed order notional. A 0.05% test with 0.25× / 2× caps returned cash PF 0.845 and −$0.05231 on Oct 13–14, and cash PF 0.962 and −$0.04028 on Oct 12–13. It did not improve either cash result, so the base remains 0.1%.

All engine ranges and Signal short/medium factors default to neutral 1×. Micro's older factory value of 2.5× is migrated back to 1×; explicit custom values remain. A same-tape allocation sensitivity lowered Minimal, General, and Long to 0.6× while leaving other groups at 1×. It changed Oct 13–14 to cash PF 0.921 / −$0.04042, and Oct 12–13 to cash PF 0.949 / −$0.07906. That did not beat neutral sizing, so those ranges remain neutral rather than being tuned to these two days.

In the Oct 13–14 window, Signal Trailing had 146 funded closes, unit PF 11.63, and +$0.00499 net cash at 0.75× / 7× caps; Signal Normal had 3 losing closes and Trailing-only had 6 winning closes. On the adjacent day, Signals had 597 funded closes across types at unit PF 1.27 and +$0.01639 net cash at the 0.75× / 7× comparison caps. The Signal results do not offset the engine's weak ranges or establish repeatable performance.

## Configuration correction

`s2VolumeFactor` was introduced under a mistaken interpretation of “Stable-02,” which is a branch name. That independent setting has been removed from the runtime, simulator, and settings UI. Existing S2 relation sizing (`s2Increase`) and the separate Signal losing-hour hedge factor remain. The one-time settings migration removes the stray `s2VolumeFactor` while preserving configured relation increments and other custom settings.

Each report replay passed 127/127 consistency checks. This cached sample does not establish positive PF for every hour, range, or configuration, and it is not live or held-out evidence. See [the expanded Signal grid validation](../trailing-signal-expanded-grid-20261016.md) for configuration coverage.
