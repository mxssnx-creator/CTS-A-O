# Base 40 and trailing execution audit — 28 October 2026

[Open the detailed report](report.html). It lists all 3,900 screened Base cells,
all 90 Base-admitted direction checks, every one of the 37 modeled executed
closes, and the hourly progression. The screen's 74 gate-passing candidate
closes are a different, larger cohort than the 37 actual walk-forward modeled
closes. Neither is a venue fill or an account-funded settlement.

## Scope and measured results

The cached Binance USD-M feed covers 20 symbols. The bounded Low-Range Short
screen uses 1, 5 and 15 minute lanes, one target step, Normal and capped
Trailing, a 60-minute hold, and 0.15% modeled round-trip cost. Indicator
warmup precedes the 24-hour evaluation interval, 2026-10-08 12:00 to
2026-10-09 12:00 UTC. A completed close exactly at the Base cut is included.
This run applies the production Base Last-40 PF rule to the screen's candidate
histories; it is not a complete runtime or live-account run. The previously
published counterfactual excluded cut-time closes from its full Base sample:
that screen passed 43/3,900 cells, while the cut-inclusive rule passed 45/3,900.
The same 25 configs subsequently validated and the same 37 modeled orders
executed in both comparisons.

At the cut, **25/90 direction contexts (27.78%)** validated, with pooled
historical unit-return PF **2.891881**. During the following 24 hours, the
walk-forward selector recorded **37 modeled closes at PF 0.963800**. Positions
were 17/17/0 and orders 37/37/0 opened/closed-or-settled/held. Normal had 23
closes at PF 0.852229; Trailing had 14 at PF 1.210925. By close reason, 16
expired at the 60-minute hold (PF 0.073752), 6 stopped out, 13 hit TP, and 2
closed at a trailing stop (PF 0.396181). The 5-minute lane's 29 closes had PF
1.553767; the 15-minute lane's 7 had PF 0.290014; one 1-minute close lost.
These small, overlapping retrospective samples do not prove lasting performance.

The candidate screen's 74 closes at PF 0.805556 are not the same execution
sample. An independent candle audit reconciled its identities, one-time costs,
hold lengths, TP, stops and prior-bar trailing stops. The separate selector
replay joined all 37 executed closes to their exact validated configuration,
symbol, side, entry, exit and source-tape return. Both use bar-based modeled
execution and cannot establish actual intrabar venue sequencing.

The other strategy types were not enabled in this replay. The detailed report
lists them as unmeasured. An older, separate 5-minute Short funded-model study
had 10,439/14,702 configs validated (71.00%) at historical PF 4.570829,
followed by 135,811 funded-modeled closes at PF 0.274964. Its Normal,
Trailing, and trailing-only PFs were 0.312, 0.296, and 0.232 respectively;
its `trail` closes alone had PF 5.021 and its time exits PF 0.081. It used a
180-minute maximum hold and excluded Historic Exit, Signal, DCA and Axis. See
`../low-range-research-20261027/EXIT-AND-COHORT-AUDIT.md` for the detailed
cohort and cost decomposition. These studies cannot be combined into one PF.

## Changes and limitations

Base Last-N defaults to 40, with 0 disabling it; each computed Base cell needs
its own recent-close evidence, and missing, stale, invalid or unordered
evidence fails closed. Worker, local and preset Base paths carry the same
proof. The Last-N sample floor permits a partial sample only at the configured
floor, and the optional loss prior uses the cell's stop. Validation Last-N
defaults to 12; the x01 validation minimum is 12, while stricter saved choices
remain intact. Signal and Exit-specific settings still have their own policies;
this does not assert that every DCA, Axis, Signal, or Historic Exit config has
been separately tested on a 40-close Base history. Do not reuse old Base proof
without recomputing it against the original data and economic settings.

Trailing-only candidate deduplication previously collapsed distinct minute caps
when their reference-bar holds were equal; 10 and 15 minutes can differ on 1m
and 5m lanes. The key now retains the cap until the effective lane hold is
known. The reproduced regression failed before and passed after the change.
This does not establish that the defect caused the PF decline in these studies.
DCA uses its own target/stop/hold path rather than the Normal trailing grid;
Axis managed exits have their own rules. Historic Exit is a separate opt-in
category and does not control another config's exits.

The requested per-step hold switches/sliders and per-config automatic hold
optimization remain unimplemented. Every nonempty arm in the earlier Micro
hold-cap comparison lost forward; it did not identify a profitable default.
Actual exchange fills, fees, positions and stop/target ownership remain
unmeasured. No running instance, host settings or exchange was changed here.

## Reproduce and inspect

The protocol seals the feed and economic source hashes. The research artifacts
in `screen/` and `walkforward/` include machine-readable data and compressed
order ledgers. With the same code and feed:

```sh
node --experimental-strip-types --no-warnings scripts/low-range-short-24h-research.mjs NEW_SCREEN --window-screen --orders --base-last-n=40 --valid-last-n=12 --production-base
node --experimental-strip-types --no-warnings scripts/low-range-base40-runtime-replay.mjs NEW_WALKFORWARD NEW_SCREEN
node --experimental-strip-types --no-warnings scripts/audit-low-range-screen-orders.mjs NEW_SCREEN
node --experimental-strip-types --no-warnings scripts/render-base40-trailing-audit.mjs AUDIT_DIRECTORY NEW_REPORT.html
```

The 122-case targeted trailing/TP/SL, restart, Signal, DCA, Axis, Historic Exit
ownership and paper audit passed. Base Last-N, worker/local, preset, settings,
API and cohort checks are recorded in the handoff. Full release CI must be
checked on the resulting commit; never infer live profitability from a pass.
