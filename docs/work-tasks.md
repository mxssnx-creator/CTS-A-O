# CTS-A-O work and tasks

Updated 16 October 2026, Europe/Vienna. Repository: `mxssnx-creator/CTS-A-O`.
Current release PR: [#140](https://github.com/mxssnx-creator/CTS-A-O/pull/140).
Latest pushed combined production/test checkpoint: `08cd452e16b37acac9799450066088ebceaa1314` (CP10), tree `214927a2683e2ba2e69d8fcd4e6249c72effe71d`.
Its direct parent is CP9 `da5fe490`, then CP8 `e6914363`, whose two-parent integration preserves CP7 `c6ed5e9` and main PR #139 merge `fc2ec3b3`. CP8 is also backed up as `backup/pre-backtest-lifecycle-20261016`; exact CP9 is backed up as `backup/pre-preset-invalidation-20261016`. Queue/lifecycle and selective preset invalidation corrections are pushed. The CP9 full regular run was deliberately interrupted after the stale-result race was confirmed. CP10 focused verification, independent review and all seven offline release checks pass. Final evidence is saved successfully. The final documentation-only release checkpoint preserves those tested computational bytes; PR #140 records its exact commit and merge state.

## Relate indication work — Micro range support

| Task | Status | Acceptance evidence |
|---|---|---|
| Add independently configurable Relate indications | Implemented on `feat/relate-indication-20261016` | 40 exact IDs: seven nonempty 1/5/15m subsets × Trend/Adaptive × Guarded/Balanced, with 28 standard identities and 12 Micro aliases. Each uses its own anchor lane and PF gate. |
| Micro, Minimal and Short routing | Implemented and tested | Micro aliases use the existing 5m minimum lane; standard 5m relations reach Minimal, standard 15m relations reach Short, and Micro aliases obey `grid.micro.ownInds` / `grid.minimal.microInds`. |
| Trend, drawdown and activity calculations | Implemented and tested | Completed-bar higher-timeframe alignment; causal ATR-normalized symbol/market drawdown; last-bar, recent-part and recent-change activity ratios; market-wide activity cap; gap warmup and market-cache invalidation. |
| Regression, UI, typecheck and build | Focused verification passes | Source commit `ec0c489fc590a693fc67ca294401e66d328bda78`; 141/141 guarded core regressions and 78/78 platform tests pass; typecheck and development build pass. Full-suite limitations are in `docs/operations-handoff.md`. |
| Performance and strategy evidence | Functional/performance evidence only | Synthetic benchmark: 40 IDs × 10 symbols, 1,973,360 config-bar visits in 210ms; +15.16MB ArrayBuffer after GC. No new held-out Micro result or profitability claim; feature is not promoted or deployed. |

## Current release: independent Overall Block and execution correctness

| Task | Status | Acceptance evidence |
|---|---|---|
| Preserve all recovered work and remote backups | Complete | Main `0ade0fb2`, remote `backup/pre-overall-block-20261016`; private release worktree and pushed checkpoints; progress/standing-rule backup `0d9c75dc`, verification-toolchain, final QA/package helpers and exact failed-fixture source backup `c0e0a153` (parent `c7241dde`); exact tested CP10 `backup/pre-overall-block-final-20261016` at `08cd452e` |
| Exact post-Base and independent exit qualification | CP10 full offline verification passes | Prior 63 independent-exit cases; unknown/losing siblings retained, strict modeled unit basis |
| Independent Overall/Shared/Additive histories and total cap | Complete; CP10 full offline verification passes | Prior 77 Block snapshot plus CP8 102-case trace/admission/rounding focus (overlapping); accepted Real virtual history, exact indication/lane and side, source pause isolation and replay |
| Ratio 0.2, stepped volume and higher Shared ratio | Complete | 0.2 gives 1.2× at level one even with seven steps; steps never inflate additions; Shared override independently configurable |
| Candidate direction gate independent of accepted Block history | Corrected and pushed; focused checks pass | Rejected losses, recovery and downturn now use a separate bounded causal history in runtime, simulation, audit and cached pending entries. Block sizing remains accepted-only. Full regression/audit 93/93, Block 46/46 and all 128 processing combinations pass; the original incomplete diagnosis and correction remain preserved |
| Native opening, updating, closing and protective orders | CP10 full offline verification passes | Prior 167 native/fee snapshot plus CP8 62-case native sparse-fee focus (overlapping); confirmed quantities, reservations, durable identities, cancellation races and storage fail-closed behavior |
| Balance volume and statistics | Focused verification passes | Synthetic fixtures exercise verified selected-account equity and own funded shares; return PF primary, cash separate, measured zero fee distinct from unknown. No authenticated X02 balance is verified |
| Frozen Block-versus-Off comparison | Fresh CP10 complete and independently audited; no arm qualifies both folds | Second fold: 792 funded parent closes, return PF 2.3748515218 and minute-equity drawdown 2.8716649447%; settled PF/cash identical to Off. First fold and all Active arms are empty. Long direction (+1) has 60 losses, PF 0; short direction (−1) has 732 closes, PF 5.938. These direction aggregates do not establish Micro/Minimal/Short range qualification. All 20 native Signal-activity checks fail; these aggregates do not establish active Signal execution. Drawdown is model minute-close risk. No performance promotion |
| Worker cancellation and statistics property fixtures | Corrected; focused checks pass | 59 pool tests, 700 property cases across three focused tests; global TypeScript and scoped lint pass. Missing legacy return evidence remains unknown |
| Broad scripts/platform/typecheck/lint | CP10 passes | Scripts 455 passed + 8 standard skips; platform 77 passed; global TypeScript passes; ESLint 0 errors/21 warnings. All 510 source hashes/HEAD/tree unchanged; dependencies match, 135 observed owned identities and wrapper exited. Whole-cgroup max events increased 24,445, OOM/kill deltas zero; no per-process attribution. Next production memory gate OK with normal thresholds |
| Development and production settings UI | CP10 stopped synthetic SQLite fixtures pass | Fresh build 3.25s; 14 checks each in dev/production, 433 decoded API responses and 18 save/reload pairs; zero app/decode errors or drain timeouts, 12 navigation capture gaps and 36 blocked external requests per mode retained. Selected X02 help verified; 279 source hashes/dependencies unchanged, private processes stopped, root visually reviewed four desktop/mobile captures |
| Complete regular and slow core suite | CP10 regular and separate slow pass; resources released | Standard 168 files: 1,946 passed, 0 failed, 2 standard opt-in skips, 0 cancellations, 323 suites in 1,838.015s; actual completion 15:30:34 UTC. Separate earlier slow: 2/2 in 233.530s, including actual two-day, queued-repeat and clamped 30-day calculations. All 510 source maps/HEAD/tree and dependencies match across both actual invocations. Both memory-event deltas zero; regular 126 observed owned identities plus wrapper/observer exited, lock absent, no signals. Historical CP9 interrupted attempt04 and CP8 complete failed attempt03 remain preserved. CP8 regular 1,917/0/2 passed, but its slow 1/1 timeout was a failure; no historical result is relabeled CP10. Full 25-symbol background-catalog performance remains unverified |
| Preset backtest rerun and disposal | CP10 focused checks and independent review pass | CP10 final nine-file bundle is 69/69 (22 lifecycle, seven queue, 40 existing cases), plus fallback 1/1, TypeScript and scoped lint with zero errors/three existing warnings; all 510 source hashes unchanged. Four active saved-list writers invalidate only changed/removed derived caches and matching jobs; exact settings/WF fences prevent stale publication. Metadata-only changes, unrelated jobs and research-copy originals remain valid. Historical CP9: queue baseline three failures became 7/7; lifecycle baseline six failures became 10/10. Final nine-file scope 57/57 plus existing fallback 1/1, global TypeScript and scoped lint pass. Scoped cancellation stops owned workers, fallback, late cache/result writes and queued successors; completed/error jobs remain eligible. Focused inventory is 505 files; the separate 510-file release inventory is not retroactive evidence for that window |
| Actual x2 VST execution tests and live reload | Blocked by unavailable access | Static ID `bingx-vst-02` maps to the VST host; authenticated account and SSH access are unavailable. No exchange API probe, venue order or live reload occurred |
| Final evidence, push and merge | Final offline evidence saved; exact Git release tracked in PR #140 | Nonprovisional six-file report/strict validation and desktop/mobile QA pass. Saved HTML 7,741,448 bytes and ZIP 186,935,749 bytes; SHA/file identities in operations handoff. ZIP 1,799 members, CRC/all copy hashes/input fingerprints/credential scans pass; failed/interrupted history retained. Final checkpoint changes only four standing-rule/handoff documents; computational source stays tested CP10 |

Primary PF uses the same owned settled unit-net-return sample after costs.
Logical Block legs never add primary sample frequency. Higher volume alone
cannot improve return PF. All losses, unknowns, insufficient and empty cohorts
remain visible. More orders never waives independent PF, sample or risk gates.
No default performance promotion or live-success claim is justified by fixtures.

Saved current release evidence: `cts-ao-overall-block-20261016.html` and
`cts-ao-overall-block-20261016.zip`. See the final evidence section in the
operations handoff for exact bytes, hashes, persistent file IDs and retry history.

The following sections preserve the 15 October 2026 PR #138 release's research and limitations.

## Prior release work

| Task | Status | Acceptance evidence |
|---|---|---|
| Trace post-Base and live-promotion PF | Implemented and independently reviewed | Exact qualified and executed samples; raw candidate PF cannot qualify or veto them |
| Diagnose Micro (`mc`), Minimal (`mn`, operator: Minimum), Short (`sh`) rejection | Diagnosis complete | Full saved waterfall and 83,712 config-side rows; see `range-admission-diagnosis-20261015.md` |
| Correct promotion/range defects | Frozen source and focused regressions pushed | Regression cases exercise the actual failing paths and keep costs/sample requirements |
| Improve non-performing indications and ranges | Six frozen development attempts finished; no profile qualifies | Historical Short admission improved, but positive execution and exact 30-onset proof remain open; no outer acquisition/promotion |
| Verify UI, worker/local parity and execution integration | Verified within offline/runtime scope | Correct stage labels and PF basis, no invented fills, deterministic independent ranges/directions |
| Preserve evidence and push/merge verified work | Evidence saved; reviewed GitHub release prepared | Remote baseline backup, tested source `f8732215`, complete evidence archive and PR #138; consult PR for final merge identity |

Qualification must come from corrected causal calculations or measured improvements. Do not lower a reported PF floor, omit losses, substitute a winning sibling, expand history silently, or select a new configuration using the reported evaluation period.

## Prior release diagnosis and checkpoints

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

Focused runtime/schema/readiness, Control/Entries, promoter, UI/API reporting and study harness checks pass, alongside type checking and the production build. The broader script run retained 414 passing cases, two failing browser cases and eight opt-in skips. Both browser failures came solely from a fixture inheriting disabled comparisons while expecting comparison numbers. Its explicit Compare fixture and readiness correction passes all four functional cases on desktop/phone; the original failed invocation is preserved rather than described as wholly green. Production desktop/mobile UI verification passes 11 grouped checks with 94 officially decoded responses and zero app/decode/capture errors. The complete 163-file core invocation retains 1,772 passes, 32 fixture/environment failures, two optional skips and zero cancellations; all 242 core source hashes stayed unchanged. Corrected native/SQLite fixtures pass 37/37, targeted SQL resync 1/1 and final real-engine cold-start/synthetic venue mechanics 7/7. This covers 1,805 distinct current regular core cases across runs, with two optional skips; the original invocation is not described as wholly green. Only six test files changed after the full run; production source stayed unchanged. The real cold-start book has no owned execution proof and opens nothing. A separate declared synthetic fixture tests mechanics with real readiness and strict gates, without the previous readiness waiver.

The previous frozen replay built Micro and Minimal engine configs. Its six unmet range checks were **Short/General/Long** (`sh/gn/lg`) admission and activity, not Micro/Minimal. All independent Signal protection histories were calculated, but funded Signal entries and settled closes were zero. Research, modeled execution and venue-owned execution remain different evidence.

## Still open from the prior release

- Authenticated live-host/deployment access, a consistent live database/settings backup, verified reload and actual execution PF.
- Exact identity of the external resource awaiting an industrial deployment name.
- Prospective validation of the four new default-disabled Signal sources; the earlier 30-day study is retrospective and selected only long config-side rows.

See `operations-handoff.md` for prior release records, complete results and saved evidence identities. Live operations remain authorized; missing access is a prerequisite, not an additional permission request.

Whole-book fold-2 P0/P2 is 90 funded closes at return PF **1.0820357007** (cash PF 1.3778827443); P1 is 112 at return PF **0.4801513711** (cash PF 1.2639199617). All 12 source close CSVs independently reconcile. This supplement cannot qualify an individual range/config or the empty first fold. Four reporter tests pass; checkpoint `a5442158a46268da560cbc175c807350fed4c17f` preserves the report.

The 15 October PR #138 release tested source is `f873221550c80933ebc7efbc7995ceba4ccead53` (tree `429085a0edda103f78c2078e0cc84f0d730503b2`). The saved `cts-ao-post-base-range-evidence-20261015.zip` contains 203 members/38,376,641 bytes, SHA-256 `b7a7143037ffddce14f2a3243f814cf47a9b0b99965ced62ac28ab17bbe2ef21`; all CRC, original-evidence and link checks pass. Full artifact identity and release verification are in `operations-handoff.md`. Future performance work needs a new frozen protocol, sufficient exact training onsets and new evaluation windows; no current profile is qualified for live promotion.

## 16 October Overall Block clarification

- Preserve prior independent-exit work in an isolated checkout; remote baseline backup created.
- Accepted Real virtual-order history and independent exact indication/lane/direction relations: focused checks pass.
- Shared higher optional ratio and explicit continuous-versus-quantized 0.2 sizing: settings/helper checks pass.
- Confirmed native protection through resizing/partial fills: prior 167-case focused snapshot and independent review pass; CP8 adds the separately bound 62-case sparse-fee focus. CP10 regular and separate slow verification also pass on the current source freeze.
- All ten comparison arms on both historical folds are captured and independently reconciled. Losses, empty outcomes, unit PF and native equity drawdown are retained. No arm meets both-fold performance policy; no defaults are activated.
