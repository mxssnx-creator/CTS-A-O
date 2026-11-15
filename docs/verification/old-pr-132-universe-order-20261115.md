# Old PR #132 — deterministic universe continuation, 15 November 2026

This is a partial claim audit and a current-target correction, not approval of
the complete old draft.

| Reference | Exact commit |
| --- | --- |
| Common base | `22d8482b9babec202cbb12805dbfc4e86e16fa8d` |
| Old shared draft head | `ddebc9d2d3c5dcd53c93f6ff43ad6d660141af59` |
| Current target | `d70a470f735fe5a43953a9c5bbd09c5a41009047` |
| Old missing correction | `d15f80990881fde79e2aebdadde5314ca9d4ccff` |

The old branch has 124 exclusive commits and 396 changed paths; the target has
911 exclusive commits. Its title's simulation reports do not describe its full
scope. A structural inventory finds 92 changed source paths, 17 tooling paths,
285 documentation paths and two other paths. None of those old final blobs
matches the current blob at the same path. This does **not** mean all those
changes are missing: changed and removed paths still require semantic mapping.
Keep #132 open while that work continues. Do not restore old x01 settings,
deploy scripts, historical PF claims, gates or whole branch material.

## One independently reproduced missing claim

Old commit `d15f809` sorted loaded symbols before constructing universes to
avoid asynchronous backfill arrival order becoming an implicit tie-breaker.
Current native full construction and both ordinary/Signal lane builders again
iterate the candle map in arrival order; current `makeUniverse` preserves that
order. The old `bySymbol` helper and its regression are absent.

The corrected current-target regression reproduces two failures before the
source change: reversed symbol arrival changes universe slots and nonempty
normal/trailing tapes. This continuation canonicalizes symbols at the common
`makeUniverse` boundary. Local, worker-reconstructed, replay and incremental
universes therefore share the same order without copying old runtime code.

Per-symbol configured lane order stays stable. Original immutable Bars objects,
candle values, short-series market inputs, indicator warmup and the explicit
evaluation boundary remain intact; caller arrays are not mutated. No price,
cost, protection, return normalization, PF gate or strategy toggle changes.
Selection under previously arrival-dependent ties may intentionally change.
Old cached calculation generations still require normal re-evaluation; this
source publication does not certify or migrate an existing live cache.

## Verification and limits

- Two new regressions pass, including nonempty Normal/Trailing histories and
  exact complete walk-forward output for reversed symbol groups on a 36-hour
  constructed feed (12-hour indicator warmup, 12-hour evaluated prehistory and
  12-hour forward segment).
- Current publication, incremental, Signal-history and stored-history parity
  inventory: **96/96 pass**, no failures, skips or TODOs.
- Typecheck and diff check pass. Required exact-head CI and broader Core
  verification remain prerequisites to merging this correction.
- The first complete Core inventory attempt exposed two legacy positional
  fixture assumptions in Break/Relate: they selected `caches[0]` while their
  scalar oracle used the named target symbol. Both fixtures now select that
  target by symbol; causal z-score, activity and prefix assertions are intact.
  All **25/25** Break/Relate/permutation checks pass, and these families are
  included in required CI. The initial full-inventory failures remain in the
  continuation log; they are not relabeled as a clean full run.
- Failed test-construction attempts are retained: the first fixture supplied
  the synthetic generator's ending clock as a starting clock; the next warmup
  assertion overlooked its first-bar offset. Typecheck also rejected the
  newer `toReversed` library API; a copied-array reverse preserves the current
  compiler target. These were fixture issues, not additional product fixes.

The separate full 12-symbol replay remains frozen on `d70a470` and is not
restarted by this correction. Its current post-Base PF, validated/evaluated
counts and settled execution PF remain unavailable until completion. No key,
account, venue order, position, service or deployment was touched here. Old
losses and failed studies remain unchanged; no positive PF or live acceptance
is inferred from these synthetic correctness checks.
