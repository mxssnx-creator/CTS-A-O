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

## 14. Holdout: the pre-D1 days no choice has read (09-24 13:00 to 09-29 11:00, 13 Oct)

The two feeds disagreed on lastN 0 over D1 (section 13). The same variants on the causal 48 h windows before D1, which
no selection used: `scripts/eval-gate.mjs --from 2026-09-24T13:00:00Z --to 2026-09-29T11:00:00Z --split
2026-09-27T00:00:00Z` (three windows, the last 22 h), direction acceptance off, both feeds. Halves split at 09-27 00:00.

| feed | variant | orders | PF | first half | second half | rule |
|---|---|---:|---:|---:|---:|---|
| 60 | baseline lastN 15 | 819 | 0.3638 | 0.5091 | 0.2402 | – |
| 60 | lastN 0 | 1,217 | 0.4509 | 0.5406 | 0.3691 | passes |
| 120 | baseline lastN 15 | 2,641 | 0.4140 | 0.3997 | 0.4183 | – |
| 120 | lastN 0 | 3,723 | 0.5234 | 0.4750 | 0.5400 | passes |
| 120 | symbol gate off | 3,099 | 0.3872 | 0.4015 | 0.3837 | fails (second half) |
| 120 | lastN 0 + symbol gate off | 4,322 | 0.4933 | 0.5034 | 0.4904 | passes; below lastN 0 alone |

- lastN 0 passes on the holdout on both feeds: orders +41–49 %, PF +0.09–0.11, both halves up. Over the four
  measurements (D1 and holdout, 60 and 120 symbols) it passes three; the one failure is the 60-symbol D1a half.
- The symbol gate stays on: switching it off lowers the holdout's second half.
- PF stays below 0.55 everywhere. The last-N gate does not bring realized PF near 1.2.

## 15. General / Long stop ratios 0.25–1.5 step 0.25 (operator directive, 13 Oct)

Operator: "from strategies Ranges General, Long, SL ratios are from 0.25 to 1.5 step 0.25". Applied as a directive (commit
0435e5d: `WIDE_TARGET_SL`, settings migration v21 for a database still on the former [0.5, 0.75, 1]); measured here for
its effect, not for a keep decision. Feed120, 120 symbols, lastN 15, direction acceptance off, measured from a worktree
pinned at 0435e5d. Before: [0.5, 0.75, 1] (sections 13 and 14 baselines).

| span | variant | orders | PF | first half | second half |
|---|---|---:|---:|---:|---:|
| D1 (five windows) | [0.5, 0.75, 1] | 13,556 | 0.3875 | 0.3956 | 0.3805 |
| D1 (five windows) | 0.25–1.5 | 17,364 | 0.4479 | 0.4873 | 0.3805 |
| holdout (three windows) | [0.5, 0.75, 1] | 2,641 | 0.4140 | 0.3997 | 0.4183 |
| holdout (three windows) | 0.25–1.5 | 2,974 | 0.3888 | 0.3997 | 0.3862 |

Per family on D1 (trades @ PF at 0.2 % cost): General follow 317 @ 0.36 → 1,511 @ 0.44, General revert 114 @ 0.30 →
569 @ 0.67, Long follow 554 @ 0.35 → 2,018 @ 0.47, Long revert 172 @ 0.45 → 820 @ 0.70, Long sweep 0 → 47 @ 1.41.
Minimal and Short are unchanged (as they should be: their grids did not change). On the holdout the only new rows are
General follow 333 @ 0.26, which lowers the second half.

- More General and Long sets pass Base (survivors per D1 window 31/15/2/13/22 → 32/19/4/16/22) and their orders rise
  3–5×; General and Long revert rise to PF ~0.7, still below 1.
- The directive stays (operator's call). On the keep rule it would pass D1 (D1a up, D1b equal) and fail the holdout's
  second half (0.42 → 0.39).

## 16. Every TP × SL × Trail in every range (operator directive, 13 Oct)

Operator: "There have to be more configs for all range types… all TP × SL × Trail… for each indication validated, all
strategies processed completely." Commit 5f19adc: trail shares 0 / ¼ / ½ / ¾ of the target in every range (a whole-target
trail arms only as the target fills, so it is the plain cell); Minimal 4–8× cost step 0.5, stops 1.5–3 step 0.25; Short
stops 1–2.5 step 0.25; General 15–22× and Long 23–32× step 1, trailing cells at every stop of 0.25–1.5. 1,704 cells per
lane (was 552), 213 Base cells (was 92). Base cells are now rounded as the grid rounds them (with 0.25 steps a target ×
stop has 5–6 decimals: Base had validated stops the grid never built). Two switches measured on top: `grid.baseRanges`
off (a validated pair builds every range its indication applies to) and `grid.baseTargets` off (every target of a passed
range). Feed120, 120 symbols, lastN 15, direction acceptance off, pinned worktrees.

| span | variant | orders | PF | first half | second half | seconds |
|---|---|---:|---:|---:|---:|---:|
| D1 | ladder only (section 15) | 17,364 | 0.4479 | 0.4873 | 0.3805 | 127 |
| D1 | every TP × SL × Trail | 57,107 | 0.4350 | 0.4751 | 0.3739 | 293 |
| D1 | + baseRanges off | 62,355 | 0.4107 | 0.4881 | 0.3136 | 317 |
| D1 | + baseTargets off | 60,156 | 0.4419 | 0.4838 | 0.3734 | 372 |
| holdout | ladder only | 2,974 | 0.3888 | 0.3997 | 0.3862 | 50 |
| holdout | every TP × SL × Trail | 8,131 | 0.3669 | 0.3619 | 0.3679 | 115 |
| holdout | + baseRanges off | 27,380 | 0.4821 | 0.3619 | 0.4884 | 130 |
| holdout | + baseTargets off | 18,253 | 0.4873 | 0.3515 | 0.4999 | 134 |

- The dense grid triples the orders (D1 3.3×, holdout 2.7×) at a slightly lower PF (−0.01 on D1, −0.02 to −0.04 on the
  holdout). Base survivors are unchanged (32/20/4/16/22): the extra orders come from more configs per validated pair, each
  its own seat. Compute 2.3× (runs share the CPU with other work; the profile is in the performance step).
- `baseRanges` off: D1b falls 0.37 → 0.31; fails the keep rule. Stays on.
- `baseTargets` off: D1a +0.009, D1b −0.0005, holdout first half −0.010; fails the keep rule. Stays on.
- The dense grid stays as the operator directed; the measured cost is recorded here and in docs/positive-coordinations.md.

## 17. Micro on, Short on 5m lanes, drawdown ratio 2 (Step 2 levers, 13 Oct)

On the dense grid (section 16), feed120, 120 symbols, lastN 15, direction acceptance off, pinned worktree at 0087a14. Base
pass counts are pairs passed / evaluated per range, summed over the windows.

| span | variant | orders | PF | first half | second half | peak RSS | seconds |
|---|---|---:|---:|---:|---:|---:|---:|
| D1 | baseline | 57,107 | 0.4350 | 0.4751 | 0.3739 | 2.3 GB | 305 |
| D1 | Micro on | 134,217 | 0.5882 | 0.6410 | 0.4945 | 6.3 GB | 1,678 |
| D1 | Short on 5m lanes | 66,034 | 0.4473 | 0.4809 | 0.4078 | 2.3 GB | 311 |
| D1 | drawdown ratio ≤ 2 | 78,092 | 0.4414 | 0.4904 | 0.3662 | 2.7 GB | 522 |
| holdout | baseline | 8,131 | 0.3669 | 0.3619 | 0.3679 | 1.8 GB | 111 |
| holdout | Micro on | 77,144 | 0.7803 | 0.3282 | 0.9733 | 7.1 GB | 388 |
| holdout | Short on 5m lanes | 16,106 | 0.3212 | 0.2659 | 0.3893 | 1.9 GB | 181 |

Base per range, D1 baseline: Minimal 63/665, Short 33/340, General 32/340, Long 29/340, Wide 15/665. Micro on: Micro
54/2,950, Minimal 540/3,615 (the Micro indications also pass Minimal's cells). Short on 5m: Short 47/505. Drawdown ratio 2:
Minimal 83, Short 51, General 47, Long 46 (the gate that binds: section 18).

- **Micro on** raises PF on D1a (+0.17), D1b (+0.12) and the holdout's second half (0.37 → 0.97) with 2.3× the orders; the
  holdout's first half falls 0.36 → 0.33. Made the default by the operator's directive (13 Oct, "include and enable also
  range Micro for processing completely", commit 129c01e). Its compute is 5.5× and its peak memory 2.7× the baseline at
  120 symbols: the performance step works on both.
- **Short on 5m lanes**: holdout first half 0.36 → 0.27 — fails the keep rule; Short stays on 15m and slower.
- **Drawdown ratio ≤ 2**: D1b 0.374 → 0.366 — fails the keep rule; the Base drawdown ratio stays at 1.

## 18. Which gate removes the pairs at Base, and what the executor's gates drop (13 Oct)

Per range at the D1 baseline (sum over five windows; `baseRangeWhy`, first gate missed in the order closes → net → PF →
drawdown ratio): most pairs miss on net ≤ 0 (Minimal 346 of 602 failing, Short 181 of 307) or too few closes (Minimal 202,
Short 84); the drawdown ratio alone removes 54 Minimal, 42 Short, 40 General and 38 Long pairs (removing it would more
than double Short's 33). PF is never the first gate missed (a pair with net > 0 has PF > 1). On the holdout almost every
Short / General / Long pair fails on closes: the feed starts one day before the first holdout window.

What the executor's gates dropped, as the candidates' own unit PF (`skipPf`) against the executed orders: D1 executed 0.44,
last-N dropped 28,293 at 0.68, symbol gate 4,941 at 0.34, duplicate 8,196 at 0.49; holdout executed 0.37, last-N 18,243 at
0.82, symbol gate 8,130 at 0.47. The last-N gate drops better trades than it keeps; the symbol gate drops worse ones on D1.
The operator set lastN 0 as the default (13 Oct, commit 129c01e).
