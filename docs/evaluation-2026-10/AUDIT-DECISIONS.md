# Audit items and what was done (11 Oct 2026)

Each item of the audit plan, with its status. "Fixed" changes behaviour and has a pinning test. "Pinned" records a value
or a documentation fact with a test. "Kept" is a rule the operator set or a documented design decision: it is not changed
here, and a change needs the operator's approval and a causal comparison (docs/positive-coordinations.md).

| Item | Status | Where / test |
|---|---|---|
| Supervisor: relaunch rule, self-matching process check, halt file | Fixed | docs/live-coordination/x01-supervise.sh; scripts/x01-supervise.test.mjs (4) |
| Loss budget from each session's start, systemwide | Fixed | src/core/loss-limit.ts sessionBaseline; scripts/core-live-test.mjs; loss-limit.test.ts |
| Keep-alive: hourly routine into the session, 10-minute cadence not allowed (routine minimum is one hour) | Partly | routine trig_01R4tPtbntNiwPo2ZQeRLPjd; a sandbox reclaim ends the session and the routine with it |
| Fee of an unmeasured fill: zero counted as a measured fee | Fixed (earlier, d6a278d) | live.server.ts parseFill / recordLanes; runtime.server.ts liveCost |
| Ledger fee of an unmeasured fill charged as zero (statistics) | Fixed | statistics.ts feeOf; statistics.test.ts (model fee) |
| Signal families keyed by one lump "sig <bot> wide" | Fixed | bot-stats.ts botFamilyOf (source × range); bot-stats.test.ts |
| Events: entry time not floored to the 15-minute bar | Fixed | bot-stats.ts eventBar; bot-stats.test.ts |
| Stale hold label "192 h" (192 bars = 48 h) | Fixed | docs/live-coordination/signals.patch.json; signal-config.ts |
| Trailing "2 × target" comment vs slOfTp 3 | Fixed (comment; value kept) | signal-config.ts |
| minTrades has two units | Documented | signal-config.ts (both named where used); signals.ts activeSignals; acceptOnWindow |
| Guard judges closes of the units active at their step | Documented | signals.ts header |
| Lowdd default comments | Pinned by the default; comments kept as written | signal-config.ts rank: "lowdd" |
| Startup refusal on unowned positions | **Deviation (not done)** | A refusal would block the relaunch you asked for: the desk trades ETH and hand positions appear on desk symbols. The desk already never touches positions it does not own, and the HALT file stops relaunches. Needs your decision. |
| Venue-minimum retry bound | Kept (already bounded) | live.server.ts ~3134-3145: notional at most max(cap, contract minimum); exchange-minimum.test.ts |
| Cross leverage "max" (cross margin is backed by the whole account) | **Kept, for your decision** | live.server.ts ensureLeverage: a design choice (isolated is capped at 4; cross is not). Changing it lowers leverage and raises the margin per position. |
| acceptOnWindow: a thin sample counts as VALID | **Kept — operator rule (6 Oct)** | signals.ts acceptOnWindow; signals.test.ts pins it |
| recentOk: one profitable close passes | **Kept — documented** | signals.ts: a per-config requirement on 6 Oct left no unit active; not applied |
| liveGate passes below n closes | **Kept — documented** | config: below the live floor the simulated validation decides; a dry run of blocked configs is needed before any change |
| side 0 maps to short in four keys | Kept (latent) | callers pass ±1 only; not changed |
| Untested functions (scoreStats, SQN, expectancy, gap fills) | Pinned | metrics/stats.test.ts (4); sim/gap-fill.test.ts (4) |
| Auto-adjust on in code and on x01, documented off | **Kept — for your decision** | config.ts; the document must match the decision |
| Stable-02 documented on, off in code; Axis documented as a positive, off in code | **Kept — for your decision** | walkforward.ts; config.ts DEFAULT_TOGGLES.axis |
| Live caps with no code default | Kept | config.ts; the x01 patch sets them |
| Family runs: causal evaluation per bot × range and per signal source × range | Built and run | eval-family.ts, runtime.server.ts (CTS_CORE_FAMILY), core-session.mjs (priceStream null), scripts/eval-families.mjs |

## 13 Oct audit — confirmed findings and the unverified low findings

The 13 Oct audit (Axis, Block, range seating, progression / async, indication relations; one skeptic per finding):
17 confirmed. C2–C15 are fixed, each with a test that fails before the fix; C1 (Axis managed-revert depth), C16 (tactics
judged on the onset bar only: `tactics.onRun`, measured as a variant) and C17 (default focus) are design items.
The 19 low findings were verified the same way afterwards: 11 fixed, 3 refuted, 5 confirmed and left for a decision.

| Finding | Outcome | Where |
|---|---|---|
| Fixed-exit revert Axis: an entry open past the axis booked a 'tp' below the fill | Fixed | axis.ts; axis.test.ts |
| block.excludeRanges could not exclude Wide; not validated | Fixed | walkforward.ts execDecision, settings-check.ts |
| Family evaluation scheduled families whose range builds nothing | Fixed | scripts/eval-families.mjs |
| One runtime's memory abort disabled the other runtimes' workers for 10 min | Fixed | runtime.server.ts, pool.server.ts |
| Live control step mixed a pre-await lane hash with post-await lanes | Fixed | live.server.ts |
| Every tape message cloned every pair's floors | Fixed (each message carries its own pairs') | runtime.server.ts |
| Preset backtest's Base used the old Micro lane floor | Fixed | runtime.server.ts |
| s2-block-stack counted a doji as up (a long bias) | Fixed | stable02.ts |
| signalSeatSymbols keyed by pair + symbol (no symbol for per-side units) | Fixed | signals.ts |
| Combined lanes computed against the fixed ladder, not the enabled lanes | Fixed | registry.ts |
| Workers built the market reference from ≥ 120-bar series only | Fixed (every series, as the main thread) | runtime.server.ts |
| Axis desk mode: an unfilled ladder holds the lane until expiry | Refuted — documented design (desk mode only, off on x01) | axis.ts |
| linear / geo ladders read `spacing` as % of price | Refuted — documented, pinned range definition | axis.ts, axis.test.ts |
| Axis desk pending intent vs resting rung | Refuted — no consumer trades an Axis pending intent | axis.ts, walkforward.ts |
| Axis off in code and in most presets, documented as a positive on x01 | **For your decision** — needs Axis on vs off on the D1 windows and holdout | config.ts DEFAULT_TOGGLES |
| Axis per range: Micro ladders trade a 0.5 % stop and 1.1 % target (desk floor) | **For your decision** — an Axis design change, measured first | walkforward.ts axisRangeVariants |
| x01.patch.json / x01.settings.json / twin.* still run Block and Block Active on | **For your decision** — desk files not edited (the running desk uses signals.patch.json, Block off) | docs/live-coordination |
| About eleven indication ids compute identical entries under two names | **For your decision** — removing aliases changes focus pairs and Base counts | registry.ts |
| The 11 Stable-02 indications (S2_INDICATIONS) are never computed | **For your decision** — enable as engine combos (+26 % Base work) or remove | pipeline.ts allCombos |
