# Prespecified account-risk and causal-entry holdout

Frozen on 17 October 2026 before inspecting this window's outcomes or the
22-symbol selection/final outcomes. **The sole preselected candidate is
`entry5-gross1`.** Other arms are comparisons, not a menu for selecting a new
winner after scoring. This is offline research; no live setting, default,
indication, range or config is changed or pruned.

## Evidence motivating the question

The 20-symbol development control and corrected-source runs had matching
Return PF 0.7656 over 126,380 funded closes. The modeled account was insolvent:
marked ending equity was −$9.9346 from $10 and marked drawdown was 238.49%.
Passing source/arithmetic checks does not establish account feasibility.
The entry-5 development policy recorded Return PF 1.267875 over 87,179 funded
closes and four positive hours out of six, with closed cash +$12.395 and marked
ending equity $12.788; marked drawdown was still 54.69%. Entry-15 marked ending
equity was $7.795 and drawdown 53.55%. These are observed development results,
not holdout success or evidence of low risk.

Those development books were **uncapped**: recorded position/gross balance
ratios were 0/0. Every new arm explicitly adds a final account position ratio
of **0.75× balance per Symbol+Direction**, and a gross ratio of 7× or 1×.
The comparison therefore changes account risk policy relative to development;
it is not a cost-only or identical-risk comparison. These are final account
funding constraints, separate from strategy orders/config seats, which retain
their existing unrestricted processing. The exchange position limit stays 100.

## Frozen source, window and four arms

Economic source: `fdabcdb3f9daf17160873f98962dc265f9142159`, verified against
all 82 non-test core-file hashes in `scripts/studies/baseline-2860c3f.json`.
This source adds complete-universe offline replay loading with a missing-history
fence, and defaults unrelated background preset comparisons off. These are
processing/resource corrections; live progressive loading is unchanged.
The existing source-check-only driver prepares the patched baseline worktree
and verifies common instrumentation; this new launcher does not modify it.
Fully materialized baseline defaults are normalized by the corrected runtime
before the explicit account/entry policy is applied and normalized again.

All 22 fixed symbols and physical candles match the existing public archive
study. Feed SHA256:
`84e29bb4e729e6f4e213ba1c8e6eb8c1a11ecbc0a8b3f65e958a4563040f8019`.
Evaluated prehistory: **14 October 15:00–21:00 UTC**. Trading:
**14 October 21:00–15 October 21:00 UTC**, exactly 24 hours. Older physical
candles initialize indicators only behind the explicit evaluation boundary.

| Arm | Exact-config entry Last-N | Entry minimum PF | Account gross/balance | Role |
|---|---:|---:|---:|---|
| control-entry0-gross7 | Off | Existing inactive floor | 7× | Diagnostic control |
| entry5-gross7 | 5 | 1.2 | 7× | Diagnostic entry comparison |
| entry5-gross1 | 5 | 1.2 | 1× | Sole frozen candidate |
| entry15-gross1 | 15 | 1.2 | 1× | Diagnostic longer entry sample |

Every arm retains all configured ranges, indications, Signal config identities,
Base/config validation gates and exit/volume models, cost 0.15%, $10 starting
balance, equity sizing 0.1%, leverage 10, Signal count 0 and live disabled.
Both directions remain enabled. The **full saved WF** explicitly has
`simH=24`, `preH=6`, `longH=6`, `causalBase=true`, `recordValidation=true`;
this prevents a saved six-hour development window from overriding CLI bounds.
Only the specified entry Last-N/floor and final account risk fields differ.

## Candidate acceptance fixed before scoring

Acceptance requires all of the following on the same funded settled cohort:

- Strict exact source/feed/settings/window/coverage checks and all shared report
  and independent arithmetic audits pass without memory degradation.
- Finite measured post-Base **Engine Return PF > 1.2**, and combined funded
  Return PF > 1.2; at least 1,000 funded settled closes and ten traded symbols
  in both the primary Engine and combined samples.
- Both Engine directions trade. Own long/short PF is reported; aggregate
  success does not imply that each direction was profitable.
- Signals are reported separately. Empty Signals remain uncertified and do
  not veto engine-only research. If Signal closes exist, their own finite
  measured Return PF must exceed 1.2 for account research acceptance.
- At least **16 of 24 cash-positive hours**, positive closed cash, and marked
  ending equity strictly above the $10 starting capital.
- Marked equity minimum strictly above zero, no recorded ruin, account
  feasibility true, **zero margin-shortfall minutes**, and marked equity
  drawdown **≤10%**. These checks use the capped account fields, never the
  separate uncapped diagnostic.

No PF clamp, invented liquidation, hidden losing hour or execution-volume
renormalization is permitted. A fully reconciled losing, infeasible or
insufficient run is a **completed research failure**, not a failed arithmetic
audit. No-loss sentinels cannot substitute for the finite measured PF rule.
Every comparison arm retains the same complete assessment; a diagnostic arm
passing cannot replace the frozen candidate.

## Execution and preservation

`scripts/run-risk-entry-study.mjs` freezes exact settings before scoring,
captures `--dump-only --tape-trades --signal-progress`, then runs the common
reporter, auditor and feasibility assessment as separate processes. Source,
feed, complete WF, settings and result scope are checked before and after.
`CTS_CORE_COMPARE=0` suppresses the unrelated background preset-comparison
benchmark; every configured strategy/config cell of the requested simulation
still computes and passes its unchanged qualification gates.
All hourly/cohort/range/config/side evidence and failed criteria remain in
artifacts; prior output directories cannot be reused.

The first four attempts in Actions run `39075929197` completed the full
22-symbol calculation, then aborted during capture at Node's default roughly
4 GiB heap limit. Their source, feed, full settings and account policies were
independently verified, but none produced a funded raw/report/audit result.
Diagnostic pre-funding simulation PF is not an account outcome. These failed
attempts remain preserved and cannot qualify or reject the frozen candidate.

The resource-only retry explicitly grants each child Node process an **8 GiB
heap limit** inside its isolated 16 GB runner. Lossless raw captures retain
all tapes, validation rows and owned-close indices in relative SHA256-sealed
sidecars, each chunk at most 8 MiB. Before and after reporting, the validator
loads owned closes and verifies every unloaded history chunk, exact row order,
counts and ordered payload hashes without retaining every tape/check at once.
The reporter explicitly enables `--chunk-allocations`; complete funded closed
and open allocation rows also remain in checksummed sidecars. The independent
auditor verifies and reads these allocations, while final assessment verifies
every report chunk and preserves its full manifest/digests alongside totals.
Unloaded allocation placeholders never represent zero funded orders.
The common helper and launcher are included in the new instrumentation seal;
the 82-file economic pin, all four policies and candidate remain unchanged.
Artifacts include `evidence/**`, covering every referenced sidecar. Retry
directories include the Actions run ID and attempt, preserving earlier runs.

The retry first reuses the exact retained public feed artifact from run
`39075929197`. It rebuilds public archives only if that artifact is confirmed
missing or expired. An available artifact's download or checksum failure
fails the attempt; it does not silently rebuild over corrupted evidence.
Whether restored or rebuilt, the feed hash and full 462-archive provenance
checks remain mandatory before any simulation.

The separate workflow changes only these three new paths and targets a PR
based on `cts-ao/exact-signal-configs-20261017`; the current core/main workflow
and ongoing original study stay unchanged. It uses public standard Ubuntu
runners, at most four simultaneous research jobs, four CPUs and 16 GB per job,
no paid larger runners or account credentials. Data, raw captures, complete
freezes, source proofs, reports, checks and failures are retained seven days.
This launch does not claim a future positive outcome or authorize live trading.
