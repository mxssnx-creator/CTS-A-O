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

The volatility rank itself also scanned all 336 prior values for every bar. Its immutable-series path now keeps
only the finite values in that causal window in sorted order and finds the strict-less-than count by binary search.
The streaming path is unchanged. A scalar oracle covered missing values, infinities, duplicates, signed zero, multiple
window sizes and causal prefixes. On 20,000 synthetic values repeated ten times, the scalar version took 228 ms and
the bounded version 54 ms with identical checksum
`c850406a7ec0c357ed5d23062e2d34c8f3ae4dbfb540af6d2597beeb5033b3e0`. The eight-batch worker comparison improved from
2,728 ms to 2,369 ms with identical output; observed peak RSS was 303,612 versus 336,028 KiB. These individual
measurements do not establish the complete runtime or peak memory. `scripts/perf/percentile-rank-bench.mjs` repeats
the scalar comparison.

The feature scan validated the same candle repeatedly in overlapping windows and allocated a temporary array on
each validation. It now maintains counts of invalid candles and gaps for the exact causal window, without retaining
an extra per-bar array. The first candle's preceding gap is excluded; the current candle and its gap are included.
The accumulation order for the trading features is unchanged. `scripts/perf/compare-dca-features.mjs` compares
source roots: 30 clean and malformed datasets, including incremental prefixes, produced 19,800 identical state and
feature arrays (checksum `dc9986a09f90c3c7845eb14ebf8012ae256876f77bf5edaac41f48c807d8e3c7`). Tests also check
exactly when invalid candles and gaps leave the window, and exercise all 2,256 configured Tactics.

In three alternating runs of the eight-batch synthetic worker benchmark, the baseline took 3,031, 2,262 and
2,318 ms; the updated scan took 1,813, 2,028 and 1,696 ms. All six outputs had checksum
`270cdda2d8f9da9e9b50084376cb1b0b9c4e9de264d9eab0349b88a954df7a99`. Peak RSS ranged from 300,704 to
305,604 KiB before and from 302,296 to 316,432 KiB after, so this small benchmark does not demonstrate a peak-memory
improvement. It also does not establish the full replay runtime or the live cycle latency.
