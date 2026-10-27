# Base diagnostic responsiveness investigation

This is an isolated synthetic four-symbol processing fixture, not a live execution, full production grid, or a profitability test. The previous runtime source was `38c9c7d87235db57a5d11376e639c28ea6f511a3`. For observation only, the stall probe threshold was reduced from 1000 ms to 500 ms in an archived source copy; the production source was not changed for this threshold. One worker and one test process were used, under a cgroup memory watchdog, with Node's sampled CPU profiler enabled.

The completed **before** run recorded a 1102 ms pause while the UI displayed Tapes, with approximately 1060 ms of main-thread CPU in the same pause. Of 984 samples covering 1101.859 ms, the largest groups were Base gate sensitivity and range diagnostic computations, not the final tape reply retention or merge. The CPU profile, clock-correlated analysis, log and memory receipt are in `before/`. Samples and thread CPU are estimates; the empty reported GC list does not prove that no garbage collection occurred.

The attempted first **after** run on `8371d7d` was stopped by its watchdog at a sampled 5,833,240,576 bytes while other local checks overlapped it. A second isolated attempt on `02ad0ae` was stopped at a sampled 5,847,375,872 bytes. Neither completed or gives an end-to-end after-fix performance result. Their receipts and logs are preserved in `interrupted/` and `interrupted-final/` respectively.

The implementation now slices three Base summaries and publishes their data only with the completed compute. Recorded pre-change fixture results remain byte-for-byte equivalent after slicing; failure, settings-change and generation-interruption tests cover each summary. The slice counter reports completed pairs, including ineligible pairs, and an event-loop test checks both responsiveness and cancellation. Batch boundaries limit the number of processed pairs, not the duration of every individual pair or sort.

## Completed diagnostic-only comparison

Three alternating runs used the same synthetic 16,000-pair input, identical range gates and an offline transport guard. The before run called the original synchronous summaries at `38c9c7d`; the after run used the actual runtime's sliced driver at `02ad0ae9fd6324a5ebeaaba4bf2590ca4bb63796`, without UI progress emission. A 5 ms timer recorded its longest gap. All six result digests were identical. This is a bounded microbenchmark of the three summaries, not the complete processing fixture, exchange latency, or an upper bound on other pauses.

| Run | Before: timer gap / compute | After: timer gap / compute |
|---|---:|---:|
| 1 | 466.58 / 465.95 ms | 29.45 / 446.49 ms |
| 2 | 480.72 / 480.09 ms | 28.08 / 466.87 ms |
| 3 | 450.75 / 450.03 ms | 27.58 / 441.04 ms |

The [raw measurements](microbenchmark.json) include memory and after-driver phase slices. Both full processing retries remain incomplete despite this smaller successful check. Reproduce the microbenchmark with separate source checkouts or archives of the specified commits (each with its dependencies installed), supplying their absolute directories:

```sh
node docs/relate-evidence-20261027/base-diagnostics-profile/run-bench.mjs /path/to/before /path/to/after /tmp/base-diagnostics-bench.json
```

The runner uses one child at a time and stops it if the Linux cgroup memory reading exceeds 5.75 GB or cannot be read; a stopped run is recorded as incomplete. The benchmark should not be run on a host without that headroom safeguard.

## Build and test boundaries

The six directly affected test files passed 127 tests with the final economic source and the offline guard; [test receipt](tests-receipt.json). A further five Signal runtime and gate files passed 23 tests; [Signal test receipt](signal-tests-receipt.json). The Signal harness initially failed to launch because of a syntax error in its local wrapper; that [launch error](signal-launch-error.log) is retained separately from the corrected test run. Typecheck passed. Two attempts to build the full app were interrupted by the 5.75 GB cgroup safeguard, including one with a 384 MiB Node heap setting; their [receipts and logs](build-interrupted/) are retained. The ordinary worker build then failed because the interrupted app build had not produced the server entry. Building the real worker into an isolated dummy server layout and syntax-checking the output succeeded; see [worker receipt](worker-bundle-receipt.json) and [worker output summary](worker-bundle.log). This does not demonstrate a complete production app build. The generated `.vercel` output from the stopped app build is incomplete and was not deployed.
