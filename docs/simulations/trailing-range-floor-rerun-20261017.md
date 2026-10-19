# Range-specific Base PF and execution replay — 17 October 2026

## Purpose and setup

This offline rerun checks whether Base evaluation actually applies the default
PF floor for each range, then follows that Base-qualified engine cohort through
config evaluation, seating and simulated execution. It reuses the cached
four-symbol feed, with 6 h of prehistory (2026-10-14 09:00–15:00 UTC) and a
causal 6 h trading window (15:00–21:00 UTC). Simulated orders only; no venue
requests or live-setting changes. Balance $10, 0.1% equity per unit, 10×
leverage, and 0.20% round-trip cost.

The range defaults are now Wide/fallback 1.00, Micro 1.05, Minimal 1.10,
Short 1.10, General 1.20, and Long 1.30. Base's `baseSetsMinPf` override only
changes the untagged Wide/fallback floor; it preserves configured tagged-range
floors. Each range's observed Base PF is scored against its own minimum.

## Stage results

| stage / cohort | evaluated | passed / executed | net unit-return PF |
|---|---:|---:|---:|
| Base engine pairs, any enabled range | 854 | 4 | per-range below |
| Config evaluation at run start | 376 engine configs | 24 | per-range validation below |
| Real engine seats at run start | — | 12 configs | — |
| Funded engine execution | — | 241 settled orders | 1.404 |
| Separately qualified Signal execution | — | 32 settled orders | 0.095 |
| Combined funded account | — | 273 settled orders | 0.634 |

Base range counts are overlapping pair/range measurements, and do not sum to a
unique-pair denominator. The PF column is the runtime's median gate score among
passed pairs; a no-loss sample uses finite score 4 for qualification rather
than an exact PF.

| Base range | min PF | passed / evaluated | median passed-pair score |
|---|---:|---:|---:|
| Wide / fallback | 1.00 | 0 / 154 | — |
| Micro | 1.05 | 1 / 700 | 1.78 |
| Minimal | 1.10 | 4 / 854 | 1.78 |
| Short | 1.10 | 0 / 89 | — |
| General | 1.20 | 0 / 89 | — |
| Long | 1.30 | 0 / 89 | — |

The Base evaluation rows meet the configured floors for every passed range.
Post-Base config evaluation passed 24/376 at run start. Its validation PF was
6.511 pooled for Micro (16/136 configs) and 4.578 for Minimal (8/224). No
Short, General or Long configs were validated in this run. Only 12 of the 24
passing configs were seated at the initial Real-stage step.

## Executed performance

| engine execution range | settled orders | return PF |
|---|---:|---:|
| Micro | 168 | 2.152 |
| Minimal | 64 | 0.624 |
| Wide | 9 | no loss (finite score 4) |
| Short / General / Long | 0 | — |
| Signals, separate cohort | 32 | 0.095 |
| Combined funded account | 273 | 0.634 |

Engine-only PF remained above 1 overall at 1.404, but Minimal fell below 1
(0.624). Signal orders were separately very weak and pulled the combined book
to PF 0.634. The combined book ended slightly negative, with 2 of 6 green
hours. Therefore the requested “high PF all the way through execution” outcome
was not demonstrated. The pipeline now reports the cohorts separately so a
high Base/validation PF cannot conceal weak execution or Signal performance.

The replay's 66/66 consistency checks passed. A report issue discovered during
review was also corrected: the hourly funnel had been labeled as though each
hour represented distinct seated configs. It now explicitly labels those as
hourly pass instances, which can repeat, and explains that the run-window total
is distinct configs passing at least one evaluation step. Start-of-run
config-evaluation pass counts and Real seats remain separate.

## Reproducibility and artifacts

- Source: `runs/trailing-range-hourly-20261016/feed.json`.
- Settings: `runs/range-floor-rerun-20261017/desk-settings.json`.
- Full Markdown replay: `runs/range-floor-rerun-20261017/replay.md`.
- HTML report: `runs/range-floor-rerun-20261017/html/index.html`.
- Structured output: `runs/range-floor-rerun-20261017/raw.json` and
  `runs/range-floor-rerun-20261017/html/data.json`.

This is one six-hour simulated sample, not evidence of durable profitability or
live execution quality. Do not tune gates on this same sample to manufacture a
high PF; use separate untouched evaluation windows to assess generalization.
