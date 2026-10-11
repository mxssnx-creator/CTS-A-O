# x01 18 h session (12 h pre-history) with the x01 desk — 8 Oct 2026

Simulation only (public BingX 1m data, no orders, no keys). Branch `claude/sim3h-fixes` at 7b32e4a, 30 symbols ranked
by 1 h volatility, pre-history 2026-10-06 18:00 → 2026-10-07 06:00 UTC, run 2026-10-07 06:00 → 2026-10-08 00:00 UTC.
x01 desk (`signals` source, vol factor 1, live kinds `trailing`, lanes [15], signal acceptance 48 h / PF 1.3, engine
side acceptance on; desk JSON as given by the operator). Balance $19.70, unit 2 % of equity, 10×, 0.20 % round trip.

Files: `session.md` (full report), `writeup.md`, `html/index.html` (+ `data.json`; open the page for the diagrams).

## Headline

| balance | equity at end (incl. open) | net closed | PF $ closed | PF unit closed | PF unit incl. open | orders | positions | WR | equity max DD | green hours |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| $19.70 → $19.80 | $16.52 (open 46 pos / 6,387 orders, MTM −$3.28) | +$0.10 (+0.52 %) | 1.03 | 0.57 | 0.28 | 4,612 | 71 | 61.3 % | $4.75 (22.34 %) | 12 / 18 |

Consistency checks 55/55 ok; `src/core/report-page.test.ts` passes; the page loads in Chromium with no console error.

- Engine (no signals): 1,837 orders, PF $ 2.44, +$1.02. Signals: 2,775 orders, PF $ 0.72, −$0.92.
- Ranges: Micro 54 · PF 2.47 · +$0.00 — Short 1,408 · 2.43 · +$0.64 — General 166 · 28.17 · +$0.27 — Long 158 · 1.44 ·
  +$0.11 — Wide 51 · 0.93 · −$0.00 — Signals 2,775 · 0.72 · −$0.92.
- The x01 book as sent (signal configs with a trailing stop, `tr > 0` = "Signal · Trailing"): 2,107 orders, PF $ 0.76,
  −$0.54, PF unit 0.56 closed / 0.23 incl. open (4,115 still open, −117.9 units MTM). Fixed-stop signal configs (`tr0`):
  668 orders, PF $ 0.63, −$0.37, PF unit 0.42 / 0.24 incl. open. All kinds: PF unit 0.57 / 0.28 incl. open.
- The day broke at 18:00 (−$0.94, signals −$0.91 of it) and 22:00–23:00 (−$0.69, 1,171 closes at WR 15–21 %); up to
  17:00 the balance had reached $21.73.
- Without the live caps the same orders end at −$11.99 (PF 0.49); the caps (0.75× per symbol × side, 7× gross) bind.
- Live sizing replay: not computed (`CTS_CORE_VARIANTS=0`, as the run was specified).

## Timing (4 vCPU, 16 GB, `CTS_CORE_WORKERS=3`)

`/usr/bin/time -v`: wall 18:18.98 (1,099 s), user 3,040 s + sys 106 s (286 % CPU), max RSS 6.25 GB (6,254,628 kB),
exit 0.

| compute | log window (s) | Base | Tapes | Real / realtime | compute total |
|---|---|---:|---:|---:|---:|
| #1 | 1 – 181 | ~31 → ~75 (≈ 45–60 s) | ~75 → ~165 (≈ 90 s) | ~165 → 190 | 158 s |
| #2 | 212 – 456 | ~215 → ~290 (≈ 60–75 s) | ~290 → ~440 (≈ 150 s) | realtime at 456 | – |
| #3 | 486 – 758 | ~480 → ~600 (≈ 120 s) | ~600 → ~720 (≈ 120 s) | ~720 → 758 | 255 s |
| #4 | 758 – 1,081 | ~770 → ~925 (≈ 155 s) | ~925 → ~1,055 (≈ 130 s) | ~1,055 → 1,081 | 313 s |

Phase bounds are read from the log's 30 s progress lines, so each is ±30 s. Session time to the final compute: 1,081 s
(vs ≈ 1,900 s for the 24 h x01 session on main d5dac9a, 3 workers); Base ≈ 45–155 s per compute (vs ≈ 300 s on main).
The run windows differ (18 h vs 24 h), so read the comparison as a rough one.
