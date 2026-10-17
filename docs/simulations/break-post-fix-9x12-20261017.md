# Break bug-fix replay recheck — 17 October 2026

## Scope

This is a repeat of the already-scored corrected 12-hour replay after the market-gap and opposite-break retest fixes. It checks whether those source changes altered the matched legacy/updated comparison. It reuses the same historical window and settings, so it is a regression check, not new or held-out profitability evidence.

- Source: cached 1-minute candles for BTC, ETH, SOL, XRP, BNB, DOGE, ADA, AVAX and LINK; all data requests blocked.
- Evaluated history: 2026-10-14 04:00–16:00 UTC. Simulated execution: 2026-10-14 16:00–2026-10-15 04:00 UTC.
- Both Base and config selection use the exact 12-hour prehistory; `longH=12`, `preH=12`, `simH=12` were checked before scoring.
- Micro only, eligible 5-minute Break lanes, Signals off, 0.20% round-trip modeled cost, $1,000 balance, 2% equity sizing and 10× leverage. Base floor PF 1.10 with 12 closes.
- Legacy arm: four Break identities. Updated arm: 60 Micro Break identities. No identity, gate, selection or sizing changes were made for this replay.
- Each arm passed all 56 report consistency checks.

## Matched results

| Metric | Legacy 4-ID | Updated 60-ID |
|---|---:|---:|
| Base pairs passed | 4 / 12 | 4 / 60 |
| Post-Base configs validated | 696 / 3,128 | 728 / 2,176 |
| Post-Base validation return PF | 4.104 | 10.345 |
| Funded settled orders | 1,563 | 726 |
| Executed return PF | 0.342 | 3.272 |
| Net at $1,000 start | −$18.768 | +$5.201 |
| Positive / flat / negative hours | 3 / 3 / 6 | 3 / 6 / 3 |
| Compute time / peak RSS | 869 ms / 376 MB | 1,496 ms / 430 MB |

The updated arm retained higher pooled PF with fewer orders. It did not achieve hourly success: three hours were negative, six had no closes, and only three were positive. The source corrections reproduced the earlier arm totals, order count, PF and hourly outcomes exactly on this window.

### Updated arm, UTC exit hour

| Hour | Funded closes | Return PF | Net |
|---|---:|---:|---:|
| 16:00 | 0 | unavailable | $0.000 |
| 17:00 | 0 | unavailable | $0.000 |
| 18:00 | 228 | 0.000 | −$0.797 |
| 19:00 | 48 | 0.630 | −$0.040 |
| 20:00 | 48 | ∞ (no loss) | +$0.317 |
| 21:00 | 188 | 6.012 | +$0.449 |
| 22:00 | 0 | unavailable | $0.000 |
| 23:00 | 2 | 0.000 | −$0.037 |
| 00:00 | 0 | unavailable | $0.000 |
| 01:00 | 0 | unavailable | $0.000 |
| 02:00 | 212 | ∞ (no loss) | +$5.309 |
| 03:00 | 0 | unavailable | $0.000 |

## Audit closure

The offline full-core invocation traversed all 170 test files and exited nonzero on two assertions whose expectations were stale: the indication-lane audit did not include Break's single anchor lane, and a processing check required independently gated Normal/Trailing tapes on every pair. The current lane audit now includes Break and Relate anchors. The processing check now verifies coverage across validated families while retaining its stage-audit assertion. Current targeted reruns pass:

- Break, Micro/Relate market relations and lane routing: 38/38.
- The corrected Base/Main stage coverage check: 1/1 (2m17s).
- Saved default-focus migration and seat regressions: 29/29.
- Empty prehistory/reporting contract: 7/7.
- Session PF/accounting and report cases: 23/23.
- TypeScript typecheck and `npm run build:dev` including packaged worker: pass.

The 128-toggle strategy-independence matrix and the rest of the full-core run passed before the stale expectations were corrected. The monolithic suite was not rerun after the test-only fixes. This replay does not prove continuous hourly profitability, validate the requested 12-symbol feed (only nine cached symbols are available), or authorize live settings or orders.
