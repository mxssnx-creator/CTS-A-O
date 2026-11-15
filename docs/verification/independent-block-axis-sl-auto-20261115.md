# Causal progression, independent Block/Axis and automatic SL — 15 November 2026

## Measured outcome

The completed ordinary 12-symbol, 12h-prehistory + 12h-trading replay evaluates the full
catalog: **3,288/3,288** combinations, previously **2,099/3,288**. All **77/77** native
report integrity checks pass. This is a coverage/correctness improvement, not a profitable
strategy result. Initial engine post-Base is **0/71,976 (0%)**, historical passing-set PF
unavailable. Every causal decision hour now records **0/246,345 (0%)** eligible engine
and own-context Signal configurations passing. No funded orders or positions open; settled
PF is unavailable, balance and equity remain 10. No live engine or monitoring service starts.

The independent Ordinary-off comparison also completes at **77/77** integrity checks:
the same 247,037 built configs, **0/71,976** initial engine passes and **0/246,345**
hourly engine/Signal passes. All twelve hours have no funded orders/positions and
unavailable PF; balance/equity stay 10. Its tape-chunk hashes match the ordinary run.
This demonstrates preserved coverage with independent controls, not profitable Block
or Axis market execution. Functional execution is proven by the separate causal fixtures.

## Exact market protocol and controlled comparison

Twelve cached symbols: DOT, APT, ARB, ATOM, ADA, AVAX, ETC, DOGE, BCH, ETH, BTC, BNB
(USDT). Physical candles: 15 October 2026 21:00 to 16 October 21:00 UTC. Evaluated
prehistory ends at 16 October 09:00; trading runs 09:00–21:00. One-minute pricing and
completed native timeframe lanes are retained. There is no undeclared indicator warmup.
The study is retrospective, not a current market forecast or venue test.

Use `scripts/independent-block-axis-study.mjs --feed FEED --out OUT --end
2026-10-16T21:00:00Z --profile default` with Node strip-types. The launcher forces live,
autostart and background comparison off, limits Signal/Exit evaluation to the requested
12h prehistory, records the feed SHA-256 and source commit, and keeps complete tape
sidecars. `--profile independent` explicitly disables Ordinary, enables Block Active,
selects `processed-orders`, and excludes Axis from Block's stack/Active restriction.
Both final profiles preserve Main/Real/Entry 40/12/12 and the extra range Last-75/PF1.35.

The untouched baseline is `bbf91430`. The ordinary fixed replay starts at local
`eb054161`, whose tree exactly matches published `aee9d23d` (`e7e1b1cb...`). Later changes
only add fresh-desk automatic defaults, correct manual-mode merges, UI counts and tests;
the simulation's walk-forward, Block and pricing sources are unchanged. The actual explicit
study policies are recorded in its receipt. The independent run uses local `10bb09d9`,
exact tree `61d4a4bda684aa6307d8057e3e2ff7721a30e58f`, published as `cb1e829e`.

An exact recursive comparison of effective input settings, removing only new `slAuto`
construction metadata, passes between baseline and the fixed ordinary run. Resolved
factory candidate ladders are separately tested equal. Derived Base proofs differ because
short lanes now receive evaluations. Costs remain 0.176% round trip; no gate is discounted.

## Repairs

* Retain real short series instead of excluding every lane below 120 bars. Each indication
  still enforces its own actual warmup; an EMA200 without enough bars remains unavailable.
* Refresh the same Base-qualified validated cohort at every causal decision clock.
  Initially insufficient sets can qualify after their own later settlements. Explicit
  supplied validation snapshots stay frozen; later losses and held protection are retained.
* Count rejected and passing evaluations before filtering, and persist hourly denominator,
  failure reasons, passing-set arithmetic PF/no-loss counts and separate pooled diagnostic.
  Initial engine-only and hourly engine-plus-Signal cohorts are explicitly distinguished.
* Add opt-in independently admitted, capped, settled modeled Block predecessors. They
  cannot become funded orders or substitute for actual persistent Active-stage proof.
  Axis exclusion preserves its exact independent order sequence and sizing.
* Correct Block reporting to classify explicit Block participation and use canonical unit
  returns from settled funded allocations. External multiples are removed once. Unknown
  allocation membership/returns are retained and cannot manufacture a positive sample.

Seven independent-Block regression cases fail on the untouched source; the corrected
tests cover Shared/Additive/Overall, both directions, caps, causal settlement and the
persistent-stage fence. The Axis test matches its complete order sequence with Block off.

## Why the gates admit nothing

A complete streamed own-context audit verifies every tape-sidecar checksum and includes
empty config × symbol × direction contexts. The unchanged real tape rows total
10,733,173; the additional 75,361 slower-lane Signal configs are empty, not new profitable
observations. Built configs increase 171,676 → 247,037.

The fixed run declares 1,744,032 engine contexts and 4,184,856 Signal contexts. At run
start no engine context reaches Last-40; the largest has 31 closes. Across the entire
24h feed the maximum is 62 (Signals 21), and **zero contexts reach Last-75**. Axis has
at most 12 own closes, below Main-40. In the final decision hour four configs reach a
different rejection, net; every other rejection is insufficient closes. These are real
sample failures, not permission to pool siblings or lower a saved threshold silently.

| Decision UTC | Passing / evaluated configs | Validated | Passing historical PF | Funded orders |
|---|---:|---:|---|---:|
| 09:00 | 0 / 246,345 | 0% | unavailable | 0 |
| 10:00 | 0 / 246,345 | 0% | unavailable | 0 |
| 11:00 | 0 / 246,345 | 0% | unavailable | 0 |
| 12:00 | 0 / 246,345 | 0% | unavailable | 0 |
| 13:00 | 0 / 246,345 | 0% | unavailable | 0 |
| 14:00 | 0 / 246,345 | 0% | unavailable | 0 |
| 15:00 | 0 / 246,345 | 0% | unavailable | 0 |
| 16:00 | 0 / 246,345 | 0% | unavailable | 0 |
| 17:00 | 0 / 246,345 | 0% | unavailable | 0 |
| 18:00 | 0 / 246,345 | 0% | unavailable | 0 |
| 19:00 | 0 / 246,345 | 0% | unavailable | 0 |
| 20:00 | 0 / 246,345 | 0% | unavailable | 0 |

## Automatic SL and fallback contract

Fresh untouched runtime desks and newly enabled ordinary ranges start automatic.
Existing saved/manual profiles are preserved, including explicit manual patches applied
after Auto. Automatic construction does not authorize execution or relax a gate.

| Factory candidate group | Min SL/TP | Max SL/TP | Step | Fallback | Count |
|---|---:|---:|---:|---:|---:|
| Wide, Minimal, Short, General, Long, Signal Normal | 0.25 | 2.5 | 0.25 | 1 | 10 |
| Micro, Low-Range | 0.2 | 1.6 | 0.1 | 1 | 15 |
| Signal Historic | 1 | 2 | 1 | 1 | 2 |

These preserve the existing factory candidates; they are not a measured economic
optimum. New edits reject reversed bounds, invalid steps/fallbacks and excessive work.
Malformed persisted construction policies recover a bounded candidate only. Price floors,
hard caps, single-charge costs and each candidate's own causal qualification still apply.

## Comparison with the earlier positive settled PF

`fee-replay-audit-20261108.md` at archived source `43d31126` records eight symbols,
12h prehistory + 12h trading **plus 25h extra indicator warmup**, and older pooled/time
policies. It has 34,629 funded modeled closes, settled PF8.30590 and balance17.69987,
but marked equity **−9.77912**, 15,532 allocations held and 541 minutes of infeasible
exposure. It uses the same 0.176% cost. It is neither an equivalent strict-24h comparison
nor a viable profitable preset. Its initial strict physical-24h runs also had zero closes.

## Verification and limits

Published tree `61d4a4bd` passes all three required workflows. The position policy/new
regression group passes **661/661**, reporting/provenance **118/118**. Hosted desktop/
mobile development and production rendering, computed-page interactions and Settings
save pass. Local typecheck, production build and actual SL-control SSR/interactions pass;
scoped lint has no errors and five existing warnings.

The earlier local full inventory has 5,002 passing, four failing stale assumptions and
three intentionally skipped slow cases. The four affected files were corrected and pass
44 targeted checks. Final SL/Signal/settings tests pass56, and the updated fresh Signal
catalog test group passes6. No claim is made that the initial broad run was all green.

Ordinary compute takes 1,004.0s, recorded peak RSS2,388MiB, worst foreground slice636ms.
Independent compute takes 986.9s, peak RSS2,382MiB, worst foreground slice819ms.
This is below the memory ceiling but does not establish the under-500ms target. No positive
Block/Axis market PF, stable post-Base or execution PF, optimal default counts, complete
venue parity or live readiness follows. Losing, insufficient and aborted runs remain
available; the requested economically positive result is still unestablished.

CI: [policy and UI](https://github.com/mxssnx-creator/CTS-A-O/actions/runs/43764133712),
[Last-N](https://github.com/mxssnx-creator/CTS-A-O/actions/runs/43764133705),
[strategy features](https://github.com/mxssnx-creator/CTS-A-O/actions/runs/43764133747).
