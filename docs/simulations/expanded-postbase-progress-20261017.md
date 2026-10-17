# Expanded post-Base study checkpoint — 17 October 2026

Initial source checkpoint: `b1a0e714d268574d5ab5c21d89f1a99279596cf3` on
`fix/postbase-expanded-study-20261017`,
[PR #164](https://github.com/mxssnx-creator/CTS-A-O/pull/164).
After preload, Base admission and cgroup-root corrections, hosted run
39077361130 completed the regular core audit with nine failures. Its slow
checks and all market replays were skipped. Isolated failure repairs and
another source freeze remain open. The four complete 20/22 results are pending;
this checkpoint establishes no new market PF, order count or hourly success.
No live deployment, reload or exchange order was performed.

## Source corrections and candidate

- The 12 optional Micro Break `reclaim8` identities detect a wick through
  the prior eight-bar channel followed by a directional close back inside.
  Penetration is bounded by prior ATR, and the existing independent trend,
  activity, drawdown and lane checks remain. The original 60 Micro Break
  default identities are preserved; reclaim8 is an explicit candidate.
- Diagnostic `allSets` construction now retains a separate Base-qualified
  pair/range map. Diagnostic rows cannot qualify themselves or displace the
  admitted Main cohort. Later selection, entries and live promotion retain
  the exact admitted range; held positions retain exit protection.
- Fixed-focus preset backtests now perform causal Base qualification too.
  A Live PF setting can tighten the matching range floor, never lower it.
- The study launcher freezes complete effective settings, derived WF,
  commands, sources and feed hashes; explicit selection is 24h. It rejects
  partial universes, missing coverage, memory fallback, unknown allocations
  and incomplete validation. Unrecorded slim-Base hourly samples display
  unavailable rather than fabricated zero observations.

The [frozen protocol](expanded-postbase-protocol-20261017.md) defines the
chronological development and final windows: 20 symbols trading Oct15
21:00–Oct16 21:00 UTC, then 22 trading Oct16 21:00–Oct17 21:00 UTC. Each has
24h evaluated prehistory and separate 205h indicator warmup. Every case uses
the same explicit 0.15% modeled cost, $1,000 balance, 0.1% balance sizing and
10× leverage. The full source archive is 397h; each replay feed is physically
cut to 253h. These are retrospective simulations, not venue-owned fills.

## Preserved incomplete first attempt

`runs/postbase-dev20-baseline-20261017-v1/baseline-20/run-result.json`
records `complete:false`, exit 130 / SIGINT and no scored result. Its engine
started Base while only five of 20 symbols were loaded, then aborted on a
memory reserve check (1,101MB available, 1,200MB hard threshold, process
534MB), carrying a Micro fallback. After the full backfill arrived it began
another Base calculation; the owned process was interrupted. The failed
protocol, command, engine log and result remain preserved. Only its stale
worktree-local lock was removed after the process exited.

Failed protocol SHA-256:
`33ff13d6e9eac03907be363e69439957d5a87f895d3ea90482d612dc9cb8a8ef`.
Engine log SHA-256:
`989e5470e30d20a91fcd2af1079da3d52e6816aa457b1c9c53df14f6c058e14c`.
Do not report its partial calculation as a completed 20-symbol benchmark.
A retry requires corrected preload/admission behavior, focused verification
and a newly sealed attempt directory and protocol.

## Earlier results and public data

[The prior comparison audit](prior-comparison-audit-20261017.md) records why
older positive headlines are not interchangeable. The archived 792-order
positive six-hour run used four symbols, 15m and 336h selection; the later
nine-symbol run used multiple lanes and bounded 6h selection. Old 12h and
24h Break drafts also inherited 336h config selection despite shorter stated
history. The separate 572-to-1,327-order cost comparison changed sizing from
2% to 0.1%, so its improvement cannot be attributed to cost alone. The
2,184-order/PF4.723109 archive and the 43-Signal/PF51.27 summary have
different funded cohorts. No old headline authorizes bypassing current gates.

[Acquisition provenance](symbols22-data-20261017/README.md) covers all 22
public symbols, 524,040 complete 1m candles, 8,734 aligned 1h candles and
374 raw public pages. TON was unavailable; ETC was chosen for availability
before strategy scoring. Failed acquisition and rate-limit attempts are
preserved. No gap filling or outcome-based symbol replacement was used.

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| `runs/symbols22-397h-corrected-20261017/feed.json` | 39,528,851 | `02ad14fd7d7ba3e89dee99026962a2ec66d8145d6beb36b17ab42a89a7d2004e` |
| `cts-ao-22-symbol-public-20261017.tar.gz` | 15,868,857 | `252bc0c3c43e66a7e2252450376b3c9cf1f475e11bcee15d79ebf0bdc3589938` |

The archive is saved and hash-verified. Its 392 regular members include 390
source payload files, an archive README and per-file manifest. Every archived
payload hash was rechecked. It contains public candles, contract metadata,
request/protocol/manifest records and failed-attempt provenance; the
deterministic first-20 feed copy, credentials, private ledgers, dependencies
and Git metadata are excluded. Tar ownership/mode/time and gzip time are
normalized. Sidecar manifest and verification records accompany the archive.

## Verification available at this checkpoint

Reclaim checks passed 35/35 and the saved-default migration case passed 1/1.
The broader ten-file run had 87 pass and one fixture failure; after the
fixture correction, the both-side indication suite passed 5/5 and its focused
case 1/1. These overlap and are not summed as independent tests.

Base/live/preset verification initially passed 110/111 with a stale catalog
assertion; its corrected focused case passed 1/1. New preset cases passed
9/9, covering saved/auto/research combinations through worker and local
paths. Root typecheck and `build:dev` passed. This does not claim one wholly
green rerun of every repository test.

The acquisition's six focused data tests and scoped ESLint passed. The
completed-evidence review helper initially passed eight synthetic tests, scoped ESLint
with zero warnings, Node syntax/help and whitespace checks. It tests
canonical unit returns, positive native allocation identity, unknown loss
retention, zero/dust ownership, endpoint exclusion, all-four completion,
source/feed/settings hash checks and exact prospective exclusion scopes.
It has not read or scored the pending final-day results.

The later exact-sign win-rate extension passed ten review tests. Total,
hourly, config and reclaim scopes distinguish wins, losses, exact breakeven
and unknown returns. Win rate includes flat funded closes in its denominator;
empty or unknown-return samples remain unavailable. These are accounting
fixture checks, separate from measured profitable hours.

## Replay recipe after preload/admission fixes are verified

Run from the repository root after committing the corrected source. Use new
directories; preserve v1 and any later failed attempts. The launcher itself
sets a transport guard, one worker, no live activity and serial processes.

```sh
study_root=runs/postbase-expanded-20261017-v2
study_feed=runs/symbols22-397h-corrected-20261017/feed.json
study_case() {
  study_out="$study_root/$1"
  node --experimental-strip-types --no-warnings scripts/core-22-symbol-study.mjs prepare \
    --feed "$study_feed" --out "$study_out" --symbols "$2" --variant "$3" \
    --end-at "$4" --cost 0.0015 --lane-history-days 11 || return
  node --experimental-strip-types --no-warnings scripts/core-22-symbol-study.mjs run \
    --protocol "$study_out/protocol.json" --case "$3-$2"
}
study_case dev20-baseline 20 baseline 2026-10-16T21:00:00Z || exit $?
study_case dev20-reclaim8 20 reclaim8 2026-10-16T21:00:00Z || exit $?
study_case val22-baseline 22 baseline 2026-10-17T21:00:00Z || exit $?
study_case val22-reclaim8 22 reclaim8 2026-10-17T21:00:00Z || exit $?
```

Only after all four complete with unchanged matching source/settings:

```sh
node --experimental-strip-types --no-warnings scripts/core-expanded-study-review.mjs \
  --baseline20 "$study_root/dev20-baseline/baseline-20" \
  --reclaim20 "$study_root/dev20-reclaim8/reclaim8-20" \
  --baseline22 "$study_root/val22-baseline/baseline-22" \
  --reclaim22 "$study_root/val22-reclaim8/reclaim8-22" \
  --out "$study_root/review"
```

The review emits matched comparisons, all 24 hours per window, Base/config
failure breakdowns and a prospective exclusion-candidate JSON. The frozen
removal rule requires the same exact config or indication/lane scope to have
at least 50 funded closes and six active hours in each window, complete unit
evidence, PF below one in both, and negative unit return in at least two-thirds
of active hours in both. It also reports positive contributions during
portfolio losing hours. No exclusion is applied; a selected removal list
needs a new prospective replay and cannot claim an after-prune PF from the
already scored final day.

## Final source checks and resealed protocols

The independent untagged DCA/Axis admission regression is fixed in 079598b.
Complete TypeScript and client/server/worker build checks passed after test-only
fixture typing corrections. A fresh serial offline script run passed 55/55
tests with no failures, cancellations or skips. The four v2 protocols are
frozen before scoring; their index and source/settings/feed hashes are in
`expanded-postbase-v2-index-20261017.json`. Shared memory headroom subsequently
fell below 700 MiB, so the expanded market replays remain pending strict
resource admission. No fallback, incomplete cohort or pruning result is claimed.

## Micro relation gap correction before scoring

A 100-bar deterministic reproduction confirmed that a missing target candle
could enter a multi-bar jump as a one-bar return while a contiguous peer kept
the market return finite. In that fixture beta was 6.0201529 instead of the
valid-pair fit 1.0941893. Commit 9a81414 excludes the invalid return, protects
movement windows across gaps, restarts RSI warmup, and rewarms own activity.
The rolling 60-bar/minimum 40-valid-pair fit and gapless arithmetic are retained.
Storage adds one shared Uint32 counter per bar, never one per config. All 9
focused offline tests passed under a 512 MiB heap cap; independent review found
no blockers. The unused v2 protocols are retained and superseded before any
market scoring; all four arms are being resealed as v3.

## Confirmed hierarchy-root scanner correction and v4 freeze

The first hosted attempt, run39076740047, passed installation, typecheck,
the packaged build and55 offline regressions, then stopped before scoring.
Linux's true cgroup hierarchy root has no memory.max/current interfaces;
the scanner had treated that documented shape as an unknown memory limit.
Commit b48e7dd distinguishes ENOENT from unreadable files and recognizes
only a structurally confirmed hierarchy root. Host availability, every real
finite ancestor cap, the4096MiB minimum, shared lock and runtime guards remain
binding. Twenty launcher tests passed and independent review found no blocker.

All four v4 protocols were freshly materialized before scoring. The
`expanded-postbase-v4-index-20261017.json` records source manifest
`bc7216bd7ab6000b7651a5d83054a16887854097a31847e7701b9a92754693f7`.
Feeds, complete runtime settings/WF, grids, costs, sizing, gates, warmup and
windows match v3 exactly; only the launcher source provenance changed.
The failed hosted evidence and original v3 index remain preserved.

The next isolated workflow additionally runs all178 core test files serially,
then the two optional synthetic runtime stress/backtest tests, before any
replay. Their bounded steps retain full logs and stop on failure; no current
full-suite or market result is claimed before those steps finish.

## Hosted verification passed; first launch blocked before scoring

[Hosted run 39076740047](postbase-ci-interrupted-39076740047/README.md)
installed the frozen dependencies, passed complete TypeScript and the
client/server/core-worker development build, and passed the same serial
55-test offline regression set with zero failures, cancellations or skips.
The encoded public fixture reconstructed the exact source feed hash. All
four development/final baseline/reclaim8 protocols were prepared before any
score, with source-manifest SHA-256
`20a6f8109c15c547c5ee1acb235aa2959134f59ff84466f36a684711b9fef0fe`.

The first baseline20 launch exited 1 at resource admission: host availability
was 14,543MiB against a 4,096MiB floor, but the scanner treated the cgroup
root's unavailable limit/current counters as unknown. Child nodes reported
unlimited limits. No strategy scoring or engine trade dump began, so all
20/22-symbol execution metrics and the prospective removal review remain
pending. This is distinct from the earlier local memory-fallback/SIGINT130
attempt. The compact original logs, complete blocked result and per-file
hashes are tracked in that evidence directory and indexed by
`expanded-postbase-validation-20261017.json`. Fixing the scanner changes the
source identity; verify it and reseal fresh protocols rather than reuse the
blocked attempt. Guards and profitability thresholds were not relaxed.

## Full hosted regular audit completed with nine failures

[Run 39077361130 evidence](postbase-ci-audit-failed-39077361130/README.md)
preserves the five exact hosted logs and their hashes. The frozen source was
`bc7216bd7ab6000b7651a5d83054a16887854097a31847e7701b9a92754693f7`,
published as commit `f75026f0d675e95fdf0a5d94e1de2aadf2f4ccb3`.
Install, TypeScript, client/server/core-worker build and 57 script regressions
passed. The complete regular audit recorded 2,097 tests across 334 suites:
2,086 passed, nine failed, none cancelled and two skipped, in
2,440,894.088435ms (40m41s). This is not a passing full-suite result.

The slow checks and every 20/22-symbol replay were skipped after that failure;
no scoring occurred. The nine checks cover adjustment/pause propagation,
settings completeness, indication fixture coverage, control backstop and
sizing/status/ownership expectations, event-loop responsiveness, and an
isolated no-TP lane fixture. Exact names and locations are preserved in the
evidence manifest, without declaring any issue fixed. The report also lists
the 15 slowest top-level suites for a prospective CI sharding plan; these
timings do not change the meaning of a failing assertion.

The separate edge-repair verification, run 39078415117 on source
`e1b28d07657b104fb9710233e3141b51d4ee3bbb9265b6027a8e8787972cc890`,
remains active at this checkpoint. Its outcome must be observed separately.
Failure corrections are being consolidated in the verified checkout for a
future v5 freeze before the first market score. No merge, deployment/reload,
exclusion, improved PF or hourly-success result is claimed.
