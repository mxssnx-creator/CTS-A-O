# Range families for Short, General and Long — protocol 8 (frozen 2026-10-13, before any family run)

The operator's 13 Oct request: indications "with special multi calcs and situations, relations", Micro and Short working
with a high Base pass rate, high PF after Base that holds. PROTOCOL-7's windows, halves and keep rule apply.

## What is tested (fixed here)

The 17 indications of `src/core/indications/range-families.ts` (commit 6843660):

| group | ids |
|---|---|
| confluence | `cfl-trend-20`, `cfl-trend-50`, `cfl-break-20`, `cfl-break-55`, `htfpb-4`, `htfpb-8` |
| situations | `rgm-20`, `rgm-50`, `cmpx-100`, `cmpx-250`, `orb-asia`, `orb-eu`, `orb-us` |
| relations | `rel-str-12`, `rel-str-48`, `rel-div-12`, `rel-div-48` |

Focus pairs: the `follow` bot on each id, on the lanes Short / General / Long trade (15m, 15m combined, 30m):
`follow|<id>@m15`, `follow|<id>@m15c`, `follow|<id>@m30` — 51 pairs, added to the default focus (16 pairs) and pinned
list (24). The families encode their own direction, so `revert` is not added. No parameter is tuned after the first run.

## Metric

- Base: pairs evaluated and passed per range (Minimal, Short, General, Long), summed over the windows
  (`scripts/eval-gate.mjs` summary `baseByRange`), and the families' own pairs among the passed.
- Realized PF of the executed orders at the stored 0.2 % round trip, pooled over the five causal 48 h D1 windows
  (2026-09-29 11:00Z to 10-09 11:00Z); D1a (choose) before 10-04 11:00Z, D1b (judge) after. The holdout (09-24 13:00Z
  to 09-29 11:00Z, split 09-27 00:00Z) as a second judge.
- Per family: its executed orders and their PF (from the trades' config ids), per half.

## Runs

1. Baseline: the code at the run's commit, default settings, feed120, 120 symbols, lastN 15.
2. Families: the same with the 51 focus pairs added (`--settings '{"focus":[…16 default…, …51…]}'`).
3. Selection on D1a only: the families whose own orders reach PF ≥ the baseline's D1a PF with at least 30 orders on
   D1a. Run 3 = the baseline plus only those families' focus pairs, judged on D1b and the holdout.

## Keep rule

- A family set becomes default focus only if, against the baseline, realized PF holds or rises on D1a, D1b and both
  holdout halves, and orders hold or rise. Otherwise the families stay registered (evaluable through `focus`) and the
  result is recorded in PF-SEARCH.md.
- No re-selection on D1b or the holdout.

## Not in this protocol

- Lever changes for Micro / Short Base pass rates (Step 2 of the plan) are measured in their own runs (PF-SEARCH.md).
- The desk is not changed by any run here.
