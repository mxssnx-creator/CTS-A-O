# H1 — V3 with signals.holdH 12 (signal round 2)

Desk `docs/sims/sigstop-2026-10-08/desks/H1.json` (V3: `signals.normal.slOfTp [1.5, 2, 3]`, `signals.trailing.slOfTp 3`,
with `signals.holdH 12`; signal config ids carry `h48` = 48 × 15 min). Commit 3e11cdc (contains 11053c8), 30 symbols,
24 h pre-history + 24 h run, focus all, balance $20, `CTS_CORE_COMPARE=0 CTS_CORE_VARIANTS=1 CTS_CORE_WORKERS=3`,
4 cores / 16 GB. The two sessions ran one after the other.

Unit basis: every order at one unit after the 0.20 % round-trip cost; net = Σ r × 100. *PF incl. open* = gross profit /
gross loss over the closed orders' r plus the open orders' mark r at the end (raw.json `openEnd.mtmR`, rule "exact").
Signals are split by the config id's stop: `tr>0` = trailing, `tr0` = fixed. The side rows split by order direction.

## Verdict

**H1 does not beat V0 in either window** on PF including the open orders:

| window | V0 total / Signals | V3 total / Signals | **H1 total / Signals** |
|---|---|---|---|
| falling (w-latest) | 0.40 / 0.39 | 0.34 / 0.33 | **0.39 / 0.38** |
| rally (w-rally) | 2.78 / 2.81 | 2.82 / 2.85 | **1.84 / 1.72** |

- Falling: the 12 h hold improves on V3 (+0.05 total, +0.05 Signals) and almost matches V0 (−0.01 / −0.01). Signals'
  open book shrinks (V3 7,530 → 4,511 open orders), but the orders that are closed at the hold limit instead lose
  closed (Signals closed 6,726 at PF 0.63 in V3 → 9,753 at PF 0.58).
- Rally: the 12 h hold costs most of the rally's profit. Signals closed PF falls from 5.76 (V3) / 8.66 (V0) to 2.11, and
  PF incl. open falls from 2.85 / 2.81 to 1.72. The hold now closes the winners before they reach their target. Their
  re-entries (11,651 closed against V3's 9,179) do not make up the gap. Net incl. open: Signals +12,551 % (V3 +20,681 %,
  V0 +13,308 %), total +16,741 % (V3 +25,212 %, V0 +17,839 %).
- Trailing signals stay ahead of fixed ones both closed and including the open orders, in both windows.

## w-latest — 2026-10-07T00:00 → 2026-10-08T00:00 UTC (the latest 24 h, a falling market)

`checks: 55/55 ok` · wall time 2,946 s (session runSeconds 2,902; it includes the 108 variant runs) · book: $20.00 → $17.46 closed (−12.68 %), equity at the end $14.50 (42 positions / 5,362 orders open, MTM −$2.97), PF $ 0.74, PF unit 0.55

| group | orders closed | PF closed | open at end | PF open (mark) | PF incl. open | net closed % | net incl. open % |
|---|---|---|---|---|---|---|---|
| Total | 14399 | 0.55 | 5362 | 0.05 | 0.39 | -13868 | -27636 |
| Micro | 87 | 0.37 | 5 | 0.00 | 0.37 | -34 | -34 |
| Short | 3825 | 0.46 | 672 | 0.05 | 0.39 | -3610 | -4827 |
| General | 363 | 0.65 | 56 | 0.18 | 0.61 | -246 | -295 |
| Long | 267 | 0.56 | 118 | 0.28 | 0.51 | -337 | -462 |
| Wide | 104 | 0.39 | 0 | – | 0.39 | -48 | -48 |
| Signals | 9753 | 0.58 | 4511 | 0.04 | 0.38 | -9592 | -21970 |
| Signals trailing (tr>0) | 4846 | 0.65 | 2437 | 0.04 | 0.38 | -3451 | -11076 |
| Signals fixed (tr0) | 4907 | 0.51 | 2074 | 0.06 | 0.38 | -6141 | -10894 |
| Signals long | 930 | 0.10 | 0 | – | 0.10 | -3938 | -3938 |
| Signals short | 8823 | 0.69 | 4511 | 0.04 | 0.42 | -5654 | -18032 |
| Total long | 3651 | 0.24 | 177 | 0.29 | 0.24 | -7614 | -7802 |
| Total short | 10748 | 0.70 | 5185 | 0.04 | 0.43 | -6254 | -19835 |

## w-rally — 2026-10-05T15:00 → 2026-10-06T15:00 UTC (the 6 Oct rally window)

`checks: 54/55 ok — FAILED: execution: strategy type axis executed orders` (the session exits 1 on it, as V0 and V3 did in this window) · wall time 2,182 s (session runSeconds 2,145; it includes the 108 variant runs) · book: $20.00 → $27.03 closed (+35.14 %), equity at the end $26.44 (29 positions / 4,622 orders open, MTM −$0.59), PF $ 2.15, PF unit 2.14. Wide (axis) executed no order: its 524 candidates were all skipped (lastN 223 · engineSide 214 · symPf 87). No other check failed.

| group | orders closed | PF closed | open at end | PF open (mark) | PF incl. open | net closed % | net incl. open % |
|---|---|---|---|---|---|---|---|
| Total | 14071 | 2.14 | 4622 | 0.90 | 1.84 | 17209 | 16741 |
| Micro | 141 | 0.68 | 3 | 0.00 | 0.68 | -16 | -16 |
| Short | 1196 | 2.47 | 217 | 2.37 | 2.46 | 1453 | 1539 |
| General | 521 | 2.02 | 136 | 7.82 | 2.31 | 589 | 799 |
| Long | 562 | 2.38 | 352 | 11.62 | 3.14 | 1105 | 1870 |
| Signals | 11651 | 2.11 | 3914 | 0.67 | 1.72 | 14078 | 12551 |
| Signals trailing (tr>0) | 5833 | 2.46 | 1957 | 0.61 | 1.82 | 7754 | 6660 |
| Signals fixed (tr0) | 5818 | 1.85 | 1957 | 0.77 | 1.64 | 6325 | 5891 |
| Signals long | 11571 | 2.12 | 3914 | 0.67 | 1.73 | 14112 | 12584 |
| Signals short | 80 | 0.78 | 0 | – | 0.78 | -34 | -34 |
| Total long | 13948 | 2.16 | 4622 | 0.90 | 1.85 | 17260 | 16793 |
| Total short | 123 | 0.72 | 0 | – | 0.72 | -51 | -51 |

## Variants that touch signals (CTS_CORE_VARIANTS=1)

In both windows the baseline row "reproduces the session run". Each row reruns the walk-forward on the session's own
tapes with one change. *PF incl. open\** is on the **open-net basis**: the variant summaries carry the open book only
as a count and a net (`openEnd`, `openNet`), not as its gross profit and loss. The open book is therefore added as one
net amount: (gp + max(openNet, 0)) / (gl + max(−openNet, 0)). On the baseline this gives 0.38 against the exact 0.39
(falling) and 2.07 against the exact 1.84 (rally). The netting flatters a mixed open book. **Read only the Δ against
the baseline row**, never the level against V0's exact figures. Signals PF closed is the variant's `byType.Signals`.
The `sig:engineSide*` rows change the engine's direction acceptance; the report lists them under signals. Entry and
validation last-N act on every type.

| variant (id) | falling: orders | PF closed | Signals PF closed | open | PF incl. open* | Δ | net incl. open % | rally: orders | PF closed | Signals PF closed | open | PF incl. open* | Δ | net incl. open % |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Baseline (as run) (`baseline`) | 14399 | 0.55 | 0.58 | 5362 | 0.38 | +0.00 | -27,636 | 14071 | 2.14 | 2.11 | 4622 | 2.07 | +0.00 | 16,741 |
| Signals off (`sig:signals`) | 4646 | 0.48 | – | 851 | 0.41 | +0.03 | -5,666 | 2420 | 2.30 | – | 708 | 2.73 | +0.66 | 4,191 |
| Signal confirmation off (`sig:confirm`) | 19052 | 0.53 | 0.54 | 6262 | 0.39 | +0.01 | -37,989 | 21996 | 1.96 | 1.92 | 5584 | 1.79 | −0.28 | 21,723 |
| Engine direction acceptance off (`sig:engineSide`) | 17560 | 0.63 | 0.58 | 6669 | 0.45 | +0.07 | -25,531 | 14907 | 2.04 | 2.11 | 4967 | 1.93 | −0.14 | 15,952 |
| Engine direction acceptance window 3 h (`sig:engineSide-hours3`) | 13528 | 0.55 | 0.58 | 5308 | 0.38 | +0.00 | -26,101 | 13033 | 1.91 | 2.11 | 4480 | 1.75 | −0.32 | 12,271 |
| Engine direction acceptance window 12 h (`sig:engineSide-hours12`) | 14002 | 0.54 | 0.58 | 5222 | 0.37 | −0.01 | -27,743 | 13416 | 1.99 | 2.11 | 4551 | 1.90 | −0.18 | 14,164 |
| Engine direction acceptance window 48 h (`sig:engineSide-hours48`) | 15180 | 0.57 | 0.58 | 5755 | 0.40 | +0.02 | -27,172 | 14076 | 2.14 | 2.11 | 4622 | 2.07 | +0.00 | 16,744 |
| Engine direction acceptance PF 1.2 (`sig:engineSide-minPf1.2`) | 13390 | 0.52 | 0.58 | 5324 | 0.36 | −0.02 | -28,138 | 13843 | 2.09 | 2.11 | 4569 | 2.01 | −0.07 | 15,832 |
| Engine direction acceptance PF 1.3 (`sig:engineSide-minPf1.3`) | 13386 | 0.52 | 0.58 | 5324 | 0.36 | −0.02 | -28,132 | 13265 | 1.98 | 2.11 | 4539 | 1.89 | −0.18 | 13,999 |
| Engine direction acceptance 10 closes (`sig:engineSide-minTrades10`) | 14399 | 0.55 | 0.58 | 5362 | 0.38 | +0.00 | -27,636 | 14071 | 2.14 | 2.11 | 4622 | 2.07 | +0.00 | 16,741 |
| Engine direction acceptance 60 closes (`sig:engineSide-minTrades60`) | 14399 | 0.55 | 0.58 | 5362 | 0.38 | +0.00 | -27,636 | 14071 | 2.14 | 2.11 | 4622 | 2.07 | +0.00 | 16,741 |
| Engine direction acceptance per indication: every range (`sig:engineSidePerInd-all`) | 15380 | 0.59 | 0.58 | 5871 | 0.41 | +0.03 | -26,562 | 14273 | 2.14 | 2.11 | 4666 | 2.02 | −0.06 | 16,345 |
| Engine direction acceptance per indication: pooled per range (`sig:engineSidePerInd-off`) | 14379 | 0.55 | 0.58 | 5357 | 0.38 | −0.00 | -27,634 | 14014 | 2.14 | 2.11 | 4619 | 2.08 | +0.00 | 16,754 |
| Signal acceptance off (`sig:accept`) | 18288 | 0.67 | 0.72 | 7089 | 0.45 | +0.07 | -30,488 | 16937 | 2.23 | 2.21 | 5952 | 2.25 | +0.18 | 21,950 |
| Signal acceptance and confirmation off (`sig:accept-confirm`) | 25595 | 0.68 | 0.72 | 8629 | 0.49 | +0.11 | -39,634 | 27004 | 1.99 | 1.97 | 7020 | 1.88 | −0.19 | 27,969 |
| Active signals 100 (`sig:count-100`) | 4779 | 0.47 | 0.34 | 881 | 0.41 | +0.03 | -5,930 | 2988 | 1.87 | 0.69 | 879 | 2.15 | +0.08 | 3,803 |
| Active signals 200 (`sig:count-200`) | 4849 | 0.49 | 0.64 | 930 | 0.42 | +0.04 | -5,911 | 4003 | 1.85 | 1.32 | 1584 | 1.94 | −0.13 | 4,157 |
| Signal ranking drawdown (`sig:rank-drawdown`) | 7993 | 0.50 | 0.51 | 2605 | 0.37 | −0.01 | -13,942 | 9023 | 3.25 | 3.78 | 3058 | 3.24 | +1.17 | 15,328 |
| Signal ranking lowdd (`sig:rank-lowdd`) | 6666 | 0.49 | 0.52 | 2061 | 0.38 | +0.00 | -10,276 | 7658 | 3.30 | 4.01 | 2807 | 3.16 | +1.09 | 13,086 |
| Entry last-N off (`gate:lastN-0`) | 14141 | 0.55 | 0.58 | 5344 | 0.38 | −0.00 | -27,218 | 13791 | 2.17 | 2.11 | 4340 | 2.09 | +0.02 | 16,662 |
| Entry last 5 (`gate:lastN-5`) | 14292 | 0.54 | 0.58 | 5652 | 0.37 | −0.01 | -28,607 | 14299 | 2.23 | 2.11 | 4527 | 2.13 | +0.05 | 17,483 |
| Entry last 10 (`gate:lastN-10`) | 15170 | 0.54 | 0.58 | 5573 | 0.38 | −0.00 | -28,888 | 14233 | 2.21 | 2.11 | 4581 | 2.12 | +0.04 | 17,258 |
| Entry last 20 (`gate:lastN-20`) | 14064 | 0.55 | 0.58 | 5318 | 0.38 | +0.00 | -27,159 | 13843 | 2.16 | 2.11 | 4492 | 2.10 | +0.02 | 16,784 |
| Entry last 25 (`gate:lastN-25`) | 14077 | 0.55 | 0.58 | 5344 | 0.38 | −0.00 | -27,232 | 13791 | 2.17 | 2.11 | 4340 | 2.09 | +0.02 | 16,662 |
| Entry last 30 (`gate:lastN-30`) | 13869 | 0.55 | 0.58 | 5271 | 0.38 | −0.00 | -26,928 | 14027 | 2.17 | 2.11 | 4359 | 2.09 | +0.02 | 16,956 |
| Entry last 35 (`gate:lastN-35`) | 13767 | 0.55 | 0.58 | 5227 | 0.38 | −0.00 | -26,673 | 14211 | 2.18 | 2.11 | 4391 | 2.09 | +0.02 | 17,032 |
| Entry last 50 (`gate:lastN-50`) | 13965 | 0.55 | 0.58 | 5157 | 0.38 | +0.00 | -26,588 | 14303 | 2.22 | 2.11 | 4521 | 2.16 | +0.08 | 17,662 |
| Entry last 75 (`gate:lastN-75`) | 14935 | 0.57 | 0.58 | 5319 | 0.40 | +0.02 | -26,664 | 14669 | 2.20 | 2.11 | 4676 | 2.16 | +0.09 | 18,068 |
| Validation last-N off (`gate:validLastN-0`) | 21424 | 0.51 | 0.57 | 7052 | 0.38 | +0.00 | -38,477 | 19508 | 2.11 | 2.17 | 6518 | 2.04 | −0.03 | 21,712 |
| Validation last 10 (`gate:validLastN-10`) | 14758 | 0.50 | 0.57 | 5586 | 0.35 | −0.03 | -30,632 | 13105 | 2.04 | 2.05 | 4710 | 1.93 | −0.14 | 13,752 |
| Validation last 20 (`gate:validLastN-20`) | 14650 | 0.56 | 0.58 | 5615 | 0.39 | +0.01 | -26,680 | 13869 | 2.12 | 2.16 | 4961 | 2.12 | +0.05 | 16,718 |
| Validation last 25 (`gate:validLastN-25`) | 15899 | 0.57 | 0.62 | 5716 | 0.40 | +0.02 | -27,862 | 15194 | 1.98 | 2.04 | 5627 | 1.95 | −0.13 | 16,181 |
| Validation last 35 (`gate:validLastN-35`) | 16939 | 0.54 | 0.61 | 6078 | 0.38 | +0.00 | -31,107 | 15950 | 2.10 | 2.19 | 5607 | 2.06 | −0.01 | 18,333 |
| Validation last 50 (`gate:validLastN-50`) | 16714 | 0.51 | 0.59 | 5963 | 0.37 | −0.01 | -31,266 | 16329 | 2.09 | 2.16 | 5742 | 2.01 | −0.06 | 18,178 |
| Validation last 75 (`gate:validLastN-75`) | 16743 | 0.52 | 0.58 | 6238 | 0.37 | −0.01 | -32,126 | 16807 | 2.13 | 2.18 | 5973 | 2.04 | −0.03 | 19,280 |
| Validation last 100 (`gate:validLastN-100`) | 16519 | 0.51 | 0.57 | 6031 | 0.36 | −0.02 | -32,086 | 17056 | 2.11 | 2.13 | 6061 | 2.01 | −0.07 | 19,141 |
| Signals last 5 (`gate:signalLastN-5`) | 8326 | 0.49 | 0.50 | 2562 | 0.36 | −0.02 | -15,502 | 6514 | 2.24 | 2.21 | 2602 | 2.19 | +0.11 | 8,339 |
| Signals last 10 (`gate:signalLastN-10`) | 7473 | 0.48 | 0.49 | 2045 | 0.37 | −0.01 | -12,834 | 5387 | 2.30 | 2.30 | 2115 | 2.32 | +0.25 | 7,415 |
| Signals last 15 (`gate:signalLastN-15`) | 7134 | 0.49 | 0.51 | 1836 | 0.38 | +0.00 | -11,330 | 4890 | 2.45 | 2.60 | 1846 | 2.50 | +0.42 | 7,324 |
| Signals last 25 (`gate:signalLastN-25`) | 7244 | 0.53 | 0.60 | 1497 | 0.44 | +0.05 | -9,384 | 4723 | 2.37 | 2.45 | 1833 | 2.44 | +0.37 | 6,877 |


### Signal rows that helped

- **In both windows (Δ PF incl. open\* > 0 in each):** Signal acceptance off (`sig:accept`, +0.07 / +0.18), Signals
  last 25 (`gate:signalLastN-25`, +0.05 / +0.37), Active signals 100 (`sig:count-100`, +0.03 / +0.08, but only 133 / 568
  signal orders), Signals off (+0.03 / +0.66), Entry last 75 (`gate:lastN-75`, +0.02 / +0.09), Validation last 20
  (`gate:validLastN-20`, +0.01 / +0.05). Signal confirmation off helps the falling window only (+0.01) and costs the
  rally (−0.28).
- **In the rally only:** Signal ranking drawdown (`sig:rank-drawdown`, +1.17; closed PF 2.14 → 3.25, Signals 3.78) and
  lowdd (+1.09). In the falling window they come out at −0.01 / 0.00.
- None of them is a causal comparison of H1 against V0. A Δ of a few hundredths in the falling window is within the
  open-net basis error (−0.01 on the baseline). The rally's largest gains (Signals last 15 / 25, ranking drawdown /
  lowdd) cut signal orders by 43–80 %.

## Reading

- The 12 h hold does what it was meant to do in the falling market: a smaller open book, and PF incl. open close to V0.
  In the rally it cuts the winners short and loses about 40 % of Signals PF incl. open (V0 2.81, V3 2.85 → 1.72). Following
  docs/positive-coordinations.md, holdH 12 does not replace the desk's hold.
- The open orders still mark far below the closed ones (falling: Signals open PF 0.04; rally: 0.67). The hold limit
  turns part of that open loss into closed loss rather than removing it.
- Compare with H2–H4 (same windows, same flags) before choosing a round 2 variant.

Raw runs (not committed): `runs/w-latest/`, `runs/w-rally/` (session.md, html, writeup.md, raw.json, log.txt).
