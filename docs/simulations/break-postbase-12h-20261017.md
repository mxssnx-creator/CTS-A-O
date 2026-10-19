# Break post-Base replay — corrected 12 h window, 17 October 2026

## Result

The updated 60-ID Break Micro arm cleared the pooled post-Base config-validation and funded-execution PF thresholds on this historical replay, but did **not** stay above PF 1 in every active hour. The existing 50% green-hour rule returned 3 positive, 6 flat and 3 negative hours. The strongest tested hour-consistency floor reduced the negative-hour losses and raised aggregate PF, but did not increase the positive-hour count.

This is offline simulated evidence on a short, reused window. It is not held-out or live execution evidence. No settings/defaults were promoted from this sample.

## Window and controls

- Cached public 1-minute OHLCV feed, replayed locally with network access guarded off.
- Nine available symbols: BTC, ETH, SOL, XRP, BNB, DOGE, ADA, AVAX and LINK. The requested 12-symbol sample is not available in this cache; no synthetic symbols were substituted.
- Evaluated history: 2026-10-14 04:00–16:00 UTC. Simulated closes: 2026-10-14 16:00–2026-10-15 04:00 UTC.
- One-minute, five-minute and fifteen-minute lanes configured. Micro’s 5-minute minimum meant this run traded on 5-minute Micro configs.
- Signals off, same balance ($1,000), 2% equity sizing, 10× leverage and 0.20% round-trip cost. One compute worker; simulated orders only.
- Base and config selection both used 12 hours. The replay-only selection-window override is bounded to offline feeds with explicit evaluation and end times. Production’s 24-hour minimum for longH is unchanged.
- Return-based PF on owned simulated closes is primary. Cash PF is a separate sizing diagnostic.

The first replay draft exposed a history mismatch: preH was 12 hours, but the default longH made config selection use 336 hours. Those results are superseded for the requested 12-hour experiment. The corrected run seals and checks the effective runtime settings before scoring; its report shows longH=12 and a 12-hour config-evaluation window.

## Matched old and updated arms

| Stage | Legacy 4-ID set | Updated 60-ID Micro set |
|---|---:|---:|
| Base Micro pairs passed | 4 / 12 | 4 / 60 |
| Base pooled PF | ∞, no loss | ∞, no loss |
| Runtime median Base no-loss score | 4.00 | 4.00 |
| Post-Base configs validated | 696 / 3,128 | 728 / 2,176 |
| Post-Base pooled validation Return PF | 4.104 | 10.345 |
| Candidate pool closes before config validation | 32,106 at PF 0.313 | 4,416 at PF 0.380 |
| Validated-config closes in the simulated window | 5,980 at PF 0.576 | 1,178 at PF 3.246 |
| Funded simulated orders | 1,563 | 726 |
| Funded simulated Return PF | 0.342 | 3.272 |
| Net simulated P&L | −$18.768 | +$5.201 |
| Equity maximum drawdown | 7.06% | 2.71% |
| Positive / flat / negative hours | 3 / 3 / 6 | 3 / 6 / 3 |
| Core compute / sampled peak RSS | 985 ms / 477 MB | 1,437 ms / 388 MB |

The updated set’s full post-Base validation and funded-book PF exceed 1, but it produced 837 fewer orders than the legacy set. Its hourly PF still fell below 1 at 18:00, 19:00 and 23:00 UTC. The Base pooled PF is infinite because the four passed pairs had gross profit and no gross loss; the finite runtime gate score of 4.00 is a qualification sentinel, not an exact measured PF.

## Updated arm: hourly funnel and executions

Base runs once on its 12-hour historical window; the hourly funnel begins after Base. “Candidate pool” is the diagnostic pool before config validation. “Validated-config closes” are simulated tape closes from configs that passed configEval at the run start. “Executed” is the actual owned simulated cohort after gates, caps and Block allocation.

| Exit hour UTC | Candidate pool (closes · PF) | Validated-config closes (closes · PF) | Simulated executed (orders · PF) | Net |
|---|---:|---:|---:|---:|
| 16:00 | 604 · 0.00 | 0 · – | 0 · – | $0.000 |
| 17:00 | 216 · 0.00 | 0 · – | 0 · – | $0.000 |
| 18:00 | 860 · 0.026 | 264 · 0.00 | 228 · 0.00 | −$0.797 |
| 19:00 | 60 · 0.840 | 48 · 0.630 | 48 · 0.630 | −$0.040 |
| 20:00 | 136 · 2.330 | 88 · 2.130 | 48 · ∞ (no loss) | +$0.317 |
| 21:00 | 1,108 · 0.584 | 272 · 2.336 | 188 · 6.012 | +$0.449 |
| 22:00 | 48 · 0.00 | 0 · – | 0 · – | $0.000 |
| 23:00 | 44 · 0.00 | 2 · 0.00 | 2 · 0.00 | −$0.037 |
| 00:00 | 96 · 0.00 | 0 · – | 0 · – | $0.000 |
| 01:00 | 6 · 0.00 | 0 · – | 0 · – | $0.000 |
| 02:00 | 1,238 · 7.946 | 504 · 48.582 | 212 · ∞ (no loss) | +$5.309 |
| 03:00 | 0 · – | 0 · – | 0 · – | $0.000 |

Hour PF is unavailable (–) when there are no closes. “∞ (no loss)” means a measured sample with positive return and no losing close. Candidate-pool PF is pre-validation and is not a qualification result. The pooled validated-config PF over the full historical selection window is 10.345; its realized per-hour PF can still be below 1.

## Hour-consistency sensitivity

The baseline config-evaluation rule requires at least 50% green hours. A bounded offline-only replay override tested stricter green-hour fractions; it does not change saved or live settings.

| Minimum green-hour fraction | Validated configs | Validation PF | Executed orders | Executed Return PF | Net | Positive / flat / negative hours |
|---:|---:|---:|---:|---:|---:|---:|
| 50% baseline | 728 / 2,176 | 10.345 | 726 | 3.272 | +$5.201 | 3 / 6 / 3 |
| 60% | 648 / 2,176 | 12.234 | 622 | 4.184 | +$5.969 | 3 / 6 / 3 |
| 70% | 616 / 2,176 | 13.391 | 566 | 4.904 | +$6.496 | 3 / 6 / 3 |
| 80% | 616 / 2,176 | 13.391 | 566 | 4.904 | +$6.496 | 3 / 6 / 3 |
| 100% | 528 / 2,176 | 19.617 | 494 | 3.714 | +$4.850 | 3 / 6 / 3 |

At 70%, the realized funnel was: candidate pool 4,416 closes at PF 0.380; validated-config closes 938 at PF 4.161; simulated executions 566 at PF 4.904. The 18:00 losing hour fell from 228 to 108 orders; 19:00 remained 48 orders at PF 0.63; 23:00 remained 2 losing orders. The filter improved the aggregate result, reduced order count by 22%, and left the number of positive hours unchanged. A 100% historical green-hour requirement performed worse in execution PF and net than 70%.

This is an exploratory in-sample sensitivity, and 70% is only a candidate for a later untouched-window test. Do not promote it or tune further against these same hours.

## Other post-Base gates tested

A 3×4 matrix crossed config-validation min PF {1.10, 1.30, 1.50} with per-config entry last-N {0, 10, 25, 50}; the entry last-N threshold was 1.10 and the 12-hour replay window and all other settings were frozen.

| Config min-PF floor | Entry last-N values | Configs passed / evaluated | Validation PF | Orders / execution PF | Hour outcome |
|---:|---|---:|---:|---:|---|
| 1.10 | 0, 10, 25, 50 | 728 / 2,176 | 10.345 | 726 / 3.272 | 3 / 6 / 3 |
| 1.30 | 0, 10, 25, 50 | 728 / 2,176 | 10.345 | 726 / 3.272 | 3 / 6 / 3 |
| 1.50 | 0, 10, 25, 50 | 728 / 2,176 | 10.345 | 726 / 3.272 | 3 / 6 / 3 |

No matrix cell changed the hourly counts, PF or net result. Last-N did reject 20 candidates at N=10 and 8 at N=25/50, but replacements kept the aggregate executed metrics unchanged. Every validated config in this run already exceeded a 1.50 PF floor, so raising that floor did not change membership.

## Verification and evidence

- Old and updated matched arms, all 12 PF × last-N cells and all four green-hour floors passed the replay’s consistency checks: 18 runs, 56/56 each.
- Focused session-report tests: 15/15.
- Break, Micro, Relate, range, walk-forward and pipeline regression bundle: 93/93 across 22 suites.
- TypeScript typecheck, Node syntax checks and git diff whitespace check passed.
- The replay-only history and green-hour flags require an offline feed plus explicit end/evaluation boundaries. The matched matrix runs did not set `--live-since`; replaying the native live last-N model gate requires that explicit flag.

Final current-source recheck: the updated baseline and 70% exploratory floor were rerun against `scripts/core-session.mjs` SHA-256 `feac6910ea8f149532b6bc153a95693ce3574e0649a597030413da22d4f422d3` and `scripts/core-session.test.mjs` SHA-256 `01bae35651b92cf504595e20f58621f167ec061f28f98a5ff6be0c9188aced98`. Both reproduced the recorded orders, PF, net and 3 / 6 / 3 hourly outcomes, and passed 56/56 checks. This confirms the later report/serialization edits did not change the replay results.

Corrected run protocol SHA-256: 3cc88a5a71dd4b8471f22c4fe444c55c4a378a1803a91a10869518cc6e6a325a. Updated-arm report SHA-256: a686d90403da6d3b55d810aeef5fe8638333d053ac30fd27d8251ded0fb1514e. Updated-arm raw session SHA-256: 67844a21e700f592e7e2fe204cfde3711613c5df145ce240c9f500b35063adcd. The complete 12× gate grid protocol and green-hour-floor protocol are separate frozen records with per-variant runtime hashes.

No live order, authenticated venue, deployment or profitability promotion was tested. These results do not establish durable profitability or success in every hour.
