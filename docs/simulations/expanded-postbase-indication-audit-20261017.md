# Remaining indication families: source audit

Read-only formula and routing review of the source represented by frozen v4
manifest `bc7216bd7ab6000b7651a5d83054a16887854097a31847e7701b9a92754693f7`.
The review covers Tactic, Stable-02 and research batches 1–4, alongside the
shared completed-higher-timeframe routing used by these families. Repairs are
isolated in commit `c11a3691782071960cadd0febc1be41273142840` on branch
`fix/indication-volume-warmup-20261017`. The running market study retains its
frozen source, formulas, gates, costs, settings and replay protocol. This
checkpoint reports a source review and focused synthetic regression tests;
it does not claim a complete core-suite result or market profitability.

## Confirmed findings and isolated repairs

### Volume-profile bucket cap discards upper-range volume

`src/core/indications/research2.ts:545–559`, `r-valuearea` and `r-valuearea-m`.
The profile fixes its bucket width at `0.15 * ATR`, then caps the bucket count
at 400 without widening the buckets. When the lookback price span exceeds
`60 * ATR`, the allocated buckets end below the observed high. Candles wholly
above that artificial ceiling contribute no volume; candles crossing it have
their full volume redistributed over only the retained portion.

A direct arithmetic reproduction uses a profile low of 100, high of 200 and
current ATR of 1. The width is 0.15 and the capped count is 400, so the
represented interval ends at 160. A valid candle with low 190, high 191 and
volume 100 produces `b0 = 600` and `b1 = 399`. The loop from `b0` through `b1`
never runs: all 100 volume units disappear. This does not require missing or
invalid candles. A wide earlier range followed by quieter trading can produce
the condition on a continuous feed.

The resulting point of control and value-area bounds therefore describe a
truncated price domain. This is an input-domain defect, independent of whether
the resulting entries win or lose. Both source variants are explicitly
disabled in default Signal settings (`src/core/signal-config.ts:702`) and are
absent from the default engine focus. No effect on the frozen study's PF is
claimed.

The repair widens the bucket width to the full span divided by 400 only when
the original request exceeds 400 buckets. Ordinary uncapped bucket widths,
indices and arithmetic remain unchanged. The production path now reuses the
extracted `valueAreaProfile()` helper. Regressions conserve input volume over
the complete capped domain, exercise real short/medium source events and
their mirrored directions, and verify causal prefixes. Any market replay of
the repaired source needs its own new source freeze.

### A flat upper-endpoint candle can lose volume without reaching the cap

The same profile's original starting-bin calculation also discards a valid
zero-range candle at the exact upper boundary when the price span is an exact
multiple of the requested width. With low 100, high 102 and width 0.25, eight
bins are sufficient. A flat candle at 102 with volume 50 produces starting
bin 8 and final bin 7, so its volume disappears even though the cap is idle.

The repair assigns that starting bin to the last represented bin for both
capped and uncapped profiles. Every formerly nonempty ordinary bin span keeps
its previous arithmetic; the corrected edge adds only the valid volume that
was previously discarded. A separate uncapped regression retains the 0.25
width, places the endpoint's 50 units in bin 7, and reconciles the full
60-unit input. Its default applicability is the same disabled `r-valuearea`
source described above.

### Stable-02 Supertrend entries bypass their documented warmup

`src/core/indications/stable02.ts:21–22,145–148,468–473` and
the `comboSignal()` onset path in `src/core/bots/bots.ts`.
`S2_WARMUP = 55` explicitly promises no entry signal before that bar. The other
ported entry helpers use `events()`, which starts at 55. The Supertrend entry
specs instead return the raw direction series from `s2Supertrend()` directly.
Its first finite direction appears when ATR-EMA is seeded: index 13 for the
short ATR(14) profile and index 20 for the medium ATR(21) profile.

For continuous valid bars with open/close 100, high 101, low 99 and volume
1000, true range and seeded ATR are 2. The initial close equals the midpoint,
so `s2Supertrend()` initializes direction to +1 at index 13/20 after preceding
zeros. The ordinary unfiltered Follow onset logic therefore emits an entry
there. The desk reference `signalFor()` in
`src/core/indications/stable02.test.ts:398–442` starts at 55 and emits no such
seed entry. Its parity comparison deliberately begins at index 260
(`stable02.test.ts:743–753`), so that comparison does not cover the mismatch.

The `s2-st-trail` Signal source is registered and allowed by the default deny
map (`src/core/signal-config.ts:264–267,672–717`). This is a warmup-contract
defect for configurations where the early raw onset is eligible, rather than
proof of a default executed trade: entry filters and later gates can reject
it. The frozen study has 205 hours of separate indicator warmup before its
evaluation floor, so the initial seed occurs before its scored history. No
effect on the frozen study's PF is claimed.

The repair adds optional `IndicationSpec.entryWarmupBars` metadata to the
Supertrend entry specs and propagates it to their Signal aliases. The shared
bot entry paths enforce that floor on the actual primary source's bar
indices. Natural Follow/Revert entries still compare the original preceding
direction; zeroing the raw prefix would instead create a false onset at 55.
Other trigger/agreement bots use the same floor while retaining raw direction
for filtering. No raw Supertrend calculation or later direction transition
changes.

The explicit `onRun` policy continues to mean the first eligible filtered bar
of a held state run. It can deliberately enter at 55 after readiness even
without a new direction flip. That delayed entry is distinct from the natural
onset policy. The frozen study has no `onRun` property: session is false,
volatility-regime and trend-strength filters are true, and cooldown is false.
For this natural-entry policy, the S2 repair leaves entries at index 55 and
later identical and changes only the excluded initial prefix. This is a
source-level parity statement, not a new replay result or a claim covering
all possible held-run policies.

## Verified scope without another definite finding

| Scope | Source checks |
|---|---|
| Tactic, all five techniques and both profiles | `tactic.ts` shares context only within the same profile; short and medium memo keys differ. Prior structure uses `donchianPrior`; ATR and volume reference baselines exclude the current bar. Finite valid contiguous segments restart the recursive indicators and readiness. Warmup covers the slow EMA's three-bar slope and required references. Adaptive state selects from that same profile's methods. |
| Research batch 1, fourteen paired families | Current/prior completed indices are causal; short and medium closures retain their own parameter records. Warmup/finite checks and the shared calculation keys inspected do not reveal another definite formula or identity defect. |
| Research batch 2, twenty-four paired families | Confirmed pivots become available only after their right-side confirmation bars; current events use current/prior completed inputs. Short and medium identities remain separate. The volume-profile cap above is the definite finding. |
| Research batch 3, eight paired families | Quarter-hour events use the explicitly defined bar-open phase. Laguerre recurrence, TD counts, choppiness, ultimate oscillator and signal crosses read only the current prefix. The rolling ATR Chandelier channel and cumulative volume-force Klinger are documented adaptations in `docs/signal-research-sources.md`; differences from other canonical variants were not mislabeled as bugs. |
| Research batch 4, RVI 10/20 | The four-bar numerator/denominator weights cancel their common normalization in the period-sum ratio; the signal applies normalized `[1,2,2,1]` weights. Zero denominator stays unknown. Invalid OHLC/time gaps restart the complete window; the first cross requires current and prior complete signal lines. Memo keys include the period. |
| Stable-02 remaining ports | The desk-specific EMA ATR/DMI and rolling rather than history-start VWAP are explicit adaptations. Registry and Signal source mappings preserve distinct short/medium parameters. The Supertrend entry warmup above is the definite finding. |
| Shared higher-timeframe routing | `cache.ts:175–244` publishes a higher bar only after a fully aligned contiguous bucket closes. Its index map points to the latest completed higher bar. `registry.ts:1117–1131` uses that map for combined-lane agreement, with a memo key containing both the source identity and factors. |

These checks concern source correctness within the stated scope. They do not
certify every indicator against external platform conventions or establish
profitability. Ordinary research indicators' assumption of valid contiguous
input was not promoted into a new universal gap-reset requirement. Tactic and
RVI do explicitly promise resets, and their reset paths were inspected.

The default engine focus contains classic, range-family and Micro Break
identities (`config.ts:497–532,562`), rather than the Tactic/Stable-02/research
families. Default Signals separately enable several batch 1/2 and Stable-02
sources. Research 3's Laguerre/Chandelier/Klinger Signal candidates and RVI are
explicitly disabled (`signal-config.ts:713–716`); the remaining batch 3 events
are available as registry indications without automatic default promotion.

## Focused verification

All commands ran serially in
`/workspace/scratch/74aec7d6017a/CTS-A-O-indication-fixes`, using Node's offline
transport guard before imports, one worker and an explicit 512 MiB heap. The
first command selected the six new regressions. The second ran the complete
existing Stable-02, research batch 2, tactics and research-Signal identity test
files. After the additional uncapped endpoint repair, the complete research
batch 2 file ran again. No local full core suite, typecheck, build or market
study was run. The dedicated combined-source CI must establish those separate
results.

| Log under `runs/indication-fixes-20261017/` | Result | Duration | SHA-256 |
|---|---|---:|---|
| `new-regressions.log` | 6 passed; 0 failed/skipped/cancelled | 1.786 s | `609379d17fbdb3ee5b2f9e9c174bb0fba40ac5f3c8dcd46d0b8b6164aafc084a` |
| `relevant-regressions.log` | 60 passed; 0 failed/skipped/cancelled | 9.001 s | `2bdad148a639c4c6efe0c3f14431afdc7c7a33e7d7d01dd4303788a94ba0edf7` |
| `profile-final.log` | 12 passed; 0 failed/skipped/cancelled | 0.873 s | `6fad5f3e3ba8a62c7434618dd2e78fffe9ebeb085d3cbfb480f3a44837719a37` |

These invocations overlap; their test counts must not be added as unique
coverage. There are seven new regressions in the final source: four profile
cases and three entry-readiness cases. The readiness cases cover both S2
profiles, Signal aliases, explicit and combined lanes, causal prefixes,
genuine later flips, no manufactured natural onset at 55, the declared
`onRun` behavior, an actual early Sandwich trigger candidate, all bot warmup
prefixes and unchanged metadata-free bot behavior. The existing identity
suite also exercises real worker serialization.

Independent read-only review checked all changed entry paths, metadata and
alias propagation, the production profile helper and both endpoint cases.
It found no remaining blocker. `git diff --check` passed before the code
commit. The frozen study checkout remained clean; these repairs were never
substituted into its running replay or used to claim changed PF, throughput
or hourly success.
