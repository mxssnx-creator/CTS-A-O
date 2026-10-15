# CTS-A-O work and tasks

Updated 15 October 2026, Europe/Vienna. Continuation baseline: main `c70cbd25213bd072c341f5e20a8376d63b5ab121`, PR #137. Scope remains CTS-A-O.

## Current work

| Task | Status | Acceptance evidence |
|---|---|---|
| Trace post-Base and live-promotion PF | Implementing reviewed fixes | Exact qualified and executed samples; raw candidate PF cannot qualify or veto them |
| Diagnose Micro (`mc`), Minimal (`mn`, operator: Minimum), Short (`sh`) rejection | Diagnosis complete | Full saved waterfall and 83,712 config-side rows; see `range-admission-diagnosis-20261015.md` |
| Correct promotion/range defects | Range checkpoint pushed; promotion integration in progress | Regression cases exercise the actual failing paths and keep costs/sample requirements |
| Improve non-performing indications and ranges | Rules frozen; awaiting source freeze | Three profiles, two retrospective development folds; later acquisition only after selection freeze; every prescribed candidate and loss retained |
| Verify UI, worker/local parity and execution integration | Pending source freeze | Correct stage labels and PF basis, no invented fills, deterministic independent ranges/directions |
| Preserve evidence and push/merge verified work | Ongoing | Remote baseline backup plus reviewed checkpoints, source hashes, tests and current handoff |

Qualification must come from corrected causal calculations or measured improvements. Do not lower a reported PF floor, omit losses, substitute a winning sibling, expand history silently, or select a new configuration using the reported evaluation period.

## Current diagnosis and checkpoints

Confirmed promotion defects include unfiltered tape fallback, unknown group returns, endpoint-only readiness and nullable SQL returns coerced to zero. Those paths are being replaced with explicit post-Base and owned execution evidence. Legacy nominal lane attribution is not funded-fill proof.

Independent promotion review also reproduced duplicate underlying fills counted as multiple samples, stale aggregate PF reused for a different last-N window, nonfinite cumulative returns, dust ownership and rounding tolerance turning zero P&L into no-loss wins. These cases are release blockers until their canonical arithmetic, ownership and exact chronological-window regressions pass. A reference must not hide newer losses or unknowns from the same execution source.

The range floor contract is corrected and has **79 passing focused tests**: Base and actual grids now agree on per-range/inherited stop floors, minimum actual trailing gaps for fractional steps, and upward rounding only when a hard minimum would otherwise be violated. All 2,656 shipped grid cells and 248 Base cells remain byte-identical to the baseline. This is a correctness checkpoint; integrated promotion/UI validation is still in progress.

The original six-hour funded book, using matching owned settled close slices, has:

| Range | Settled close slices | Return PF | Cash PF (diagnostic) |
|---|---:|---:|---:|
| Micro | 23,294 | 0.8439145865 | 0.7079411421 |
| Minimal | 2,746 | 1.3815196967 | 1.5936751558 |
| Short | 0 | Unavailable | Unavailable |

These aggregate figures do not establish an individual configuration's execution sample. Positive short-direction cohorts are diagnosis, not permission to delete all long losses. The full 83,712 config-side rows and rejection waterfall are retained in the range-admission audit.

The bounded development comparison is three profiles on fixed BTC/ETH/SOL/XRP, regular and combined 15m, six existing Micro bases plus all ten Tactic bases, and the complete unchanged Micro/Minimal/Short protection grids. It compares corrected scoped defaults, Base trailing-cell discovery, and existing causal side acceptance. Source/settings/protocol must freeze before scoring. The two historical folds are development evidence; newly accessed data after 04:00 UTC can provide only a shorter provisional outer check, not an invented six-hour prospective result.

The protocol was frozen at 08:02:47 UTC before scoring: SHA-256 `c3bee5d76710d4de16c135ecae4cbaa5ac419549bd16b0b18134819558460316`. It uses supporting 15/30m bars for the exact 32 regular/combined 15m IDs, 205 hours of indicator-only warmup, 72 hours of evaluated prehistory and two six-hour trading folds. No engine scoring or new market-data acquisition has occurred at this checkpoint. First source checkpoint: `eb12239c32f50752b71cd039ebb1ceb851b36124`; baseline backup branch: `backup/pre-promotion-range-20261015`; implementation PR: #138.

The previous frozen replay built Micro and Minimal engine configs. Its six unmet range checks were **Short/General/Long** (`sh/gn/lg`) admission and activity, not Micro/Minimal. All independent Signal protection histories were calculated, but funded Signal entries and settled closes were zero. Research, modeled execution and venue-owned execution remain different evidence.

## Still open from the prior release

- Authenticated live-host/deployment access, a consistent live database/settings backup, verified reload and actual execution PF.
- Exact identity of the external resource awaiting an industrial deployment name.
- Prospective validation of the four new default-disabled Signal sources; the earlier 30-day study is retrospective and selected only long config-side rows.

See `operations-handoff.md` for prior release records, complete results and saved evidence identities. Live operations remain authorized; missing access is a prerequisite, not an additional permission request.
