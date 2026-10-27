# Low-Range Short integration and evidence — 27 October 2026

The operator's standing rule is `AGENTS.project.md`: every update reports the
post-Base historical PF and validated/evaluated counts and percentage for its
exact cohort, separately from later funded or actual execution. Empty or missing
denominators remain unavailable. Preserve losing and insufficient results.

## Code and settings

The local branch is based on `35112f3`; the final tested economic source is
`aab2892`, whose session source-file hash is
`207927deaedab0a88cb074ee48252928817d7d72cdc2fb8719fc7121c74e2f80`.
Low-Range registers 75 lookback/method/relation combinations and owns only the
Short range's normal, trailing and trailing-only cells. It is **off by default**.
Its Settings controls expose the price step, target steps, SL and trailing
ratios, and hold; the Short range controls minimum timeframe. The default Short
floor is 15m. To use a saved custom focus, add the sources with the Settings
button and ensure the indication kind and Short range are enabled.

The modeled default step is 0.20% of price and round-trip cost is 0.15%.
Gross TP = cost + step × target; SL = cost + max(step, step × target × ratio);
the positive trailing peak gap = cost + max(2 × step, step × target × ratio).
Cost is deducted once on settlement. The resulting default minimum stop is
0.35% and minimum trailing gap is 0.55%. The existing 3% trailing-only ceiling
still applies. These floors are implemented **for Low-Range cells**, not as a
systemwide migration of other strategies. Axis, DCA and Historic Exit do not
yet have matching Low-Range Base proofs and are not admitted for these sources.

Every Low-Range cell is individually screened at Base even when the general
`baseCells` option is off. The actual lane hold is part of its recorded cell
identity. Tape construction and published post-Base selection fail closed on
missing exact Low-Range cells; removed held configs rebuild at their old
distances as held-only. A deterministic test exercises all 75 sources on both
sides, and worker/local Base parity, exact-cell admission, Short-only scope,
stop/trailing floors, settings and held recovery are covered.

## Short-only 20-symbol candidate research

This already-examined feed has 24h indicator warm-up, 24h initial history
(8 October 12:00–9 October 12:00 UTC), then 24h observation (9 October
12:00–10 October 12:00 UTC). The independent 1m/5m/15m lanes do not apply the
runtime's default Short 15m floor. The study uses 46,800 distinct economic
cells: 3,223 passed Base, and **952 / 6,446 direction contexts validated
(14.77%) with historical pooled PF 4.221097**. The later dynamic-gated,
overlapping and unallocated candidate tape had **PF 0.822958**, 14,941 settled
records, 69 endpoint-held and seven positive / 17 negative hours. These are not
funded positions or venue fills. The complete cell inventory and aggregation
audit passed; a separate causal recomputation checked 43 stratified cells.
See `short/` for the protocol, data, per-cell ledger, audits and relation,
lookback and ratio breakdowns. The detail rerun exactly matched the first
Short-only cell ledger and aggregates. An earlier detail attempt stopped at
the memory safeguard after 7,280/46,800 cells and is not presented as a result.

After observing the window, step-4 standalone (later PF 1.213, 163 candidate
closes), step-4 breakout relation (1.113, 947) and step-6 activity (1.135,
1,635) are exploratory follow-up groups, not established winners. Their
overlapping market events and post-hoc choice preclude an independent
profitability claim. Test any proposal on a genuinely untouched period and
normal portfolio/venue constraints before promoting it.

## 15m production-path 20-symbol replay

The frozen replay uses all 75 sources, one independent 15m Short lane, steps
2–6 and the complete configured SL/trailing grid with no-TP siblings. It uses
the same warm-up/history/observation periods, existing qualification gates and
modeled 0.15% cost. Other indication kinds, Axis, DCA and Historic Exit were
outside the study. These are simulated funded allocations, not exchange fills.

The default volatility and trend tactics produced **0/75 Base-passed pairs**:
the available 15m warm-up was shorter than the volatility-rank requirement.
There were no post-Base configs, so PF and validation percentage are
unavailable. An after-observation follow-up disabled entry tactics (not the
Base/post-Base gates or cost): **18/75 pairs passed Base; 559/1,469 configs
validated at the run start (38.05%) with historical PF 25.123751**. In the
following 24h it settled **1,883 funded-model orders / 14 positions**, with
zero held at the end; modeled return PF **0.078058**, net **-$0.162147** from
$10 starting balance, and three positive / 14 flat / seven negative hours.
No live last-N/venue execution is asserted. The report's 66/66 checks, the
independent 16/16 allocation reconciliation checks, and a separately
recomputed Base-cell audit for all 1,883 orders passed. No pruning was
authorized by these results.

| Target | Validated / evaluated | Historical PF | Later settled | Later modeled PF |
| --- | ---: | ---: | ---: | ---: |
| 2 | 6 / 18 (33.33%) | 35.037 | 10 | 0.574 |
| 3 | 40 / 90 (44.44%) | 24.649 | 211 | 0.301 |
| 4 | 99 / 160 (61.88%) | 29.779 | 288 | 0.087 |
| 5 | 116 / 214 (54.21%) | 48.726 | 366 | 0.107 |
| 6 | 127 / 320 (39.69%) | 35.896 | 379 | 0.052 |
| Trailing-only, no TP | 171 / 667 (25.64%) | 18.676 | 629 | 0.032 |

No-TP cells can merge across original target steps and cannot be assigned
truthfully to one step. `runtime-15m/` preserves the frozen source protocol,
step × symbol × hour aggregates and compact audit evidence. The HTML reports
separately contain the candidate research and the modeled runtime results.

## Outstanding before production

Do not promote this losing follow-up or promise hourly success. Full
production-path coverage on 1m/5m/combined lanes, robust fresh multi-window
tests, a systemwide stop/trailing-floor migration, complete UI/browser QA,
and full release CI remain outstanding. Do not reload the running desk or
deploy without its state/ownership reconciliation and release checks. The
local feature branch has not been pushed or merged to the external repository.
Research on cost-aware trading and multiple-testing risk includes
https://arxiv.org/abs/2606.00060 and
https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2308659; neither paper
certifies this configuration.
