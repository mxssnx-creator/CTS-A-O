# CTS-A-O operations handoff

Updated 2026-10-16, Europe/Vienna. Repository: `mxssnx-creator/CTS-A-O`.

## Continuation check — range and Signal trailing coverage — 2026-10-16

Validated source commit: `746a79ed363c1848a233a3da8c7c4205420b97cd`, based on merged main `ec30c30c80c9d5531e368ac7de5084d41ac79d23`. The source fix restores the missing standard Signal trailing-grid cells after lane scaling while keeping the historic/custom exact-distance floor check. No default numeric TP/SL/trail arrays or gates changed. See [`docs/trailing-config-validation-20261016.md`](trailing-config-validation-20261016.md) for grid values, full coverage totals, per-range results, and replay details.

The focused 12-file suite passed **125/125**; Signal discovery passed **4/4**; Signal progress passed **3/3**; `npm run typecheck` passed; scoped ESLint reported **0 errors and 4 warnings**. Both completed simulated engine replays passed **65/65 checks**. At 12h the funded settled sample was 1,805 orders at return PF 15.69, with 8 green / 1 red / 3 flat hours. At 24h it was 2,212 orders at return PF 4.96, with 13 green / 5 red / 6 flat hours. These windows overlap. In the 24h run Micro lost (PF 1.54; net −$0.031973), Short and General had no funded closes, and Long had one funded loss. The result does not meet the request for positive PF in every hour/range and is not evidence of stable profitability or a basis for trailing-value tuning.

The remote branch `feat/trailing-range-configs-20261016` contains this tested source commit; draft PR [#147](https://github.com/mxssnx-creator/CTS-A-O/pull/147) is open. At the latest check GitHub reported it as non-mergeable; draft PR #146 touches four of the same files. Keep #147 in draft, recheck against the final #146 tree, and rerun the focused checks before merging. It is **not deployed or merged**; no live orders were placed. Remaining blockers are resolving PR #146, independent held-out profitability evidence for any numeric change, and authenticated venue evidence for live execution. Preserve lower-range values and all current qualification gates until a predeclared held-out comparison supports a change.

## Continuation check — systemwide PF and volume audit

Validated local source commit: `86b018956a3edc995486a4d3489110ffe6fc93ef`;
published PR head: `f93bf39a17aa9d67512509a466ac755a7b3b36d6`. Both have the exact
tested source tree `38a13887ba443a3b310caa512bbadcd3830131b9`, based on merged
main `ad7f603c27abfb1b1df8f2ea3777314847aaa8b9` (PR #141). PR #142 is the
systemwide PF/volume audit fix. The remote backup
`backup/pre-systemwide-pf-audit-20261016` preserves that base before this fix.
The focused offline regression bundle passed **338/338 tests** across 32
suites in 15.4 seconds. `npm run typecheck -- --pretty false` and scoped ESLint
on the three changed source/test files also passed. The tests covered independent
Block relations, .2 ratio and stack cap behavior, accepted-order replay, unit
versus sized PF, cash reconciliation, ownership, the self-audit, and API reports.
Runtime state, autostart, comparison jobs and live execution were disabled; the
offline network guard was active.

The audit found one defect: its plain-close cost check defaulted missing modeled
volume evidence to multiplier 1, even though primary modeled PF correctly marked
that sample unknown. It now uses the canonical modeled-unit return helper,
requires a finite positive multiplier, and checks recorded position volume against
the external multiplier. A regression confirms missing multiplier evidence fails
the check. The statistics type comment now identifies recorded net points as
volume-weighted diagnostics, separate from normalized PF and dollar P&L.

The existing frozen 6h+6h Block study remains the strategy evidence and was not
rescored: 920 base combinations were evaluated per fold; fold 1 had no owned
settled closes; fold 2 had 792 settled slices at return PF 2.3748515, with no
settled PF uplift over Block Off. Two scored hours had PF zero and every native
Signal-activity check failed. This audit-only fix does not alter strategy sizing,
trade selection or the measured outcome. A fresh untouched market window and
authenticated account evidence are not available, so a profitable strategy
change, positive results in every hour, or live execution cannot be claimed.

Fast trading tests now default to six hours of evaluated prehistory plus six
hours of simulated trading; older indicator warmup remains outside the score
window. The existing frozen 6h+6h Block study remains the strategy evidence and
was not rescored on its reused folds: 920 base combinations were evaluated per
fold; fold 1 had no owned settled closes; fold 2 had 792 settled slices at return
PF 2.3748515, with no settled PF uplift over Block Off. Two scored hours had PF
zero and every native Signal-activity check failed. These results do not meet
the requested continuous-positive-hour outcome. A fresh untouched market window
and authenticated account evidence are not available in this workspace, so a
profitable strategy change or live execution claim cannot be verified here.

## 16 October Overall Block and execution correctness release

Current release: [PR #140](https://github.com/mxssnx-creator/CTS-A-O/pull/140).
Latest pushed combined production/test checkpoint:
`08cd452e16b37acac9799450066088ebceaa1314` (CP10), tree
`214927a2683e2ba2e69d8fcd4e6249c72effe71d`, direct parent
`da5fe49058bc721086d207ac4b34e67cab856b32` (CP9), then
`e6914363380599e1f49a837a3a7a835ff9276faf` (CP8). CP8's merge preserves parents
`c6ed5e9275a70f1fd995992f11a19cd9b57bf290` (CP7 direction correction) and
`fc2ec3b3e9e6fe61b55a95fd1ea8802103c564a8` (main PR #139). All seven offline broad/build/core checks pass. Evidence publication is tracked
below; this does not establish a live deployment or financial qualification.
The pre-release main is `0ade0fb2ba22a50e49cf03a9825ea612b4abc30f` (PR #138),
preserved remotely as `backup/pre-overall-block-20261016`.

Work is isolated in `CTS-A-O-block` on `fix/overall-block-relations-20261016`;
the original overlapping checkout is left intact. PR #139 historical study and
verification documents are retained with explicit historical banners. For another
chat, fetch the latest main containing PR #140 and read its final handoff and
standing rules; the final release documentation descends from tested computational
source `08cd452e`. Verify that source identity before changing code or deployment.
This instruction does not describe a completed live reload. Do not overwrite the
other checkout or merge an older overlapping branch over these contracts.
Source checkpoints were pushed regularly. Private credentials/account records
are excluded from Git and public research evidence.
Operational progress/standing rules are also backed up as
`backup/cp10-operations-progress-20261016` at `0d9c75dc4fc5aef62e295a8239468f57e82fe4c0`.
The verification toolchain and exact failed/intermediate source fixtures are
backed up as `backup/cp10-verification-toolchain-20261016` at
`c0e0a153bd80fece234d4f7fa35d150c72265d71` (tree `f2b5b4812126054a2aaa69daf4158f07a93e42c4`),
under `verification/overall-block-20261016/`. The earlier `c7241dde2f610296a7809733f306d6c1a436b1da`
snapshot is its direct parent. All original 17 program/fixture files stay unchanged;
the final standalone report QA harness and packaging wrapper bring the source
manifest to 19 files, plus README/manifest (21 files total). The final report
launch was inline Python, with actual argv/pins/results in its run receipt.
Historical fixtures intentionally include failures; helper paths reflect this
workspace. Both remote backup tips were independently verified when written.
These separate backup refs were created without changing the frozen release
HEAD, working source or default index.
The exact tested CP10 source is also independently retained as
`backup/pre-overall-block-final-20261016` at `08cd452e16b37acac9799450066088ebceaa1314`,
verified by remote ref before the documentation-only final checkpoint.

CP9 corrects completed/error-job rerun eligibility and owns each background
backtest through a controller, absolute deadline and tracked task. Stop, shutdown
and disposal cancel only that runtime's work; canceled worker tasks cannot fall
back locally, publish late results or start queued successors. Shared market reads
can finish for other consumers; canceled owner continuations cannot write caches
or progress. A fresh stopped runtime may backtest; a disposed runtime cannot.
The test tracker cancels and drains before closing the pool. A fresh process
restart is still required; old untracked hot-reload work is not certified.

The queue baseline reproduced three failures; identical tests now pass 7/7.
Lifecycle baseline reproduced six failures; final lifecycle scope passes 10/10.
The final nine-file focused bundle passes 57/57 plus the existing fallback 1/1;
global TypeScript passes and scoped lint has zero errors/three existing warnings.
Its actual before/after inventory is **505 files**. An earlier 510 claim was
corrected in the retained scope erratum; the later canonical 510-file inventory
is a distinct scope and does not establish the earlier window retroactively.
CP9 broad checks passed (455 scripts, eight standard skips; platform 77; lint
zero errors/21 warnings), and stopped-fixture build/UI passed (28 checks, 431
decoded responses, 18 save/reload pairs). Its fresh 20-capture comparison and
independent audit completed without economic defects; no arm qualified both folds.
The 168-file regular core run was deliberately interrupted with exit 130 after a
further preset edit/delete invalidation race was confirmed. It is incomplete;
slow tests never started. Attempt04 preserves the partial run, unchanged 510-file
source/dependencies, zero memory-event deltas and all 40 observed owned process
identities exited. CP10 now selectively invalidates changed or removed derived preset caches and
cancels only their matching calculation. All four active saved-list writers use
the same path; exact immutable settings/WF fences guard both final publications.
Metadata-only changes, unrelated work and research-copy originals remain valid.
The corrected coherent nine-file bundle passes 69/69 plus fallback 1/1, global
TypeScript and scoped lint (zero errors/three existing warnings). Its actual
510-file before/after inventory is unchanged; dependencies match, cgroup-event
deltas are zero and all 11 observed owned identities/wrapper exited.
Fresh release checks run against this frozen CP10 source: broad, early two slow
cases, UI, comparison/audit, then the 168-file regular suite. Both runtime-phase
receipts must match the same source/HEAD/tree; no combined invocation is invented.
CP10 broad checks now pass: 455 script tests/eight standard skips, platform
77/77, full lint zero errors/21 warnings. Source/HEAD/tree and dependencies are
unchanged; all 135 observed owned identities/wrapper exited. Whole concurrent
cgroup max events increased 24,445, with zero OOM/kill/high/low deltas and no
per-process attribution. The next normal production memory gate passed.
The exact two slow cases passed 2/2 in 233.530s (14:43:53–14:47:46 UTC). The
actual two-day, queued-repeat and clamped 30-day preset case passed in 55.25s.
All 510 source hashes/HEAD/tree and dependencies stayed unchanged; slow memory-
event deltas were zero and four observed owned identities plus wrapper/observer
exited. The later 168-file regular suite also passed on the identical source
freeze and dependencies, as recorded below. The untouched execution
pre-phase memory snapshot is authoritative; a standalone launch-named diagnostic
was overwritten by a post-cleanup preflight. Its original bytes were not saved;
separate post-cleanup data and an explicit provenance note preserve that limit.
CP10 build/UI also pass: build 3.25s, 14 checks each in production/development,
433 decoded responses, 18 confirmed save/reload pairs and 26 screenshots. Zero
app/decode errors or drain timeouts; 12 navigation capture gaps and 36 blocked
external requests per mode remain disclosed. All 279 core/UI hashes and
dependencies matched; private servers/ports/browser processes exited. Root
visually inspected four desktop/mobile captures. These stopped synthetic SQLite
fixtures verify presentation and API mechanics; they are not account/venue proof.
The fresh CP10 study completed all 20 captures in 71.046s. Independent audit
reconstructed all 7,200 causal minute points with zero economic defects/missing
marks; owner/proof stay immutable with separate final linkage. Its observed
results match the prior study: return PF 2.3748515218, no settled Block uplift,
Long PF zero, Signal activity zero and no profile qualifies both folds.
The final standard 168-file regular suite completed at 15:30:34 UTC: **1,946
passed, zero failed, two standard opt-in skips and zero cancellations**, 1,948
tests in 323 suites, phase duration 1,838.015s. It started at 14:59:56 UTC after
a uniquely named normal production memory gate passed. All 510 canonical,
expected, before, after and current source maps, HEAD/tree and dependency lock
match the separately executed earlier slow receipt. Dependencies: 423 present,
zero mismatches and 49 absent optional packages. Both phase memory-event deltas
are zero. All 126 observed regular PID/start identities, wrapper and observer
exited; the owned lock is absent and no signals were sent. The actual regular
and slow receipts remain separate; no combined run is invented. Source and HEAD
stayed frozen throughout the tests. All seven offline release checks pass.
The final 16-row functionality matrix independently verifies 80 distinct evidence
hash pairs and 46 current source bindings. The immutable integrated source seal
records that regular verification was pending at seal time; final actual receipts
supplement that historical state without rewriting the seal. Reports and artifact
QA run only after verified cleanup. No earlier result is relabeled CP10.
Existing live preset caches created before these corrections are unverified;
a consistent backup and re-evaluation or selective retirement of derived preset
results is required before live reload. No live cache or execution ledger was
modified in this session. CP8 remains available on remote backup
`backup/pre-backtest-lifecycle-20261016` at exact `e6914363`; CP9 is backed up as
`backup/pre-preset-invalidation-20261016` at exact `da5fe490`.

## Final offline evidence and continuation

The six-file nonprovisional report and both saved deliverables are complete.
The final release documentation changes only `AGENTS.project.md`, this handoff,
`docs/work-tasks.md` and `docs/positive-coordinations.md`; tested computational
source remains `08cd452e16b37acac9799450066088ebceaa1314`. PR #140 records the
final documentation checkpoint and merge identity. A documentation-only commit
is not a new computational test run or a live deployment.

| Saved artifact | Bytes | SHA-256 | Persistent file identity/version |
|---|---:|---|---|
| cts-ao-overall-block-20261016.html | 7,741,448 | `2aeb1cf9717a2d46f04bdc62400a5609c501b6d2d14f589e57890ff6fccd7da8` | `libfile_e50f79b418808191b32b054d9136d14d`, version 0 |
| cts-ao-overall-block-20261016.zip | 186,935,749 | `1581a1f2ab0e9bb6f6d4756184e358028848e6987545695d6fa21eaaef0cd14f` | `libfile_ec0fe486e4a8819186a1606275bd75d3`, version 0 |

Saved file IDs are `file_00000000cbe8820dba186a577589b9c7` and
`file_0000000053cc81f5af4f8813e0d0700f`, respectively. The complete sanitized save receipt is
`cts-overall-block-final-save-complete-20261016.json`, SHA-256
`4180d015a9a938f5c6ec13724d95525e984b458453a45e62672914c236111e90`.
The original ordered save retained a successful HTML and a definitively failed
ZIP transfer. Only the ZIP was retried with identical verified bytes staged in
the active conversation workspace; its prepared save succeeded. Original failure
and successful retry receipts remain preserved. No source/private account data
or screenshots were saved in either deliverable.

Strict final validation passes: 20 comparisons, 120 hourly rows and 5,616 virtual
settled slices (4,752 positive allocations and 864 known zeros). Repeated arms
share opportunities and are not independent market trials. Three embedded CSVs
match their physical bytes. Desktop and mobile each passed six table inventories,
four expandable sections and all three real CSV downloads: six byte-exact
downloads total, zero page/console/request errors, external requests or document
overflow. Root visually inspected both actual overview screenshots. Report
validation SHA-256 is `e410949c2c267c7b3120280756fe63977860ddcf106490cc52b94121af1977c9`;
final standalone QA is `c2109e08ef4fe914fb909b3b14ee94d149b6d25d082d29f11940f1531730ea7d`.
All owned report and browser resources exited before packaging.

The ZIP has **1,799 members**, covering 1,811 logical inputs/1,795 physical inputs,
the current protocol and all eight preserved study attempts plus four historical
core attempts. Public feed deduplication preserves 83,614,640 bytes through exact
manifest mappings. Full input credential scans, streaming copy hashes, every
member CRC, final input fingerprints and the whole ZIP hash pass. Six final report
files and four nested source-free baseline manifests were independently matched
inside the ZIP. Code bodies, dependencies, private databases and screenshots are
excluded; actual verification source is retained on the separate Git backup branch.
Archive manifest SHA-256: `111461354a8b3f29c9a4d9c821c594caf77e615eb5f8d8b8f9a9f48facdef696`.
Packaging receipt SHA-256: `bfb6d414b1bfb3c1159bc208539b5464ff09f64aa87714c0ab855dad8280d564`.
Packaging finished in 517.663s, exit zero. Whole concurrent cgroup max events
rose 34,845, with zero OOM/kill/high/low deltas; this is not process attribution.
All 510 computational source bytes, HEAD/tree and frozen metadata stayed unchanged.

The archived final evidence index is `f82a71b9846643efc0370c24b8b88c3370f0cdc8499c0ca5fb29dfbb5150f676`.
Outer archive/save identities are deliberately recorded after assembly, avoiding
self-hash cycles. A report-launch index was updated before being separately copied;
its exact prior bytes were recovered by reversing the documented record/status
append and matching the already recorded SHA-256. That explicit provenance and
all exact preserved launch metadata are included in the evidence.

All seven offline checks pass; no profile qualifies both research folds, and
settled Block PF/cash equals Off. Actual X02 account/execution PF, live reload,
full 25-symbol background-catalog compute performance and the external rename
remain unverified. Missing live access/resource identity remains a prerequisite,
not a request for another authorization. Preserve protection and take consistent
live backups before any eventual reload; re-evaluate or retire unversioned old
preset caches and restart the process.

Overall learns from settled accepted Real virtual orders before account funding.
Each exact config × symbol × direction, symbol × direction, global direction,
and exact indication/lane × direction keeps independent history and pauses.
Overall source legs share one total cap including base and relation volume.
Shared accepts any qualifying enabled relation and an optional independent
`sharedRatio`; Additive sums valid enabled levels. A positive 0.2 request remains
0.2 even with seven volume steps; larger step requests round down. Six-decimal
recording also rounds down, so tiny additions cannot inflate into a full micro-unit. Defaults for
ratio, steps and cap are unchanged. Current holdings retain their entry Block
multiple; actual confirmed quantity/equity resizing reconciles their protection.

Runtime restoration merges current defaults: persisted settings missing
`historySource` adopt accepted orders. Explicit `real-candidates` preserves the
legacy diagnostic across restart; only direct configs outside runtime default
merging have the unset-field legacy fallback. Neither history is venue-fill
proof. Empty accepted-history Block Active cannot invent a seed or borrow raw
wins; its explicit Signal own-base exception remains.

Native protection now follows confirmed parent quantities, weighted source
shares, one-way funded units, partial fills, cancellation races and refusals.
Provisional stop/TP IDs and residual quantity caps are durably checkpointed
before requests; required state/journal failure blocks new funding. Volume
uses verified selected-account equity and all enabled position/exposure/risk/
backstop/free-margin budgets. Unknown or pending quantities reserve capacity.
Cumulative receipts do not certify independently timed individual fill slices.

The shared worker pool synchronously cancels running calls across module copies,
including a queued successful reply and a reserved-worker handoff. A later ordinary
worker exit cannot inherit an earlier abort reason. This new shared schema requires
a fresh process restart; hot adoption of an older scheduler object is rejected.
The selected connection's missing-key help no longer directs X02 to X01 credentials.

Primary PF removes external Block × coordination weighting once, on the same
funded settled parent-close sample as cash reconciliation. Intrinsic ladder
semantics remain. Duplicate modeled parent closes reject scoring, regardless
of source legs/allocation indices. Unknown ownership/returns/overflow remain
unavailable; known zero allocations stay visible outside funded PF. General
session headlines, groups, hourly counts/returns/hold averages now share that
owned cohort. Virtual requests, episodes and marks are labeled separately.
Confirmed zero fees persist distinctly from unknown/legacy estimates. Live
statistics retain actual close notional even at zero return; cash no-loss
labels require explicit provenance.

The optional `sideGateN` filter now reads its own bounded all-candidate direction
history in simulation, runtime, audit and cached pending entries. Rejected losses
and winning recovery cannot disappear into accepted-only Block history. CP7
passes full regression/audit 93/93, Block 46/46, all 128 processing combinations,
global TypeScript and scoped lint. The seven-failure complete CP6 invocation and
its original stacks remain preserved. The historical CP8 regular verification
passed 1,917 cases with zero failures and two standard opt-in skips. Its separate
slow verification failed in the queued-preset wait; the preserved result is below.
CP9 queue eligibility and disposal fixes passed focused checks; the further CP10
preset-revision repair and current release status are described at the top. Main integration also preserves measured commission across
identical sparse cumulative-fill polls, while changed quantity or price requires
new fee evidence; all four added regression cases pass in the 62-case native focus.
The CP8 trace/rounding focus passed 102/102, global TypeScript and scoped lint.
An earlier 149-case matrix/replay focus is preserved before the narrow rounding
correction. The optional trace includes unknowns in available sample counts and
never changes admission or sizing. Historical CP8 standard core selection was 166
files plus two slow cases, with 508 source/config files. CP9/CP10 use 168 regular
files plus two slow cases and a separate 510-file release inventory.

### Preserved historical comparison on CP8

Ten arms × two six-hour execution windows, each with six hours of evaluated
preparation; older candles initialize indicators only. BTC/ETH/SOL/XRP,
unchanged complete configured focus/exits/cost/capital/settings and causal gates.
Protocol SHA256:
`70d7b62c80a11f1be2971e7873e1560f6c52f3d38c3526fb433ddfc6e553d99d`.
108-file source-set SHA256:
`48c4240a00b0243d2325c8079d36769dfb4bcb040d82c320fac3aa1e3ea4b87a`.
Source-freeze record SHA256:
`55c5470b6f806a7b2d6f0c5754e77a94359380e95b222b945dee3f52770ef906`.
Independent CP8 accounting audit SHA256:
`ca91afe47b7fefec45d7175aaca0c14efa4dc573b17e29cc6cfa1a1342423090`.
Parameter/source summary proof SHA256:
`5e29a2c9cc4f9cf23ce984acfef3cdedf025b21820a32f1f6e8ce6ad8a8accca`.
Final owner manifest SHA256:
`7a6665a76648a260cebe5c160bb9b02576d87326885de5f179d1c89231861945`.

All 20 fresh CP8 captures completed in 69.138s. Exact settings, feeds, folds,
arms and policy match the prior frozen protocol; no outcome-based retuning
occurred. The independent audit recomputed all owned cohorts, groups, hours,
closed/open cash allocations and 7,200 causal minute equity/margin points,
with zero economic defects. Raw CP6 economic identity was observed after
calculation, never required or assumed. This is reused retrospective evidence,
not an untouched holdout or venue execution.

The frozen study has `sideGateN: 0` and `blockTrace: false`; it does not activate
the newly repaired optional direction filter or diagnostic trace. Their enabled
runtime/simulation behavior is verified separately by focused regressions.
The original captured study is retained as attempt03, corrected CP5 comparison
as attempt04, memory-degraded CP6 refusal as attempt05, and the complete prior
CP6 capture as attempt06. Initial preservation manifests remain unchanged;
the later CP6 owner-binding copy has an append-only addendum. Earlier protocols,
raw outcomes, failed checks, incomplete diagnoses, errata and audits remain
retained. No source, memory threshold or strategy gate was waived.

The book is a **modeled $1,000 account**, sized at **2% of equity** with
**10× leverage** and fixed modeled **0.20% round-trip costs**. The research
launcher uses the frozen X01 fallback caps
`maxPositionX: 0.75` and `maxExposureX: 7` where its captured settings lack
positive caps; these are research inputs, not authenticated X02 account limits.
Drawdown measures unrounded model minute-close marked equity, including open
marks. It does not measure the worst intraminute mark or verify tick-level
fills, slippage, funding or liquidation behavior.

All 20 captures failed the native Signal-execution activity check. This study
does not establish active Signal execution or positive independent
Micro/Minimal/Short qualification. Engine/direction aggregate PF cannot
substitute for those missing exact cohorts.

No arm passes both folds. The first window and all Active arms have no owned
closes, hence unavailable PF. In the second window every non-Active arm has
792 funded parent closes (258 losses), 144 zero allocations retained separately,
return PF **2.3748515218**, cash PF **2.2230310512**, closed cash net **+4.41871304**
on the simulated $1,000 book, and exact minute-equity drawdown **2.8716649447%**.
Long direction (+1): 60 closes, all losses, PF **0**. Short direction (−1): 732
closes, PF **5.93804698**. These direction aggregates do not establish the
independent Micro/Minimal/Short range qualifications.
All 792 matched unit returns are identical to Off. Actual Block raises occur on
450 funded closes, but position caps neutralize their funded amounts; incremental
settled PF/cash benefit is zero. Shared 0.2/0.4 saturates the tested 2× cap at
observed levels, so this window cannot establish higher-Shared superiority.

Base computation completes 920/920 requested comparisons, while required range/
type coverage and activity conditions genuinely fail. `grid.allSets` is a mode,
not completion. Empty PF equality remains non-comparable (null serializes
unavailable values), never a manufactured numeric pass. No performance defaults,
promotion thresholds or losing/empty cohorts were changed to obtain success.

### Preserved verification snapshots and CP8 checks

| Check | Status |
|---|---|
| Prior Block relations/ratio/replay snapshot | 77 focused cases pass on their recorded checkpoint; retained historical evidence |
| Prior independent exits and modeled return provenance snapshot | 63 focused cases pass on their recorded checkpoint; final CP8 regular core also passes |
| Prior native quantities/protection/durability/fees snapshot | 167 focused cases pass on their recorded checkpoint; added CP8 sparse-fee focus passes 62/62 |
| Prior reporting/API/UI snapshots | 147 focused cases and 16 session follow-up cases pass on their respective recorded checkpoints |
| Complete scripts, 52 files | 455 pass, 8 standard skips, 0 failures/cancellations |
| Platform/auth/UI helpers, 8 files | 77 pass |
| Final CP8 Block trace/admission and conservative recording | 102 focused cases pass; earlier 149-case pre-quantization matrix/replay scope is retained separately |
| TypeScript | Final CP8 pass |
| Full ESLint | 0 errors, 22 existing warnings; scoped seven-file lint also clean |
| Preserved CP6 worker pool cancellation snapshot, 9 files | 59 tests pass; those pool source hashes remain unchanged in CP8 |
| Statistics property fixture repair | 3 focused tests / 700 cases pass; separate unknown losing-return regression retains cash/count and unavailable PF |
| Final production build | Pass on CP8, exit 0 in 3.16s; 277 source hashes unchanged |
| Stopped synthetic SQLite dev/production desktop/mobile UI fixtures | 14 checks each mode, 427 decoded API responses and 18 save/reload pairs; 0 app/decode errors, 18 navigation capture gaps and 36 blocked external requests per mode retained; selected X02 help verified; private processes stopped |
| Complete regular core, 166 files | 1,917 passed, 0 failed, 2 standard opt-in skips, 0 cancellations in 1,714.146s; all 508 source hashes unchanged; prior complete CP6 failure and CP5 partial failure preserved |
| Separate opt-in runtime slow cases | CP8: 1 passed, 1 failed, 0 skips/cancellations in 1,078.134s; timeout at runtime.test.ts:640 awaiting the queued 25-symbol preset; initial two-day result completed, 30-day assertion not reached |
| Historical comparison capture/accounting audit | All 20 fresh CP8 captured; independent 7,200-minute accounting audit passes; performance policy not met |

Focused counts overlap other suites and must not be added into a monolithic
claim. Checks use before-import nonlocal transport guards, sanitized credentials
and bounded workers; no venue traffic occurs. Original failed script fixtures
and browser setup attempts are preserved. Synthetic PF fixtures explicitly declare their known unit basis. Legacy raw-
bootstrap tests explicitly select candidate history; default accepted-history
checks, all 128 processing combinations and numeric/PF assertions remain. No
assertion, cost, sample or promotion gate was waived.
An invalid PID-namespace RSS trace in one broad wrapper is excluded from process/
memory conclusions; direct known host PID cleanup was separately verified.
The first CP5 complete-scope invocation was interrupted after two statistics
property fixture failures; it is incomplete, not a complete passing suite. Its
507 source hashes stayed unchanged and no OOM/kill occurred. The fixture now
declares multiplier 1 for intentionally unit trades without changing RNG calls
or the original assertions. The separate mixed-legacy case confirms unknown
returns cannot be silently treated as known. Both original failure stacks and
corrected focused results are preserved before the CP6 invocation. That complete
165-file run finished with 1,882 passed, seven failed, two standard opt-in skips
and zero cancellations; slow correctly did not start. Its seven actual causes
were repaired and focused-verified in CP7. The historical CP8 combined-source
regular run passed completely, but its separate slow phase failed. Full attempt03 retains
both raw logs, the actual stack, all 508 unchanged source hashes, exact matching
dependencies, zero memory-event deltas and verified cleanup of 129 owned identities
plus wrapper/observer. No signals were sent. Its failed release-status SHA256 is
`722928b70f12d8b734b00ad5bc3c074992fdb8b65801930b622a7e3d1bfe50c1`.
The fixture waited 600 seconds for a new 25-symbol preset introduced into the
catalog. Separate static and baseline checks found that a completed job ID was
wrongly excluded from later queues, and disposal failed to invalidate its running
backtest or prevent fallback, publication and next-queue work. Those defects were
corrected and focused-verified in CP9. The later preset-revision invalidation
race requires CP10 corrections and fresh release verification. The original
timeout remains a failed attempt; it is never relabeled as a passing workload.
Memory guards stay enabled. The prior CP6 full run initially observed conservative hard
pressure from active file cache, then passed the API contract after capacity
recovered. A later own-file cache hint preserved all 590 files' stat identities;
the bulk recovery had already occurred and is not attributed to that hint.
No source, memory threshold, trading gate or unrelated process changed. A saved
research lock reappeared after a successful unlink; its namespace-local PID is
not process ownership evidence and must never be used to kill a process.

### Live and remaining work

The operator explicitly requests actual x2 VST testing of opening, updating,
closing, protection, volume, statistics and sustained execution. Canonical
connection `bingx-vst-02` uses the VST host, but no usable authentication or
reachable host is available here. The documented live-host/SSH routes return ENETUNREACH on TCP port 22 from
this environment; no exchange API probe was made, and this does not prove
the hosts or venue are down. No venue order, live
reload or account success was verified. Before any authorized live change, take
settings/durable-state and database-supported consistent backups, verify the
actual selected demo account, and reconcile current own holdings/orders.

Open work: obtain authenticated x2 access, perform bounded venue lifecycle and
forward exact-config PF/volume/statistics checks, establish adequate independent
samples in both directions and each requested range/type, and measure future
Block benefit/drawdown without weakening gates. High order count and continuous
positive PF are unproven. The external rename of `imperative-greeting-fox` still
requires its exact deployment resource identity; no guessed resource was renamed.
A metadata-only check of connected Sites/Library/GitHub status surfaces found
no verified matching asset. Available GitHub tools cannot inventory Codespaces
or deployments; the prior Vercel inventory also found no matching project.
Evidence: `cts-block-rename-identity-20261016.json`, SHA256
`55c3cbd1bf2390e713e545bf1ea8cfbe9f2fc9403291bcc08d8583d1ceff2834`.

Historical CP8 UI and comparison results are preserved above; current CP9/CP10
status is at the top. The final evidence archive/report identity and complete
current regular/slow results will be filled after verification. See `docs/work-tasks.md` and `AGENTS.project.md`.

## 15 October post-Base promotion and range continuation — verified source and evidence

Active work is tracked in `docs/work-tasks.md`. Baseline main is `c70cbd25213bd072c341f5e20a8376d63b5ab121` (PR #137), preserved remotely as `backup/pre-promotion-range-20261015`. Implementation branch `fix/post-base-range-promotion-20261015` has [PR #138](https://github.com/mxssnx-creator/CTS-A-O/pull/138). It is not a live deployment.

Checkpoint `eb12239c32f50752b71cd039ebb1ceb851b36124` fixes custom Base/actual range stop and trailing-floor parity, with 79 focused tests and byte-identical shipped defaults. Checkpoint `790e5c292463d5dcae668b61f11ca628e277e07a` replaces range-wide nominal promotion with versioned exact config/symbol/direction evidence. The promoter preserves configured kinds, requires qualified post-Base and owned execution return proof, and retains the execution closes needed to recompute the runtime's actual last-N window. Independent guarded review passed 40 tests, including the pure promoter and strict runtime proof cases. Production runtime/UI/API source is frozen and pushed at `207e2170a9561e877bcc3b177be23bd88fccd365`, tree `4a39adb30b7055c7b36a09a70c2175952c4b1b21`. Focused checks pass: runtime/provenance/schema/readiness 64, Control/Entries fixtures 113, promoter 24, UI/API reporting 54, and an additional API contract fixture. TypeScript passes; focused lint has zero errors. The range comparison, production UI verification and affected integration-fixture corrections are complete; their exact scopes are recorded below.

The audit reproduced duplicate underlying fills inflating sample counts, stale aggregate PF relabeled to another last-N sample, dust allocations, nonfinite cumulative returns, and arithmetic tolerance turning a zero-P&L close into a no-loss win. Corrected paths use canonical net P&L/owned notional arithmetic and exact chronological windows. Reference evidence must not hide newer local losses or unknowns. Nominal `live_lane_trades` attribution cannot establish allocated execution ownership. Frozen UI/API changes distinguish post-Base accepted virtual outcomes before allocation, recorded paper diagnostics, allocated owned paper evidence and verified venue execution. They preserve unknown and losing closes instead of silently backfilling older wins.

The complete range diagnosis is in `docs/range-admission-diagnosis-20261015.md`. In the original six-hour funded replay, Micro return PF is 0.8439145865 on 23,294 settled slices, Minimal is 1.3815196967 on 2,746, and Short has zero funded closes. Positive pooled Minimal performance does not prove an individual config/direction. The three-profile follow-up protocol was frozen before scoring at 08:02:47 UTC, SHA-256 `c3bee5d76710d4de16c135ecae4cbaa5ac419549bd16b0b18134819558460316`. It keeps all gates and costs, uses exact regular/combined 15m IDs with 15/30m support, separates 205-hour indicator warmup from 72-hour evaluated prehistory, and compares two historical six-hour development folds.

The first study invocation preserved six startup failures before any strategy outcome: its launcher serialized a partial nested Micro range while the runtime requires the complete range object. The harness correction sends the full frozen materialized settings, applies production lane normalization (requested support 15/30m; actual base-data lanes 1/15/30m) and verifies exact settings/WF parity on all three stopped runtimes before scoring. Fourteen focused harness tests pass. The exact 32 focused outcome IDs and all 57,344 configured protects remain unchanged; no 1m outcome or gate change was added. Attempt 01, its original seal and all startup logs remain preserved. Attempt 02 ran against `3834804ffae367a0c0a4a7cab1330cf200ff4791`, source SHA `c4b9732334500c9047cd80b15be4cbaf17d964207032aabc27e28a36418ffaeb`, seal `594de3edc7f1d38eade322b4f70901b73b96216900db0d5a828b604416f1ef75`.

All six corrected engine attempts exited zero at full memory level. Three fold-1 cases had no new-entry opportunities and retain failed strategy activity/completeness status; fold 2 retains the failed Short activity check. All 18 failed-check occurrences remain visible. No profile qualified and no outer GET or live promotion occurred. The complete 18-range/864-hour report is `docs/range-study-results-20261015.md`. Short historical Base admission improved 1→3/3→4 pairs with trailing Base cells, and fold-1 configEval passes rose 139→183; execution stayed zero. The two eligible Short opportunities failed prior symbol-side PF 0.7959115653. Fold-2 Micro unit PF was 0.8616866761 for P0/P2 and 0.4904366222 for P1; P1 Minimal was 0.4437584524. Minimal P0/P2 had only 16 no-loss closes, insufficient for the frozen 30-onset rule. No exact config/symbol/direction research cohort has 30 historical onsets. All losses and both directions remain retained; cash PF above one never qualified losing unit PF. Independent reconciliation verified all outcomes, hourly zeros, frozen hashes and causal rejection evidence using less than 68 MiB. The focused 15/30m history reconstruction meets the requested horizons; the mandatory unfocused 1m series has only 66 pre-trade hours and is explicitly disclosed. Physical origins are reconstructed rather than recorded runtime telemetry. Four reporter tests pass. Independently reconciled whole-book fold-2 P0/P2 has 90 funded closes, primary return PF 1.0820357007 versus cash PF 1.3778827443 and net +$1.59559328813. P1 has 112 closes, return PF 0.4801513711 versus cash PF 1.2639199617 and net +$1.21446934408. Whole-book figures cannot qualify an individual range/config or replace the empty first fold. Selection remains NONE. The final reporter supplement is pushed at `a5442158a46268da560cbc175c807350fed4c17f`.

Full-repository lint passes with zero errors and 22 existing warnings. The broader script invocation recorded 414 passes, two functional-browser failures and eight skips. Only Compare's expected numbers were missing because the test inherited `CTS_CORE_COMPARE=0`; explicitly enabling comparisons inside its bounded fixture and waiting for comparison completion then passes all four functional cases. All 416 distinct active script cases are verified across those invocations; do not represent the original run as wholly green. Additional UI unit checks pass 24 cases. Guarded production build and final desktop/mobile QA pass: 11 grouped checks, 94 officially decoded API responses, 14 screenshots, zero app/decode/capture errors and 274 identical core/v2 source hashes from build through QA. Font/Grok requests were blocked and logged. Three scratch-probe mistakes are retained separately. The preview stop wrapper reported the prior PID-namespace mismatch; actual cleanup verified the owning exec ended, its reported host PID was absent and port 8081 refused connections.

The full 163-file core invocation completed in 1,833.51 seconds: **1,772 passed, 32 failed, two opt-in slow-test skips, zero cancelled**. All 242 core TypeScript files were byte-identical throughout; OOM counters did not increase. Twenty-six native-order fixtures supplied no exact settled promotion history, four engine-to-venue cases consequently had no admitted targets, and two SQL assertions ran under the broad wrapper's `CTS_CORE_STATE=off`. These are preserved failures, not a green monolithic run. Corrected guarded native/SQLite fixtures pass **37/37**, the isolated real-SQL resync case passes **1/1**, and final runtime/venue integration passes **7/7**. Only six test files changed after the full run; production source is unchanged. Across the complete invocation and affected reruns, **1,805 distinct current regular core cases** are covered, with two optional slow-test skips. No OOM counter increased.

The first E2E repair explicitly required an actual current paper lane to have sufficient positive exact post-Base history and failed its before hook. That unsuccessful attempt is preserved. The final fixture keeps the real computed runtime/book unchanged and asserts its cold start has zero owned execution history and sends no orders. A separate real CoreRuntime uses clearly declared synthetic settled model trades and independent known-$10-owned-paper history per config/symbol/side to test convergence, protective stops, independent hedges, no churn and ledger reconciliation. Its real readiness and strict promotion methods remain active; the former `requireReady:false` waiver is removed. The negative projection changes both canonical unit returns and sized returns, proving rejection instead of only corrupting cached PF. Synthetic mechanics do not establish profitable market or venue performance. Final E2E source SHA-256 is `f07853c400e81a0b6a4b8e72514a186d978e7bb424f423b6a38572d2e6d3d7e7`; final typecheck/scoped lint pass. Native/SQL fixture checkpoint is `089e6d6848c8d0e6a9ae75f1f2a93285d1779b15`.

Final tested source: **`f873221550c80933ebc7efbc7995ceba4ccead53`**, tree **`429085a0edda103f78c2078e0cc84f0d730503b2`**. Independent final review approved all six fixture repairs and the exact E2E source hash above. The later evidence-record checkpoint changes documentation only. Consult PR #138 for its final merge status/SHA.

Saved evidence: **`cts-ao-post-base-range-evidence-20261015.zip`**, **38,376,641 bytes**, SHA-256 **`b7a7143037ffddce14f2a3243f814cf47a9b0b99965ced62ac28ab17bbe2ef21`**. Saved file identity `libfile_45908e26864c8191a69be441754d7d13`, version `0`. Its 203 members include exact frozen feeds, all 18 range outcomes, 864 hourly cells, complete exact-config/direction and owned-close evidence, both development attempts, the original failed full test run, corrected reruns, final source hashes and successful production UI reports. All CRCs, original evidence sizes/CRCs and relative report links pass; no duplicate members, code trees or screenshots are included. The final verification summary explicitly limits PASS to the software/offline/synthetic scope and keeps strategy selection NONE. An incomplete temporary repack was detected and preserved separately; the verified evidence archive was intact, then repacked and fully checked before saving. No live or private account data is included.

Authenticated live access and the exact external rename target remain unavailable. No live reload, exchange request or order has occurred in this continuation. The prior operator authorization remains valid; do not ask for redundant permission, invent live proof or relax evidence gates.

## 15 October Signals continuation — verified source and evidence

Release branch: `fix/signal-trailing-20261015`, [PR #137](https://github.com/mxssnx-creator/CTS-A-O/pull/137). Tested implementation/report source is `b138428bc6beafe6407048baedf153a6d98f2cea`, tree `164a4ac3dea2481e2035ae3d26f0a0b539ccac57`; the final follow-up changes documentation only. Remote backup `backup/pre-signal-trailing-20261015` preserves main `31b1eebace3a5cab179ee5a61e4d28d58d57c791` (PR #136). Earlier source checkpoints remain in the release branch history. Consult the PR for its exact merge identity.

Signals add nine independent default trailing-only SL × trail sets: SL 1.5/3/6%, activation 0.5/1/2%, step 1, before existing lane scaling. They have `tp: 0`, `trailOnly: true`, kind `trailing-only` and config suffix `|to`; nondefault step is encoded. Normal/capped Trailing IDs remain unchanged. Held-only recovered configs retain exact distances and ratcheted stops through range changes, relative adjustments, worker transfer and restart, but cannot rank or re-enter. A capped Signal's explicit target must not inherit the global engine free-trail setting.

The account audit found desired reductions releasing spendable capacity before actual confirmation. New admission uses actual owned and unresolved quantities, current mark-to-stop risk and verified equity. Legacy Entries now receives the same gross/risk/backstop/free-margin and actual position caps while retaining its documented fixed-unit sizing; the ratio remains Overall-only. Confirmed but never-observed fills remain reserved until visibility or confirmed protective-close deltas reconcile them. Unknown protection/account/price blocks guarded growth while held protection continues.

The remaining Presets/CLI weighted-PF leaks are corrected. Endpoint-inclusive Preset backtest qualification stays endpoint-inclusive and is labeled; settled diagrams have a separate matching sample. New saved/auto/backtest records retain unit/gross/no-loss provenance. Old aggregate-only saved records remain unavailable as primary PF. An old unmarked auto PF cannot reject newer verified unit evidence. Cash curves and raw sized outcomes remain diagnostic.

The six-hour test is frozen to **15 October 00:00–06:00 Europe/Vienna**, with evaluated prehistory **14 October 18:00–00:00**. The original strict 12-hour dataset has 12 × 720 completed 1m bars, no gaps, SHA256 `89585cd14f0bde4c13636d3cd14d489b0762c3fe8b633424ba5205290925f3ae`. Its preserved first attempt produced zero trades/tapes and failed completeness checks: the default longer-lane indicator warmup was unavailable, and a Signals-only engine removed required confirmation candidates. This is an unsuccessful attempt, not evidence of profitable execution.

The revised protocol retains the exact six-hour performance and trading windows and every gate. Cached earlier candles initialize indicators only; replay-only constructor `evaluationFromT` excludes pre-floor entries from Base/tapes/MFE and workers. The default engine confirmation focus is restored, with Signal PF reported separately from the shared system cash book. A pre-floor held book causes an explicit rejection while preserving its existing protection. Revised 12-symbol warmup data has 303,840 valid 1m bars, SHA256 `92940eb92f38db51016280421c6d64ce4944f5e52950b09b3472a66414108a5b`; no further network acquisition was needed.

The second attempt exposed an actual discovery dependency: even with Signal `baseGate:false`, a sparse `DEFAULT_PROTECT` representative blocked every independent protection history. Discovery now calculates every configured initialized pair in that mode; explicit `baseGate:true` retains the representative gates. Typed/config PF, sample, guard, cluster and confirmation gates remain unchanged. Runtime and saved-preset backtests share the same helper. Discovery counts are separate from representative PF-qualified counts.

Final attempt 03 calculated **all 504 Signal pairs and all 19,278 effective protection configs** (19,656 requested). Normal and capped Trailing each have 7,560 effective cells; trailing-only has 4,158. On 1m, existing minimum-trail floors merge nine raw no-TP cells into six effective IDs; the 378 requested aliases remain visible. Independent candidate diagnostics after costs are Normal **17,266 closes/PF 1.152728** (8,759 long/8,507 short), TP+trail **16,365/PF 2.710891** (9,302/7,063), trailing-only **17,393/PF 0.752508** (9,226/8,167). These are unqualified independent tape calculations, not funded execution performance. The active-unit TP+trail subset retained all 20 losing short closes (PF 0.009424), rather than substituting the profitable full candidate pool.

A single capture-only repeat adds **18 type-hour and 288 type/range/lane/direction-hour cells**, retaining empty and unknown samples. Its frozen addendum SHA256 is `ccf887e9d99b1c0bea295c6245d909ea391b8f6a15deec7a37b308891f5a2d89`. Original trades, open positions, tape aggregates, configurations, settings, funnel and all 62 check records match exactly; only reporting fields and wall-clock/timing/memory measurements differ. Candidate partition sums reconcile within 1e-9. The 03:00–04:00 Vienna TP+trail cohort has ten closes and no losses; score 4 is a sentinel, not a measured finite PF.

The frozen replay is **56/62 checks, not an all-green execution result**. Engine ranges sh/gn/lg built zero admitted configs: all 1,008/1,152/1,440 respective grid cells were rejected by unchanged `baseRange` admission. Their three configuration-coverage and three activity checks therefore remain failed. Complete independent Signal history calculation is separate from those engine range admissions. The legacy raw execution check includes seven planned Signal endpoint entries and does not establish funded ownership.

**Funded Signal entries, settled closes and endpoint positions are all zero**, so primary Signal PF is unavailable in every hour/type. Seven planned short endpoint marks are retained separately and had numerical-zero capital allocation. Prehistory PF ≥1.1/minimum-three config-side diagnostics count 0 Normal, 114 TP+trail and 545 trailing-only passes, pooled across symbols; they are not actual Base admissions or exact-symbol activation proof. Do not relax gates or invent trades to claim that both directions executed.

Report-book ownership is determined after uniform USD roundoff normalization. `BOOK_NOTIONAL_EPS_USD=1e-9`, matching existing live monetary-comparison precision, zeros finite nonnegative allocated total notional at or below that tolerance before units/cash/book updates. Raw allocations and the pre-normalization book remain retained. Tiny positive floating cap residues cannot become funded trade counts. No engine, source, PF gate, costs or return was changed by this book-only repair. Final shared owned book: **26,098 settled close slices, return PF 0.9016968601, cash PF 0.7599364745**, net **−$26.63299385**, balance **$973.36700615**, equity **$943.502663**, max equity drawdown approximately **9.4313%**, from $1,000. The 34,054 virtual pre-sizing walk-forward records (PF 0.823968) are a separate diagnostic. Earlier strict-positive/dust ownership counts and PF are superseded.

The operator additionally requested web research and new short/medium sources. The four-candidate definitions, exact 39-cell protection grid, fixed eight-symbol cache, seven warmup/53 IS/30 OOS days and PF 1.1/minimum 30 IS screening were frozen before scoring in `docs/signal-research-protocol-20261015.json`. Laguerre, rolling ATR Chandelier and internal Klinger reuse documented existing adaptations; RVI follows the official weighted formula. The full 688 IS-selected config-side pool returned OOS PF **1.4383917333** on **95,610 settled closes**, or **1.3526231032** including 2,617 endpoint marks. Every selected row is long; all 1,224 short rows were calculated and none qualified. The losing selected 1m cohort (PF 0.884358) remains included. All 2,448 effective rows together lose (PF 0.855695). The study and exact repeat are byte-identical, and an independent audit reconciled membership/gross sums and actual long/short return arithmetic. See `docs/signal-research-results-20261015.md`. All four research sources remain default-disabled: the catalog has 100 sources, with the original 63 enabled. This reused cache is retrospective chronological holdout evidence, not a new global untouched sample or live proof.

The default core test command and `test-all` now install a portable before-import offline Node transport guard, clear exchange/proxy credentials and propagate guard-first workers, including CJS watchdogs. It is a bounded Node test surface, not an OS sandbox. Failed child status, explicit slow-test policy, coverage/headroom/governor behavior and pinned synthetic dates are preserved; nested test-runner context is cleared. A delayed eval-gate mock now explicitly disables its own memory kill floor while keeping production guards unchanged. Generated `runs/` source snapshots are excluded from ESLint; active source is linted once. Final checks include script tests **396 passed/8 opt-in skipped**, platform **76 passed**, typecheck pass, lint **0 errors/22 existing warnings**, production build pass, and desktop/mobile production UI/SQLite checks (122 decoded API responses, no app/decode/capture errors; independent no-TP/source controls and measured/no-loss/unknown PF verified). External Fonts/Grok requests were blocked for offline QA.

The full 159-file core run finished in 1,663.77 seconds: **1,742 passed, one failed, two opt-in slow-test skips**. All 237 core TypeScript hashes stayed unchanged during that run. The sole failure was a progress fixture assuming its first job completed Paper. A forced memory-aborted first job reproduced that exact assertion; an unpressured original test passed. Production correctly terminated the aborted job and retried. The fixture now uses scoped deterministic memory thresholds, restores the prior environment/cache, and separately tests the real abort/retry path, including no premature compute/Paper publication, full completed stages, monotonicity and final book readiness. Both corrected cases pass. Production memory guards and all trading code remain unchanged. The complete corrected runtime file then passed **27 tests, zero failures and two opt-in skips** in 513.99 seconds, with all 237 hashes unchanged during that rerun. Across the full run and corrected runtime rerun, **1,744 distinct regular core cases are verified**, with two distinct slow-test skips. Only `src/core/server/runtime.test.ts` changed between runs. The original failed full-run evidence is retained; this is not represented as one wholly green monolithic invocation.

Implementation/report checkpoints are `1dd3f9364930afd79ce75616997e851746bd6814` (complete evidence helpers) and `4d73220adf7e4e1d10b725c911254a5ada199229` (exact literal UTC/Vienna workbook labels). The workbook includes a clearly labeled deterministic 3,024-row configuration index; all **38,556** full config-side rows and requested aliases remain in the evidence CSV/JSON. Timestamp export/readback, all 14 workbook reconciliations and all OpenXML parts pass.

Evidence artifacts: `cts-ao-signals-six-hour-20261015.xlsx` (401,901 bytes, SHA256 `350af44945b416e9854a2235bd8918c611caf2f80af8ef56ce30d1c84b6d4761`) and `cts-ao-signals-evidence-20261015.zip` (49,307,793 bytes, SHA256 `ae02c0f41bec0866d62a88dcc326b75321c25e8a835b1614cb180e80ba4dd887`). Both are saved successfully. The ZIP has 143 entries; its manifest verifies all other 142 files by byte count/SHA256, and CRC checks pass. It retains complete/repeated research, frozen public feeds, full six-hour configuration and hourly evidence, prior unsuccessful attempts, original and corrected QA runs, source manifests and a data dictionary. No screenshots, copied engine source trees, environment files or private/live database state are included. Evidence metadata records source `b138428bc6beafe6407048baedf153a6d98f2cea` and PR #137; its merge field is intentionally null because assembly preceded the merge.

Authenticated live host/deployment access and the exact `imperative-greeting-fox` resource identity are still absent. No live reload, external rename, live backup or exchange order has occurred in this continuation. Prior authorizations remain valid; access is the missing prerequisite.

## 15 October continuation — verified source and release record

The operator confirmed **CTS-A-O**. CTS-G's separate replay/checkpoints are outside this task. This release is carried by `fix/report-pf-20261015` and [PR #136](https://github.com/mxssnx-creator/CTS-A-O/pull/136). Its pre-release main is backed up as `backup/pre-report-pf-20261015` at `54b35b08606faff332f4637f889d2a8a2cabce2b` (PR #135). Consult PR #136 for the final merge identity.

The exact tested source is `fdec0ffe9756bee6641d5aa8c5f35c56edc4c932` (tree `d03d640032c4b0f5f3af9a7ca8b788f58a4f9a5c`, 73 changed paths). Production source was frozen at `8ffed441`; the subsequent source checkpoint changes only six existing test fixtures and this handoff. Known synthetic summaries now declare their unit basis; losing-PF assertions remain strict, and the trading E2E uses actual synthetic loss rows rather than corrupting only a cached PF. No production guard was relaxed. Final release changes after this checkpoint are documentation only.

The audit reproduced unit returns +0.8%/-1%, externally multiplied by 2/1, being scored as weighted PF 1.60 instead of primary return PF 0.80. Primary metrics, readiness, paper proof and reports now use explicit unit-return helpers. Direct modeled execution returns remove their recorded external **Block × coordination** multiplier; intrinsic DCA/Axis tape-leg semantics remain part of the config. Stored weighted returns, cash P&L, equity and sizing remain intact. Actual venue return/fee arithmetic is unchanged.

New paper closes persist nullable `unit_r` separately. Legacy rows lack recoverable multipliers and remain unknown; no guessed backfill is allowed. Unknown closes stay in the current chronological last-N/proof/adjustment window, block qualification, and cannot be skipped to select older winners. A complete actual exchange window can supersede paper evidence. Cached pre-upgrade simulation breakdowns are derived from their retained orders; aggregate-only archives without a unit basis expose unavailable primary PF and retain separately labeled sized diagnostics.

Reporting also preserves Tactic's full-indication minimum PF 1.1 and stricter settings, mixed groups' effective threshold ranges, exact hourly close bounds, independent opposite-direction research slots, no-loss provenance and unavailable PF differences. A no-loss score is not an exact finite ratio; unknown history must not hide a recorded loss. The frozen historical 90-day OOS PF 1.117865539 remains research only, with no retuning or promotion.

No live reload or exchange orders occurred. Recorded hosts remain unreachable; no authenticated Tailscale/SSH/deployment route is available. The requested industrial rename of `imperative-greeting-fox` still needs its exact external resource identity.

## Standing accounting and identity contract

The operator requires persistent work, remote backups and regular validated GitHub checkpoints. Read `AGENTS.project.md` when continuing in another chat.

**Return-based PF is primary everywhere:** sum positive net returns divided by absolute sum negative net returns on the same settled owned sample, after costs. Cash PF is a separately labeled reconciliation diagnostic. +1.36% on $100 and -1% on $680 gives return PF 1.36 and cash PF 0.20; comparing them as the same metric is wrong.

Match connection, ownership, settled close slices, partial quantities, costs and time bounds before comparing PF, net or history. Whole-position episodes are a separately labeled diagnostic. Expose the engine's no-loss score convention (`4`) with gross return sums and `noLoss/pfConvention`; do not present a sentinel as an exact measured finite ratio.

An accepted order is not a fill. Journal zero executed quantity and durable request identity before submission. Poll the original ID; explicit zero, partial, stale or malformed replies cannot invent ownership. A known stop loss remains recorded if a later cumulative entry creates unresolved chronology. Preserve its evidence and hold that key rather than silently rewriting history or claiming profit.

Signals retain full source, parameter range, lane, strategy type and protection-config identities. Empty/losing sibling types cannot dilute or qualify another type. Each config still passes its own minimum return-PF gate. A signal onset counts once inside its independent acceptance group; PF includes every settled return slice. Shared direction/account safety coordination remains separate. The 14 Oct operator instruction supersedes older source-wide pooling notes in `docs/positive-coordinations.md`.

**Tactic is a first-class indication type**, distinct from the existing remove-only Tactics entry filters. Trend, pullback, mean reversion, breakout and regime-adaptive techniques each have Short/Medium variants and use the existing independent/combined 1/5/15/30-minute pipeline. Keep their complete config identities. Historical and combined calculations must use completed, valid candles; return-PF qualification is evidence about the sampled past, never a guarantee of future returns.

## Backups and GitHub

Merged release PR #134: main `69347e5cee60c7f6ff5a486999fbe8f3f08d2851`.

Remote source backups:

- `backup/pre-execution-audit-20261014`: `061eedd5accb5f013e9d7f2910fc7222d8794fe8`.
- `backup/pre-fill-reconciliation-20261014`: `69347e5cee60c7f6ff5a486999fbe8f3f08d2851`.

Follow-up: branch `fix/fill-return-pf-20261014`, PR #135. Reporting checkpoint: `c3e84490d5dc83db4dee68d89c77629fd30e7f9a`; execution/Signal/Tactic checkpoint: `ab750d87b88957b83c765642259f4f0118685844`; complete Base-count source: `4c2f814c6c62c100f89d6f2adaf1ff6f7dfffe0f`; production worker packaging/shared scheduling and research: `70186289d371f27579cf14bd0e46000abaa11931`; final reviewed source including safe legacy restart guard: `fe1110d354d75ffa298df8a80a198b97656def0d`. Consult PR #135 for its final merge commit/status. These source backups do not contain a production database or private runtime settings. Back up live settings, durable state and a consistent database snapshot before deploying.

The public research evidence backup is `cts-ao-research-backup-20261014.zip`, 18,070,327 bytes, SHA256 `cd8633a7414d4145c0d004cd7abe57c30dff06cb5368f5a445c1d564081bc3da`. It contains both original public candle caches, frozen protocols/manifests, full reports, repeat metadata and per-file hashes; no credentials or private account records. It was saved separately from source control for future continuation.

## Implemented corrections

- Primary execution reporting and UI use the same settled owned close slices, including partial reductions. History preserves exact identities and latest cumulative orders instead of rounding unsafe venue IDs or summing duplicate cumulative records. Paper/session/coordination outputs explicitly identify their evidence basis.
- Actual quantity, price, fees and pending lifecycle survive crash recovery in both live modes. Pending zero entries cannot adopt unrelated venue positions. Protective closes honor actual zero/partial results. Actual exit timestamps determine history windows. Proven external stop losses are attributed once; ambiguous extra late fills remain explicitly unresolved.
- Account sizing uses verified current account equity; unknown or stale values never become a paper $1,000 live balance. Retry quantities pass risk/margin checks again. Wallet balance, equity, ledger net and reconstructed history remain separately labeled.
- Signal qualification is independent by full range/lane/type; order, paper, lane and stats keys preserve exact configs. Exchange acceptance and simulation agree on onset sample count and settled return PF.
- Signal historical MFE calculations use the existing bounded worker pool with shared causal bars, pair isolation, deterministic merge, held-config preservation, generator fallback and cancellation/memory guards.
- Tactic is registered as an indication family, with the standard Base → Live evaluation path and human labels in settings, presets, configs and statistics. Its calculation recovers after gaps/invalid candles using fresh valid segments.
- Tactic has a minimum return PF of 1.1 throughout Base and subsequent exact-config gates, retaining stricter settings. The actual full saved TP/SL/trail/hold grids are counted separately from representative admission, by full indication/lane/range/strategy, with configured, evaluated, PF-only and all-gate counts. Bounded background chunks use the same causal Base tapes, preserve whole-grid range fitting and release completed history. API reads cached snapshots and displays pending, partial, failure and stale states honestly.
- Existing measured Focus defaults remain intact. The explicit Include Tactic in Base focus action adds all ten Tactic bases to a nonempty Focus, preserves other pairs/pins and enables the kind; an empty Focus already includes all kinds. Settings persist and restore correctly.
- Production builds package a standalone ESM worker beside the server. Worker resolution honors an explicit operator path and otherwise finds that exact build artifact. Nitro module copies share worker queues, priority, abort and watchdog activity; an idle worker can no longer strand another copy's work.
- Upgrading a running old slots-only development pool explicitly requires a process restart. New code rejects the incompatible schema before mutating it, so both old running and separately queued calls finish normally. Fresh production boots and ordinary new-schema module copies share the complete pool state.
- A definite rejected emergency close clears its pending request identity in both entry-stop and stop-repair paths; unknown transport results retain their durable identity for polling. Stress fixtures distinguish definite venue rejection from ambiguous network failure.
- Higher-timeframe aggregation rejects incomplete source buckets and malformed duplicate/non-increasing timestamps. Tail resampling matches the last complete buckets of full resampling.
- Supervisor and monitoring fixes from PR #134 preserve exact process identity, fail closed on process-query failure and respect procfs PID namespaces.

## Preserved earlier verification and focused supplements (not CP10)

The following earlier invocation counts and separately labeled focused supplements
are historical evidence. They do not replace or add to the completed CP10 release
checks at the start of this handoff:

| Check | Result |
| --- | --- |
| Complete scripts | 344 passed, 8 environment/browser skips |
| Platform/authentication/UI helpers | 73 passed |
| Final CP8 Block trace/admission and conservative recording | 102 focused cases pass; earlier 149-case pre-quantization matrix/replay scope is retained separately |
| TypeScript | Final CP8 pass |
| Production build, including packaged worker | Pass |
| Full ESLint | 0 errors, 23 warnings |
| Offline page/viewport QA | 24 checks passed; static/local evidence |
| Runtime/API/SQLite browser fixtures | Desktop/mobile passed; return PF 1.36 versus cash PF 0.20; unknown legacy evidence retains its loss; no-loss differences remain unavailable |
| Bounded Tactic count fixture | 600 evaluated, 37 at PF floor, 36 passing all gates, 1 admitted representative pair |
| Core: all 151 test files, concurrency 1 | 1,653 passed, 4 temporary harness failures, 2 slow-test skips; 1,670.35 seconds |
| Corrected offline harness: all stall-probe tests | 6 passed, including all 4 previously failed cases; production source unchanged |

The complete core run used the normal test files with concurrency reduced to one, one compute worker and Compare disabled. All 228 core TypeScript file hashes remained unchanged during the run; cgroup OOM counters did not increase. Its exit code was 1: four stall-probe workers could not start because the temporary offline wrapper copied unsupported expanded Node test-runner flags into explicit worker arguments. Independent diagnosis captured `ERR_WORKER_INVALID_EXEC_ARGV`. Narrowing only that wrapper's inherited flag allowlist fixed all six probe tests, including the four failures, without source changes or waived assertions. This verifies 1,657 distinct core cases across the complete run and targeted correction; it is not a claim of one wholly green monolithic invocation.

Automatic approval review rejected the unrestricted test/QA process over possible BingX traffic with an unknown payload. Replacement checks omitted exchange credentials and installed a before-import nonlocal transport guard, including explicit CJS preload propagation into workers and Node children. Local proof covered denied HTTP/TLS/TCP/UDP/fetch paths and allowed loopback fixtures. Native exchange connectivity and funded trading were not tested.

The browser accounting checks exercised the actual local API and runtime-backed SQLite with seeded data. The refreshed `seeded-accounting-seroval-verified` report used Seroval's official decoder: measured/no-loss/unknown provenance remained false/true/null respectively, with 42 decoded responses, zero decode/app errors and 16 desktop/mobile screenshots. Two unrelated background response-body capture misses remain recorded; all required samples were captured. Earlier lossy collector reports are preserved and superseded. The Tactic counts are bounded synthetic worker/UI evidence, separate from representative admission and market profitability. Neither check establishes live execution PF.

The raw browser smoke still records the environment's existing Google Fonts/Grok `ERR_EMPTY_RESPONSE` failures; they were not hidden or removed. App assertions and viewport checks passed, and QA processes were stopped.

Live backup, deployment/reload, execution reconciliation and the external rename remain **blocked by unavailable authenticated host access/resource identity**. Before any live change, take settings, durable-state and consistent database backups. Restart the process for the previously documented worker-pool upgrade. Expect legacy unknown paper history to block new qualification until a complete verified current window exists; preserve held-position protection and never waive the PF/proof gates to manufacture readiness.

Keep source checkpoints and this handoff pushed to GitHub. Before any live change, back up settings, durable state and a consistent database snapshot. Never substitute fixture/research PF or a previous release's checks for final source and actual execution verification.

## Research and live deployment limits

Public BingX research data covers eight symbols and 18 closed days. The earlier narrow lean runner covered only 32 of 259 requested combinations, not the full engine. Its held-out 83 closes produced return PF 0.46055 after modeled costs despite IS PF 2.549; it was not promoted. See `docs/research-check-2026-10-14.md`.

Tactic's frozen 1,680-cell comparison separately selects current-default-entry-filter and raw-diagnostic modes on physically truncated IS data, then evaluates OOS. At the operator's PF 1.1 screen, the default-filter IS-qualified pool returns PF 0.661652 across 130 OOS closes; raw returns PF 0.643878 across 102. One preselected default-filter Short breakout/combined-5m member returns PF 1.275618 across 39 OOS closes, while the whole pool is negative. Do not substitute that member after seeing OOS. Research protects are explicitly fixed distances, not lane-scaled runtime grid cells, and portfolio coordination/capital limits are absent. See `docs/tactic-validation.md`.

A separate protocol was frozen before new-symbol performance access: AVAX/LINK/LTC/SUI/NEAR/DOT/ATOM/APT, 90 days, first 60 IS and final 30 OOS, unchanged techniques/grid/cost/modes and PF 1.1/minimum 30 IS screening. Acquisition validated 1,036,800 closed 1m candles without gaps/duplicates. Six default-filter IS-qualified groups produced 910 OOS settled closes at return PF **1.117865539**, or **1.116471777** including seven open marks. The losing 30m medium pullback remains included; neither mode nor pool membership was selected on OOS. All 70 diagnostic default groups together remain negative (PF 0.899959). Raw mode's one preselected group produced PF 1.815373 on only 27 OOS closes, below the 30-close sample screen.

Two full runs produced byte-identical research JSON, SHA256 `5f40353363fd4d6a8f3054a6dbcee33726bfca93b3daca81878b38b95b8a2c3d`; independent review recomputed IS selection from all 1,680 cells and verified protocol/cache/manifests, pooled sums and repeated output. The positive pool has maximum drawdown 186.772 return points versus net +106.424 points, with 561.917 hours of drawdown time. This is a historical new-symbol sample with overlapping dates/correlated markets, not live evidence or independent account ROI. Full runtime gates, funding, actual slippage, account sizing and capital coordination are absent. No live promotion is justified by the pooled research result. See `docs/tactic-validation-independent.md`. No OOS tuning or mode selection is authorized by a desire for positive results.

No exchange credentials or reachable authenticated live route are available in this environment. There is no configured Tailscale client/session, SSH identity or deployment workflow; recorded hosts `152.53.114.112` and `100.105.148.7` are unreachable. No live orders were placed and no reload or live PF-above-1 claim is justified.

The exact external resource `imperative-greeting-fox` was absent from source, connected Sites and connected Vercel name lookups. Its requested industrial rename remains pending an exact resource identity. Do not rename a guessed deployment.

## Fast 6h + 6h release check — 2026-10-16

The offline session uses the cached candle feed through 2026-10-15 04:00 UTC and exactly six evaluated prehistory hours. Signals receive no additional warmup. The feed is historical and was about 38 hours old at the replay; this is a smoke check, not a current-market or profitability claim. Full hourly, per-type, range, lane, sizing and Block-multiplier tables are in [`docs/sims/systemwide-pf-volume-audit-20261016.md`](sims/systemwide-pf-volume-audit-20261016.md).

- 6-hour session: 792 funded closes, Return PF 2.374852, cash PF diagnostic 2.223031, realized +$4.418713 from $1,000, end equity $1,000.703278, max equity drawdown 2.8717%, and 4/6 positive hours. Long had 60 losing orders; Short had 732 orders at PF 5.938047. The result is not positive in every hour.
- Range coverage: Micro executed 792 closes at PF 2.37. Minimal, Short, General and Long had no executed sets. Signals built 4,914 requested configs but had no active/executed units under the unchanged 24–48h gates. Keep these outcomes empty; do not relax gates using this short sample.
- Volume: ×1 had 342 closes at Return PF 30.806253 / cash PF 31.595471 / +$5.143369. ×1.5–2 had 450 closes at Return PF 1.116727 / cash PF 0.789638 / -$0.724656. The overall 936-close virtual Return PF is 2.578589; funding/caps reduce the owned sample to 792. Volume changes cash outcomes, not unit-return PF on an unchanged cohort.
- The report generator now carries the source mode into saved dumps, labels cached-feed replay accurately in both reports, and marks Signal history as the same minimal evaluated window. The local startup now resolves the repository root, uses the cgroup-bounded memory budget and available CPUs, and keeps the local app synthetic with autostart/live disabled.
- Checks: 383 focused strategy/Block/Signal/promotion tests and 143 balance/sizing tests passed; typecheck also passes after the report changes. The offline session itself completed in 12 seconds; its consistency report is 55/64 because the aforementioned ranges and Signals have no configs/orders in six hours.

GitHub state at this checkpoint: PR #142 is merged into current `main`; there are no open issues. Draft PR #132 remains unrelated and was not merged.
