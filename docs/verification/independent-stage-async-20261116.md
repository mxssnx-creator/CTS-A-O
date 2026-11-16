# Independent stage processing and asynchronous evaluation — 16 November 2026

Follow-up to PR #286. Live engines and monitoring remain stopped. This branch changes offline/paper
processing and worker scheduling; it makes no profitability or deployment claim.

## Reproduced defects and repairs

- With persistent Main/Real stages, Block Active rejected the very predecessors needed to populate
  its own processed-order book. Gate-qualified unit predecessors now traverse their own stages.
  Only an Active predecessor's settled outcome can teach Block; earlier stage outcomes cannot.
  Precursors have explicit ownership, zero funding and no venue contribution. Losing histories
  keep processing and may recover; accepted-only history retains its configured semantics.
- Per-range Ordinary-off previously defeated the global-toggle workaround for Block predecessors.
  The precursor path now preserves the exact original range/type gates and switches.
- The runtime treated the last simulation's ever-qualified IDs as a frozen whitelist. An empty
  result suppressed later qualification. Full selection steps reevaluate current own histories;
  explicitly supplied frozen snapshots and held protection retain their contract.
- Runtime post-Base counts came from the already-filtered seats, hiding failed evaluations and
  making nonempty cohorts appear 100% validated. Capture the denominator during actual evaluation.
- A newly allocated incremental learning feed could leave book cursors reading the older array.
  Retire those cursors on feed replacement. Pre-Active paper outcomes no longer enter accepted
  execution feedback; processed-only Block precursor feedback remains separately marked.
- Stored histories revalidated ownership through millions of accessor calls. Read each column
  once and cache checked provenance by immutable generation without retaining decoded arenas.
  Freeze stored symbol metadata, invalidate replacements/retirements, verify checksums on reload,
  and reuse only exact-size decoded buffers. Per-config selection avoids unused catalog maps.
- Count selection and sample coverage yield by elapsed time. Live research returns coverage from
  the same bounded owned worker, avoiding a second catalog scan on the ticker thread. Worker
  messages identify intra-hour work without inventing completed hours. A monotonic completed-work
  counter supports a three-minute inactivity timeout and a finite one-hour research deadline.
- Native admission indexes processing-only ownership once per immutable published book, rather
  than scanning all held positions for each candidate. Missing entry clocks stay conservative;
  exact config/symbol/side/entry identities and replacement publications remain independent.

## Verification checkpoint

Original failing reproductions are retained with the study evidence. Count-policy tests cover
three Block modes, both directions, Ordinary off, per-range off, own Main/Real windows, losses,
recovery, cap constraints and the first causally admissible raised entry. Actual full/fast runtime
tests cover zero precursor funding, independent feedback, held ownership and later qualification.
The 20-symbol 1/5/15-minute worker transport comparison includes every result, loss, feed,
validation field and coverage summary. Immutable-cache eviction, replacement, retirement and
unknown-evidence controls remain required.

The bounded synthetic history benchmark retained the exact evaluation hash
`2838b17d320213bbfa393fb3ca7f510ed97056c432e635f569a7f50953d2a89e`:
800/800 decisions passed unchanged native gates. Observed evaluation time was 1,894.69→665.07 ms,
sampled RSS 273,186,816→187,793,408 bytes, and stored-column cache hits 10,695,360→1,360.
Historical validation PF was 20 on the synthetic Main-window cohort, with an identical evaluation
hash on both versions; there are no funded executions. Heap did not improve (39.76→40.66 MB).
This is a synthetic calculation benchmark, not market evidence or a complete live-cycle SLA.

Final application source is `f1019c59ef995095e27f5e7e7d754747754aa8da`, tree
`7e9fa5549e674c6b3706b0b8294ae83c4c41075b`. The full market replay is frozen on
`5da5c96f6499133c183b55d09ae503b1e1ce9765`; the later application delta is only the
native precursor index. `908076f2` subsequently clarifies one test assertion without changing
production code. The canonical final regression run passes 804 tests across 63 files and
42 suites, zero skips/failures, in 127.54 seconds. The first direct launcher omitted `--expose-gc`
and failed one memory fixture; its 803 passes and failure remain archived. The canonical runner
rerun verifies collection of evicted arenas. Eight stage tests also pass after the assertion cleanup.
Typecheck and production/core-worker build pass. Changed-file lint has zero errors and eight
existing unused-symbol warnings; the original test-only optional-chain lint failure is retained.

The native admission index visits a 20,000-row book once across 20,000 checks (36.28 ms in its
fixture). A separate warmed mark/protection control on final application source uses 20 symbols
and 1/5/15-minute identities for 50 frames: 200 positions p95 2.74/max 6.66 ms, 20,000 positions
p95 204.66/max 218.89 ms, with exact scalar mark parity and intermittent missing quotes.
This control excludes selection, DB/network waits and worker startup; it has no admission or
funded PF cohort and cannot certify the complete 500 ms foreground target.

The November 14 gate comparison was repeated on final application source: all 10,733,173 retained
candidate rows were rescanned, then 5,184 decisions/diagnostics across 18 chosen configs and twelve
hourly clocks matched `1cf7742d` exactly (0 passing, historical PF unavailable). This is a gate-only
comparison on retained histories, not a fresh full-engine rebuild of the older branch.

The fresh 12-symbol market replay completed successfully on sealed source `5da5c96f`, exactly
12h prehistory and 12h trading (October 15 21:00–October 16 21:00 UTC; trading 09:00–21:00),
with unchanged own Main-40/Real-12/Entry-12 and range Last-75. All 77 native integrity checks pass.
Each of twelve hourly decision snapshots has 0/246,345 validated (0%), no funded orders or positions
opened/settled/held, and unavailable historical passing/funded PF. Equity and balance remain 10;
all twelve hours are flat. Initial engine validation is 0/71,976, with 174,369 separate Signal tapes.
All 247,037 configurations and 10,733,173 candidate rows were audited with every chunk checksum.
The maximum own history is 31 closes at the start and 62 at the end; no exact context reaches75.
Settings, symbols, window, candidate hashes, hourly validation/results and funded totals exactly
match the prior Ordinary-off independent run. The sample limit remains; no gate was weakened.

Compute time is 1,998.94 seconds; end-to-end time 2,274.69 seconds. Peak recorded RSS is 2,405 MB
(decimal), cold event-loop p99 348.39 ms/max 2,965.37 ms. Last-N coverage takes49.74 seconds with
maximum yielded slice229.65 ms. Full paper reselection now actually reevaluates the previously
empty cohort:39.56 seconds, maximum slice1,704.92 ms. Those cold costs are not a warmed cycle SLA.
The CPU profile still records substantial GC (351.34 self seconds), countWindowRows (125.60
self seconds) and stored-column/decompression work. Every performance issue is not resolved.
The earlier independent replay computed in2,822.80 seconds with2,515 MB peak RSS, but profiling
and concurrent host workloads differ. These are observations, not an isolated speedup guarantee.

This preserved market profile leaves optional persistent processed stages disabled. Populated
Main→Real→Active behavior is separately verified with deterministic full/fast runtime fixtures;
the empty market cohort cannot establish native execution parity or profitability. Bounded
Auto-SL defaults/fallbacks remain construction policy, not a proved economic optimum.

PR #286's merge request is unresolved: GitHub last reported open, with a prior “Merge already in
progress” response. Do not force-move main or issue blind duplicate merges. This follow-up stays
isolated until the remote merge outcome is known. Automatic approval review rejected the new GitHub
push because it could not verify explicit authorization to disclose the repository's code/history.
No alternate publication route was attempted. New source is committed locally only; no push, merge
or deployment is claimed. No SL defaults are declared economically optimal.
