# Intraday indication extension: evidence and limits

Research checked29October2026. These primary sources inform implementation and testing; none establishes a
profitable1–30m cryptocurrency strategy or allows a low-performing config to inherit a sibling’s validation.

| Primary source | Relevant finding or contract | Application here |
|---|---|---|
| [Bybit Kline](https://bybit-exchange.github.io/docs/v5/market/kline) and [closed-bar WebSocket contract](https://bybit-exchange.github.io/docs/v5/websocket/public/kline) |1/5/15/30m are supported; unfinished candles can change; confirm=true identifies a close | Derived/combined decisions use completed bars. Indication timeframe remains separate from minute execution pricing. |
| [Lo, Mamaysky, Wang, NBER7613](https://www.nber.org/papers/w7613) | Systematic pattern recognition can provide conditional information in the studied daily stock sample | Formalize patterns and compare their own conditional samples; this is not evidence of minute crypto profitability. |
| [Moskowitz, Ooi, Pedersen: Time Series Momentum](https://www.aqr.com/Insights/Research/Journal-Article/Time-Series-Momentum) | Own past returns predict returns at monthly horizons in the studied futures | Explore own-direction and market-relative context separately. Do not transfer its monthly result into an intraday PF claim. |
| [Bailey et al.: Probability of Backtest Overfitting](https://escholarship.org/uc/item/4w1110bb) and [Deflated Sharpe Ratio](https://doi.org/10.2139/ssrn.2460551) | Searching many configurations inflates apparent historical performance | Keep trial counts, causal own-context gates, costs and losing outcomes; do not choose a winner using the later scoring period. |
| [Bybit rate limits](https://bybit-exchange.github.io/docs/v5/rate-limit) | Rolling per-IP and per-UID limits, explicit reset headers and rate-limit replies | Retain bounded shared request budgets, batching, reset-aware delays and the existing no-blind-retry rule for ambiguous writes. |

The existing Micro35-method family includes prior-price/market drawdown, residuals, last/part activity,
acceleration, persistence, trend reclaim, failed break, retest and Tactic/market relations. Relate keeps independent
trend/adaptive and drawdown/activity profiles; Break keeps six cores and independent drawdown/profile cells;
Low-Range keeps650 distinct lookback/method/past-move/trend/break/activity sources. The extension adds every
nonempty1/5/15/30m subset to Micro/Relate/Break and30m eligibility to Inverse/Low-Range, retaining the original
seven subset identities and frozen historical default Break selection. Tactic already supports all four frames.

Fresh selection changes and the exact former factory selection upgrade separately from customized/off Focus.
Affected cached proofs must be backed up and retired; new lanes require their own Base/processed validation.
Registration, synthetic stress and unit parity do not establish high forward PF or completed Real/Live integration.
New studies must fit within72hours TOTAL including prehistory, retaining independent configs and bounded batches.


The new Low-Range/standard Inverse combined lanes use an explicit`c30` suffix (for example`@m1c30`). Old`c`
lanes retain their original three-frame confirmation math, so adding30m does not rewrite an existing set’s
history or reuse its orders. Missing required30m data stays unavailable. Empty Focus means all sources and must
retire old catalogue proof; custom bare sources that acquire new lanes also keep their selection but require new
proof. The maximum Focus size is4000 so the new2961-entry factory selection validates without truncation.

54 focused identity/math/clock/migration checks and46 additional Tactic/Low-Range checks pass; original Micro
checksum and the frozen60 default Break identities remain unchanged. Typecheck, scoped lint and production
build pass. A20-symbol72h synthetic calculation stress passes3391source IDs/8276lane configs,165520calculations
and304930320direction values in19.626s, max sampled batch-end heap93.04MiB, process high-water RSS285.34MiB,
with one symbol’s derived memos retained at a time and a768MiB heap ceiling. Result checksum:
`2de94a6051c5699fafac566742f1e84e885c63709fa222819b25f149789b6c7f`.

This extension is a draft, not a completed execution-price adapter. Investigation found that a15min maximum on
a30m indication becomes hold0 in`laneProtect`, and is skipped by Base and the tape builder. Rounding it to one
30m bar would violate that15min cap. Correct1m pricing, wall-clock hold identity, cursor/ATR/Axis projection,
Base/Main parity and retained ownership must be integrated and tested before enabling that execution path.
Full persistent Main/Real processing and final Active→Live mapping remain pending too.
