# CTS-A-O work and tasks

Updated 15 October 2026, Europe/Vienna. Continuation baseline: main `c70cbd25213bd072c341f5e20a8376d63b5ab121`, PR #137. Scope remains CTS-A-O.

## Current work

| Task | Status | Acceptance evidence |
|---|---|---|
| Trace post-Base and live-promotion PF | Implemented and independently reviewed | Exact qualified and executed samples; raw candidate PF cannot qualify or veto them |
| Diagnose Micro (`mc`), Minimal (`mn`, operator: Minimum), Short (`sh`) rejection | Diagnosis complete | Full saved waterfall and 83,712 config-side rows; see `range-admission-diagnosis-20261015.md` |
| Correct promotion/range defects | Frozen source and focused regressions pushed | Regression cases exercise the actual failing paths and keep costs/sample requirements |
| Improve non-performing indications and ranges | Six frozen development attempts finished; no profile qualifies | Historical Short admission improved, but positive execution and exact 30-onset proof remain open; no outer acquisition/promotion |
| Verify UI, worker/local parity and execution integration | Verified within offline/runtime scope | Correct stage labels and PF basis, no invented fills, deterministic independent ranges/directions |
| Preserve evidence and push/merge verified work | Ongoing | Remote baseline backup plus reviewed checkpoints, source hashes, tests and current handoff |

Qualification must come from corrected causal calculations or measured improvements. Do not lower a reported PF floor, omit losses, substitute a winning sibling, expand history silently, or select a new configuration using the reported evaluation period.

## Current diagnosis and checkpoints

Confirmed promotion defects include unfiltered tape fallback, unknown group returns, endpoint-only readiness and nullable SQL returns coerced to zero. Those paths now require explicit post-Base and owned execution evidence. Legacy nominal lane attribution is not funded-fill proof.

Independent promotion review also reproduced duplicate underlying fills counted as multiple samples, stale aggregate PF reused for a different last-N window, nonfinite cumulative returns, dust ownership and rounding tolerance turning zero P&L into no-loss wins. Their corrected canonical arithmetic, ownership and exact chronological-window regressions now pass. A reference cannot hide newer losses or unknowns from the same execution source, and a pooled losing sibling cannot veto an independently proven exact lane. The full release invocation and its affected fixture corrections are documented below.

The range floor contract is corrected and has **79 passing focused tests**: Base and actual grids now agree on per-range/inherited stop floors, minimum actual trailing gaps for fractional steps, and upward rounding only when a hard minimum would otherwise be violated. All 2,656 shipped grid cells and 248 Base cells remain byte-identical to the baseline. This is a correctness correction; integrated promotion and production UI checks are documented below.

The original six-hour funded book, using matching owned settled close slices, has:

| Range | Settled close slices | Return PF | Cash PF (diagnostic) |
|---|---:|---:|---:|
| Micro | 23,294 | 0.8439145865 | 0.7079411421 |
| Minimal | 2,746 | 1.3815196967 | 1.5936751558 |
| Short | 0 | Unavailable | Unavailable |

These aggregate figures do not establish an individual configuration's execution sample. Positive short-direction cohorts are diagnosis, not permission to delete all long losses. The full 83,712 config-side rows and rejection waterfall are retained in the range-admission audit.

The bounded development comparison is three profiles on fixed BTC/ETH/SOL/XRP, regular and combined 15m, six existing Micro bases plus all ten Tactic bases, and the complete unchanged Micro/Minimal/Short protection grids. It compares corrected scoped defaults, Base trailing-cell discovery, and existing causal side acceptance. Source/settings/protocol froze before scoring. The two historical folds are development evidence. No outer acquisition was triggered because no profile met selection.

The protocol was frozen at 08:02:47 UTC before scoring: SHA-256 `c3bee5d76710d4de16c135ecae4cbaa5ac419549bd16b0b18134819558460316`. It uses supporting 15/30m bars for the exact 32 regular/combined 15m IDs, 205 hours of indicator-only warmup, 72 hours of evaluated prehistory on those focused series and two six-hour trading folds. The corrected, actually applied settings/harness are remotely preserved at `3834804ffae367a0c0a4a7cab1330cf200ff4791`, import-source SHA `c4b9732334500c9047cd80b15be4cbaf17d964207032aabc27e28a36418ffaeb`. Six earlier partial-settings startup failures and their original seal remain preserved. Each profile contains 57,344 effective configured identities: Micro 30,464, Minimal 16,128 and Short 10,752. Inventory is not evaluation or qualification. No new market-data acquisition occurred. First source checkpoint: `eb12239c32f50752b71cd039ebb1ceb851b36124`; baseline backup branch: `backup/pre-promotion-range-20261015`; implementation PR: #138.

See `range-study-results-20261015.md` for all 18 range results and all 864 retained hourly cells. P1 increased Short Base pairs 1→3 and initial configEval passes 139→183 in fold 1; fold 2 Base pairs rose 3→4 while configEval passes remained 52. Short accepted/funded closes stayed zero. Two otherwise eligible Short opportunities failed their causal five-close symbol-side PF of 0.7959. Fold 2 Micro return PF was 0.8617 for P0/P2 and 0.4904 for P1; P1 Minimal was 0.4438. Cash PF was higher and remains diagnostic. No exact config/symbol/direction has the required 30 historical onsets. All profiles therefore fail the frozen two-fold selection; none is enabled or promoted. Three no-trade fold-1 cases retain incomplete activity status, and all 18 failed-check occurrences remain visible. Focused 15/30m history was reconstructed completely; mandatory unfocused 1m retains only 66 pre-trade hours and is explicitly disclosed.

Focused runtime/schema/readiness, Control/Entries, promoter, UI/API reporting and study harness checks pass, alongside type checking and the production build. The broader script run retained 414 passing cases, two failing browser cases and eight opt-in skips. Both browser failures came solely from a fixture inheriting disabled comparisons while expecting comparison numbers. Its explicit Compare fixture and readiness correction passes all four functional cases on desktop/phone; the original failed invocation is preserved rather than described as wholly green. Production desktop/mobile UI verification passes 11 grouped checks with 94 officially decoded responses and zero app/decode/capture errors. The complete 163-file core invocation retains 1,772 passes, 32 fixture/environment failures, two optional skips and zero cancellations; all 242 core source hashes stayed unchanged. Corrected native/SQLite fixtures pass37/37, targeted SQL resync1/1 and final real-engine cold-start/synthetic venue mechanics7/7. This covers1,805 distinct current regular core cases across runs, with two optional skips; the original invocation is not described as wholly green. Only six test files changed after the full run; production source stayed unchanged. The real cold-start book has no owned execution proof and opens nothing. A separate declared synthetic fixture tests mechanics with real readiness and strict gates, without the previous readiness waiver.

The previous frozen replay built Micro and Minimal engine configs. Its six unmet range checks were **Short/General/Long** (`sh/gn/lg`) admission and activity, not Micro/Minimal. All independent Signal protection histories were calculated, but funded Signal entries and settled closes were zero. Research, modeled execution and venue-owned execution remain different evidence.

## Still open from the prior release

- Authenticated live-host/deployment access, a consistent live database/settings backup, verified reload and actual execution PF.
- Exact identity of the external resource awaiting an industrial deployment name.
- Prospective validation of the four new default-disabled Signal sources; the earlier 30-day study is retrospective and selected only long config-side rows.

See `operations-handoff.md` for prior release records, complete results and saved evidence identities. Live operations remain authorized; missing access is a prerequisite, not an additional permission request.

Whole-book fold-2 P0/P2 is 90 funded closes at return PF **1.0820357007** (cash PF 1.3778827443); P1 is 112 at return PF **0.4801513711** (cash PF 1.2639199617). All 12 source close CSVs independently reconcile. This supplement cannot qualify an individual range/config or the empty first fold. Four reporter tests pass; checkpoint `a5442158a46268da560cbc175c807350fed4c17f` preserves the report.
