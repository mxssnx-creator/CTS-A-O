# Micro hold caps and Base-cell proof audit — 28 October 2026

This is an exploratory retrospective comparison on previously examined 20-symbol Binance USD-M candles, not a fresh holdout, funded account result or exchange fill. Historical evaluation is 2026-10-08 12:00–2026-10-09 12:00 UTC; forward execution is the next 24 hours. The study uses 429 scoped Follow indication/lane pairs (three legacy Micro sources plus all first-class Micro and inverse-Micro methods and profiles on their own 1/5/15m anchor lanes), Micro target steps 1–4, one stop ratio, Normal, capped Trailing and trailing-only; all other strategies are off. The 1m lane is enabled for this research only. Existing Base and post-Base gates and 0.15% modeled round-trip cost remain in force. Validation Last-N was 15 for this run; the later Base 40 / Validation 12 request is a separate experiment below.

## Micro caps

| Maximum hold | Micro Base-passing pairs / scoped | Exact Base-passing cells | Validated direction contexts / evaluated built contexts | Historical validation PF | Forward model closes | Forward model PF | Positions opened / closed / held |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 5m | 0 / 429 | 0 | unavailable (0 evaluated) | unavailable | 0 | unavailable | 0 / 0 / 0 |
| 10m | 1 / 429 | 1 | 0 / 2 (0%) | unavailable | 0 | unavailable | 0 / 0 / 0 |
| 15m | 5 / 429 | 12 | 1 / 24 (4.17%) | 3.3132 | 4 | 0.4104 | 4 / 4 / 0 |
| 20m | 7 / 429 | 26 | 17 / 52 (32.69%) | 3.3395 | 140 | 0.4613 | 20 / 20 / 0 |
| 30m | 13 / 429 | 39 | 22 / 78 (28.21%) | 3.6716 | 176 | 0.5385 | 26 / 26 / 0 |
| 50m | 23 / 429 | 65 | 27 / 130 (20.77%) | 3.8619 | 134 | 0.4408 | 29 / 29 / 0 |

The 429-pair scope includes lanes structurally too slow for a particular cap; a 5m cap cannot be evaluated on 15m candles. Post-Base context percentages use both directions of the cells that were actually built after Base, including insufficient contexts. Orders opened / closed / held equal the forward close count / close count / 0 for each arm. This is an unallocated model and multiple configurations can overlap. The best forward PF among these caps was 30m in this examined sample, but every nonempty forward arm lost; 15m has only four closes. It would be unsound to advertise any as a proven profitable or globally optimal default.

At 20/30/50m, Normal PF was 0.5095/0.5278/0.5294, capped Trailing PF 0.2804/0.3326/0.1028, and trailing-only PF 0.5371/0.6718/0.5215. The 15m arm had trailing-only orders only. Time exits were 50/140, 55/176 and 31/134 at 20/30/50m, with PF 0.0268/0.0545/0.0132; stop losses also contributed substantial losses. These are exit-class observations, not proof that a time limit alone causes the forward drop. Every one of the 454 closes matched its admitted tape and validated config ID, and a second run reproduced all six ordered ledgers. Returns matched side-aware price changes less the modeled cost once within 1.05×10⁻⁷ per close using stored float32 tape prices. This is not an independent venue-fill or OHLC-path audit.

## Correctness fixes

- With `baseCells` enabled, `baseRangeProtects` previously dropped `maxHoldMin` in its exact-cell branch. A 10-minute cell could be judged on a 15-minute reference hold even though its 1m executable tape held 10 minutes. The cap now survives on Normal and capped Trailing Base cells.
- Base previously recorded reference-timeframe hold keys for ordinary range cells, while the tape, selector and admission guard used converted lane holds. On 1m and 5m this could reject a measured, validated cell after Base. Proofs now name the actual lane cell, and tape admission compares the effective post-feedback protection to that proof. A changed, unproven protection cannot borrow its source cell's proof; held unqualified positions remain held-only.
- When exact Base cells and independent trailing-only were enabled for legacy range indications, the representative Base grid omitted trailing-only cells. They now receive their own Base evaluation independently of the `baseTrailCells` switch for capped Trailing.

The direct 10/15/20-minute and 1/5/15m proof regression covers Micro, Minimal and Short, Normal/Trailing/trailing-only, a different hold, changed SL and held-position recovery. A timeframe longer than the requested cap stays ineligible; on slower eligible lanes the close time is rounded down to a whole lane bar. This does not establish minute-accurate intrabar fills.

**Upgrade boundary:** previously saved Base cell proofs may use reference-lane keys, and some previously evaluated exact cells may have used the wrong cap. Recompute Base and downstream validated tapes from the original bars/settings after upgrading; do not convert old proof strings into claims of fresh validation. Preserve held protection while doing so. No live state, venue orders or runtime settings were changed here.

## Base 40 / Validation 12 research screen

A separate Short Low-Range step-3 screen applied a counterfactual additional Base Last-N 40 after the existing aggregate Base gate, with Validation Last-N 12, range Last-N 75 and 60m cap. It passed **43/3,900 Base cells**, then **25/86 (29.07%)** direction contexts at historical PF **2.8919**. Its subsequent unallocated candidate screen produced **74 closes at PF 0.8056**. Real walk-forward selection and entry gates modeled **37 closes at PF 0.9638**, with 17/17/0 positions and 37/37/0 orders opened/closed/held. Sixteen of the 37 closes were time exits at PF 0.0738; 13 were TP, six SL and two trail.

Base 40 removed four Base cells versus the prior Base 60 screen but kept the same 25 Active config IDs. The ordered candidate and walk-forward close ledgers matched the Base 60 / Validation 12 case exactly. All 74 candidate closes passed the independent candle/exit/cost auditor; the 37 walk-forward closes matched the audited candidate and source tape. Base Last-N 40 was a **research-only additional gate** in this run; it has not yet been implemented as a production default. Production Validation Last-N 12 and the requested step-hold controls/Auto Mode also remain outstanding in this checkpoint.

## Evidence

- [Detailed HTML: all scoped Base pairs, built config/direction decisions, and forward model closes](report.html).
- [Broad study protocol](broad/protocol.json), [results and every scoped Base row](broad/results.json), with six compressed order ledgers in the same directory. `scripts/study-micro-step-holds.mjs` recreates it; its hash and source/feed hashes are in the protocol.
- `initial/` and `expanded/` retain the smaller exploratory runs and their original frozen runner copies; the broad scope was selected after inspecting those runs and is not untouched data.
- [`base40-validation12/screen`](base40-validation12/screen/), [independent screen audit](base40-validation12/screen-audit.json), and [`walkforward`](base40-validation12/walkforward/) preserve the separate Base-40 comparison.
- The last completed focused suite had 234 tests pass, including prior selection, simulation parity and lane identity tests; TypeScript and targeted lint passed with one existing warning. This does not certify every strategy family, live account, or future PF.
