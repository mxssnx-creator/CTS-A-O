# Stable high PF after the Base validation, October 2026 — protocol 7 (frozen 2026-10-11T19:55:27Z)

Supersedes nothing; adds the metric and the acceptance rule the operator set on 11 Oct: from the Base validation onward, the
PF of the sets that are validated and then placed must stay stable, must not fall, and should rise. Frozen before any
variant below is run. Windows, halves and the judge rule of PROTOCOL-3 and PROTOCOL-5 apply.

## Metric (fixed)

- The realized PF of the orders placed by validated sets (the executed trades of the run), per range, at the stored 0.2 %
  round trip. Pooled over the five causal 48 h D1 windows (2026-09-29 11:00Z to 10-09 11:00Z), each trade counted once in
  the window its entry falls in.
- D1a (choose): entries before 2026-10-04 11:00Z. D1b (judge): entries from that time.
- Stability: the 8 h blocks (by entry time) with at least 3 orders; the share of blocks with PF ≥ 1.

## Acceptance (the operator's rule)

- A change is kept only if the realized PF on D1a and on D1b stays at or above the baseline and orders rise or hold.
  A change that lowers PF on either half is recorded and not kept. No re-selection on D1b.
- A change that raises PF in every half but conflicts with an operator decision is not made a default; it is put to the
  operator with its numbers (engine direction acceptance is the case, 11 Oct).

## Baseline (as run, 11 Oct, from the five windows)

- orders 3,918; PF D1 0.33, D1a 0.47, D1b 0.24.

## Variants (fixed here, each a single change against the baseline, then the best stacked)

- S1: shrunk ranking. Rank validation candidates by PF shrunk toward 1 with K pseudo-closes (K = 10 and K = 25).
- S2: hysteresis. A validated config stays seated for the next step while its realized PF over its last N executed closes is
  at least 1.0 (N = 10).
- S3: out-of-sample lookback. A config validates only when both halves of the 96 h lookback reach the range's PF (the Base
  half-check's model).
- Engine direction acceptance off, the operator's candidate (already measured, PF 0.33 → 0.46 on D1; passes every half).
- Stacking: the best single variant is stacked with the others, and the stack is kept only by the acceptance rule.

## What is not in this protocol

- Changes to the indication set (Step 3 of the approved plan) are a separate protocol (PROTOCOL-8), frozen before its run.
- The desk is not changed by any variant here.
