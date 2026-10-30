# Trailing-only protection and execution audit — 30 October 2026

## Status

The repaired trailing-only entry, minute-hold and continuation paths pass the bounded regressions below. A changed-gate, retrospective market-model diagnostic also produced 126 trailing-only closes. This is not an exchange fill test or proof of future profitability. The persistent processed Base → Main → Real adapter remains disabled and unfinished; a controlled Main coordination-conflict regression still has one passing assertion and one expected, actually failing TODO. Do not start x01 on this evidence.

## Repairs

- ATR resolution now preserves the trailing-only flag, zero target, captured maximum hold and trailing ceiling; a non-Signal trailing-only resolved protection is capped after ATR resolution. A no-TP simulated order cannot invent an ATR take-profit.
- A pending ordinary trailing-only entry now receives the same capped stop and trailing distances as the simulator. Long and short tests compare the actual pending entry and simulated entry.
- A pending order originating from minute-projected execution now retains the execution clock and captured minute hold. It expires at that deadline instead of a rounded source-lane deadline, including the 15-minute Micro case. Provenance must match the actual protection; old unstamped orders are not assigned a guessed deadline.
- Reconciliation is notified when a stale target or trailing setting is repaired even if the stop price itself did not change.
- Trailing-only tapes can resume incrementally; resume checks compare pending execution metadata and held protection before accepting a continuation.
- A tagged trailing-only candidate now obeys the existing Base target proof during tape construction, matching later seat selection. The fitted positive-TP filter remains bypassed for a zero-TP cell.
- Where per-cell Base proof is used, its key now distinguishes no-TP mode, trailing ratio, free mode and a nondefault stop ceiling. Base publishes the same capped post-lane protection used by execution. Default policy keys retain their compatible encoding; old unmatched protected holdings must be managed without acquiring a new seat.

**Remaining Base qualification limitation:** The frozen market desk has `grid.baseCells` off. Its ordinary engine Base proof is at pair/range/target level, so a passing zero-TP target can admit a sibling stop/hold policy without an independent Base cell verdict. The proof-key repair prevents aliasing where per-cell proof exists; it does not turn target-level Base into exact per-config Base. Base cell enumeration, missing-proof behavior, adjustment and worker/preset/runtime publication must all be changed and tested together before claiming exact per-config Base qualification systemwide. Signal and Historic Exit have separate qualification paths.

## Two retrospective runs

Both runs use the same eight public-candle symbols, 8 October 12:00–9 October 00:00 UTC as evaluated prehistory and 9 October 00:00–12:00 UTC as trading, in 2026. Both use a bounded grid and 0.15% modeled round-trip costs; no exchange was contacted. PF is gross positive unit returns divided by gross negative unit returns, with 1.00 neutral. This is a previously inspected window, not held-out evidence. Counts are funded-model positions or orders and are not exchange fills. Both runs failed the same 2 of 76 catalog coverage checks: 27,284/42,366 requested combinations, 20/21 indication kinds; low-range was not evaluated and 15m/30m lanes did not have the required 120 completed bars.

| Cohort | Default gates | Diagnostic: minimum closes 10, validation Last-10 |
|---|---:|---:|
| Base passed / evaluated | 120 / 27,242 (0.44%) | 151 / 27,242 (0.55%) |
| Initial post-Base engine configs passed / evaluated | 6 / 236 (2.54%) | 54 / 478 (11.30%) |
| Initial passing finite mean PF | 55.806 across 2 finite sets; 4 no-loss sets separate | 17.649 across 17 finite sets; 37 no-loss sets separate |
| Positions opened / closed / held | 51 / 46 / 5 | 16 / 8 / 8 |
| Orders opened / closed / held | 307 / 294 / 13 | 2,195 / 2,116 / 79 |
| Closed-order model PF | 3.596185 | 3.900433 |
| Initial Base-target-allowed trailing-only configs passed / evaluated | 0 / 8 (0%) | 4 / 26 (15.38%) |
| Trailing-only orders closed / held | 0 / 0 | 126 / 1 |
| Closed trailing-only model PF | unavailable | 2.646054 |
| Exchange PF | unavailable | unavailable |

The diagnostic changes the shared `settings.gates.minTrades` from 12 to 10, and `wf.validLastN` from 12 to 10; the normalized `wf.gates.minTrades` follows the settings. No other frozen economic settings changed. Since the minimum also affects Base, the difference cannot be attributed to Last-N alone. This experiment is not a production settings change or an assertion that 10 is optimal. In the default snapshot, all eight eligible no-TP configs failed for insufficient closes (8–11 versus 12), rather than an arbitrary loss of their orders.

The diagnostic's 126 trailing-only closes were all **long Minimal**, with 118 trailing-stop and 8 hard-stop exits, no TP, and observed holds from 3 to 438 minutes (mean 52.52). Trailing-only hourly PF was below 1 in hours 00–01 (0.186; 6 closes), 08–09 (0.187; 8 closes), and 10–11 (0.428; 6 closes); hour 09–10 had no closes and 11–12 had one no-loss close. Other hours had positive finite PF. This does not establish continuous high PF, short-side performance, or exact processed-stage validation.

The four initially selected no-TP configurations in the diagnostic, all with trailing activation 0.4%, 960 one-minute bars nominal hold and a 3% ceiling:

| Indication | Initial stop | Initial validation closes / PF | Later closed orders / PF |
|---|---:|---:|---:|
| micro-1x5-drawdown-market-fast@m1 | 1.2% | 11 / 12.314 | 18 / 2.412 |
| micro-1x5-drawdown-market-fast@m1 | 2.4% | 11 / 12.314 | 17 / 2.413 |
| inverse-known-cci-14-100@m1 | 1.2% | 10 / 3.394 | 46 / 2.196 |
| inverse-known-cci-14-100@m1 | 2.4% | 10 / 17.399 | 45 / 3.806 |

The default replay's 294 funded closes, 13 held orders and their closed/held allocations, 27,200 Base pair rows, initial selection, 12 engine validation steps and Signal step exactly match the prior frozen run. Of 818 prior candidate tapes, 800 were retained identically and 18 removed tapes were all unselected zero-TP trailing-only candidates without initial Base admission or later funded closes. The two runs' settings, window, account and feed match. This is qualified-cohort parity, not identical complete candidate histories. Exact source-tape reconciliation matched all 294 default and all 2,116 diagnostic funded closes; 110 and 857 ordinary price/cost checks respectively had maximum errors 8.2e-8 and 8.9e-8 from compact prices.

Default wall time was 20.10 seconds and maximum child RSS 641,940 KiB; worst Tapes slice 1,767 ms exceeds the 500 ms target. Diagnostic wall time was 21.95 seconds, maximum child RSS 711,700 KiB, worst slice 1,864 ms. RSS is the largest child, not summed process memory; neither run meets the foreground latency target.

## Tests and evidence

- Six bounded core test files: **69 passed**, covering both directions, exact proof, Low-Range worker/local parity, 15-minute and sub-lane deadlines, incremental/full tape parity, costs, Signal protection and mocked venue controls. Typecheck and a sequential production build passed; the build skipped database migration because `DATABASE_URL` was unset.
- The two new self-contained HTML reports and the preceding report passed **3 renderer tests**, including full order/config retention, pagination, 12-hour heatmaps and changed-gate labeling. No browser or real venue was exercised.
- The independent Main conflict reproducer remains **1 pass, 1 expected failing TODO**. The TODO is not a pass and the root processed-stage issue remains open.
- A Signal fixture was accidentally run once at 125 hours earlier in this work, exceeding the operator's three-day limit. Its fixture was reduced to 24 hours and rerun successfully. The two recorded market runs and final bounded test suite follow the current duration limit; the earlier overrun is not erased.

[Default detailed report](report.html) lists every recorded configuration, all 294 closed orders and the 13 held orders, with a 12-hour heatmap. [Last-10 diagnostic report](report-n10.html) does the same for 2,116 closed orders and 79 held orders. Each report supports search and JSONL order export.

Source checkpoint tested: local `9c19344` (the source-tree seal, not the final documentation commit). Source inventory SHA-256: `7bf849ea9bf2a7a932f38c00f0e03d34960c20b08515447c7160ee42b09fe71d`. Frozen feed SHA-256: `bd4b66e09c65b990082ccc56dfd2624fd18815d01767a315dc002dfa0f6f02b0`. `evidence/replay-records.tar.gz` SHA-256: `18ab88e306a452d1ceac5e3d6819ce48b96dd08cb22ecbd9a09511f029564881`. It contains both complete raw reports and their referenced sidecars, normalized settings, audit outputs, commands and resources. The preceding `docs/execution-audit-20261030/evidence/replay-records.tar.gz` contains the comparison baseline; its feed is stored alongside it.

After extracting both archives into the same directory, run `node scripts/audit-trailing-only-replay.mjs <dir>/full-focus <dir>/trailing-only-final-20261030 <dir>/full-focus/main-audit.json <dir>/qualified-parity.json`. Rebuild each HTML with `python scripts/render-execution-audit.py <run-dir> <output.html>`. The test and build logs are included under `evidence/`.
