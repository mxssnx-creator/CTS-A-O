# Break review — 17 October 2026

Validated source diff: `fix: score Break market relations prior-only`, verified locally as `dd5a2e3`.
Applied to the PR #155 branch `feat/break-micro-short-channel-20261017`, whose pre-change files match the tested local parent tree.

## What changed

- Break's rolling market beta, volatility and residual baselines now use the 60
  completed returns before the bar being evaluated. The current return is only
  scored against that history; it no longer dilutes its own market-relative
  z-scores.
- The per-config trend check no longer allocates a `Map`, and hot-path finite
  checks no longer allocate rest-parameter arrays.
- Replay coverage now compares seatable tapes to `kept` set counts and excludes
  held-only tapes, which are carried to close existing positions but cannot be
  seated as new configs.
- Added a hand-calculated regression for prior-only market and residual z-scores.
  The existing Break grid remains 144 IDs: 60 Micro and 84 standard, with five
  source types, 1/5/15-minute trend subsets, 24/48-bar drawdown windows and two
  activity/risk profiles.

## Matched 24-hour replay

Offline cached-feed replay, 24 hours of prehistory plus 24 hours of trading,
signals off, one worker, identical costs and sizing. The requested 12-symbol
feed was not available: the only cached feed contains nine actual symbols, so no
synthetic symbols were substituted.

| Arm/window | Base pairs passed | Funded orders | Return PF | Cash PF diagnostic | Net cash | Equity max DD | Positive hours |
|---|---:|---:|---:|---:|---:|---:|---:|
| Legacy 4 IDs, Oct 12–13 | 5 / 20 | 1,593 | 0.174 | 0.548 | −$39.87 | 11.40% | 6 / 24 |
| Updated 60 Micro IDs, Oct 12–13 | 8 / 60 | 11,851 | 0.447 | 0.660 | −$43.10 | 9.67% | 6 / 24 |
| Updated 60 Micro IDs, Oct 13–14 | 21 / 60 | 31,149 | 0.325 | 1.772 | +$44.37 | 8.87% | 7 / 24 |

The updated arm generated 7.4× the legacy order count and improved primary
return PF on the matched Oct 12–13 day. Its net loss was $3.22 larger. Both days
remain below return PF 1.0; the positive cash result on Oct 13–14 came with a
0.325 return PF and must not be treated as unit-level profitability evidence.
The hourly target is also unmet: 16 of 24 hours lost on Oct 12–13 and 17 of 24
lost on Oct 13–14.

An adjacent Oct 11–12 replay had zero Base-passing pairs, seats or orders. This
is a valid no-trade gate outcome, not a profitable or scored result.

## Losing hours and config diagnosis

Updated Oct 12–13 funded-book hours with the largest cash losses:

| UTC exit hour | Funded orders | Return PF | Net cash |
|---|---:|---:|---:|
| 14:00 | 2,363 | 0.370 | −$35.10 |
| 22:00 | 339 | 0.050 | −$9.30 |
| 16:00 | 825 | 0.342 | −$8.84 |
| 15:00 | 153 | 0.000 | −$6.77 |
| 21:00 | 1,699 | 0.118 | −$3.32 |

Eight configs passed Base on Oct 12–13; all were Balanced 5-minute Micro
anchors (Donchian, 8-bar Donchian, retest and 8-bar retest, each with 24/48-bar
drawdown). No Guarded profile or 15-minute/combined anchor passed. Pooled
virtual tape diagnostics in the loss hours show:

- At 14:00, the retest and 8-bar retest Trailing groups had no winning virtual
  closes in several DD variants; Donchian and 8-bar Donchian Trailing groups had
  PF about 0.30–0.33.
- At 16:00, Donchian/8-bar Donchian Trailing groups had PF about 0.26–0.30.
- At 21:00, Donchian/8-bar Donchian Trailing groups had PF about 0.09–0.12;
  the larger retest groups were also negative.

Those source-by-hour numbers are unit-return **virtual tape** diagnostics,
including closes that did not receive funding allocation. They are not cash
results and were not used to select a replacement config.

Across the funded Oct 12–13 portfolio, Trailing contributed 7,248 orders at
PF 0.342 and −$40.64; Normal contributed 4,356 at PF 0.628 and −$0.17; DCA
contributed 247 at PF 0.679 and −$2.29. This identifies Trailing as the main
loss source in that window, while leaving strategy-specific causality unproven.

### Trailing-off ablation

| Window | Trailing | Orders | Return PF | Net cash | Equity max DD | Positive hours |
|---|---|---:|---:|---:|---:|---:|
| Oct 12–13 | On | 11,851 | 0.447 | −$43.10 | 9.67% | 6 / 24 |
| Oct 12–13 | Off | 4,385 | 0.589 | −$27.78 | 8.53% | 6 / 24 |
| Oct 13–14 | On | 31,149 | 0.325 | +$44.37 | 8.87% | 7 / 24 |
| Oct 13–14 | Off | 13,100 | 0.329 | +$19.77 | 10.55% | 7 / 24 |

Disabling Trailing helped the first window but did not raise PF meaningfully in
the adjacent window and increased its drawdown. Defaults remain unchanged; this
ablation does not establish a profitable setting.

## Performance and verification

- Updated 60-ID Oct 12–13 run: about 2.26 seconds reported compute and 461 MB
  peak RSS. On Oct 13–14, with 21 Base-passing pairs and 12,319 tapes, compute
  was about 4.23 seconds and peak RSS was 803 MB. The 12-symbol memory/runtime
  profile remains unmeasured.
- Updated replay checks: 55/55 on Oct 12–13 and 55/55 on Oct 13–14. The two
  trailing-off ablations passed 53/53 each. The older Oct 11–12 no-seat replay
  exposed a false activity-coverage failure; the corrected empty-run path is
  covered by the 53/53 post-fix comparisons below.
- Focused indication, market, Micro, pipeline and range tests: 97/97 across 15
  suites. Break-specific tests: 9/9.
- `npm run typecheck -- --pretty false`, `npm run build:dev` including core
  worker packaging, `git diff --check` and scoped ESLint passed. ESLint reports
  one pre-existing unused `byEntry` warning in `scripts/core-session.mjs`.
- Replays were offline under the network guard. No venue order, live execution
  or deployment was attempted. The Break performance target is not met, so these
  results do not qualify the family for live promotion.

## Decision

Keep the code-level correction and replay coverage fix. Keep current strategy
defaults and the 144-ID grid; do not promote configs based on these short,
negative unit-PF windows. A genuine 12-symbol feed and longer untouched
walk-forward windows are needed before making a positive performance claim.

## Post-fix empty-run audit — 17 October

I repeated the matched 9-symbol Micro Break comparison after fixing empty-sample
PF reporting and no-admission session checks. The evaluation and trade windows,
fees, sizing and qualification gate are unchanged: six
evaluation hours (2026-10-14 16:00–22:00 UTC), then six simulated hours
(22:00–2026-10-15 04:00 UTC), minimum 12 Base closes and return PF ≥ 1.10.

| Arm | IDs | Base pairs evaluated / passed | Orders | Return PF | Hourly closes (22, 23, 00, 01, 02, 03 UTC) | Symbols covered | Audit checks |
|---|---:|---:|---:|---:|---|---:|---:|
| Legacy | 4 | 20 / 0 | 0 | Unavailable | 0, 0, 0, 0, 0, 0 | 9 / 9 | 53 / 53 |
| Updated | 60 | 60 / 0 | 0 | Unavailable | 0, 0, 0, 0, 0, 0 | 9 / 9 | 53 / 53 |

The Base rejection is real: every pair missed the minimum-close gate on this
short sample. There are no funded or virtual closes to score, so PF, win rate
and positive-hour rate are unavailable; they are not zero. The unchanged gate
was not weakened to force orders. This result says the window could not qualify
Break configs, not that the PF calculation returned a measured PF of zero.

The audit fixes were:

- Empty close samples now have null measured PF in Base, simulation, connection,
  prehistoric and saved-preset reporting. Runtime status and logs say
  “unavailable” rather than “0.00”; the internal no-loss score remains
  available for qualification and is labeled separately.
- If Base rejects every pair, symbol coverage is measured from the processed
  candle universe, not from the empty set of admitted tapes. Empty strategy and
  range coverage is accepted when there are no kept configs.
- Session checks now require complete unit-return evidence for the primary PF;
  unknown return units fail the audit instead of being silently omitted.
- Regression tests cover empty Base, saved-preset, runtime-PF-label and
  unknown-return paths. The focused Break/pipeline/range/session/reporting/
  preset bundle passed 67/67, TypeScript passed, and the development build
  with packaged core worker passed.

This differs from the earlier broad systemwide 6-hour replay, which had 792
funded closes at return PF 2.374852 and 4/6 positive hours. That replay used a
different focus, symbols, indications and strategy set; it confirms the replay
and PF pipeline can produce nonempty results but does not validate this Break
window. See [`systemwide-pf-volume-audit-20261016.md`](sims/systemwide-pf-volume-audit-20261016.md)
for its hourly and volume breakdown. The Break result is recorded with its
complete hourly table in
[`break-postfix-empty-run-20261017.md`](simulations/break-postfix-empty-run-20261017.md).
