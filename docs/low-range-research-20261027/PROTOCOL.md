# Low-Range research protocol — frozen before scoring

This is an isolated research candidate, not an enabled engine indication. Use the
previously examined `docs/micro-optimization-2026-10-20/reproduction-feed.json.gz`
with its 20 native one-minute symbol series. The fixed evaluation interval is
2026-10-10 00:00–06:00 UTC; the forward observation interval is 06:00–12:00
UTC. One additional day warms indicators without contributing trades or PF.
This retrospective sample is not an untouched holdout or a BingX venue test.

Candidates: all three lookbacks (12, 24, 48 bars), the edge-turn, failed-break,
and breakout methods, and each method independently with no relation, a trend
relation, and a six-bar breakout relation. This first bounded run uses one-minute
bars and the fixed representative protection subset: steps 2/4/6, stop ratios
0.5/1.5/3.5, normal and trailing ratio 0.5, separately for Micro, Minimal and
Short. It does not claim coverage of the full grid, higher timeframes, other
strategies or the actual production pipeline.

One step is provisionally the existing 0.20% fixed range reference. The modeled
round-trip position cost is 0.15%. For net movement `d = step * steps`, gross
target is `cost + d`; gross stop is `cost + max(step, d * stopRatio)`; an active
trailing gap is `cost + max(2 * step, d * trailRatio)`. Settled net returns
deduct the modeled round-trip cost once, using the existing bar simulator.
Exchange price ticks, actual commissions, spread and slippage are not verified.

Freeze the protocol and source hashes before scoring. Use the existing
`rangeCellPass` on each exact cell's prehistory, then `configDirectionEval` at
06:00 UTC on each Base-passed cell and direction, retaining the production
PF, sample, Last-N, range and drawdown gates. Report the exact Base cell and
direction-context denominators, including insufficient cases. The qualified
prehistory PF pools only passing directional context returns. No-loss PF is the
engine's sentinel and must be labeled. Later candidate-tape outcomes use only
the initially qualified cell/direction, exclude open endpoint marks, and retain
all losses. They overlap across configurations and are not independently funded
orders, dynamic per-entry qualification or actual venue fills. Report these
results separately from production post-Base and funded execution evidence.

Research sources: [Wen et al., intraday momentum and reversal](https://doi.org/10.1016/j.najef.2022.101733),
[Svogun and Bazán-Palomino, technical rules and transaction costs](https://doi.org/10.1016/j.intfin.2022.101601),
[Bailey et al., probability of backtest overfitting](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2326253),
and the preprint [short-horizon crypto reversal and costs](https://arxiv.org/abs/2608.21888).
The latter reports a measurable gross short-horizon effect smaller than its
benchmark round-trip cost; it does not establish that these candidates profit.
