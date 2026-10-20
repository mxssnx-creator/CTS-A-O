> **Superseded source:** these numbers use the withdrawn per-symbol full-config gate. They cannot certify the final admission-scope source. Frozen protocols and losses are retained for provenance.

# Inverse expansion — 20 October 2026

102 independent indication identities, 1/5/15m independent and completed combined lanes, ordinary production TP/SL and Trailing cells. **Technical coverage is improved; consistently profitable Long/Short/live trading is not established.** All thresholds remain unchanged.

Code checkpoint `b1018e2063195ad66739f6ac1f4172934c8aa86e` maps to published `026c09f00ed666ffedbc46823e51a3447642856e` (identical Git tree). Main, running accounts and deployments were not changed. Operator requirements for future project work are recorded in AGENTS.project.md.

## Frozen twelve-symbol economic studies

All are cached public-history replays after 0.15% modeled round-trip cost. Base-qualified exact pairs/ranges/targets feed independently qualified config/symbol/direction contexts; only accepted modeled entries appear in primary PF. External sizing multipliers are removed by the canonical unit-return helper; intrinsic DCA leg returns remain part of that strategy's model. These are virtual cohorts before account funding and margin feasibility, not venue-owned fills.

| Run | Selection / source | Base pairs | Tapes | Executed configs | Settled closes | Settled PF | Open marks | Settled + marks PF | Positive/flat/negative settled hours |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 6h-final | 24h / 120h | 29/510 | 3656 | 27 | 46 | 0.789 | 30 | 0.143 | 2/2/2 |
| 24h-r2 | 24h / 120h | 214/510 | 62816 | 362 | 967 | 8.200 | 44 | 2.587 | 13/10/1 |
| long-history-final | 336h / 360h | 29/510 | 3656 | 6 | 6 | 0.465 | 72 | 0.013 | 1/2/3 |

The 6h cases use 6h evaluated Base prehistory and 6h simulated trading. The 24h acceptance case uses explicitly frozen 24h Base prehistory and 24h simulation. Older source candles initialize indicators and supply strictly causal selection/Last-N history; they do not silently expand Base's measured window. The public candles cover 1–17 October; this is not a fresh live feed. The archive is previously examined and these windows overlap. Do not add them or select a new production setting from them as though it had independent holdout proof.

The 24h cohort executes **17 Long closes at PF 0.099** and **950 Short closes at PF 47.073**, across APT/ARB/ATOM/AVAX/DOT. All twelve symbols are calculated; seven have no executed settled sample. Its 44 open marks all lose, with net -110.682182 unit percentage points. The high pooled settled PF does not qualify the losing Long cohort.

The longer-history case mechanically completes but **fails economically**: 6 settled closes, 72 losing endpoint marks and combined PF 0.013. It is a sensitivity test, not a selected default. Long's two wins have no finite measured PF and prove no stable edge. The ordinary engine selection default remains 24h. All three runs have zero Base/config/context qualification violations. Positive settled hours do not prove positive hourly equity.

## Actual strategy and range configuration

No private Inverse protection grid is substituted. The factory grid's complete TP × SL × Trail × hold cells are used, with effective floor duplicates removed. Trailing multipliers are 0, 0.25, 0.5 and 0.75 of TP; 0 is Normal TP/SL. Standard maximum holds are 16h and 24h. Micro's 1m floor is preserved (5m minimum); Short, General and Long start at 15m. Minimal is eligible on 1/5/15m.

| Range | TP price distance | SL/TP ratios | Normal / Trailing physical cells per reference grid |
|---|---|---|---:|
| Micro | 0.35–0.95% at current cost; 0.20–0.80% net target | 1–5, step 0.25; own net stop floor + cost | 238 / 714 |
| Minimal | 0.80–1.60%, step 0.10% | 1.5–3, step 0.25 | 126 / 378 |
| Short | 1.80–2.80%, step 0.20% | 1–2.5, step 0.25 | 84 / 252 |
| General | 3.00–4.40%, step 0.20% | 0.25–1.5, step 0.25; 1% stop floor | 96 / 288 |
| Long | 4.60–6.40%, step 0.20% | 0.25–1.5, step 0.25; 1.6% stop floor | 120 / 360 |

Dedicated `inverse-mc-*` identities use Micro and, under the existing default Micro rule, Minimal. Other Inverse identities use Minimal/Short/General/Long. Optional Wide and Minimal plus remain disabled in the factory normal grid. Independent DCA/DCA Active/Axis configurations are built through the production builders; their execution toggles remain DCA on, DCA Active/Axis off. Independent historic Exit and Signals processing are outside these economic studies and retain separate correctness fixtures. Trailing-only is a distinct explicitly tested protection shape, not silently added to the capped factory grid.

In 24h, 852 closes are Trailing (PF 42.655), 115 DCA (PF 1.020), and zero Normal TP/SL closes. Normal was computed and independently evaluated, including 18 eligible 5m configs at the start; no accepted entry closed in that window. In the long-history study, two Normal TP/SL trades actually close and lose (PF 0); four Trailing trades close. Micro/Short/General/Long produce no accepted settled execution in these windows. Constructed twelve-symbol integration tests separately exercise full physical Normal and Trailing range grids with closes on both sides; that is correctness evidence, not profitable market evidence.

## Calculations and selection

38 opposite/confirmed variants of 19 established sources; 40 math/market variants over 10/20/40/80 bars; 12 dedicated Micro identities over 10/20 bars; 12 named BTC/ETH pair comparisons (spread/residual × 10/20/40). Shared rolling contexts and immutable state arrays avoid recomputing identical standard/Micro signals. Each source/profile/range/protection/lane/symbol/direction retains its independent economic identity. Follow executes the already-inverted entry; Revert cannot undo it. No post-hoc return negation.

Math covers log-price z-score, impulse, acceleration, rolling OLS deviation, wick rejection, failed prior-channel break and indicator consensus. Market methods use the equal-weight universe, prior-window beta and relative moves/shocks. Pair methods use timestamp-aligned named peers, prior-window return covariance/beta and stretched log-ratio or beta-neutral three-bar residual moves, with positive prior correlation. Missing/self/ambiguous peers are neutral; gaps require fresh measured fits. Each symbol is a separately qualified traded leg; these are reference-pair signals, not atomic two-leg arbitrage orders or guaranteed hedges. Completed bars, fresh warmup and prefix causality are checked.

All 102 identities join the factory Focus (199 entries). v36 migrates only the exact former default settings/preset selection; custom selections, empty-all selections and deliberately disabled types are preserved. The settings UI shows coverage and can include the family explicitly. Live promotion still requires independent matching modeled and owned execution evidence.

## Longer history and performance

Explicit longer engine/symbol windows extend requested backfill, storage retention and lane construction, including the sliced-Base cache identity. Saved lane preferences stay unchanged. Restarted short caches refetch older data. Tests cover requested 168/336/720/1440-hour windows and actual 336h-plus-warmup retention across lanes. The available public archive supports 336h selection with 360h source, not a claimed real 60-day replay. Unavailable source coverage is rejected by the audit; partial venue history is warned and remains limited evidence.

| Run | Base / tapes / walk / reporting seconds | Total seconds | Peak RSS MiB |
|---|---|---:|---:|
| 6h-final | 3.99 / 33.63 / 3.66 / 1.20 | 42.48 | 928.0 |
| 24h-r2 | 7.07 / 346.50 / 56.15 / 3.72 | 413.44 | 3463.7 |
| long-history-final | 9.06 / 156.68 / 102.12 / 21.24 | 289.11 | 1754.5 |

102-variant 120h cold calculation benchmarks span 994.4–2255.8 ms under shared-host load, 11,162,880 state values, warm full-cache lookup 2.818 / 2.092 ms, peak RSS 394.2 / 450.1 MiB. Identical original 58-variant comparisons: cold 613.9 → 527.2 ms; warm 0.983 → 1.048 ms; peak 451.2 → 384.2 MiB. The original state digest is identical before/after. These are measurements, not universal speed guarantees, production tick latency or venue throughput. The audit runs in one process; real worker/local/serialization parity has separate fixtures.

## Verification and preserved failures

`verification` in the compressed evidence records completed check counts and log hashes. Typecheck, production build, changed-file lint and dev/built desktop/phone UI pass. Focus-size and generic source/lane fixture assumptions found by the broad run were corrected without weakening strategy gates. Missing BTC/ETH data now has its own neutral-evidence case and appropriate reference-universe coverage. The original broad attempt was interrupted after those diagnostics; the final complete run is separately identified.

    {
      "inverse-followup-targeted": {
        "tests": 75,
        "pass": 75,
        "fail": 0,
        "cancelled": 0,
        "skipped": 0,
        "duration_ms": 55018.098543,
        "completed": true,
        "logSha256": "4b5b86a3ae49a887e4fbf97215e73771217f667ab7f95d1994623a93755e0a70"
      },
      "inverse-followup-fixes": {
        "tests": 314,
        "pass": 314,
        "fail": 0,
        "cancelled": 0,
        "skipped": 0,
        "duration_ms": 3230.665826,
        "completed": true,
        "logSha256": "8a0b4d152c10c1a4ffe422611e2bbc784299c776732dcbbb5c884eed65398ff8"
      },
      "inverse-followup-symmetry": {
        "tests": 19,
        "pass": 19,
        "fail": 0,
        "cancelled": 0,
        "skipped": 0,
        "duration_ms": 25301.984933,
        "completed": true,
        "logSha256": "541d84b0780a57ef0ba28f92fd853354f5f3ddd7908d1475c32fc7b9e7e9105d"
      },
      "inverse-processing-source-only": {
        "tests": 3,
        "pass": 3,
        "fail": 0,
        "cancelled": 0,
        "skipped": 0,
        "duration_ms": 13683.412787,
        "completed": true,
        "logSha256": "bdaf42c6190ae5cf35f2c102568e37f0cfb5bf6e8969a7e47325a6d415dd4d94"
      },
      "inverse-full-core-final": {
        "completed": false,
        "logSha256": "1bff05c5582fc844d9dc5d1f761cf0ec7f8a8462d7ff848eeda3ac9fc79c28f5"
      },
      "ui": [
        {
          "name": "dev",
          "vp": "desktop",
          "errors": [],
          "includeButtonWorks": true,
          "overflow": false
        },
        {
          "name": "dev",
          "vp": "phone",
          "errors": [],
          "includeButtonWorks": true,
          "overflow": false
        },
        {
          "name": "built",
          "vp": "desktop",
          "errors": [],
          "includeButtonWorks": true,
          "overflow": false
        },
        {
          "name": "built",
          "vp": "phone",
          "errors": [],
          "includeButtonWorks": true,
          "overflow": false
        }
      ],
      "typecheck": {
        "passed": true
      },
      "lint": {
        "passed": true
      },
      "build": {
        "passed": true
      }
    }

The failed redundant DCA harness assertion and the interrupted/resealed studies retain their frozen protocols in the evidence archive. No result from an incomplete attempt is promoted. Earlier 58-variant studies remain in `inverse-12-symbol-20261020.*` and cannot certify this expanded cohort. Actual live fills, funded-account feasibility and durable Long/Short profitability remain unresolved.

## 24h post-Base configuration coverage

Built cells are constructed post-Base configurations, not unfiltered full-catalog passes. Qualified counts are snapshots; actual entry gates are rechecked independently. Omitted range/lane combinations were structurally ineligible or not admitted by Base, never assumed passing. Full frozen settings and all 102 per-source results are in the compressed evidence.

| Range | Type | Lane | Built | Nonempty history | Qualified start/end | Executed configs | Settled closes |
|---|---|---:|---:|---:|---|---:|---:|
| mn | normal | 1 | 6146 | 6146 | 0/0 | 0 | 0 |
| mn | trailing | 1 | 18438 | 18438 | 84/8 | 336 | 852 |
| wide | dca | 1 | 412 | 412 | 13/3 | 26 | 115 |
| wide | dca-active | 1 | 412 | 412 | 0/0 | 0 | 0 |
| wide | axis | 1 | 824 | 808 | 0/0 | 0 | 0 |
| mn | normal | 5 | 5796 | 5796 | 18/0 | 0 | 0 |
| mn | trailing | 5 | 17388 | 17388 | 28/0 | 0 | 0 |
| wide | dca | 5 | 364 | 364 | 0/0 | 0 | 0 |
| wide | dca-active | 5 | 364 | 364 | 0/0 | 0 | 0 |
| wide | axis | 5 | 728 | 712 | 0/0 | 0 | 0 |
| gn | normal | 15 | 240 | 240 | 0/0 | 0 | 0 |
| gn | trailing | 15 | 720 | 720 | 0/0 | 0 | 0 |
| wide | dca | 15 | 80 | 80 | 0/0 | 0 | 0 |
| wide | dca-active | 15 | 80 | 80 | 0/0 | 0 | 0 |
| wide | axis | 15 | 160 | 144 | 0/0 | 0 | 0 |
| mn | normal | 15 | 840 | 840 | 0/0 | 0 | 0 |
| mn | trailing | 15 | 2520 | 2520 | 0/0 | 0 | 0 |
| sh | normal | 15 | 518 | 518 | 0/0 | 0 | 0 |
| sh | trailing | 15 | 1554 | 1554 | 0/0 | 0 | 0 |
| lg | normal | 15 | 84 | 84 | 0/0 | 0 | 0 |
| lg | trailing | 15 | 252 | 252 | 0/0 | 0 | 0 |
| mc | normal | 5 | 1190 | 1190 | 0/0 | 0 | 0 |
| mc | trailing | 5 | 3570 | 3570 | 0/0 | 0 | 0 |
| mc | normal | 15 | 34 | 34 | 0/0 | 0 | 0 |
| mc | trailing | 15 | 102 | 102 | 0/0 | 0 | 0 |
