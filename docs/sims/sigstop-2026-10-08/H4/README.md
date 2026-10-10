# H4 — V3 with signals.holdH 12 and faster acceptance

Desk `docs/sims/sigstop-2026-10-08/desks/H4.json` = V3 with `signals.holdH 12` (was 24),
`signals.accept.hours 24` (was 48) and `signals.sideAccept { hours 12, minTrades 10 }` (was 24 h / 20). Commit 3e11cdc,
30 symbols, 24 h pre-historic + 24 h simulated, focus all, balance $20, `CTS_CORE_COMPARE=0 CTS_CORE_VARIANTS=1
CTS_CORE_WORKERS=3`, 4 cores / 16 GB, the two sessions run one after the other.

Unit basis (every order at one unit, Σ trade r in %, 0.2 % round trip included). *PF incl. open* = (gross profit of
the closed orders + of the open orders marked at the end) ÷ (gross loss of both), from raw.json (`trades` r,
`openEnd` mtmR, rule "exact"). Signals split by config id: `tr0` = fixed stop, `tr>0` = trailing. Long = side 1,
short = side −1.

## Verdict against V0 (goal: beat V0 on PF incl. open in both windows)

| window | group | V0 | V3 | **H4** | H4 PF closed | H4 orders closed / open | H4 net incl. open |
|---|---|---|---|---|---|---|---|
| falling (latest 24 h) | Total | 0.40 | 0.34 | **0.44** | 0.62 | 16,486 / 5,079 | −27,246 % |
| falling (latest 24 h) | Signals | 0.39 | 0.33 | **0.45** | 0.66 | 11,839 / 4,228 | −21,581 % |
| rally (6 Oct) | Total | 2.78 | 2.82 | **1.83** | 2.12 | 14,814 / 5,667 | +17,347 % |
| rally (6 Oct) | Signals | 2.81 | 2.85 | **1.74** | 2.11 | 12,491 / 4,923 | +13,546 % |

**H4 does not beat V0 in both windows.** It beats V0 in the falling window (Total 0.44 vs 0.40, Signals 0.45 vs 0.39)
and loses clearly in the rally (Total 1.83 vs 2.78, Signals 1.74 vs 2.81): the faster acceptance and the 12 h hold
cut the open book in the falling market (4,228 signal orders open vs V3's 7,530) but also cut the rally's winners
(Signals PF closed 2.11 vs V3's 5.76). No setting changes on this result (docs/positive-coordinations.md).

## Window 1 — the latest 24 h (7 Oct 00:00 → 8 Oct 00:00 UTC, falling market)

Run log: `checks: 55/55 ok`; variants baseline "reproduces the session run"; session wall time 4,614 s (incl. 108
variant walk-forwards, 3,014 s; the report's runSeconds 4,509). Book as live sizes it: $20.00 → $17.79 closed
(−11.03 %), equity at the end $14.69.

| group | orders closed | PF closed | open at end | PF incl. open | net closed | net incl. open |
|---|---|---|---|---|---|---|
| Total | 16,486 | 0.62 | 5,079 | 0.44 | −12,992 % | −27,246 % |
| Micro | 87 | 0.37 | 5 | 0.37 | −34 % | −34 % |
| Short | 3,826 | 0.46 | 672 | 0.39 | −3,609 % | −4,825 % |
| General | 363 | 0.65 | 56 | 0.61 | −246 % | −295 % |
| Long | 267 | 0.56 | 118 | 0.51 | −337 % | −462 % |
| Wide | 104 | 0.39 | 0 | 0.39 | −48 % | −48 % |
| Signals | 11,839 | 0.66 | 4,228 | 0.45 | −8,718 % | −21,581 % |
| Signals trailing (tr>0) | 5,845 | 0.77 | 2,300 | 0.45 | −2,477 % | −10,554 % |
| Signals fixed (tr0) | 5,994 | 0.58 | 1,928 | 0.45 | −6,241 % | −11,027 % |

By side:

| group · side | orders closed | PF closed | open at end | PF incl. open | net closed | net incl. open |
|---|---|---|---|---|---|---|
| Total · long | 3,679 | 0.25 | 177 | 0.25 | −7,582 % | −7,769 % |
| Total · short | 12,807 | 0.77 | 4,902 | 0.50 | −5,410 % | −19,477 % |
| Micro · long | 48 | 0.32 | 5 | 0.32 | −24 % | −24 % |
| Micro · short | 39 | 0.45 | 0 | 0.45 | −10 % | −10 % |
| Short · long | 2,196 | 0.31 | 121 | 0.30 | −3,047 % | −3,242 % |
| Short · short | 1,630 | 0.75 | 551 | 0.52 | −562 % | −1,583 % |
| General · long | 237 | 0.35 | 21 | 0.36 | −362 % | −373 % |
| General · short | 126 | 1.85 | 35 | 1.44 | +116 % | +78 % |
| Long · long | 241 | 0.63 | 30 | 0.67 | −242 % | −223 % |
| Long · short | 26 | 0.12 | 88 | 0.07 | −95 % | −238 % |
| Wide · short | 104 | 0.39 | 0 | 0.39 | −48 % | −48 % |
| Signals · long | 957 | 0.11 | 0 | 0.11 | −3,907 % | −3,907 % |
| Signals · short | 10,882 | 0.77 | 4,228 | 0.49 | −4,811 % | −17,674 % |
| Signals trailing (tr>0) · long | 452 | 0.11 | 0 | 0.11 | −1,783 % | −1,783 % |
| Signals trailing (tr>0) · short | 5,393 | 0.92 | 2,300 | 0.49 | −693 % | −8,770 % |
| Signals fixed (tr0) · long | 505 | 0.11 | 0 | 0.11 | −2,123 % | −2,123 % |
| Signals fixed (tr0) · short | 5,489 | 0.67 | 1,928 | 0.49 | −4,118 % | −8,904 % |

## Window 2 — the 6 Oct rally (5 Oct 15:00 → 6 Oct 15:00 UTC)

Run log: `checks: 54/55 ok — FAILED: execution: strategy type axis executed orders` (the session exits 1 on it, as
V0 and V3 did in this window: Wide/axis seated configs but all 402 Wide candidates were skipped — engineSide 207 ·
lastN 141 · symPf 54); variants baseline "reproduces the session run"; session wall time 3,590 s (variants 2,277 s;
runSeconds 3,522). Book as live sizes it: $20.00 → $27.54 closed (+37.71 %), equity at the end $27.15.

| group | orders closed | PF closed | open at end | PF incl. open | net closed | net incl. open |
|---|---|---|---|---|---|---|
| Total | 14,814 | 2.12 | 5,667 | 1.83 | +17,467 % | +17,347 % |
| Micro | 111 | 0.79 | 3 | 0.79 | −8 % | −8 % |
| Short | 1,125 | 2.82 | 249 | 2.77 | +1,541 % | +1,643 % |
| General | 519 | 1.86 | 131 | 2.12 | +524 % | +713 % |
| Long | 568 | 1.89 | 361 | 2.46 | +825 % | +1,452 % |
| Signals | 12,491 | 2.11 | 4,923 | 1.74 | +14,584 % | +13,546 % |
| Signals trailing (tr>0) | 6,156 | 2.46 | 2,463 | 1.83 | +7,701 % | +6,884 % |
| Signals fixed (tr0) | 6,335 | 1.87 | 2,460 | 1.67 | +6,883 % | +6,662 % |

By side:

| group · side | orders closed | PF closed | open at end | PF incl. open | net closed | net incl. open |
|---|---|---|---|---|---|---|
| Total · long | 14,693 | 2.11 | 5,667 | 1.82 | +17,244 % | +17,124 % |
| Total · short | 121 | 7.09 | 0 | 7.09 | +223 % | +223 % |
| Micro · long | 83 | 1.81 | 3 | 1.79 | +11 % | +10 % |
| Micro · short | 28 | 0.20 | 0 | 0.20 | −18 % | −18 % |
| Short · long | 1,125 | 2.82 | 249 | 2.77 | +1,541 % | +1,643 % |
| General · long | 519 | 1.86 | 131 | 2.12 | +524 % | +713 % |
| Long · long | 568 | 1.89 | 361 | 2.46 | +825 % | +1,452 % |
| Signals · long | 12,398 | 2.09 | 4,923 | 1.73 | +14,343 % | +13,305 % |
| Signals · short | 93 | 18.22 | 0 | 18.22 | +241 % | +241 % |
| Signals trailing (tr>0) · long | 6,112 | 2.44 | 2,463 | 1.82 | +7,618 % | +6,801 % |
| Signals trailing (tr>0) · short | 44 | 12.59 | 0 | 12.59 | +83 % | +83 % |
| Signals fixed (tr0) · long | 6,286 | 1.85 | 2,460 | 1.66 | +6,725 % | +6,504 % |
| Signals fixed (tr0) · short | 49 | 24.07 | 0 | 24.07 | +159 % | +159 % |

## Variants that touch signals (CTS_CORE_VARIANTS=1)

Each row reruns the walk-forward on the session's own tapes with one switch flipped (the baseline reproduces the
session run in both windows). The variant summaries keep the closed orders' gross profit / loss but only the *net*
mark of the open orders, so the PF incl. open column here is a **netted proxy**: (closed gross profit + open net if > 0)
÷ (closed gross loss + |open net| if < 0). It differs from the exact figure (baseline: falling 0.43 vs exact
0.44, rally 2.10 vs exact 1.83) — compare the Δ against the baseline row, not against the tables above.

### Falling window

| id | variant | orders | PF closed | Signals PF closed | open | open net % | PF incl. open (netted proxy) | Δ proxy | net incl. open % | effect |
|---|---|---|---|---|---|---|---|---|---|---|
| baseline | Baseline (as run) | 16486 | 0.62 | 0.66 | 5079 | −14,253 | 0.43 | +0.00 | −27,246 | – |
| type:crowd-sig-1 | Signals: at most 1 per bar | 5303 | 0.49 | 0.59 | 975 | −1,669 | 0.42 | -0.02 | −6,430 | orders |
| type:crowd-sig-3 | Signals: at most 3 per bar | 6442 | 0.52 | 0.60 | 1309 | −2,557 | 0.42 | -0.01 | −8,267 | orders |
| type:crowd-sig-10 | Signals: at most 10 per bar | 9885 | 0.55 | 0.60 | 2474 | −6,130 | 0.42 | -0.02 | −14,854 | orders |
| sig:signals | Signals off | 4647 | 0.48 | – | 851 | −1,390 | 0.41 | -0.02 | −5,664 | orders |
| sig:confirm | Signal confirmation off | 22723 | 0.63 | 0.66 | 6230 | −17,817 | 0.46 | +0.03 | −36,470 | orders |
| sig:engineSide | Engine direction acceptance off | 19651 | 0.68 | 0.66 | 6389 | −13,661 | 0.50 | +0.06 | −25,132 | orders |
| sig:engineSide-hours3 | Engine direction acceptance window 3 h | 15615 | 0.62 | 0.66 | 5025 | −13,106 | 0.44 | +0.01 | −25,711 | orders |
| sig:engineSide-hours12 | Engine direction acceptance window 12 h | 16089 | 0.61 | 0.66 | 4939 | −14,226 | 0.43 | -0.01 | −27,352 | orders |
| sig:engineSide-hours48 | Engine direction acceptance window 48 h | 17267 | 0.63 | 0.66 | 5472 | −13,871 | 0.45 | +0.02 | −26,781 | orders |
| sig:engineSide-minPf1.2 | Engine direction acceptance PF 1.2 | 15477 | 0.59 | 0.66 | 5041 | −14,205 | 0.42 | -0.02 | −27,747 | orders |
| sig:engineSide-minPf1.3 | Engine direction acceptance PF 1.3 | 15473 | 0.59 | 0.66 | 5041 | −14,205 | 0.42 | -0.02 | −27,742 | orders |
| sig:engineSide-minTrades10 | Engine direction acceptance 10 closes | 16486 | 0.62 | 0.66 | 5079 | −14,253 | 0.43 | +0.00 | −27,246 | none |
| sig:engineSide-minTrades60 | Engine direction acceptance 60 closes | 16486 | 0.62 | 0.66 | 5079 | −14,253 | 0.43 | +0.00 | −27,246 | none |
| sig:engineSidePerInd-all | Engine direction acceptance per indication: every range | 17469 | 0.65 | 0.66 | 5591 | −14,024 | 0.46 | +0.03 | −26,161 | orders |
| sig:engineSidePerInd-off | Engine direction acceptance per indication: pooled per range | 16466 | 0.62 | 0.66 | 5074 | −14,253 | 0.43 | -0.00 | −27,243 | orders |
| sig:accept | Signal acceptance off | 18253 | 0.67 | 0.72 | 5866 | −15,728 | 0.47 | +0.03 | −27,826 | orders |
| sig:accept-confirm | Signal acceptance and confirmation off | 25560 | 0.69 | 0.72 | 7258 | −19,962 | 0.50 | +0.07 | −37,027 | orders |
| sig:count-100 | Active signals 100 | 4840 | 0.52 | 1.29 | 904 | −1,263 | 0.45 | +0.01 | −5,430 | orders |
| sig:count-200 | Active signals 200 | 4980 | 0.52 | 1.06 | 962 | −1,406 | 0.45 | +0.01 | −5,644 | orders |
| sig:rank-drawdown | Signal ranking drawdown | 8416 | 0.55 | 0.61 | 2296 | −5,596 | 0.41 | -0.02 | −13,189 | orders |
| sig:rank-lowdd | Signal ranking lowdd | 6911 | 0.53 | 0.62 | 1987 | −3,753 | 0.41 | -0.02 | −9,838 | orders |
| coord:cooldown-signals | Cooldown signals | 13416 | 0.53 | 0.55 | 3472 | −9,922 | 0.40 | -0.04 | −23,328 | orders |
| gate:signalLastN-5 | Signals last 5 | 9281 | 0.56 | 0.62 | 2508 | −6,841 | 0.41 | -0.03 | −15,074 | orders |
| gate:signalLastN-10 | Signals last 10 | 8247 | 0.54 | 0.60 | 2059 | −5,071 | 0.41 | -0.02 | −12,739 | orders |
| gate:signalLastN-15 | Signals last 15 | 7827 | 0.55 | 0.63 | 1865 | −4,320 | 0.43 | -0.01 | −11,157 | orders |
| gate:signalLastN-25 | Signals last 25 | 7895 | 0.61 | 0.78 | 1499 | −2,994 | 0.50 | +0.07 | −8,632 | orders |

### Rally window

| id | variant | orders | PF closed | Signals PF closed | open | open net % | PF incl. open (netted proxy) | Δ proxy | net incl. open % | effect |
|---|---|---|---|---|---|---|---|---|---|---|
| baseline | Baseline (as run) | 14814 | 2.12 | 2.11 | 5667 | −120 | 2.10 | +0.00 | +17,347 | – |
| type:crowd-sig-1 | Signals: at most 1 per bar | 2995 | 2.06 | 1.55 | 897 | +903 | 2.35 | +0.25 | +4,142 | orders |
| type:crowd-sig-3 | Signals: at most 3 per bar | 4199 | 1.98 | 1.70 | 1223 | +859 | 2.18 | +0.08 | +4,996 | orders |
| type:crowd-sig-10 | Signals: at most 10 per bar | 7766 | 1.91 | 1.78 | 2372 | +691 | 2.00 | -0.11 | +7,805 | orders |
| sig:signals | Signals off | 2323 | 2.19 | – | 744 | +918 | 2.57 | +0.47 | +3,801 | orders |
| sig:confirm | Signal confirmation off | 23189 | 1.93 | 1.90 | 6541 | −2,135 | 1.78 | -0.32 | +22,298 | orders |
| sig:engineSide | Engine direction acceptance off | 16042 | 1.94 | 2.11 | 6121 | −739 | 1.86 | -0.24 | +15,893 | orders |
| sig:engineSide-hours3 | Engine direction acceptance window 3 h | 13707 | 2.00 | 2.11 | 5518 | −842 | 1.90 | -0.21 | +14,067 | orders |
| sig:engineSide-hours12 | Engine direction acceptance window 12 h | 14267 | 2.00 | 2.11 | 5592 | −316 | 1.96 | -0.14 | +15,172 | orders |
| sig:engineSide-hours48 | Engine direction acceptance window 48 h | 14814 | 2.12 | 2.11 | 5667 | −120 | 2.10 | +0.00 | +17,355 | orders |
| sig:engineSide-minPf1.2 | Engine direction acceptance PF 1.2 | 14264 | 2.00 | 2.11 | 5590 | −316 | 1.96 | -0.14 | +15,173 | orders |
| sig:engineSide-minPf1.3 | Engine direction acceptance PF 1.3 | 14138 | 2.00 | 2.11 | 5576 | −346 | 1.95 | -0.15 | +15,041 | orders |
| sig:engineSide-minTrades10 | Engine direction acceptance 10 closes | 14814 | 2.12 | 2.11 | 5667 | −120 | 2.10 | +0.00 | +17,347 | none |
| sig:engineSide-minTrades60 | Engine direction acceptance 60 closes | 14814 | 2.12 | 2.11 | 5667 | −120 | 2.10 | +0.00 | +17,347 | none |
| sig:engineSidePerInd-all | Engine direction acceptance per indication: every range | 15178 | 1.98 | 2.11 | 5703 | −609 | 1.91 | -0.20 | +15,596 | orders |
| sig:engineSidePerInd-off | Engine direction acceptance per indication: pooled per range | 14778 | 2.12 | 2.11 | 5664 | −120 | 2.11 | +0.00 | +17,362 | orders |
| sig:accept | Signal acceptance off | 16718 | 2.17 | 2.17 | 6479 | +313 | 2.19 | +0.09 | +20,421 | orders |
| sig:accept-confirm | Signal acceptance and confirmation off | 25978 | 1.95 | 1.93 | 7434 | −2,004 | 1.83 | -0.28 | +25,655 | orders |
| sig:count-100 | Active signals 100 | 2984 | 1.71 | 0.61 | 920 | +711 | 1.92 | -0.19 | +3,184 | orders |
| sig:count-200 | Active signals 200 | 3995 | 1.74 | 1.24 | 1317 | +663 | 1.89 | -0.21 | +4,053 | orders |
| sig:rank-drawdown | Signal ranking drawdown | 9060 | 2.92 | 3.27 | 3345 | +191 | 2.94 | +0.84 | +14,236 | orders |
| sig:rank-lowdd | Signal ranking lowdd | 7788 | 3.09 | 3.69 | 2949 | +74 | 3.11 | +1.00 | +12,831 | orders |
| coord:cooldown-signals | Cooldown signals | 13260 | 1.85 | 1.79 | 3509 | −98 | 1.84 | -0.26 | +12,710 | orders |
| gate:signalLastN-5 | Signals last 5 | 6920 | 2.08 | 2.03 | 3072 | −126 | 2.05 | -0.06 | +8,000 | orders |
| gate:signalLastN-10 | Signals last 10 | 5664 | 2.20 | 2.21 | 2663 | +232 | 2.24 | +0.14 | +7,418 | orders |
| gate:signalLastN-15 | Signals last 15 | 5125 | 2.37 | 2.53 | 2550 | +347 | 2.44 | +0.34 | +7,403 | orders |
| gate:signalLastN-25 | Signals last 25 | 4984 | 2.35 | 2.50 | 2433 | +446 | 2.44 | +0.33 | +7,157 | orders |

## Reading

- Signal variants that raise the proxy PF incl. open in **both** windows: `gate:signalLastN-25` (Signals last 25:
  falling +0.07, rally +0.33; Signals PF closed 0.78 / 2.50) and `sig:accept` off (+0.03 / +0.09 — but signal
  acceptance is a positive coordination and stays on). `gate:signalLastN-15` is +0.34 in the rally and −0.01 in the
  falling window.
- Signal ranking `lowdd` / `drawdown` lift the rally strongly (+1.00 / +0.84, Signals PF closed 3.69 / 3.27) but
  cost 0.02 in the falling window.
- Confirmation off, engine direction acceptance off, cooldown on signals and per-bar crowding caps (rally aside for
  crowd-sig-1) do not help in both windows.
- Candidates for a round 3 (one causal comparison each, against V0 in both windows): H4 or V3 with
  `signals lastN 25`, and with the signal ranking `lowdd`.

Raw runs (not committed): `runs/w-latest/`, `runs/w-rally/` (session.md, html, writeup.md, raw.json, log.txt).
