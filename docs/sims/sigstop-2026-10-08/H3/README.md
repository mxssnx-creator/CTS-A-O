# H3 — V3 with hold 12 h and tight trails (signals.holdH 12, signals.trailing trailOfTp [0.25, 0.4, 0.6], slOfTp 2)

Desk `docs/sims/sigstop-2026-10-08/desks/H3.json` (round 2, see `desks/README.md`), branch `claude/sim3h-fixes` at
3e11cdc (11053c8 + one sims-only commit). 30 symbols, 24 h pre-history, 24 h run, focus all, balance $20,
`CTS_CORE_COMPARE=0 CTS_CORE_VARIANTS=1 CTS_CORE_WORKERS=3`, 4 cores / 16 GB; the two sessions ran one after the other.

Unit basis: every order at one unit after the 0.20 % round-trip cost; net = Σ r × 100. *PF incl. open* = gross
profit / gross loss over the closed orders' r plus the open orders' mark r at the end (raw.json `openEnd.mtmR`, rule
"exact"). Signals are split by the config id's trail (`tr>0` trailing, `tr0` fixed) and by side. PF closed per range
matches the report's "PF unit".

## Result against V0 / V3 (PF incl. open, total / Signals)

| window | V0 | V3 | **H3** | H3 beats V0? |
|---|---|---|---|---|
| falling (w-latest) | 0.40 / 0.39 | 0.34 / 0.33 | **0.38 / 0.37** | no (−0.02 / −0.02) |
| rally (w-rally) | 2.78 / 2.81 | 2.82 / 2.85 | **1.83 / 1.71** | no (−0.95 / −1.10) |

**H3 does not beat V0 in either window.** In the falling market it is a little better than V3 (0.38 vs 0.34) but
under V0; in the rally it is far worse than both. The tight trails (exits at 0.25–0.6× the target behind the price,
stop 2× the target) cut the signals' winners: Signals' PF closed falls from 8.66 (V0) / 5.76 (V3) to 2.00 in the rally,
while in the falling market it gains nothing on closed orders (0.53 vs 0.99 V0 / 0.63 V3). Fewer orders stay open at
the end (falling 4,698 signal orders vs 7,927 V0; rally 3,558 vs 3,501), but their mark is worse in the falling
window (PF open 0.04 vs 0.11).

## w-latest — 2026-10-07T00:00 → 2026-10-08T00:00 UTC (the latest 24 h, a falling market)

`checks: 55/55 ok` · wall time 3,149 s (session runSeconds 3,098; the 108 variant reruns included) · baseline variant "reproduces the session run" · book as live sizes it: $20.00 → $16.05 closed (−19.73 %), equity at the end $13.48 (42 positions / 5,550 orders open, MTM −$2.57), PF $ 0.61, PF unit 0.52

| group | orders closed | PF closed | open at end | PF open (mark) | PF incl. open | net closed | net incl. open |
|---|---|---|---|---|---|---|---|
| Total | 15,701 | 0.52 | 5,550 | 0.05 | 0.38 | −15,603.2 % | −28,992.5 % |
| Micro | 87 | 0.37 | 5 | 0.00 | 0.37 | −33.8 % | −33.9 % |
| Short | 3,825 | 0.46 | 673 | 0.05 | 0.39 | −3,610.5 % | −4,826.3 % |
| General | 363 | 0.65 | 56 | 0.18 | 0.61 | −246.0 % | −295.3 % |
| Long | 267 | 0.56 | 118 | 0.28 | 0.51 | −337.0 % | −461.6 % |
| Wide | 104 | 0.39 | 0 | – | 0.39 | −48.4 % | −48.4 % |
| Signals | 11,055 | 0.53 | 4,698 | 0.04 | 0.37 | −11,327.4 % | −23,327.0 % |
| Signals trailing (tr>0) | 6,179 | 0.59 | 2,327 | 0.03 | 0.38 | −4,690.6 % | −11,295.0 % |
| Signals fixed (tr0) | 4,876 | 0.48 | 2,371 | 0.06 | 0.35 | −6,636.8 % | −12,032.0 % |
| Signals long | 652 | 0.11 | 0 | – | 0.11 | −3,179.5 % | −3,179.5 % |
| Signals short | 10,403 | 0.60 | 4,698 | 0.04 | 0.39 | −8,147.9 % | −20,147.6 % |
| Total long | 3,373 | 0.26 | 177 | 0.29 | 0.26 | −6,855.9 % | −7,043.0 % |
| Total short | 12,328 | 0.62 | 5,373 | 0.04 | 0.41 | −8,747.3 % | −21,949.4 % |

### Variant rows that touch signals (CTS_CORE_VARIANTS=1, the same tapes, one switch each)

The dump keeps each variant's open orders as count and net only, so *PF incl. open (est.)* = gross profit ÷ (gross loss + |open net|) when the open net is negative, (gross profit + open net) ÷ gross loss when positive. It ranks the variants against the baseline row's own estimate (Δ); the exact baseline value is in the table above.

| variant | change | orders | PF closed | open at end | open net | PF incl. open (est.) | Δ vs baseline | Signals PF closed |
|---|---|---|---|---|---|---|---|---|
| Baseline (as run) | – | 15,701 | 0.52 | 5,550 | -13,389 % | 0.37 | – | 0.53 |
| Signals: at most 1 per bar | Signals configs per symbol × side × bar unlimited → 1 | 5,304 | 0.48 | 1,012 | -1,707 % | 0.41 | +0.04 | 0.51 |
| Signals: at most 3 per bar | Signals configs per symbol × side × bar unlimited → 3 | 6,444 | 0.49 | 1,410 | -2,559 % | 0.40 | +0.03 | 0.50 |
| Signals: at most 10 per bar | Signals configs per symbol × side × bar unlimited → 10 | 9,816 | 0.50 | 2,721 | -5,986 % | 0.38 | +0.01 | 0.51 |
| Signals off | signal orders excluded (no active signal) | 4,646 | 0.48 | 852 | -1,390 % | 0.41 | +0.04 | – |
| Signal confirmation off | confirmation on → off | 20,452 | 0.52 | 6,380 | -16,050 % | 0.38 | +0.01 | 0.52 |
| Engine direction acceptance off | engine direction acceptance on → off | 18,862 | 0.59 | 6,857 | -12,795 % | 0.43 | +0.07 | 0.53 |
| Engine direction acceptance window 3 h | engine direction acceptance window 3 h (as run: PF 1.05 · 24 h · 30 closes) | 14,830 | 0.51 | 5,495 | -12,242 % | 0.37 | +0.00 | 0.53 |
| Engine direction acceptance window 12 h | engine direction acceptance window 12 h (as run: PF 1.05 · 24 h · 30 closes) | 15,304 | 0.51 | 5,409 | -13,363 % | 0.36 | −0.01 | 0.53 |
| Engine direction acceptance window 48 h | engine direction acceptance window 48 h (as run: PF 1.05 · 24 h · 30 closes) | 16,482 | 0.54 | 5,943 | -13,007 % | 0.39 | +0.02 | 0.53 |
| Engine direction acceptance PF 1.2 | engine direction acceptance PF 1.2 (as run: PF 1.05 · 24 h · 30 closes) | 14,692 | 0.49 | 5,512 | -13,342 % | 0.35 | −0.02 | 0.53 |
| Engine direction acceptance PF 1.3 | engine direction acceptance PF 1.3 (as run: PF 1.05 · 24 h · 30 closes) | 14,688 | 0.49 | 5,512 | -13,342 % | 0.35 | −0.02 | 0.53 |
| Engine direction acceptance 10 closes | engine direction acceptance 10 closes (as run: PF 1.05 · 24 h · 30 closes) | 15,701 | 0.52 | 5,550 | -13,389 % | 0.37 | +0.00 | 0.53 |
| Engine direction acceptance 60 closes | engine direction acceptance 60 closes (as run: PF 1.05 · 24 h · 30 closes) | 15,701 | 0.52 | 5,550 | -13,389 % | 0.37 | +0.00 | 0.53 |
| Engine direction acceptance per indication: every range | direction groups split by indication on mc, mn, mp, sh, gn, lg, wide (as run: mc) | 16,682 | 0.55 | 6,059 | -13,159 % | 0.40 | +0.03 | 0.53 |
| Engine direction acceptance per indication: pooled per range | direction groups split by indication on no range (as run: mc) | 15,681 | 0.52 | 5,545 | -13,389 % | 0.37 | −0.00 | 0.53 |
| Signal acceptance off | per-group signal acceptance on → off | 20,142 | 0.65 | 7,287 | -17,413 % | 0.45 | +0.08 | 0.69 |
| Signal acceptance and confirmation off | per-group signal acceptance and signal confirmation on → off, together | 27,563 | 0.66 | 8,648 | -20,969 % | 0.48 | +0.11 | 0.69 |
| Active signals 100 | active signals all → 100 | 4,788 | 0.46 | 876 | -1,321 % | 0.40 | +0.04 | 0.24 |
| Active signals 200 | active signals all → 200 | 4,878 | 0.48 | 958 | -1,565 % | 0.41 | +0.04 | 0.52 |
| Signal ranking drawdown | ranked by net → drawdown (net ÷ drawdown) | 7,882 | 0.46 | 2,867 | -5,869 % | 0.34 | −0.03 | 0.45 |
| Signal ranking lowdd | ranked by net → lowdd (net ÷ drawdown²) | 6,640 | 0.48 | 2,382 | -4,652 % | 0.35 | −0.02 | 0.46 |
| Cooldown signals | cooldown off → signals | 13,269 | 0.54 | 2,787 | -6,955 % | 0.43 | +0.06 | 0.57 |
| Conflict block on | no entry against an open opposite position off → on | 9,085 | 0.52 | 2,571 | -5,266 % | 0.40 | +0.04 | 0.56 |
| Negative-hour hedge on | hedge signals while the book loses off → on | 15,701 | 0.52 | 5,550 | -13,389 % | 0.37 | +0.00 | 0.53 |
| Signals last 5 | signal validation and entry last-N off → 5 | 8,862 | 0.46 | 2,550 | -6,141 % | 0.34 | −0.02 | 0.44 |
| Signals last 10 | signal validation and entry last-N off → 10 | 7,881 | 0.46 | 2,072 | -4,915 % | 0.35 | −0.01 | 0.44 |
| Signals last 15 | signal validation and entry last-N off → 15 | 7,504 | 0.47 | 1,910 | -4,383 % | 0.36 | −0.01 | 0.45 |
| Signals last 25 | signal validation and entry last-N off → 25 | 7,554 | 0.50 | 1,675 | -3,527 % | 0.40 | +0.03 | 0.53 |

## w-rally — 2026-10-05T15:00 → 2026-10-06T15:00 UTC (the 6 Oct rally)

`checks: 54/55 ok — FAILED: execution: strategy type axis executed orders` (the session exits 1 on it, as V0 and V3 did in this window: Wide skips lastN 223 · engineSide 214 · symPf 87 of 524, nothing crashed) · wall time 2,456 s (runSeconds 2,419) · baseline variant "reproduces the session run" · book as live sizes it: $20.00 → $27.36 closed (+36.79 %), equity at the end $27.03 (28 positions / 4,266 orders open, MTM −$0.32), PF $ 2.19, PF unit 2.05

| group | orders closed | PF closed | open at end | PF open (mark) | PF incl. open | net closed | net incl. open |
|---|---|---|---|---|---|---|---|
| Total | 14,785 | 2.05 | 4,266 | 1.02 | 1.83 | 15,657.7 % | 15,744.5 % |
| Micro | 141 | 0.68 | 3 | 0.00 | 0.68 | −16.3 % | −16.4 % |
| Short | 1,196 | 2.47 | 217 | 2.37 | 2.46 | 1,452.7 % | 1,539.1 % |
| General | 521 | 2.02 | 136 | 7.82 | 2.31 | 589.0 % | 798.6 % |
| Long | 562 | 2.38 | 352 | 11.62 | 3.14 | 1,105.1 % | 1,869.6 % |
| Wide | 0 | – | 0 | – | – | 0 | 0 |
| Signals | 12,365 | 2.00 | 3,558 | 0.74 | 1.71 | 12,527.2 % | 11,553.5 % |
| Signals trailing (tr>0) | 6,538 | 2.14 | 1,615 | 0.76 | 1.79 | 6,029.4 % | 5,608.1 % |
| Signals fixed (tr0) | 5,827 | 1.89 | 1,943 | 0.72 | 1.64 | 6,497.8 % | 5,945.4 % |
| Signals long | 12,315 | 1.99 | 3,558 | 0.74 | 1.71 | 12,451.8 % | 11,478.1 % |
| Signals short | 50 | 3.24 | 0 | – | 3.24 | 75.4 % | 75.4 % |
| Total long | 14,692 | 2.05 | 4,266 | 1.02 | 1.83 | 15,599.9 % | 15,686.6 % |
| Total short | 93 | 1.94 | 0 | – | 1.94 | 57.8 % | 57.8 % |

### Variant rows that touch signals (CTS_CORE_VARIANTS=1, the same tapes, one switch each)

The dump keeps each variant's open orders as count and net only, so *PF incl. open (est.)* = gross profit ÷ (gross loss + |open net|) when the open net is negative, (gross profit + open net) ÷ gross loss when positive. It ranks the variants against the baseline row's own estimate (Δ); the exact baseline value is in the table above.

| variant | change | orders | PF closed | open at end | open net | PF incl. open (est.) | Δ vs baseline | Signals PF closed |
|---|---|---|---|---|---|---|---|---|
| Baseline (as run) | – | 14,785 | 2.05 | 4,266 | 87 % | 2.05 | – | 2.00 |
| Signals: at most 1 per bar | Signals configs per symbol × side × bar unlimited → 1 | 3,082 | 2.14 | 823 | 1,040 % | 2.49 | +0.44 | 1.52 |
| Signals: at most 3 per bar | Signals configs per symbol × side × bar unlimited → 3 | 4,253 | 2.04 | 1,087 | 953 % | 2.27 | +0.22 | 1.66 |
| Signals: at most 10 per bar | Signals configs per symbol × side × bar unlimited → 10 | 7,865 | 1.96 | 1,939 | 798 % | 2.07 | +0.02 | 1.80 |
| Signals off | signal orders excluded (no active signal) | 2,420 | 2.30 | 708 | 1,060 % | 2.73 | +0.68 | – |
| Signal confirmation off | confirmation on → off | 22,885 | 1.87 | 5,115 | -1,245 % | 1.78 | −0.28 | 1.82 |
| Engine direction acceptance off | engine direction acceptance on → off | 15,621 | 1.95 | 4,611 | -347 % | 1.91 | −0.14 | 2.00 |
| Engine direction acceptance window 3 h | engine direction acceptance window 3 h (as run: PF 1.05 · 24 h · 30 closes) | 13,747 | 1.82 | 4,124 | -837 % | 1.72 | −0.33 | 2.00 |
| Engine direction acceptance window 12 h | engine direction acceptance window 12 h (as run: PF 1.05 · 24 h · 30 closes) | 14,130 | 1.89 | 4,195 | -150 % | 1.87 | −0.18 | 2.00 |
| Engine direction acceptance window 48 h | engine direction acceptance window 48 h (as run: PF 1.05 · 24 h · 30 closes) | 14,790 | 2.05 | 4,266 | 87 % | 2.05 | +0.00 | 2.00 |
| Engine direction acceptance PF 1.2 | engine direction acceptance PF 1.2 (as run: PF 1.05 · 24 h · 30 closes) | 14,557 | 2.00 | 4,213 | -94 % | 1.99 | −0.06 | 2.00 |
| Engine direction acceptance PF 1.3 | engine direction acceptance PF 1.3 (as run: PF 1.05 · 24 h · 30 closes) | 13,979 | 1.89 | 4,183 | -180 % | 1.87 | −0.18 | 2.00 |
| Engine direction acceptance 10 closes | engine direction acceptance 10 closes (as run: PF 1.05 · 24 h · 30 closes) | 14,785 | 2.05 | 4,266 | 87 % | 2.05 | +0.00 | 2.00 |
| Engine direction acceptance 60 closes | engine direction acceptance 60 closes (as run: PF 1.05 · 24 h · 30 closes) | 14,785 | 2.05 | 4,266 | 87 % | 2.05 | +0.00 | 2.00 |
| Engine direction acceptance per indication: every range | direction groups split by indication on mc, mn, mp, sh, gn, lg, wide (as run: mc) | 14,987 | 2.05 | 4,310 | -388 % | 2.00 | −0.05 | 2.00 |
| Engine direction acceptance per indication: pooled per range | direction groups split by indication on no range (as run: mc) | 14,728 | 2.05 | 4,263 | 87 % | 2.05 | +0.00 | 2.00 |
| Signal acceptance off | per-group signal acceptance on → off | 17,953 | 2.12 | 5,480 | 512 % | 2.15 | +0.10 | 2.09 |
| Signal acceptance and confirmation off | per-group signal acceptance and signal confirmation on → off, together | 28,217 | 1.88 | 6,410 | -1,136 % | 1.81 | −0.24 | 1.85 |
| Active signals 100 | active signals all → 100 | 3,095 | 1.99 | 961 | 955 % | 2.29 | +0.24 | 1.00 |
| Active signals 200 | active signals all → 200 | 4,335 | 1.93 | 1,589 | 660 % | 2.08 | +0.03 | 1.48 |
| Signal ranking drawdown | ranked by net → drawdown (net ÷ drawdown) | 9,452 | 2.80 | 2,640 | 167 % | 2.83 | +0.78 | 3.04 |
| Signal ranking lowdd | ranked by net → lowdd (net ÷ drawdown²) | 7,992 | 2.78 | 2,421 | 30 % | 2.79 | +0.73 | 3.07 |
| Cooldown signals | cooldown off → signals | 11,297 | 1.62 | 3,486 | 628 % | 1.67 | −0.38 | 1.47 |
| Conflict block on | no entry against an open opposite position off → on | 14,171 | 2.05 | 4,260 | 66 % | 2.05 | −0.00 | 1.95 |
| Negative-hour hedge on | hedge signals while the book loses off → on | 14,785 | 2.05 | 4,266 | 87 % | 2.05 | +0.00 | 2.00 |
| Signals last 5 | signal validation and entry last-N off → 5 | 6,706 | 2.11 | 2,381 | 336 % | 2.16 | +0.11 | 2.01 |
| Signals last 10 | signal validation and entry last-N off → 10 | 5,566 | 2.20 | 1,997 | 548 % | 2.30 | +0.25 | 2.13 |
| Signals last 15 | signal validation and entry last-N off → 15 | 4,975 | 2.34 | 1,812 | 613 % | 2.47 | +0.42 | 2.38 |
| Signals last 25 | signal validation and entry last-N off → 25 | 4,771 | 2.40 | 1,795 | 594 % | 2.54 | +0.49 | 2.53 |

## Signal variant rows that helped (Δ PF incl. open est. vs baseline, falling / rally)

Helped in BOTH windows:

- **Signals last 25** (signal validation and entry last-N off → 25): +0.03 / +0.49; Signals PF closed 0.53 / 2.53.
- **Signals: at most 1 per bar** (signal configs per symbol × side × bar unlimited → 1): +0.04 / +0.44; at most 3:
  +0.03 / +0.22.
- **Active signals 100**: +0.04 / +0.24 (but Signals PF closed 0.24 / 1.00 — the gain is from trading fewer
  signals, not better ones). Active 200: +0.04 / +0.03.
- **Signal acceptance off**: +0.08 / +0.10 (turns off a positive coordination; with confirmation also off it is
  +0.11 / −0.24).
- Signals off entirely: +0.04 / +0.68 — on this desk the signals pull the book's PF incl. open down in both windows.

Helped in one window only: ranking `drawdown` / `lowdd` (−0.03 / +0.78, −0.02 / +0.73); Signals last 5 / 10 / 15
(−0.02…−0.01 / +0.11…+0.42); engine direction acceptance off (+0.07 / −0.14); cooldown signals (+0.06 / −0.38).

None of these were run with V0 in this round, so they are leads for a next variant (H3 + signals last 25 or one signal
per bar), not a default change (docs/positive-coordinations.md).

Raw runs (not committed): `runs/w-latest/`, `runs/w-rally/` (session.md, html, writeup.md, raw.json, log.txt).
