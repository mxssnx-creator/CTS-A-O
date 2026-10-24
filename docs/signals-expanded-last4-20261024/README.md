# Expanded Signals, Last-4 and order control — 24 October 2026

Expanded is now the factory Signal profile: all 103 sources, 1/5/15/30-minute lanes, percentage and ATR exits, and three independent trailing-gap ratios (0.5/1/1.5). Signals keep their own range and also use the independent Strategies Exit path. Last-4 replaces Last-8; 100h historical evaluation and one-minute prices remain. Full-history sample, PF, drawdown and source-stability requirements are retained. Backed-up one-time migrations preserve custom values and later edits.

Configuration details now reconstruct the exact published Base history, including the independent Signal window and frozen costs/settings. Shared API/report counters keep a position open while any funded sibling order remains held. Orders retain their exact configuration identity; hourly positions and orders reconcile from opening through settlement and endpoint holdings.

## Frozen comparison

Final-source replay complete; see release.json for the completed CI and source records.

Both arms use the same cached minute feed, all sources, 12 symbols, 100h evaluation plus separate indicator warmup, and the 12h window 16 October 23:00–17 October 11:00 Europe/Vienna. Simulated starting equity is $10, sizing 0.1%, leverage 10, modeled round-trip cost 0.15%. DCA/Block/Axis are off in this paired Signal financial profile; their ordinary defaults and systemwide lifecycle tests are separate. This is retrospective modeled execution, not venue-owned fills or unseen-market validation.

| Measure | Last-8 | Last-4 |
|---|---:|---:|
| Effective configured standard cells | 242538 | 242538 |
| Built configurations | 242993 | 242988 |
| Historic closes | 16932927 | 16929954 |
| Missing configured cells | 0 | 0 |
| Positions opened / closed / held | 11 / 8 / 3 | 14 / 9 / 5 |
| Orders opened / settled / held | 153 / 135 / 18 | 203 / 186 / 17 |
| Peak positions / orders | 6 / 86 | 9 / 88 |
| Settled unit-return PF | 1.815398 | 1.882191 |
| Sized-dollar PF (diagnostic) | 1.059000 | 1.179552 |
| Ending equity ($) | 10.000269 | 10.000092 |
| Maximum equity drawdown (%) | 0.1933 | 0.1945 |
| Maximum equity drawdown duration (h) | 6.35 | 6.35 |
| Positive / negative / empty return hours | 2 / 7 / 3 | 2 / 7 / 3 |

Last-4 opened 32.7% more orders. Overall settled PF is above one, but seven hours and the 15-minute lane lost. The 1-minute lane and combined parameter range produced no funded orders. No losing/empty group is suppressed. Counts of qualified sets may decline legitimately as returns enter and expire from their own rolling windows; conservation and exact scalar recomputation, not forced monotonic growth, establish correctness.

## Coverage, independent evidence and execution

All 330,768 requested grid cells were accounted for, with duplicates created by identical hard-floor protections reconciled to 242,538 distinct standard configurations. The catalog has 118 source identities (103 original sources plus 15 coordinators), 884 source/range/lane pairs and 12 symbols. Each configuration × symbol × direction is evaluated independently at 13 reporting checkpoints. Price paths, protection and entry processing remain at minute precision.

At the Last-4 endpoint, 202,629 configurations (83.39%) have four closes in at least one context. Across all 5,831,712 exact configuration × symbol × direction contexts, 29.40% have Last-4; 1.61% meet the separate full-history minimum, and 2,786 contexts across 2,220 configurations pass the full evaluation. Four closes alone never bypass the other gates.

| Type | Configurations | Exact contexts with Last-4 | Positions opened / closed / held | Orders opened / settled / held | Settled return PF |
|---|---:|---:|---:|---:|---:|
| exit | 38 | 38.82% | 4 / 2 / 2 | 16 / 10 / 6 | no-loss |
| normal | 53,120 | 27.63% | 5 / 5 / 0 | 18 / 18 / 0 | 2.521492 |
| trailing | 137,090 | 29.20% | 11 / 8 / 3 | 141 / 131 / 10 | 1.500554 |
| trailing-only | 52,740 | 31.69% | 3 / 2 / 1 | 28 / 27 / 1 | 2.442985 |

Position episodes overlap between type groups and must not be added. Exit had ten settled orders with no losses; this is a no-loss sample, not a finite PF estimate. The separate entry-admission trace explains all 108 own-valid settled candidates not in the selection: 77 block-stability, 27 recent-history and four selection-clock cases. Own validation is not complete admission, and endpoint-open candidates are counted separately.

| Lane | Configurations | Exact contexts with Last-4 | Orders opened / settled / held | Settled return PF |
|---|---:|---:|---:|---:|
| 5 | 64,517 | 49.47% | 37 / 37 / 0 | 3.776867 |
| 15 | 57,705 | 36.44% | 122 / 105 / 17 | 0.356216 |
| 30 | 54,923 | 17.45% | 44 / 44 / 0 | 3.716203 |
| 1 | 65,843 | 13.51% | 0 / 0 / 0 | empty |

## Hourly reconciliation

Each row reports completed-hour events in Europe/Vienna. Exit events on an hour boundary belong to the hour just completed. Both ledgers satisfy start + opened − closed = held at every checkpoint. PF uses settled funded unit returns; cash-hour signs can differ because order sizes differ.

| Hour beginning | Positions opened / closed / held | Orders opened / settled / held | Settled PF |
|---|---:|---:|---:|
| 16 Oct 23:00 | 5 / 0 / 5 | 106 / 18 / 88 | 0.3918 |
| 17 Oct 00:00 | 1 / 0 / 6 | 5 / 29 / 64 | 0.5915 |
| 17 Oct 01:00 | 0 / 0 / 6 | 0 / 0 / 64 | empty |
| 17 Oct 02:00 | 2 / 0 / 8 | 4 / 2 / 66 | 0.0000 |
| 17 Oct 03:00 | 0 / 2 / 6 | 0 / 17 / 49 | 0.0004 |
| 17 Oct 04:00 | 1 / 0 / 7 | 5 / 0 / 54 | empty |
| 17 Oct 05:00 | 3 / 1 / 9 | 35 / 25 / 64 | 0.0000 |
| 17 Oct 06:00 | 0 / 3 / 6 | 24 / 52 / 36 | 23.4050 |
| 17 Oct 07:00 | 1 / 0 / 7 | 2 / 12 / 26 | 4.9482 |
| 17 Oct 08:00 | 1 / 2 / 6 | 22 / 9 / 39 | 0.7312 |
| 17 Oct 09:00 | 0 / 1 / 5 | 0 / 22 / 17 | 0.0000 |
| 17 Oct 10:00 | 0 / 0 / 5 | 0 / 0 / 17 | empty |

## Protection and performance limits

Last-4 percentage protections have a 3% maximum hard stop and a maximum SL/TP ratio of 3. Trailing activation starts as low as 0.17%, with a 0.20% minimum peak gap; trailing-only activation starts at 0.21%, with a 0.25% minimum gap and no TP. Independent Exit activation starts at 0.84%, with minimum peak gap 0.5412%. ATR configurations retain their own ATR multiples and hard floors; percentage/ATR parameters are not interchangeable. Exact per-type/source/range bounds and qualification drawdown durations are in report.html and coverage.json.

Final-source runs used the complete expanded grid. Hosted runs use two workers; the local repeat uses four:

| Case | Computation | Native run including report | Child peak RSS | Independent scalar audit |
|---|---:|---:|---:|---:|
| Last-8 | 509.022 s | 544.297 s | 4,570.95 MiB | 108.931 s |
| Last-4 | 806.465 s | 865.062 s | 3,809.26 MiB | 181.606 s |
| Last-4, four workers on local host | 526.952 s | 581.216 s | 4,810.95 MiB | 151.744 s |

The final four-worker repeat passed all 68 native checks and reproduced the two-worker catalog, grouped results, hourly ledgers, exact execution contexts and admission outcomes exactly; see `worker-parity-final.json`.

There were no memory aborts or fallback reductions. The full scalar audit checked 75,812,256 Last-4 comparisons plus 75,813,816 Last-8 comparisons with zero differences. Final Last-4 was slower across Base, history, tapes and trading on its hosted runner. These are separate hosts, so neither a speedup nor a causal regression can be inferred from this pair. `performance.json` retains phase timings.

Before the final detail/label fixes, the preserved two-worker Last-4 run took 504.659 s compute / 540.069 s including reporting, with 4,543.89 MiB child peak RSS; Last-8 took 510.045 / 547.759 s and 4,585.93 MiB. A four-worker run of that earlier source took 517.417 / 579.452 s and 4,790.14 MiB. `worker-parity.json` proves equality across worker counts for that source; `source-result-parity.json` verifies that the final code preserves both arms' full catalogs, grouped results, hourly ledgers, exact execution-context records and admission outcomes, with the primary position-label correction explicitly checked. Historical processing uses bounded tasks, minute candidate batches, released worker scratch, streamed evidence and bounded derived caches. The measurements do not establish a universal performance optimum.

## Lifecycle and release evidence

The independent-admission fixture executes 1,728 orders across 24 position episodes, with 1,152 peak concurrent orders and 576 reopens while siblings stay held. The mocked native-control matrix covers 112 range × type × side combinations: two independent parents, a 0.4 partial close, the exact 0.6 remainder, sibling closure, no rebuy and no orphan protective orders. Existing restart, unknown-fill, stale cumulative-fill, ownership, fee, risk and reconciliation guards remain required. The 128-toggle whole-engine processing matrix passes. These are correctness tests, not financial market outcomes.

Final full-inventory CI passed 4,287 tests: 3,487 ordinary core, two slow runtime, 715 script and 83 app/component tests. There were zero failures or cancellations; eight template-only script cases were intentionally skipped, and the two slow runtime cases were excluded from the ordinary partition and passed separately. Types, production build and desktop/mobile report checks passed; lint has zero errors and 43 existing warnings. Exact CI, browser verification and merge records are in release.json. attempts.json retains failed/cancelled attempts and their fixes. receipts/pre-detail remains an explicitly older successful source; final receipts and the standalone report are recorded separately. archives.json gives checksums and durable full-history archive identifiers. No live exchange operations or deployment/restart are performed by this release.

Reproduction: `node --experimental-strip-types --no-warnings scripts/prepare-signals-last4.mjs runs/NEW_DIRECTORY`, followed by `python3 scripts/run-signals-native-case.py runs/NEW_DIRECTORY last4` and the equivalent `last8` command. Use a new directory and freeze both arms before scoring. Never reuse a failed source seal.
