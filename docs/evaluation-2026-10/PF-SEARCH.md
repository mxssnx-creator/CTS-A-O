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
