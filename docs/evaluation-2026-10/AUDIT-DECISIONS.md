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
