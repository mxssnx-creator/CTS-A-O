# Four-source Signal research — 15 October 2026

The entire pool selected using IS history produced **OOS unit return PF 1.4383917 over 95,610 settled closes**. Including 2,617 endpoint open marks gives PF **1.3526231**. This is independent configuration research, without account capital allocation or runtime activation/acceptance gates; it is not live execution evidence or account ROI. All four sources remain disabled by default.

The public eight-symbol cache was previously used for Tactic research. This new-formula study is therefore a retrospective chronological holdout, not a globally untouched or forward sample. Sources, parameters, symbols, costs, grid and selection rules were frozen before scoring. The subsequent floor/filter clarification was also recorded before outcomes and reproduces existing Signal behavior.

## Frozen sample and model

- Symbols: AVAX, LINK, LTC, SUI, NEAR, DOT, ATOM and APT, all USDT.
- Data: 16 July–14 October 2026, 21:25 UTC, end exclusive; seven indicator-warmup days, 53 IS days, then 30 OOS days beginning **14 September 2026, 21:25 UTC**.
- Each source has independent short/medium ranges, 1/5/15/30-minute lanes and long/short slots. The requested protection grid has 15 Normal, 15 capped Normal+Trailing and nine no-target Trailing-only cells.
- Actual `signalProtects → laneProtect → adjustProtect` behavior maps 2,496 requested config-side cells to **2,448 distinct effective rows**. The 48 duplicated requests are retained as aliases, rather than counted as extra samples.
- Entries use the complete Signal identity, `entrySignal(follow, DEFAULT_TACTICS)`, existing cooldown and the default Signal ATR/price filter of 0.003. Every simulated return deducts 0.2% roundtrip modeled cost. Funding, additional slippage, account budgets and executed-live feedback are excluded.
- IS arrays are physically truncated before calculation. Every exact config-side with at least 30 settled closes, PF ≥1.1 and positive net, also passing PF ≥1.1 including endpoint marks, freezes before any OOS calculation. OOS starts with fresh positions and causal pre-context. Endpoint marks use the final completed lane close and its actual timestamp.

## Current-runtime scope note — 17 October 2026

The frozen run and its pinned source checkpoint used the protocol's lane-scale-then-floor policy. The current Signal tape builder now disables a trailing configuration when its lane-scaled trail is below the 0.5% minimum instead of widening that trail. Across this frozen grid, that current runtime rule removes 64 config IDs (128 long/short rows) from the active set. This historical report remains unchanged and valid for its recorded protocol, but its 688-config selection and PF are not current-runtime qualification evidence. A fresh post-change study needs the original candle cache, which is not part of this repository.

## Complete cohorts

| Frozen OOS cohort | Effective rows | Settled closes | Return PF | PF including marks |
|---|---:|---:|---:|---:|
| All configured cells, diagnostic | 2,448 | 533,118 | **0.8556948** | 0.8464028 |
| Entire IS-qualified pool | 688 | 95,610 | **1.4383917** | 1.3526231 |
| IS-unqualified cells, diagnostic | 1,760 | 437,508 | **0.7186279** | 0.7206724 |

The 688 prequalified rows are all long. No short row qualified in IS. The losing selected **1-minute cohort remains included**: 26,924 closes, PF **0.884358**, or 0.875377 including marks. No OOS source, lane or losing configuration was removed from the frozen pool.

| Source | IS-qualified long rows | IS-qualified short rows | Selected OOS long closes | Selected OOS long PF | Selected OOS short closes/PF |
|---|---:|---:|---:|---:|---|
| Laguerre RSI turn | 150 | 0 | 23,940 | 1.3029713 | 0 / unavailable |
| ATR Chandelier channel flip | 198 | 0 | 30,436 | 1.2295806 | 0 / unavailable |
| Klinger volume-force cross | 166 | 0 | 16,920 | 1.4974568 | 0 / unavailable |
| Relative Vigor Index cross | 174 | 0 | 24,314 | 1.7793434 | 0 / unavailable |

Shorts were calculated independently, not relabeled or omitted. Every one of the 1,224 short rows had 68–969 actual IS closes. All had negative IS net; their maximum settled PF was 0.9940724, below the frozen 1.1 threshold. Mean per-config short IS PF was 0.5743789; that arithmetic mean is distinct from the pooled PF below.

| All-config direction | IS rows | IS closes | IS pooled PF | OOS closes | OOS pooled PF |
|---|---:|---:|---:|---:|---:|
| Long | 1,224 | 247,192 | 1.1970466 | 264,152 | 1.1412005 |
| Short | 1,224 | 241,705 | 0.5729955 | 268,966 | 0.6595471 |

Pools contain overlapping independent configuration copies. Their gross positive/negative sums and return points do not describe a funded portfolio. JSON retains every IS/OOS row, requested aliases, effective protects, both directions, sample bounds, gross sums, no-loss metadata and cohort source/range/lane/type/symbol/hour/day breakdowns. The no-loss score is 4 with an explicit flag and null exact ratio; an empty selected short sample has no measured PF.

## Verification and reproduction

Eight guarded synthetic runner tests passed at the pinned implementation checkpoint, including all 32 source/range/lane prefix checks, poisoned-future selection invariance, physical IS isolation, complete qualified membership, no-target behavior, direct simulator parity and Signal tape-builder parity. The later runtime trail-floor change is documented above; the current regression test verifies the five affected Laguerre short-1m configs are excluded by today's builder while preserving this frozen run's historical policy. The independent runner review approved the protocol implementation before the first outcome.

Independent post-run reconciliation reproduced all 688 selected identities and the row/cohort/mark sums in all eight breakdown dimensions. A direct replay of the first prescribed AVAX Laguerre 1-minute cell exercised 66 long and 58 short closes; every return exactly matched `side × (exit − entry) / entry − 0.002`, with correct direction labels and zero discrepancy.

The complete study and one exact repeat produced byte-identical report and selection files. Both runs verified cache/protocol/source hashes, with no tuning between them. Runtime was 22.76/22.94 seconds; Node measured maximum RSS of approximately 646/675 MiB with a 768 MiB heap limit. The external PID-based RSS observer could not measure this environment; those peak figures come from Node itself. Exchange credential variables were omitted and the tracked outbound-deny guard was loaded before imports.

```sh
NODE_OPTIONS="--require=$PWD/scripts/lib/core-test-offline-guard.cjs" \
CTS_CORE_LIVE=0 CTS_CORE_WORKERS=0 CTS_CORE_COMPARE=0 \
node --max-old-space-size=768 --experimental-strip-types --no-warnings \
  scripts/core-signal-research.mjs \
  --protocol docs/signal-research-protocol-20261015.json \
  --out runs/research-signal-20261015/report.json \
  --selection-out runs/research-signal-20261015/is-selection.json \
  --markdown runs/research-signal-20261015/report.md
```

The original launch additionally omitted the named BingX credential variables and enforced an eight-minute deadline. Raw public candles, full reports, repeat files and run metadata remain in the evidence bundle rather than Git.

| Evidence | SHA256 |
|---|---|
| Protocol | `cc0a3b12a8cb12ced51a8d464f7fba8fac5d9b32ec5bf66eaa8590449259281e` |
| Public cache | `09efe84ff135bad1458995ac36df9bb209e1d56fab671375d171b3c76abdefa4` |
| Source files and protocol fingerprint | `8cb8659442d5e00d3cc87544ac7862ba028d0c7bd6d1143700488a4aaf0c44d6` |
| Frozen qualified-ID list | `9dfd29003e005743808ff885115dc8760a5dba53e2c63e90f75b448d9934b748` |
| Selection artifact, both runs | `098ddf1a8a93b4167e6de6767dbc236f9229f414e5c7211148fd5cc2ab1739ca` |
| Complete report, both runs | `67e4c0545e413d8a6c0c2ad45974f176057dec73bd3962ced357ad1250d75535` |

The report records source-file hashes from the unchanged implementation checkpoint `510b7b421c23c3226f8672a471e9aaa1f1be97bd`. The frozen protocol itself retains its earlier definition checkpoint and the complete pre-outcome clarification chain.
