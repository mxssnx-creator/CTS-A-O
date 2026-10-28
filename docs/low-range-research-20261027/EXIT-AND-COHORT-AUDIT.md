# Exit ownership and the 19 October 5m PF comparison

The 20-symbol capped replay from 19 October 00:00 to 20 October 00:00 UTC did **not** enable Historic Exit. Its frozen protocol, walk-forward toggles and saved effective settings each have Exit off; Signals, Block, DCA and Axis were also off. The observed funded sample comprises Short-range Normal, Trailing and trailing-only modeled orders. The separately examined mixed 150-hour expanded replay enabled Historic Exit but passed **0 of 40 Exit Base pairs**, so it executed no Historic Exit configurations. Neither replay shows Historic Exit closing another strategy's order.

An additional exact-cohort audit independently joined every funded settled row to the saved source tape with the same complete configuration ID, symbol, side, entry time, exit time and unit return. It matched **135,811 of 135,811** closes across 11,943 executed config tapes, with no missing or mismatched closes; all were Short range. It excludes the 9,052 known-zero allocations. This verifies the identities and returns stored by the replay; the source tape and execution share the same simulation assumptions, so it does not establish correct intrabar exchange sequencing, actual order fills, or live parent isolation. In the sealed source at `582e209`, each config is simulated with its own protection before accepted trades are materialized from that config's tape. Portfolio caps can affect funding and admission, and are not independent venue orders.

## What the two PFs compare

The initial cut evaluated 14,702 Base-admitted config tapes. **10,439 (71.00%)** passed and their pooled historical unit-return PF was **4.570829**. The later 24-hour funded-settled PF was **0.274964**, on 135,811 orders. They describe different periods and the run reevaluated configurations hourly: the initial passing set was not frozen for the full day.

### Where the PF changes during progression

The progression receipt records all 24 hourly decisions. It begins at
**2026-10-19 00:00 UTC** with the 10,439/14,702 initial post-Base pass set
(71.00%; historical PF 4.570829). The later funded closes from that same
initially passing config set, grouped by settlement hour, were:

| Settlement hour (UTC) | Funded settled closes | Unit-return PF |
| --- | ---: | ---: |
| 00:00–01:00 | 501 | 0.000 |
| 01:00–02:00 | 2,665 | 5.718 |
| 02:00–03:00 | 19,084 | 1.149 |
| 03:00–04:00 | 14,554 | 0.126 |
| 04:00–05:00 | 21,859 | 0.319 |
| 05:00–06:00 | 36,156 | 0.049 |

Across all later closes from the initially passing set, the exact-config
partition is **121,962 closes, PF 0.283614**. Thus the change is already
visible after initial validation, in forward model settlement; it is not
explained by the 4,263 configs that failed at the initial cut and passed a
later hourly evaluation. The hourly ledger still applied each config's
rolling decision and recorded entry-direction checks; this is not evidence
that a historic winner will remain a future winner.

### Which close ended each position

The archived raw session was recovered at
`runs/low-range-continuity-final-oct19-5m-capped-20261027/raw.json`. The
close-reason audit matched all **144,863** report rows to the raw tape in order,
including 135,811 positive allocations and 9,052 zero allocations. Funded
price returns reconstructed from entry and exit prices within 0.001141 bp at
worst, and the funded totals reconcile to the saved runtime-step detail. Raw
header SHA-256: `1c2f7e39b7798891b278b23a61e8d3ac966c32fc159ed4e9d3d9aae4ae0e312b`.

| Close reason | Funded closes | Share | Unit gains | Unit losses | Return PF | Mean net bp/order |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Target (`tp`) | 12,604 | 9.28% | 89.828000 | 0 | No losses | +71.27 |
| Stop (`sl`) | 23,522 | 17.32% | 0 | 278.136237 | 0 | −118.25 |
| Trailing stop (`trail`) | 24,466 | 18.02% | 46.168250 | 9.195256 | 5.021 | +15.11 |
| Hold expiry (`time`) | 75,219 | 55.38% | 23.857144 | 294.029306 | 0.081 | −35.92 |
| Total | 135,811 | 100% | 159.853395 | 581.360799 | 0.275 | −31.04 |

Time exits and ordinary stop exits account for **98.42% of gross unit losses**.
For the exact initially-passed cohort (121,962 later closes, PF 0.283614),
there were 67,839 time exits (PF 0.0799), 19,226 stop exits (PF 0), 23,574
trailing exits (PF 5.058) and 11,323 target exits (no losses). The same forward
failure is therefore present inside the configs that initially passed; later
config turnover does not explain it.

All three strategy kinds lost over the funded window: Normal 23,872 closes,
PF 0.312; Trailing 55,194, PF 0.296; trailing-only 56,745, PF 0.232. Every
funded time exit had exactly 36 five-minute bars, matching the configured
180-minute maximum hold. None of the 23,522 funded `sl` closes had a recorded
maximum favorable excursion that reached its configured target, so the
stop-first tie-break on a bar touching both stop and target does not explain
this stop-loss cohort.

In the simulator, each config's own position is closed in
`src/core/sim/backtest.ts`: the close recorder is at line 415; long/short
stop-target checks are at lines 469–482; hold expiry is at lines 485–487. A
touched stop is `sl` before its trail is armed and `trail` after it is armed; a
target is `tp`; an open position that reaches `p.hold` closes as `time` at the
bar close. Stop is checked first if both barriers touch in the same bar. This
replay has Historic Exit disabled, and the exact tape join found no
simultaneous stop/target touch among the funded `sl` exits. The audit still
shares the simulator's candle-path assumptions; it does not certify actual
venue fills.

The fixed-path decomposition also finds mean net return **−31.04 bp/order**;
adding back the one modeled 15 bp cost while holding observed entries/exits
fixed still leaves **−16.04 bp/order**. Therefore transaction cost contributed
to the loss, but the observed price path contributed more. This is an
arithmetic reconstruction, not a counterfactual zero-cost strategy run.

The fixed-path audit reports funded closes, gains, losses and PF by `tp`, `sl`,
`trail` and `time`, split by strategy kind, target step, direction and the
config's first post-Base verdict. Future reports now retain each order's close
reason and strategy kind beside its allocation; the independent session audit
checks those fields against the raw tape when present.

The audited partition uses each exact config ID's first recorded pass/fail verdict, not a whole-pool or symbol-only match. It groups every later funded settled close by that config's initial verdict; the later entry-time validation and direction gates remain as recorded. It reconciles counts, gross gains and gross losses to the existing full progression and allocation receipts:

| Initial verdict | Initially evaluated configs | Configs with funded closes | Funded settled closes | Unit gains | Unit losses | Later PF |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Passed | 10,439 | 10,105 | 121,962 | 145.642547 | 513.524433 | 0.283614 |
| Failed | 4,263 | 1,838 | 13,849 | 14.210847 | 67.836366 | 0.209487 |
| Combined | 14,702 | 11,943 | 135,811 | 159.853395 | 581.360799 | 0.274964 |

The second row consists of configs that passed a later rolling evaluation before their funded entries. Cohort turnover means the initial PF and later pooled PF are not the same config set, but it does not explain away the loss: the initially passing subset itself had later PF **0.283614**. This is a config-level partition; it does not assert that every later symbol and direction was qualified at the initial cut. A previously completed independent progression audit checked 352,848 recorded step decisions and all funded entry-time direction checks against each config's own tape.

The [fixed-path cost audit](FIXED-PATH-COST-ANALYSIS.md) found an equal-order mean of **−31.04 bp net**. Adding back the modeled 15 bp round-trip cost while holding the observed entries and exits fixed gives **−16.04 bp**. Thus both the observed price path and the modeled cost contributed to the negative result in this sample. This arithmetic is not a no-cost rerun: changing cost can change stops, qualification, entries and funding. The short, already examined historical window, overlapping strategies and changing market regime are plausible limits on forward generalization; these data do not isolate a single causal mechanism or prove future performance. The input is Binance USD-M candles, while the live venue is BingX.

## Mixed synthetic ownership test

`src/core/sim/mixed-exit-ownership.test.ts` is a deterministic offline fixture for both long and short. It supplies separately admitted Base sets and passing planted histories, simulates a Historic Exit and an ordinary Short parent opening on the same symbol and bar, runs both through mixed walk-forward selection/execution, and assigns each a positive fixed modeled unit with `sizeBook`. The Exit's own stop closes first while the ordinary parent reaches its own later target. Disabling one Base admission or making Exit's own history fail leaves the other parent's result unchanged; changing Exit's stop changes its own result without altering the ordinary close.

This test supplies its Base verdicts and uses synthetic prices. It does not fit Exit from market history, run the capped report allocator, prove venue-side atomicity, or establish profitability. Existing `exit-strategy.test.ts` separately exercises the real historical fitter and candidate qualification on planted data.

## Reproduce

The full raw run and its checksummed sidecars must be present; committed summaries alone are not enough to rerun tape parity. From the repository root, with `RUN` set to the original capped run directory:

```sh
node --experimental-strip-types --no-warnings scripts/audit-simulation-parity.mjs "$RUN/raw.json" /tmp/lowrange-tape-parity.json
node --experimental-strip-types --no-warnings scripts/audit-low-range-cohort-turnover.mjs "$RUN" /tmp/lowrange-cohort-turnover.json /tmp/lowrange-tape-parity.json
node --experimental-strip-types --no-warnings scripts/low-range-fixed-path-cost.mjs "$RUN"
node --experimental-strip-types --no-warnings --test scripts/audit-low-range-cohort-turnover.test.mjs
node --experimental-strip-types --no-warnings --test scripts/low-range-fixed-path-cost.test.mjs
node scripts/test-core.mjs src/core/sim/mixed-exit-ownership.test.ts
```

The [cohort receipt](runtime-195-5m-capped/cohort-turnover-audit.json) records the protocol, source, raw header and audit-input hashes, the exact parity totals, and its own audit-script hash. It checks the earlier progression audit against its recorded SHA-256, checks the frozen Exit-off settings in the protocol and raw header, and fails on missing clocks, duplicate configs, unknown allocations or unreconciled totals. The underlying replay remains retrospective and is not a fresh holdout or live-performance guarantee.
