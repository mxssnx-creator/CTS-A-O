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

## Verification and remaining work

The native Signal replay on source `393fdfb39930f969c8b1ac85d2f86975db86f05e919979f29f36478ee17246e7` has started. The new workflow covers both complete ordinary windows at two Micro stop-ratio floors and both Signal controls. Existing minute-activation DCA/Block arms continue independently. 42 targeted tests pass, including memory-guard cancellation, lossless worker transport, metadata retention and causal minute evaluation. Typecheck and lint (zero errors) pass. Full CI and study outcomes must be appended before release claims.

No venue action is part of this storage change. The user's stability condition for a complete X02 VST launch remains unmet by the losing later window; positive PF and production readiness are not claimed. Complete ordinary results, fractional Exit tactics and final X02 reconciliation remain outstanding.
