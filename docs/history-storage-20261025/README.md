# Bounded complete histories and exact-minute Signal calculation

The ordinary all-range study previously exceeded 13.9 GB before finishing its strategy tapes. Completed worker replies now move into an immutable lossless history store as they arrive. A compute retains at most 256 MiB of raw arenas by default (`CTS_CORE_HISTORY_MEMORY_MB`, 1–4096 MiB); complete remaining columns are checksummed on private temporary storage with a 64 MiB column cache. This changes storage, not history length, config coverage, cost or gates. Production uses Zstandard level 1 when available and a self-described deflate fallback otherwise.

Each worker reads a streamed, checksummed manifest. It no longer needs one additional full shared-buffer copy of a stored catalog. Owners stay alive until their worker call settles; failed/superseded computations close unpublished files. Reply consumption is cancellable, cancellation drains before returning, and storage errors never invoke the unbounded tape-build fallback. Derived direction views are bounded and selection metadata holds weak references. Compaction and worker packing now preserve `carried` eligibility metadata.

The Signal activation book retains up to 128 MiB of immutable exact-context columns and indices. It recomputes all time-dependent verdicts at the decision minute, including the existing strict t/t−1 boundaries. The benchmark over 5,052 configs, 439,887 closes and 61 clocks matched all ordered keys: median 7.17 ms per cached minute versus 23.07 ms in the preceding implementation and 177.87 ms for fresh full ranking. The new cached run took 0.823 s; the first/hour-boundary maximum remained 196.84 ms. This is a sampled calculation benchmark, not an exchange latency guarantee.

## Storage evidence

The three fixed 12-symbol full-grid profiles retained identical binary catalog digests, all 6,693 configs and 10,072,876 closes. `profile-comparison.json` compares a deliberately small 32 MiB resident budget plus 64 MiB cache against the resident representation. Micro ended at 566.46 MiB versus 864.85 MiB RSS. Its deflate prototype added 11.14 s; that overhead is reported, not hidden. The subsequent codec benchmark over 16 actual Micro tapes / 88,019 closes found Zstandard write 15.22 ms versus deflate 75.56 ms, and read 7.58 ms versus 16.60 ms, with every byte equal after decoding. Full runtime performance still requires the newly frozen native study.

## Completed minute-activation replay (merged PR #201)

| Window, UTC | Opened / settled / held orders | Opened / closed / held positions | Settled unit PF | Peak equity DD |
|---|---:|---:|---:|---:|
| Oct 16 21:00–Oct 17 09:00 | 476 / 371 / 105 | 15 / 6 / 9 | 4.888011 | 0.1316% |
| Oct 17 09:00–21:00 | 863 / 280 / 583 | 4 / 2 / 2 | 0.065995 | 1.1745% |

Both use minute prices, 150h Signal history, Last4 and modeled 0.15% round-trip cost once. PF neutral is 1. The later window's 278 previously admitted closes kept exactly the same unit returns; two additional closes explain the changed combined PF. No loss was removed. The later audit checked 39,402,168 scalar observations, 126,289 configs and 10,999,508 closes, with zero missing configured cells or unknown allocations. It found zero remaining entry-ready examples missing because of the hourly activation clock; all remaining audited exclusions were recent-history or Block rules.

The later window has 34.31% of config × symbol × direction contexts with Last4 at its end, including empty contexts in the denominator. 104,465 of 126,289 configs have at least one ready context (82.72%). Historical qualified-context PF at the end is 4.60818, while the subsequently settled executed cohort is 0.065995: these are different samples, not interchangeable guarantees.

## End-to-end regression found and corrected

The first native bounded-storage control (`393fdfb…`) completed every check and all 39,402,168 coverage comparisons with the exact same 863 opened / 280 settled / 583 held orders and 4 opened / 2 closed / 2 held positions. It took 1,482.84 seconds and peaked at 4,706.11 MiB, versus 1,198.02 seconds / 4,314.48 MiB for the preceding local resident control. This is a performance regression, despite the faster sampled activation benchmark.

The replay was reopening every stored Signal tape at every minute merely to check its next entry timestamp. The follow-up uses a heap of upcoming closed/open entries, with the next closed-entry time retained in the cursor. Complete candidates still pass the same minute activation, caps, tie ordering, guards and independent order handling. No future return is read to choose an entry. Empty cursors are released. Carry-over and slimming also preserve stored ownership instead of evaluating all enumerable column getters, and activation-cache accounting now reserves metadata overhead as well as binary columns.

The paired sampled 12h storage benchmark (1,263 configs / 111,471 historical closes, deliberately small 1 MiB cache) retained the exact complete result SHA-256 `aa5e560524e5ff7bcec84fbd4b1787c7faa60e9ac9e5df2844bd5aac759a44b1`. Runtime fell from 7,919.81 to 2,429.68 ms; reads fell from 68,207 to 18,803. This sparse sample settled only three orders and is performance/parity evidence, not profitability evidence. The full native follow-up is frozen on source `767bc5d9d87f29ca463fb36612d6eaadaec7726a15bad66356ee3251f39f6c99` and must finish before an end-to-end improvement is claimed. The default resident history budget remains 256 MiB.

## DCA controls collected so far

The predeclared study keeps all outcomes; Active and Block arms remain pending. The second 12h window fails the profitability condition with or without DCA.

| Arm / offset | Orders opened / settled / held | Positions opened / closed / held | Settled unit PF | Peak equity DD |
|---|---:|---:|---:|---:|
| DCA unit / 0h | 491 / 386 / 105 | 15 / 6 / 9 | 4.425885 | 0.1359% |
| DCA weighted / 0h | 494 / 389 / 105 | 15 / 6 / 9 | 4.490939 | 0.1360% |
| DCA unit / 12h | 963 / 284 / 679 | 4 / 2 / 2 | 0.062541 | 1.4344% |
| DCA weighted / 12h | 980 / 284 / 696 | 4 / 2 / 2 | 0.062541 | 1.6553% |

[Complete control detail](control-detail.md) lists both controls by strategy range, type, parameter family, lane, symbol and every source, plus hourly order/position ledgers and protection distances.

## Verification and remaining work

All seven CI jobs passed for the first bounded-history head. The follow-up passes 52 focused tests, including complete 720-minute entry scheduling with no idle-minute disk reads, independent orders, caps, lossless worker transport, cancellation, carried eligibility and causal minute evaluation. The two carry tests were repeated after correcting their typed range identifiers. Typecheck and lint (zero errors, 43 existing warnings) pass. The new workflow covers both complete ordinary windows at two Micro stop-ratio floors and both Signal controls. Existing minute-activation DCA/Block arms continue independently. Final-head CI and complete study outcomes must be appended before release claims.

No venue action is part of this storage change. The user's stability condition for a complete X02 VST launch remains unmet by the losing later window; positive PF and production readiness are not claimed. Complete ordinary results, fractional Exit tactics and final X02 reconciliation remain outstanding.
