# SL and minimum-stop drawdown audit — 18 October 2026

## Decision

No global SL ratio or minimum-stop default is changed. The available forward
evidence does not identify one ratio that is best at all timeframes, and the
same-feed 6 h replay did not produce funded post-Base orders from which to
measure account-equity drawdown. Tuning a stop against its zero-order DD would
be meaningless.

The audited tighter-stop trial set the generic grid minimum from 1.0% to 0.5%
and the generic SL ratios to 0.75×/1.0× TP. It left the universal 0.5%
evaluation/protection floor in place. It did not change Base admissions or the
reported post-Base Short, General and Long range cohorts: those ranges have
independent SL ladders and minimums. Both baseline and trial replayed the same
12-symbol cached feed on 17 October, with 6 h simulated and six hours of
pre-history, limited to four symbols for the completed run. Both processed 214
Base pairs, admitted 54, and produced zero funded orders, so PF and account DD
are unavailable. A 12-symbol full-history attempt hit the runner's memory
guard and was not scored.

## Existing SL evidence

The recorded 90-day holdout sensitivities are mixed:

| timeframe | SL ratio sensitivity | min-SL sensitivity |
|---|---|---|
| 1m | PF 0.42 at 0.75×, rising to 0.46 at 2.5× TP | PF 0.44 across 0.08%–0.26% |
| 15m | PF 0.74 at 0.75×, rising to 0.77 at 2.5× TP | PF 0.76 across 0.30%–1.00% |
| 1h | PF 0.69 at 0.75×, falling to 0.63 at 2.5× TP | PF 0.66 across 0.60%–2.00% |

These are pooled unit-return PF sensitivities, not equity-DD comparisons. The
1m and 15m results favor wider stops; the 1h result favors tighter stops. The
minimum distance had little PF effect in these tests. Existing `EVAL_MIN_SL`
remains 0.5% because the project recorded 0.1%–0.2% Micro stops being inside
ordinary noise and a zero win rate. This audit does not weaken that floor or
the PF gates.

## Verification and test corrections

- Fixed a regression expectation to normalize range targets by their fixed
  0.20% construction basis, not the separately updated 0.15% modeled round-trip
  cost.
- Fixed the auto-adjust execution test's tape fixture to include its required
  bot, indication and protect identity.
- SL/range protection, Micro, defaults, regression and auto-adjust suites:
  **100/100 passed**.
- TypeScript typecheck and `git diff --check` passed.
- The full core suite was started but not completed; the focused run caught and
  resolved its auto-adjust fixture failure.

Next valid SL comparison requires an identical market window with funded
post-Base executions in both arms, exact config-level SL identities, and
minute-marked account equity. Retain the configured stop floors and PF gates
until that comparison exists.
