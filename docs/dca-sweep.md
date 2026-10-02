# DCA sweep: levels, spacing, stop, targets, stack (12 symbols, 6 windows × 24 h)

All runs use real BingX 1m data (`scripts/core-dca-sweep.mjs`, pooled by `scripts/core-dca-sweep-report.mjs`):
- **Windows:** 24 h each, ending 0 to 120 h ago, 12 most volatile symbols, 12 h of pre-calculation.
- **Per window:** one engine compute; then each DCA variant rebuilds only its DCA tapes for every Main pair.
- **Base:** every DCA tape over the window, no selection ("avg curve" spreads one unit over all tapes).
- **WF:** the Real-stage walk-forward the engine actually trades, run per kind, since DCA and DCA Active exclude each other.

## Default (line by line)

| setting | value | meaning |
|---|---|---|
| Levels | 2 | two deeper legs after the base leg (3 stages) |
| Max stack | 5 stages | base + at most 4 levels per position, whatever the setting |
| Step | 2 % | distance between levels (Step × target 0 = the % step) |
| Stop gap | 0.5 steps | the stop sits half a step beyond the deepest level |
| Stop × target | 1 | DCA stop = 1 × its target (never inside the deepest level + gap) |
| Targets | 0.8 / 1.2 / 2.6 / 3.5 % | the DCA protect set (configurable) |
| DCA Active | off | it skips the base leg; it hardly trades and lost in every window |

## Stage 3: levels 1–4 × spacing, stop 1 × target (walk-forward, ranked by net ÷ worst drawdown)

| variant | kind | WF closes | WF PF | positive windows | WF net % | worst DD % | net ÷ DD | base PF | legs | WF PF per window |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| cur L1 s1% sl1 | dca | 273 | 1.41 | 3/4 | 249 | 113 | 2.21 | 0.92 | 1.61 | – · 1.61 · – · 1.54 · 1.22 · 0.00 |
| cur L1 s1% sl1 | dca-active | 18 | 0.95 | 1/2 | -2 | 21 | -0.10 | 0.77 | 1.00 | – · – · – · 1.21 · 0.57 · – |
| cur L1 s1.5% sl1 | dca | 242 | 1.37 | 4/6 | 176 | 101 | 1.75 | 0.91 | 1.50 | 0.29 · 1.33 · 0.14 · 1.03 · 1.88 · 1.11 |
| cur L1 s2% sl1 | dca | 182 | 0.91 | 1/5 | -32 | 99 | -0.32 | 0.88 | 1.42 | – · 1.26 · 0.95 · 0.52 · 0.69 · 0.75 |
| cur L2 s1% sl1 | dca | 215 | 1.27 | 3/5 | 146 | 127 | 1.15 | 0.91 | 2.04 | – · 1.30 · 1.05 · 2.83 · 0.91 · 0.23 |
| cur L2 s1% sl1 | dca-active | 18 | 0.95 | 1/2 | -2 | 21 | -0.10 | 0.77 | 1.00 | – · – · – · 1.21 · 0.57 · – |
| cur L2 s1.5% sl1 | dca | 160 | 1.03 | 3/4 | 14 | 104 | 0.13 | 0.84 | 1.83 | – · 0.89 · 1.31 · 1.12 · 1.14 · – |
| cur L2 s2% sl1 | dca | 201 | 1.55 | 4/5 | 169 | 58 | 2.91 | 0.87 | 1.67 | – · 0.29 · 1.54 · 1.64 · 1.93 · 1.81 |
| cur L3 s1% sl1 | dca | 133 | 1.00 | 3/5 | -1 | 115 | -0.01 | 0.82 | 2.36 | 99.00 · 1.31 · 0.67 · 1.19 · 0.58 · – |
| cur L3 s1% sl1 | dca-active | 18 | 0.95 | 1/2 | -2 | 21 | -0.10 | 0.77 | 1.00 | – · – · – · 1.21 · 0.57 · – |
| cur L3 s1.5% sl1 | dca | 175 | 1.29 | 3/5 | 112 | 81 | 1.38 | 0.83 | 2.04 | – · 0.60 · 0.49 · 1.71 · 1.32 · 2.83 |
| cur L3 s2% sl1 | dca | 120 | 1.29 | 2/5 | 85 | 96 | 0.89 | 0.76 | 1.84 | – · 0.30 · 0.36 · 2.14 · 1.87 · 0.61 |
| cur L4 s1% sl1 | dca | 145 | 1.07 | 3/5 | 24 | 83 | 0.29 | 0.84 | 2.62 | – · 0.87 · 0.83 · 1.25 · 1.04 · 1.96 |
| cur L4 s1% sl1 | dca-active | 18 | 0.95 | 1/2 | -2 | 21 | -0.10 | 0.77 | 1.00 | – · – · – · 1.21 · 0.57 · – |
| cur L4 s1.5% sl1 | dca | 130 | 1.77 | 3/6 | 266 | 127 | 2.10 | 0.76 | 2.22 | 0.45 · 0.11 · 0.22 · 3.60 · 2.74 · 1.36 |
| cur L4 s2% sl1 | dca | 97 | 1.00 | 3/5 | 1 | 107 | 0.01 | 0.74 | 1.95 | – · 1.68 · 0.29 · 99.00 · 1.28 · 0.52 |
| cur L2 s2% default-sl | dca | 186 | 2.03 | 3/5 | 258 | 79 | 3.26 | 0.86 | 1.66 | – · 0.41 · 0.29 · 2.68 · 2.90 · 1.81 |

## Stage 2: stop × target for the stage-1 leaders and the former default

| variant | kind | base closes | base PF | positive windows | Σ net (avg curve) % | worst avg-curve DD % | worst close % | legs | WF closes | WF PF | WF net % | WF max DD % | WF DDT h |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| tp:gl L1 s0.5tp g0.5 sl1 | dca | 12846 | 1.17 | 4/6 | 30.89 | 13.63 | -12.44 | 1.54 | 221 | 1.18 | 89.80 | 71.26 | 24.10 |
| tp:gl L1 s1% g0.5 sl0.75 | dca | 13212 | 1.18 | 5/6 | 36.15 | 15.98 | -11.33 | 1.69 | 285 | 1.24 | 178.12 | 123.25 | 24.10 |
| tp:gl L1 s1% g0.5 sl1 | dca | 12727 | 1.17 | 5/6 | 36.11 | 16.36 | -15.31 | 1.69 | 266 | 1.02 | 13.92 | 315.89 | 24.10 |
| tp:gl L1 s0.5tp g0.5 sl0.75 | dca | 13308 | 1.18 | 5/6 | 28.89 | 13.28 | -8.40 | 1.54 | 284 | 1.10 | 58.08 | 135.36 | 24.10 |
| tp:gl L1 s1tp g0.5 sl0.75 | dca | 12062 | 1.15 | 5/6 | 25.32 | 16.78 | -16.58 | 1.34 | 232 | 0.89 | -69.85 | 270.03 | 24.10 |
| tp:gl L1 s1tp g0.5 sl1 | dca | 12062 | 1.15 | 5/6 | 25.32 | 16.78 | -16.58 | 1.34 | 232 | 0.89 | -69.85 | 270.03 | 24.10 |
| tp:gl L1 s1tp g0.5 sl1.5 | dca | 12062 | 1.15 | 5/6 | 25.32 | 16.78 | -16.58 | 1.34 | 232 | 0.89 | -69.85 | 270.03 | 24.10 |
| tp:gl L1 s0.5tp g0.5 sl1.5 | dca | 12192 | 1.12 | 4/6 | 25.53 | 19.88 | -20.53 | 1.53 | 184 | 1.01 | 2.43 | 149.16 | 24.10 |
| tp:gl L1 s1% g0.5 sl1.5 | dca | 12045 | 1.13 | 4/6 | 32.51 | 25.41 | -23.27 | 1.68 | 208 | 0.88 | -90.03 | 374.37 | 24.10 |
| tp:gl L1 s1% g0.5 sl2 | dca | 11686 | 1.12 | 4/6 | 30.55 | 28.14 | -31.23 | 1.68 | 218 | 1.03 | 23.28 | 352.46 | 24.10 |
| tp:gl L1 s1tp g0.5 sl2 | dca | 11746 | 1.09 | 4/6 | 17.79 | 19.54 | -24.84 | 1.33 | 216 | 1.15 | 81.26 | 162.54 | 24.10 |
| tp:mix L1 s1tp g0.5 sl0.75 | dca | 13707 | 1.04 | 4/6 | 6.10 | 12.92 | -14.23 | 1.42 | 276 | 1.13 | 74.87 | 155.06 | 24.10 |
| tp:mix L1 s1tp g0.5 sl1 | dca | 13707 | 1.04 | 4/6 | 6.10 | 12.92 | -14.23 | 1.42 | 276 | 1.13 | 74.87 | 155.06 | 24.10 |
| tp:mix L1 s1tp g0.5 sl1.5 | dca | 13707 | 1.04 | 4/6 | 6.10 | 12.92 | -14.23 | 1.42 | 276 | 1.13 | 74.87 | 155.06 | 24.10 |
| tp:gl L1 s0.5tp g0.5 sl2 | dca | 11826 | 1.12 | 3/6 | 28.39 | 21.72 | -28.61 | 1.53 | 216 | 1.17 | 107.36 | 249.35 | 24.10 |
| tp:gl L2 s1tp g0.5 sl0.75 | dca | 11551 | 1.01 | 3/6 | 5.66 | 24.76 | -38.01 | 1.51 | 241 | 0.74 | -254.92 | 407.07 | 24.10 |
| tp:gl L2 s1tp g0.5 sl1 | dca | 11551 | 1.01 | 3/6 | 5.66 | 24.76 | -38.01 | 1.51 | 241 | 0.74 | -254.92 | 407.07 | 24.10 |
| tp:gl L2 s1tp g0.5 sl1.5 | dca | 11551 | 1.01 | 3/6 | 5.66 | 24.76 | -38.01 | 1.51 | 241 | 0.74 | -254.92 | 407.07 | 24.10 |
| tp:gl L2 s1tp g0.5 sl2 | dca | 11551 | 1.01 | 3/6 | 5.66 | 24.76 | -38.01 | 1.51 | 241 | 0.74 | -254.92 | 407.07 | 24.10 |
| tp:gl L1 s1% g0.5 sl1.5 | dca-active | 8406 | 1.00 | 2/6 | 1.29 | 12.59 | -11.19 | 1.00 | 16 | 0.55 | -20.46 | 15.38 | 24.10 |
| tp:gl L1 s1% g0.5 sl2 | dca-active | 8065 | 0.99 | 2/6 | 1.04 | 12.82 | -15.19 | 1.00 | 8 | 0.84 | -3.37 | 14.89 | 24.10 |
| tp:gl L1 s1% g0.5 sl0.75 | dca-active | 9369 | 0.98 | 3/6 | -0.78 | 7.64 | -5.19 | 1.00 | 31 | 0.31 | -67.26 | 36.16 | 24.10 |
| tp:gl L1 s1% g0.5 sl1 | dca-active | 9000 | 0.97 | 3/6 | -2.38 | 8.80 | -7.19 | 1.00 | 21 | 0.59 | -24.30 | 22.16 | 24.10 |
| tp:mix L1 s1tp g0.5 sl2 | dca | 13393 | 0.95 | 1/6 | -5.94 | 18.35 | -21.27 | 1.41 | 246 | 1.40 | 201.24 | 140.57 | 24.10 |

## Stage 1: targets × levels × spacing × stop gap (base over every DCA tape, top rows)

| variant | kind | base closes | base PF | positive windows | Σ net (avg curve) % | worst avg-curve DD % | worst close % | legs | WF closes | WF PF | WF net % | WF max DD % | WF DDT h |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| tp:gl L1 s1tp g0.5 | dca | 12181 | 1.28 | 5/6 | 43.66 | 16.42 | -16.58 | 1.32 | 0 | 0.00 | 0.00 | 0.00 | 24.60 |
| tp:gl L1 s1% g0.5 | dca | 12199 | 1.29 | 4/6 | 65.48 | 25.02 | -23.27 | 1.66 | 0 | 0.00 | 0.00 | 0.00 | 24.60 |
| tp:gl L1 s1% g1.5 | dca | 12192 | 1.29 | 4/6 | 65.38 | 25.13 | -23.27 | 1.66 | 0 | 0.00 | 0.00 | 0.00 | 24.60 |
| tp:gl L1 s0.5tp g0.5 | dca | 12325 | 1.24 | 4/6 | 47.41 | 19.42 | -20.53 | 1.50 | 0 | 0.00 | 0.00 | 0.00 | 24.60 |
| tp:gl L1 s0.5tp g1.5 | dca | 12325 | 1.24 | 4/6 | 47.41 | 19.42 | -20.53 | 1.50 | 0 | 0.00 | 0.00 | 0.00 | 24.60 |
| tp:mix L1 s1% g0.5 | dca | 13765 | 1.19 | 4/6 | 35.99 | 18.36 | -19.85 | 1.62 | 0 | 0.00 | 0.00 | 0.00 | 24.60 |
| tp:mix L1 s1% g1.5 | dca | 13718 | 1.19 | 5/6 | 36.05 | 18.79 | -19.85 | 1.62 | 0 | 0.00 | 0.00 | 0.00 | 24.60 |
| tp:gl L1 s2% g1.5 | dca | 12171 | 1.22 | 4/6 | 45.83 | 24.42 | -22.36 | 1.48 | 0 | 0.00 | 0.00 | 0.00 | 24.60 |
| tp:mix L1 s0.5tp g1.5 | dca | 13809 | 1.15 | 4/6 | 26.60 | 14.22 | -17.60 | 1.58 | 0 | 0.00 | 0.00 | 0.00 | 24.60 |
| tp:mix L1 s0.5tp g0.5 | dca | 13805 | 1.15 | 4/6 | 26.36 | 14.22 | -17.60 | 1.58 | 0 | 0.00 | 0.00 | 0.00 | 24.60 |
| tp:mix L1 s1tp g0.5 | dca | 13812 | 1.16 | 4/6 | 22.79 | 12.38 | -14.23 | 1.39 | 0 | 0.00 | 0.00 | 0.00 | 24.60 |
| tp:gl L1 s2% g0.5 | dca | 12220 | 1.21 | 4/6 | 42.97 | 24.11 | -22.36 | 1.48 | 0 | 0.00 | 0.00 | 0.00 | 24.60 |
| tp:gl L2 s1% g0.5 | dca | 12283 | 1.17 | 4/6 | 55.05 | 39.54 | -33.55 | 2.14 | 0 | 0.00 | 0.00 | 0.00 | 24.60 |
| tp:gl L2 s0.5tp g0.5 | dca | 12365 | 1.14 | 4/6 | 35.44 | 25.52 | -25.03 | 1.82 | 0 | 0.00 | 0.00 | 0.00 | 24.60 |
| tp:gl L2 s1% g1.5 | dca | 12268 | 1.16 | 4/6 | 53.32 | 38.88 | -33.55 | 2.13 | 0 | 0.00 | 0.00 | 0.00 | 24.60 |
| tp:mix L1 s2% g0.5 | dca | 13720 | 1.12 | 4/6 | 20.75 | 15.49 | -18.93 | 1.43 | 0 | 0.00 | 0.00 | 0.00 | 24.60 |
| tp:mix L1 s2% g1.5 | dca | 13501 | 1.13 | 4/6 | 21.90 | 17.45 | -18.93 | 1.43 | 0 | 0.00 | 0.00 | 0.00 | 24.60 |
| tp:gl L1 s1% g0.5 | dca-active | 8365 | 1.14 | 4/6 | 15.45 | 12.59 | -11.19 | 1.00 | 54 | 0.67 | -62.14 | 133.95 | 24.60 |
| tp:gl L2 s1% g0.5 | dca-active | 8365 | 1.14 | 4/6 | 15.45 | 12.59 | -11.19 | 1.00 | 54 | 0.67 | -62.14 | 133.95 | 24.60 |
| tp:gl L3 s1% g0.5 | dca-active | 8365 | 1.14 | 4/6 | 15.45 | 12.59 | -11.19 | 1.00 | 54 | 0.67 | -62.14 | 133.95 | 24.60 |

## Reading

- **Selection matters more than the parameters.** Over all tapes the default targets lose (base PF 0.84–0.88), but the configs the engine selects win (WF PF 1.55–2.03).
- **General / Long targets** (3.2–5.6 %) give the best base PF (1.17–1.28), but their selected book is weaker (WF PF 1.10–1.24) with larger drawdowns.
- **Deeper stacks** (3–4 levels) raise the legs per position (2.0–2.6) and lower PF; the 5-stage cap is never the binding limit at the default.
- **Stop 1 × target** keeps the drawdown lowest (58) and the most windows positive (4 of 5). The former stops earn more (PF 2.03) at a higher drawdown (79) and 3 of 5 windows.
