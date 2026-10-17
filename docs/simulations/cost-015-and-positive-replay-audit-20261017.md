# 0.15% cost and positive replay audit — 17 October 2026

## What was compared

The 0.15% modeled round-trip cost was tested as a replay setting (0.05% taker
fee plus 0.025% slippage per side). These archived runs did not change
production defaults. The
two full-engine replays use the same four-symbol cached feed
(ATOM-USDT, APT-USDT, NEAR-USDT, DOT-USDT), 48 h evaluated config history,
24 h trading window, 37-pair historical focus, coordination settings,
corrected range PF floors, $10 balance, 10× leverage, and 0.75× per-position
/ 7× gross exposure caps. Their account sizing differs: the 0.20% run uses
2% of balance per order unit; the 0.15% run uses 0.1%. The 20× sizing
change affects allocation and funded-cohort membership (20 zero allocations
versus none), so these results do not isolate the cost change. The previous
claim that only costs changed was incorrect.

| Cost | Funded closes | Return / base-$1 PF | Sized-dollar PF diagnostic | Closed net | Green / red / flat hours |
|---|---:|---:|---:|---:|---:|
| 0.20% | 572 | 0.483424 | 0.600055 | −$0.295683 | 7 / 6 / 11 |
| 0.15% | 1,327 | 0.712008 | 1.391965 | +$0.093060 | 11 / 7 / 6 |

At 0.15%, closed balance rose from $10 to $10.093060. Marked equity ended at
$9.961860 because 682 orders remained open with −$0.131200 MTM. The 24-hour
window was not consistently profitable: seven active hours were red and the
unit-return PF stayed below 1. Cash PF above 1 does not reverse that result.
Costs changed Base qualification and execution membership, while different
sizing also changed allocation. This is a comparison of two policies, not an
isolated cost experiment or a per-trade subtraction on an unchanged cohort.

The 0.15% run processed 794 engine Base pairs; 105 passed. It built 54,191
config tapes. At the run start, configEval evaluated 41,756 engine configs
and passed 1,580. The later paper/current selection snapshot contained 403
engine configs plus 4,488 Signal configs. That snapshot was previously
mislabeled as initial Real seats; the archived raw dump does not record the
first simulated-step selection separately. The Signal count describes the
paper snapshot's config representation, not independently passing config
checks or funded orders. The final funded ranges were:

| Range | Funded closes | Return PF | Closed net |
|---|---:|---:|---:|
| Micro | 70 | 2.331322 | +$0.014562 |
| Minimal | 833 | 2.018576 | +$0.127443 |
| Short | 54 | 0.000000 | −$0.020720 |
| General | 121 | 0.003512 | −$0.023415 |
| Long | 59 | 0.000000 | −$0.014237 |
| Wide | 4 | no losses (finite gate score 4) | +$0.001259 |
| Signals | 186 | 1.983346 | +$0.008167 |

This identifies the material failure after Base: Short, General and Long
passed some Base checks (20/89, 16/89 and 12/89 respectively) but their funded
execution cohorts were losing. Recorded execution skips include symbol-PF
vetoes (Short 13, General 15, Long 26) and duplicate suppression (Short 13,
General 4); Signal skips include 680 validation, 827 cluster and 405
confirmation rejections. These are useful diagnosis counts, not evidence that
the gates should be relaxed. The saved range minimums were Wide 1.00, Micro
1.05, Minimal 1.10, Short 1.10, General 1.20 and Long 1.30.

## Screenshot reconciliation

The earlier positive run used a **336 h config-selection window**, confirmed
by its recorded `evalRule.preH=336` and `ddtMaxH=163.333333`. The later
37-pair replay explicitly sets `wf.longH=48` (`ddtMaxH=23.333333`), while
both reports describe 48 h of prehistory. They therefore do not use the same
config evaluation sample or drawdown-time limit. Historical run-start
configEval passed 2,857 of 32,204 evaluated configs, with nine first failures
for insufficient closes. In the later 0.20%/48 h run it passed 1,260 of
31,724, with 23,479 first failures for insufficient closes. This history
mismatch materially changes qualification; the difference cannot be
attributed only to corrected range PF floors, caps or code regressions.

The archived positive 24-hour raw replay reproduces 2,184 funded orders,
Return PF = base-$1 PF 4.723109, sized-dollar PF diagnostic 2.024519, and
closed net +$0.445260 at the saved 0.20% cost. It is a separate capped
four-symbol sample with 2,169 engine closes and 15 Signal closes. Its Signal
PF is 0.030867. The screenshot row “Signals 43 / PF 51.27” cannot belong to
that run: the order counts do not reconcile. The screenshot's hour summary
also differs from the saved raw run (saved replay recomputes 14 green, 4 red,
6 flat hours). The old positive headline is retained as a valid result for its
own saved raw cohort, not as proof of current-floor or 20-symbol performance.

The report labels now distinguish Return PF / equal-$1 PF from the
allocation-weighted sized-dollar PF diagnostic. For the historical positive
run, these are 4.723109 and 2.024519 respectively. The PF arithmetic is
consistent; the old label “cash PF diagnostic” was easy to misread as the
equal-$1 value. Generated reports also say “applied Base PF floor” so an old
dump whose range floors were stripped is not presented as if the configured
floor had actually been used.

## Scope and checks

The full-engine cached feed used for these archived runs has four symbols. A separate repository
research report covers 40 symbols over 20 days in a lean 1-minute pipeline;
its held-out PF was 0.4605 on 83 closes at 0.20%, and it is not a substitute
for a full-engine 20-symbol replay. These artifacts do not contain a 20-symbol full-engine feed or result, so no
20-symbol runtime result is claimed here. The user
requested new indications and coordination research; this pass did not add
unvalidated strategies or weaken gates on the same sample. Existing indication,
range, coordination, activity and history dimensions remain in the generated
reports for follow-up on a predeclared larger feed.

The corrected 0.15% capped replay passed 66/66 consistency checks. The exact
historical positive replay passed 58/58. Focused Return PF / $ PF accounting
tests passed 34/34, including equal-notional PF matching and the separate
sized-dollar diagnostic. Node syntax and `git diff --check` pass. These are
offline simulated results only; no live orders or exchange settings changed.

## Reproduction artifacts

- Matched 0.20% result: `runs/positive-24h-pf-recalc-20261017/matched-focus/html/data.json`.
- Matched 0.15% result: `runs/positive-24h-pf-recalc-20261017/cost015-matched37-capped-html/data.json`.
- 0.15% Markdown summary: `runs/positive-24h-pf-recalc-20261017/cost015-matched37-capped-summary.md`.
- Reconciled positive historical report: `runs/positive-24h-pf-recalc-20261017/positive-historical-corrected-html/index.html`.
- Frozen candle source: `runs/trailing-range-hourly-20261016/feed.json`.
- Settings snapshot: `runs/positive-24h-pf-recalc-20261017/matched-focus/desk-settings-cost015.json`.
