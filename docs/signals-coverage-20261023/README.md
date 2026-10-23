# Signals: independent config coverage and funded orders

This study distinguishes calculated configurations, exact qualified contexts, funded openings, settled closes and endpoint-open positions. One settled close did not mean only one order opened: the capped baseline opened five, with four still open. Larger configuration inventories do not authorize entries from insufficient or losing histories.

## Repairs

- Signal source/range/lane/type/protection identities retain their own Signals PF and Last-N qualification. Ordinary protection tags cannot impose another strategy range's PF gate. Independently fitted Exit remains the Exit range.
- The pooled mature-entry count for fitting a source's excursion distribution is separate from each config × symbol × direction's close minimum. The former `max(hist.minN, validation.minTrades)` incorrectly required 30 closes from every context even when its own minimum was 12. The pooled 30-entry requirement, own PF, Last-8 and drawdown requirements remain enforced.
- Three derived evaluation caches are bounded and weak-keyed. Eviction changes retained work, not calculations or evidence. Full trade tapes and empty configurations remain available to the streaming audits.
- Paper selection indexes exact active config identities before scanning the large tape inventory, while retaining source/type/symbol/side verification. Index and tape scans yield in bounded batches; held-position handling retains its existing independent path.
- Runtime and reports expose built configs, settled orders, total openings and endpoint opens separately. Occupancy includes endpoint-open orders. Signals using the independent Exit strategy are reported under Exit.
- Complete catalog checks include standard, DCA, DCA Active and Axis identities. Every expected enabled cell must exist, including cells that never execute. The complete scalar audit checks all contexts at 13 clocks, including empty histories and losses.

## Frozen comparison

The five cases are baseline settings, all sources, DCA, DCA with Block, and DCA Active. All use the same 12 symbols and immutable public minute feed. Evaluated history is 100 hours; trading covers **16 October 23:00–17 October 11:00 Europe/Vienna**. Indicator-only warmup is separate. Last-8 is the Signal/Exit history policy; ordinary engine and separately configured paper gates have their own explicitly reported values. Hourly checkpoints report progress; prices and entry/exit evaluation remain minute-based.

The expanded cases enable all 103 Signal sources, both short/medium parameter ranges and 1/5/15/30-minute lanes, alongside 15 coordinator identities. Source and coordinator ranking caps are unlimited for these research profiles. Ordinary trailing ratios are 0.5, 1 and 1.5; coordinators retain their separate grid. This is a deliberate profile change, not a like-for-like speed claim or an automatic live-settings update.

The DCA grid builds both DCA and DCA Active histories; execution toggles distinguish the cases. Enabling DCA Active selects higher-level fills and excludes regular DCA entries; both histories remain independently calculated. Additional legs remain inside a parent config's return sample. Block uses accepted-order learning, ratio 0.2 and maximum multiplier 2. Every case preserves its actual materialized settings and source/feed seals.

The $10 modeled account uses equity sizing 0.1%, leverage 10 and the frozen net modeled cost of 0.15%. Return PF is primary; cash-weighted PF is a separate same-cohort diagnostic. Coordinator volume can make cash results negative despite positive unit-return PF. Endpoint losses remain in equity/drawdown; no-loss samples are not presented as a measured finite PF.

The configured historical DDT value is 35 hours per 72 hours of available history. A complete 100-hour history therefore permits up to 48.611 hours; the observed passing maximum of 48.583 hours is within that bound. Last-8 DDT retains its separate 35-hour limit. Account-equity DDT is a different measured series and is reported separately.

## Measured performance controls

On the same local baseline and exact output cohort, bounded caches reduced main-process peak RSS from 4,223 MB to 2,064 MB, compute time from 419.0 s to 383.4 s, and end-to-end time from 448.9 s to 406.0 s. Every one of the 121,452 tapes and 7,641,419 historical closes was retained. The expanded old source exhausted its 4 GB heap; the bounded-cache source completed the expanded and DCA studies without degraded coverage. See `performance/native-parity.json` and the preserved failure receipt.

Across all 242,565 tapes and 12 recorded selection steps, the bounded selection index returned exactly the same ordered selected config IDs. Isolated selection time fell from 40.444 s to 0.608 s, with a maximum measured yielding slice of 2.793 ms. This is a selection benchmark, not an end-to-end or live latency guarantee. See `performance/seat-selection-sliced-index.json`.

The corrected baseline restores 83 distinct fitted configs and 13,054 historical closes. A separate lossless comparison verifies unchanged metadata and ordered trade bytes for every one of the previous 121,452 configs and 7,641,419 closes; none disappeared or changed. See `performance/historic-fit-additions.json`. The expanded comparison likewise preserves all 242,565 prior configs and 16,855,856 prior closes unchanged, adding 428 configs and 77,071 closes (`performance/historic-fit-expanded-additions.json`).

Fresh replays include both the selection index and pooled-sample fix. They run on separate GitHub Ubuntu runners; their wall times are labeled separately and cannot establish a like-for-like speedup against the local machine.

## Evidence and reproduction

- `report.html`: self-contained comparison, all sources/symbols/types/ranges/lanes, full Last-8/minimum-history denominators, exact execution contexts, PF/DDT and effective protection bounds.
- `receipts/`: compact protocols, actual settings, complete audit summaries and admission explanations. Each receipt includes its own source seal; older controls are not relabeled as the final implementation.
- `archive-index.json`: checksums of full lossless evidence archives. Full native artifacts retain every tape, trade, allocation and zero-execution config.
- `universal-plan.json`: frozen all-registry causal/identity audit. Synthetic correctness coverage is separate from funded historical performance.
- `.github/workflows/signal-coverage-native.yml`: explicitly dispatched five-case frozen study plus complete audits (report-only updates do not rescore the market window); `.github/audits/run-signal-coverage.py` records machine scope, wall time, CPU time and peak RSS.

To reproduce, install locked dependencies and build, then run `node --experimental-strip-types scripts/prepare-signals-coverage.mjs scripts/studies/signals-coverage/base-protocol.json runs/signals-native` before scoring any case. Run `python3 .github/audits/run-signal-coverage.py CASE` for each named case. The launcher rejects an unexpected economic source, settings, window or feed. The checked-in feed SHA256 is `e21d39b0b7583685e2fe355f6261e0860deff3057ca5c81b43a6c3cf374e2f03`.

Research acceptance was declared before comparison: at least 30 funded settles, return PF at least 1.1 and maximum account equity drawdown at most 10%. Passing those retrospective thresholds would still not prove positive future or hourly returns. Preserve every negative, empty, unfinished and failed outcome. No venue orders or live-account changes are part of this study.

## Why earlier order totals differ

The [20 October research](../simulations/signals-12sym-20261020.md) reported 21,775 accepted **virtual** closes over a different 24-hour window with 336 hours of history, a 15-minute catalog and different guards/funding. Its full-sample unit PF was 0.623875; the 1,758-close PF 3.618 subgroup was selected in training. Neither total is a funded, like-for-like reference for the present 100-hour/12-hour study. The earlier incomplete 48-hour feed could not certify its requested 336-hour coverage either.

Rolling historical counts are not cumulative order totals. Each new checkpoint drops closes older than the configured window and adds newly settled closes. The scalar audit verifies those memberships independently at all 13 clocks. A declining passing count is reported with its first failed gate; it is not repaired by retaining expired wins or discarding new losses.

## Final measured results

| Case | Configs | Opened | Settled | Still open | Unit PF | Equity change | Max equity DD | Compute / main RSS |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| corrected | 121,535 | 5 | 1 | 4 | no losses; 1 close | -0.03906% | 0.0487% | 457.6 s / 2,050 MB |
| all-sources | 242,993 | 153 | 135 | 18 | 1.815398 | +0.00269% | 0.1933% | 840.9 s / 3,322 MB |
| dca | 436,785 | 196 | 135 | 61 | 1.815398 | -1.30150% | 5.0263% | 1111.1 s / 5,023 MB |
| dca-block | 436,785 | 196 | 135 | 61 | 1.815398 | -1.30190% | 5.0265% | 1106.4 s / 5,140 MB |
| dca-active | 436,785 | 153 | 135 | 18 | 1.815398 | +0.00269% | 0.1933% | 1095.2 s / 4,986 MB |

All five cases pass their complete scalar/catalog/funded-tape audits: **522,563,496 comparisons**, zero missing configured cells and zero mismatched funded trades. Each report passes 68 or 70 controls. Processing remains at one-minute precision. The main RSS column and separate child-process peak in the JSON are distinct measurements.

The expanded final profile restores 428 distinct fitted configs, adds 12 settled and one endpoint-open order, and raises settled unit PF from the pre-fitting-fix control's 1.636424 to 1.815398. Its cash PF diagnostic is 1.059, closed cash net +0.000203 and ending equity 10.000269 on the $10 modeled account. These are small retrospective gains. Normal, Trailing and Trailing-only each have settled PF above 1; the 15-minute lane remains losing (PF 0.44431), and there are two positive, seven negative and three empty hours. Exit has 27 calculated configs and no qualifying settled execution in this window.

DCA adds 43 funded positions that remain open; none settles within these 12 hours. Its open losses reduce ending equity by about 1.30%, with maximum equity drawdown about 5.03%. Block keeps the same settled unit-return PF and slightly worsens cash results. DCA Active has 96,896 independently calculated configs, but no own context meets the full 12-close minimum; it executes no ladder orders. These outcomes do **not** certify positive or stable DCA/Block performance.

At the final expanded checkpoint, 44.30% of configs have at least one own Last-8 context; 8.37% of all 5,831,832 contexts have eight closes, and 1.60% meet the full minimum-history requirement. There are 2,135 passing configs across 2,594 exact contexts. The report breaks these denominators down by every source, symbol, type, range and lane. Axis is disabled in these frozen market profiles; its construction, identity and execution paths are covered by the complete repository tests and separate registry fixtures.

Verification on the exact economic source: 270 core test files, 3,362 ordinary plus two slow passes, 715 script and 83 app/component passes; eight template-only scripts explicitly skip absent fixtures. Types and production app/worker build pass; lint has zero errors. All 1,972 registered specs and 38,402 source/lane combinations pass the independent 20-symbol causal/identity audits, including unfinished higher-timeframe candles.
