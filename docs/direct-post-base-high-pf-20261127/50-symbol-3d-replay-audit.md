# 50-symbol, 3-day direct post-Base replay audit

**Audit date:** 27 November 2026  
**Status:** blocked before scoring; no fresh replay metrics were produced.

## Requested replay

- 50 symbols, 1-minute candles.
- 48 hours of causal prehistory followed by 72 hours of evaluated trading (120 hours total).
- Base PF floors: 1.5, 2.0 and 2.5.
- Direct post-Base/Exec PF floors: 2.0 and 2.5.
- Base windows: Long 10/20/30/40/50; Short 4/8/12/16; Last 1/2/3/4/5. Short and Last each have positive and negative lanes.
- End-evaluation windows: positive Short 8/12/16/20; negative Short 8/12; positive and negative Last 1/2/3/4/5.
- Axis/Block profiles: baseline, both at factor 1, Axis only at factor 1, Block only at factor 1, Axis only at factor 0.1, and Axis plus Block at factor 0.1.

The grid contains 400 Base policies and 60 end policies (24,000 Base×Exec pairs per profile). The six Base/Exec PF-floor pairs are run for baseline and Axis+Block factor 1. Four additional Axis/Block profiles use Base PF 2.5 and Exec PF 2.5, for 16 profiles total and 384,000 profile-path evaluations if a complete feed is supplied.

## Why this replay is unscored

The repository does not contain a 50-symbol, 120-hour candle feed. The available archived feeds inspected for this run are smaller or shorter (including a 24-symbol/48-hour feed, 20-symbol feeds up to 96 hours, and an 8-symbol/72-hour feed). The run was not substituted with one of those cohorts or synthetic prices.

| Metric | 50-symbol requested replay |
|---|---:|
| Feed symbols / duration | unavailable / unavailable |
| Base evaluated / passed | not evaluated |
| Post-Base evaluated / passed | not evaluated |
| Post-Base validation percentage | unavailable |
| Simulated orders / settlements | not evaluated |
| Execute PF | unavailable |
| Positive trading hours / 72 | not evaluated |
| Axis/Block comparison | not evaluated |

“Not evaluated” is not a zero-pass result. No PF, validation rate or hour-success rate can be inferred for this cohort.

## Production and exchange audit boundary

The direct Base→Exec grid remains an offline summary/window-grid research path. It bypasses Main and Real for stage-isolation analysis, but it is not the production Session→Execute adapter. The native adapter has persistent stage ownership and reconciliation requirements and fails closed when asked to run the unsupported direct research policy. I did not make that unsupported path the live default or remove native ownership/reconciliation stages.

The focused exchange and runtime safety suites run against mocks/offline fixtures. They cover lifecycle, parent isolation, stall handling, exchange minimums, Bybit behavior and signed/request-budget handling; they do not verify a connected BingX account, venue fills, balances, control orders, reconnect recovery or live PF. No venue order was submitted. Venue readiness and live execution PF remain unverified because this workspace has no connected exchange credentials or reachable exchange deployment.

## Checks and code change

The change in this branch lets direct research grids specify only Base and Exec windows. It normalizes those two windows, counts only Base×Exec paths and reports zero Main/Real policy choices. Existing four-stage grids retain their four-stage shape. Regression coverage checks both positive/negative direct lanes and the omitted Main/Real choices.

The focused processing and offline exchange suites passed in the earlier isolated run (58 processing checks and 64 exchange/runtime checks). In this audit, the two direct Base→Exec regression cases passed in isolation. The replay test runner was later killed with code 137 when rerun alongside an absent test-file path; the full project typecheck and targeted TypeScript check also exited with code 137. These memory failures do not establish a source defect, but typechecking this revision remains incomplete.

## To complete the requested replay

Provide or make reachable the exact 50-symbol, 1-minute feed covering the 48-hour prehistory and 72-hour evaluation window in the session runner's `--feed` format. Then rerun all 16 profiles and publish actual per-path PF, opened/settled order counts, positive-hour percentages, Base/post-Base evaluated and passing counts, validation percentages, and the Axis/Block comparison. Exchange verification separately requires an authorized reachable test venue/deployment; keep it in paper/demo mode until order/fill/reconciliation parity is demonstrated.

The prior 8-symbol, 12-hour matrix remains available as a separate historical reference at [the earlier HTML report](./index.html); it is not evidence for this requested 50-symbol replay.
