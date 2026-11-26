# Tactic Base feature lifetime — 26 November 2026

The full-focus synthetic settings-storm test on `cbab73f` did not settle within 900 seconds. A separate
four-minute diagnostic on the later Relate revision showed continuous Base progress across 190,378 configured
combinations, rather than an idle state: its seven 30-second samples rose from 2.35% to 15.70%; sampled process
RSS peaked at 1,046 MiB, with no memory-guard abort. The diagnostic was stopped deliberately after four minutes
and is not a successful stress test or a complete performance measurement.

DCA Tactic variants with the same lookback use the same closed-bar feature arrays. Base was clearing those arrays
after each indication, then rebuilding them for the next variant. Worker batches now share only those fixed-lookback
features within the batch; indication outputs are still released after each group, and the shared features are
released at the end of the batch. A regression verifies the exact local results, worker parity, one feature build
per lookback and release after the batch. Fifty focused Base, Tactic, worker and partition tests passed.

On a synthetic 320-combination, two-symbol, 2,880-bar benchmark, the old implementation took 2,065 ms and the new
one 112 ms. The result checksum was identical (`455dedd227677480c7d37138ffef3c85d117d2ebbdc9db3ca2930e2fc9375c9d`);
the respective peak process RSS measurements were 189,856 and 133,904 KiB. This is one synthetic workload, not an
end-to-end session result. `scripts/perf/dca-base-cache-bench.mjs` repeats the comparison. The complete slow test and
the 12-symbol replay must still pass before asserting that the production timeout or memory limit is resolved.

The initial cache alone did not resolve the stress timeout: at approximately 780 seconds its Base stage had reached
46.7% on one worker. Profiling found that the volatility percentile and trend-strength filters were also rebuilt for
each indication group. Their fixed bar-derived arrays now have the same batch-bounded lifetime, with local/worker
result parity and release tests. On eight synthetic 256-combination worker batches (four symbols, three days of
bars), the prior code took 3,825 ms, DCA feature reuse alone took 2,887 ms, and both caches took 2,378 ms. Every
worker result had checksum `270cdda2d8f9da9e9b50084376cb1b0b9c4e9de264d9eab0349b88a954df7a99`; respective peak
process RSS values were 322,592, 325,628 and 311,348 KiB. `scripts/perf/tactic-worker-bench.mjs` repeats that
synthetic comparison. The complete settings-storm and market replay remain required.
