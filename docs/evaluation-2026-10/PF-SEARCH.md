# PF search: results, October 2026

Protocols: PROTOCOL-3 (windows, halves, selection, judge) and PROTOCOL-4 (the Base gate as a lever). Every variant tried is
listed here. The D1 feed (sha256 84c7eb2d40e1…) covers 2026-09-23 to 10-11; D1 is entries 2026-09-29 11:00Z to 10-09 11:00Z.
D1b was already read in aggregate by the earlier runs, so it is not a clean judge; the forward record is.

## 1. How many Base pairs survive the PF gate, and how well it works, per window

Full engine, default settings, five causal 48 h windows (24 h pre-history each). Source: runs/eval/gate/v0-base.json.

| window ends (Z) | Base pairs | survive the gate | survivors that trade | trades | window PF |
|---|---:|---:|---:|---:|---:|
| 10-01 11:00 | 133 | 19 (14 %) | 16 | 1,196 | 0.50 (survivors) |
| 10-03 11:00 | 133 | 17 (13 %) | 8 | 93 | – |
| 10-05 11:00 | 133 | 2 (1.5 %) | 0 | 0 | – |
| 10-07 11:00 | 133 | 12 (9 %) | 4 | 34 | – |
| 10-09 11:00 | 133 | 19 (14 %) | 13 | 2,595 | – |

- The survival share moves from 1.5 % to 14 % between windows, and the trade count from 0 to 2,595. The gate is not a stable
  selector.
- Its ranking has no out-of-window value. Among the survivors of the first window, pre-window Base PF 1.05–1.2 earned a
  window PF of 0.58 (10 pairs) and pre-window PF ≥ 1.2 earned 0.48 (6 pairs).
- The gate cannot be loosened through settings: `minPfOf` clamps each range minimum to at least 1.05. The gate tests below
  are therefore tighter or sample-size variants only.

## 2. The gate as a lever (PROTOCOL-4)

| variant | patch | trades (D1a / D1b) | PF D1 | PF D1a | PF D1b | chosen? |
|---|---|---:|---:|---:|---:|---|
| V0 baseline | none | 3,918 (1,289 / 2,629) | 0.33 | 0.47 | 0.24 | – |
| V1 | minTrades 30 | 2,481 (605 / 1,876) | 0.26 | **0.52** | 0.17 | yes (best D1a with ≥ 30 trades) |
| V2 | range minimums 1.25 | 3,816 (1,203 / 2,613) | 0.33 | 0.49 | 0.24 | – |
| V3 | maxDdr 0.5 | 1,765 (424 / 1,341) | 0.31 | 0.50 | 0.23 | – |

Judge (D1b, PROTOCOL-3 criteria): **V1 fails** (PF 0.17, not ≥ 1.2). None of the four variants moves the D1b PF above the
baseline's 0.24. Tightening the gate lowers the trade count and does not improve what is left. The gate is not where the
out-of-sample loss comes from.

## 3. Engine families (PROTOCOL-3, five 48 h windows each)

Source: runs/eval/*.json (schema 3). PF at the stored 0.2 % round trip.

| family | trades | PF D1 | D1a trades | PF D1a | D1b trades | PF D1b | events |
|---|---:|---:|---:|---:|---:|---:|---:|
| eng revert mn | 1,570 | 0.16 | 194 | 0.32 | 1,376 | 0.15 | 72 |
| eng follow mn | 997 | 0.33 | 314 | 0.56 | 683 | 0.27 | 124 |
| eng follow sh | 407 | 0.58 | 351 | 0.72 | 56 | 0.19 | 75 |
| eng follow gn | 211 | 0.29 | 118 | 0.31 | 93 | 0.25 | 52 |
| eng revert lg | 137 | 0.30 | 137 | 0.30 | 0 | – | 11 |
| eng follow lg | 93 | 0.38 | 93 | 0.38 | 0 | – | 12 |
| eng revert gn | 73 | 0.36 | 73 | 0.36 | 0 | – | 10 |
| eng follow mc, mp, wide; revert mc, mp, sh, wide | 0 | – | 0 | – | 0 | – | 0 |

- No engine family reaches PF 1 on D1 (best: follow sh, 0.58), and none is positive on D1b.
- PF search (scripts/eval-pf-search.mjs, 628 units tried on the 14 families): no unit passes the D1b judge. The closest,
  `eng follow mn | long`, has D1a PF 0.97 and D1b PF 1.44, but on 149 trades in 17 events and with no short trades; it fails
  the events and both-sides criteria.
- Signal families (126): not evaluated in this run. The driver is ready (`--only signal`), but at ~3 minutes per family it
  is about 3 hours at two jobs.

## 4. The 12-hour test simulation of the positive types

Not run: no family has PF > 1 on D1, so the set of positive types is empty and scripts/sim-positive-types.mjs has nothing to
simulate.

## 5. What this means, and what was ruled out

- The engine loses on this window at the 0.2 % round trip. The loss holds in every variant and is concentrated in the
  reverting families (revert mn: 1,570 trades at PF 0.16).
- Ruled out as the cause: the feed (its minute range covers the windows), the performance changes (the parent commit gives
  the same trades), and the Base gate's threshold and drawdown settings (all four variants give D1b PF 0.17–0.24).
- Found and fixed in the evaluation (not in the engine): a 240 h causal run stops trading after its first days, because the
  causal Base is frozen at the run start. The family results of that design are kept as invalid in runs/eval-240h-invalid/.

## 6. Next, and what needs a decision

- The Base gate is not a PF lever on this data. The next candidate lever is a different Base statistic: the pre-window PF
  needs a sample floor and a consistency test (pass in both halves of the pre-window, or in k of N sub-blocks). That needs a
  code change and a unit test first; it is not run here.
- Signal families (126) are not evaluated. Running them is the next evaluation, at about three hours on two jobs.
- Any change to the desk's defaults needs a causal comparison recorded in docs/positive-coordinations.md and the operator's
  approval.

## 7. Ranges and order count (PROTOCOL-5, five 48 h causal windows, engine only unless noted)

| variant | orders | PF D1 | PF D1a | PF D1b |
|---|---:|---:|---:|---:|
| V0 baseline | 3,918 | 0.33 | 0.47 | 0.24 |
| V1 Micro range on (`grid.micro` = MICRO_RANGE) | 8,600 | 0.42 | 0.55 | 0.19 |
| V2 range gate minPf 1.0 (`grid.rangeGate`) | 4,194 | 0.33 | 0.47 | 0.24 |
| V3 V1 + V2 | 9,770 | 0.44 | **0.57** | 0.20 |
| V4 minTrades 6 | 5,283 | 0.37 | 0.47 | 0.24 |

- Selection (best PF on D1a with ≥ 30 trades): V3. Judge (D1b): PF 0.20, fails. No variant passes.
- Per range, V3: Minimal 8,951 orders (PF D1 0.43, D1a 0.60, D1b 0.20); Short 382 (D1b no trades); Long 234 (D1b no
  trades); General 187 (D1b no trades); Micro 16 (PF 9.00 on no losses, D1b only).
- Micro: Base passes Micro-lane pairs (140 survivor entries over five windows), but only 16 Micro orders trade, even with
  the range gate at 1.0. The block is between Base and the seats in the Real stage. Not yet diagnosed.
- Wide: Base passes 4 pairs and seats none in the windows measured.
- Order count and PF trade off: the variants that raise orders 1.1–2.5× lower the D1b PF.

## 8. Open defects found while running the ranges

- Signal family runs (`CTS_CORE_FAMILY` with signal labels): zero closed trades, although seats are created (100 units).
  The same window with all signals and no family filter gives 105 signal trades in its last window. So the family
  restriction removes a step that signal trades need. The full-engine run with all signals (`sig-all-v0`, per-family
  table in its summary) is used as the signal evaluation until the restriction is fixed. Its signal result: 298 orders,
  PF 0.60 on D1 (D1a 0.84, D1b 0.39); the best signal family with 30 or more trades is below PF 1.
- A Base skip for signal-only families was tried and reverted: its test had zero trades on both sides, so it proved
  nothing.
- Micro seating (above) and Wide seating are the next diagnoses.

## 9. What this means for "high PF with many orders"

- Orders can be raised (Micro on, a range-gate at 1.0, a trade floor of 6): up to 2.5× the baseline.
- Out of sample (D1b) PF did not rise with them; it fell in the variant that raised orders the most. No range, no signal
  family and no variant reaches PF ≥ 1.2 on D1b.
- Nothing has been put live. Any live change needs the operator's approval and a causal comparison recorded in
  docs/positive-coordinations.md.

## 10. Validated sets per range, hourly (five 48 h causal windows, full engine, default settings, mode fixed)

Source: `scripts/eval-validation.mjs` on the dumps with `--wf '{"recordValidation":true}'` (240 hourly steps). "Cand" = configs
that reach the validation check each hour (they have closes in their lookback and pass the tape filters); "valid" = configs
that pass the validation (configEval). PF cand and PF valid are the lookback PF that the check saw (in-sample for the seat
decision). PF realized is the PF of the orders those seated configs actually placed in the run (out of sample).

| range | cand/h | valid/h | valid rate | PF cand | PF valid | orders/h | PF realized | Base PF median |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Minimal | 504.0 | 46.5 | 9 % | 0.92 | 2.16 | 13.0 | 0.27 | 0.73 |
| Short | 151.2 | 6.9 | 5 % | 1.07 | 1.83 | 1.6 | 0.74 | 0.82 |
| General | 88.0 | 5.3 | 6 % | 1.21 | 1.65 | 0.8 | 0.32 | 0.79 |
| Long | 100.0 | 5.0 | 5 % | 1.17 | 1.63 | 1.0 | 0.34 | 0.74 |
| Wide, Micro, Minimal plus, Signals | 0 | 0 | – | – | – | 0 | – | 0.62 / 0 / 0 / – |

- Validation raises the lookback PF from 0.9–1.2 to 1.6–2.2 in every range. The realized PF is 0.27–0.74. The seat criterion
  does not carry forward; this matches the Base-gate result in sections 1–2.
- Validated is not traded: Short validates 6.9 configs an hour and places 1.6 orders an hour.
- The desk runs `durable` or `hourly` selection in some settings; these numbers are the eval's `fixed` mode (the default of
  the causal runs). The desk's own validation counts can differ.
- Instrumentation: `WalkForwardOptions.recordValidation` (default off), the step log's `checks`, and the dump's `validation`.
  The trades of a window are identical with and without it (verified on the last window: 2,595 trades both).

## 11. The realized-PF gap: what was checked, and the post-validation gates (11 Oct)

Checked on the five causal windows (`tapeTrades` in the dump; `scripts/core-session.mjs --wf '{"recordValidation":true}'`):
- The executor is exact: all 2,595 executed trades of the last window match their tape trade in exit time and return.
- The validation lookback is exact: the recorded closes, gross profit and gross loss reproduce from the tape with a 96 h
  window and no close after the step. (Earlier notes said 24 h; the record matches 96 h.)
- Every executed trade enters inside the hour its config was validated (2,595 of 2,595).
- Validated configs do not predict forward: over the next 24 h of their tape trades, validated configs score PF 1.10 and
  rejected candidates 1.12 (Minimal 1.17 vs 1.13; Short 0.34 vs 0.66).
- The gap between the validated and the executed PF comes from the executor's gates: of 7,274 tape trades that enter in
  their pick hour, the 2,595 executed have PF 0.23 and the 4,679 dropped have PF 0.92. The gates that drop them are the
  last-N gate (3,031 skips), the engine direction acceptance (1,272), the symbol PF gate (443) and the duplicate rule (354).
- Coordination (`coord`) makes no difference to the executed trades of the sim (identical with it off).

Post-validation gates, pooled over five windows (table in docs/positive-coordinations.md, 11 Oct): engine direction
acceptance off is the only change that raises PF in every half (D1 0.33 → 0.46, D1a 0.47 → 0.55, D1b 0.24 → 0.41). It
conflicts with the operator's 6 Oct decision to keep it on, so it is not applied. The last-N and symbol gates lower D1a
and are kept as they are. Realized PF is still far from the target.

## 12. Last-N gate, direction acceptance off (PROTOCOL-7 Step 1, 12 Oct)

Five causal 48 h D1 windows, full engine, 60 symbols, direction acceptance off (the code default), one change against
baseline lastN 15. Each run: `scripts/eval-gate.mjs --wf '{"lastN":N}' --jobs 2` (labels `lastn<N>-d0`, `runs/eval/gate/`).
The baseline reproduces the 11 Oct direction-off run exactly (5,502 orders, PF D1 0.46, D1a 0.55, D1b 0.41).

| variant | orders | PF D1 | PF D1a | PF D1b | keep? |
|---|---:|---:|---:|---:|---|
| baseline lastN 15 | 5,502 | 0.46 | 0.55 | 0.41 | – |
| lastN 0 (off) | 9,110 | 0.54 | 0.49 | 0.58 | no: D1a falls |
| lastN 5 | 4,963 | 0.44 | 0.54 | 0.40 | no: orders, D1a and D1b fall |
| lastN 10 | 5,093 | 0.43 | 0.57 | 0.37 | no: D1b falls |
| lastN 25 | 5,828 | 0.46 | 0.61 | 0.37 | no: D1b falls |
| lastN 40 | 5,850 | 0.47 | 0.60 | 0.37 | no: D1b falls |

- Rule (PROTOCOL-7): kept only if D1a and D1b PF stay at or above baseline and orders rise or hold. No variant passes.
  Baseline lastN 15 stays. The 8 h stability share was not computed: it only informs a change that is kept.
- The last-N gate trades orders against D1a and D1b PF. Lowering it raises orders and pooled D1 PF (lastN 0: 0.54), but it
  lowers D1a, the choosing half. Raising it raises D1a and lowers D1b.
- Pooled D1 PF stays below 0.55 in every variant. The target (PF ≥ 1.2 out of sample) is not met by the last-N gate.

## 13. The 120-symbol feed: last-N and symbol gate, direction acceptance off (PROTOCOL-7 steps 2–3, 12 Oct)

Feed: `runs/eval/feed120.json`, 120 symbols (the 60 of feed.json plus 60 by exchange quote volume), 25,920 1 m bars each,
2026-09-23 12:55 to 10-11 12:54, SHA-256 `4541bfdced0f01b08cc28d6ed8dfdfd6ff1a2a48e00b6453e52caae282125f69`. Built by
`scripts/build-eval-feed120.mjs` (commit 9cbefe9). Five causal 48 h D1 windows, `scripts/eval-gate.mjs --feed
runs/eval/feed120.json --symbols 120 --jobs 2`, direction acceptance off (the code default). Baseline: lastN 15.

| variant | orders | PF D1 | PF D1a | PF D1b | 8 h blocks with ≥3 orders at PF ≥ 1 | rule |
|---|---:|---:|---:|---:|---:|---|
| baseline lastN 15 | 13,556 | 0.3875 | 0.3956 | 0.3805 | 3 of 14 (21 %) | – |
| symbol gate off | 14,654 | 0.3881 | 0.3972 | 0.3807 | 2 of 14 (14 %) | passes (D1b +0.0002, marginal) |
| lastN 0 | 18,712 | 0.4588 | 0.4525 | 0.4653 | 2 of 15 (13 %) | passes |
| lastN 0 + symbol gate off | 20,427 | 0.4639 | 0.4513 | 0.4759 | 2 of 15 (13 %) | passes; D1a below lastN 0 alone |

- Selection (PROTOCOL-7: best D1a with at least 30 trades among the passing variants): lastN 0 alone (D1a 0.4525).
- Stability: no variant reaches the 2/3 of 8 h blocks at PF ≥ 1 that PROTOCOL-7 sets for a stable change. The share falls
  from 21 % to 13 % with lastN 0, so the orders are not more stable.
- Disagreement with the 60-symbol feed (section 12): on feed.json, lastN 0 lowers D1a (0.55 → 0.49). The same change
  passes on feed120. The default is not changed until the operator decides which feed governs the change; the desk runs
  60 symbols today.
- Harness: `eval-gate.mjs` gained `--symbols` (default 60, commit 5b6dd26). The 60-symbol baseline is unchanged.
