# Eight-symbol 12h + 12h execution audit, 30 October 2026

## Result and release status

**The requested stage-processing defect is reproduced but is not fixed.** A separately verified repair prevents
unknown Signal/engine-side returns from poisoning later finite windows or passing sparse proof. This repair has
not been shown to cause or resolve the recorded market-window PF drop. The production runtime still reads candidate
tape histories rather than the fully independent, persistent Base → Main → Real derived sets requested by the
operator. The draft stage implementation remains disabled; it has no complete runtime adapter. Do not start x01.

`src/core/sim/processed-main-conflict.test.ts` uses a controlled eight-symbol, 12h+12h synthetic tape. An enabled
coordination conflict rejects 14 winning sibling candidates while a specific target context admits 12 losing
orders. At the next decision the exact processed Last-12 has PF 0, yet the raw candidate Last-12 passes 1.08 and
another losing candidate is admitted. The first assertion verifies this mismatch. The second assertion is marked
TODO and actually fails: **1 pass, 1 expected failure, not two passes**. This is a contract counterexample, not
proof that all historical losses have this cause. Any complete fix must simulate and retain each upstream
stage's own admitted entries and closes, with causal event ordering and correct handling of positions still open,
then use those histories for the successor gates before mirroring Active; replacing a tape with funded closes is
not equivalent because funding occurs later. Rejected upstream entries must not occupy a simulated position slot.
Do not remove live guardrails or enable an incomplete stage implementation to make this test green.

## Market replay and interpretation

Frozen 8-symbol public market feed; 8 October 12:00 to 9 October 00:00 UTC prehistory and 9 October 00:00 to
12:00 UTC trading, 2026. Only 24 hours of bars were used, including indicator initialization. This window was
previously examined and is not held out. The bounded protection grid is not the complete possible grid. The
existing EMA/MACD/RSI Signal sources and all enabled Base indication/bot combinations were requested; 15m and
30m lanes lacked the 120 completed bars needed by the engine. The `low-range` kind was not evaluated.

- Base: 120 / 27,242 passed = 0.4405%, including separate Base paths. Initial engine post-Base config validation:
  6 / 236 passed = 2.542%; Signal selection is separate. The finite historical mean is 55.806 from two sets;
  four additional no-loss sets are counted separately. This historical snapshot and subsequent execution are
  different cohorts.
- Funded **model**, after recorded 0.15% round-trip costs: 51 positions opened, 46 closed, 5 held; 307 orders
  opened, 294 closed, 13 held. Closed unit-return PF **3.596185**; 258 wins and 36 losses. This is a model
  allocation, not an exchange receipt. Exchange PF is unavailable. All 294 closes are long; no short performance
  conclusion is supported. The mark-inclusive model figure was approximately 3.09 and must not be called the
  settled PF.
- Settled execution by strategy/range: Minimal Trailing 110 closes, PF 11.00974; Wide DCA 184 closes, PF
  2.90752. Other strategy/range categories have zero closes and unavailable PF. 229 closes were TP, 5 SL and 60
  trailing; no time exit occurred. Four DCA stops accounted for 0.338536 / 0.369983 (91.5%) of gross unit-return
  losses in this sample. The 08:00–09:00 UTC hour closed 13 orders at PF 0.149; 09:00–10:00 had no closes;
  10:00–11:00 closed three at PF 0. This does not demonstrate consistently high PF.
- 294/294 exact cfg × symbol × side × entry × exit identities and one-unit returns match the source tape; 110
  ordinary trailing price/cost checks had max error 8.2e-8 (compact Float32 prices). DCA deterministic tests
  cover weighted per-leg economics; no intrabar venue execution is established. 232 closes had fewer than nine
  own-symbol/direction source closes at entry under the legacy scope, a diagnostic rather than proof of the
  requested processed-stage evaluation.
- Checks: 74/76. The run exited 1 on the two incomplete catalog coverage checks: 27,284 / 42,366 expected
  combinations and 20 / 21 indication kinds. No missing cell is marked as passed. Wall 18.83 s, peak RSS
  657,560 KiB; worst reported processing slice 1,954 ms (loop max 1,993 ms), exceeding the 500 ms target.
- Comparison against baseline `af8a790` on the identical feed/settings retained all 294 funded and virtual
  closes, 13 holdings and allocations, selected configs, 27,200 Base pairs, 818 candidate tape histories and 12
  validation steps exactly. The unknown-return repair did not change this finite-return market sample. The
  baseline and new full runs both had the same incomplete-coverage failure.

The earlier 51-focus 8-symbol 12+12 run produced no funded trades: Base 9 / 768, initial engine validation 0 / 0,
PF unavailable. The 9 Base passes were independently qualified Historic Exit pairs that lacked enough fitting
entries. Baseline/after parity on that run describes an empty execution cohort and is not evidence of profit.

## Tests and evidence

- `node scripts/test-core.mjs` on the ten named regression files recorded in `evidence/bounded-core.log`:
  **99 passed**; includes mocked Bybit and cost/trailing/Micro/hold/identity/processed-set coverage.
- Unknown-return suite and adjacent Signal/live provenance checks: **44 passed** in
  `evidence/execution-audit-signal-final.log`. Typecheck passed.
- `node --test scripts/render-execution-audit.test.mjs`: **1 passed**; exercises embedded data, accurate
  denominators, report rendering, filtering and 12-hour heatmap without connecting to an exchange.
- The controlled Main-stage fixture is **1 pass, 1 TODO expected failure** in
  `evidence/execution-audit-main-reproducer.log`.
- The 247-case legacy baseline batch inadvertently included two synthetic fixtures with 100h/336h history.
  The automatically triggered Exit verification PR workflow subsequently ran the full core inventory, including
  those two fixtures again; its synthetic UI fixture configured six days. These executions exceeded the operator's
  three-day maximum and must not be represented as compliant. They were not intentionally repeated locally.
- GitHub's dedicated bounded verification passed. The accidentally triggered broad workflow's four core shards
  and slow-runtime job passed, but its UI quality job failed on the missing PF-helper binding and an obsolete
  PF-minus-one text assertion. The bindings and assertion were corrected in subsequent PRs; the six-day browser
  fixture was not rerun, so a compliant end-to-end browser pass remains outstanding. The separate Exact Signal
  workflow also failed on that same missing binding; its market research jobs were skipped.

`evidence/feed-8-symbols-24h.json.gz` SHA-256:
`bd4b66e09c65b990082ccc56dfd2624fd18815d01767a315dc002dfa0f6f02b0`.
`evidence/replay-records.tar.gz` SHA-256:
`f5a38858faaf1fb33d1ef608d5bc3e62efd74df9e62b2d4a55018b19ad57c3b2`.
It includes both raw dumps, native allocation report data and their referenced sidecars. After extracting it,
`node docs/pf-neutral-20261029/verify-replay.mjs <baseline-dir> <full-focus-dir> <output.json>` reruns exact
parity; `python scripts/render-execution-audit.py <full-focus-dir> <output.html>` regenerates the report. Both
were checked on the extracted archive. The frozen command and protocol record the actual research settings.
- A sequential production build completed with the core worker packaged and database migration skipped without
  `DATABASE_URL` (`evidence/build.log`). An earlier concurrent build log ended at SSR startup without a completion
  marker despite its wrapper returning zero; it is preserved as inconclusive in `build-parallel-incomplete.log`.
