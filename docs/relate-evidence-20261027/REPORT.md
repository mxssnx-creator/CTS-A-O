# Relate exploratory comparison — 27 October 2026

This is a retrospective modeled comparison, not exchange execution or proof of profitability. In the primary uncapped runs, no tested Relate arm improved the realized sized-dollar PF over the control in this window. Relate remains off by default. The Auto arm also admitted fewer orders and lowered unit-return PF. A separate post-hoc cap sensitivity is reported below with its limitations.

## Scope

- Public BingX swap 1-minute candles for BTC-USDT, ETH-USDT, SOL-USDT, XRP-USDT, BNB-USDT, DOGE-USDT, ADA-USDT, TRX-USDT, LINK-USDT, AVAX-USDT, SUI-USDT, LTC-USDT. The sealed feed contains 51,840 contiguous bars, with the 24-hour indicator warm-up beginning 24 October 13:00 UTC, 24 hours of prehistory beginning 25 October 13:00 UTC, and the 24-hour modeled execution window from 26 October 13:00 to 27 October 13:00 UTC. TON was absent from the current ticker; LTC, the next available major in the repository ordering, was used.
- Reduced Micro and Minimal grids: three targets × three stop ratios × two trailing shares × one four-hour hold per range; six configured focus entries, with the engine's separately expanded eligible combinations. Normal and Trailing enabled; Block, DCA, Axis, Exit and Signals disabled for the Relate comparison. See [desk-reduced.json](desk-reduced.json) for the actual settings.
- The account simulation used a $10,000 starting balance, $2 fixed order unit, 10× leverage and modeled round-trip cost 0.15%. Position and exposure caps were disabled for this diagnostic. All primary recorded orders received a positive modeled allocation; this does not prove actual venue funding or account feasibility.
- At the **26 October 13:00 UTC** start, the post-Base engine config validation pooled PF was **2.877097**, with **343/732 (46.86%)** evaluated configs passing. The validation windows overlap; this PF is not the later execution PF.
- The native off baseline was exactly reproduced on the final common tapes. The repeated reduced-grid run reproduced baseline digest `9dfe711dca2880c947d6b621c6bc4de14430993fdfd1ce1419d4d5c02b3fc3c7`. All 23 rendered arms passed the native 67 report consistency checks, but their Base and calculated-coverage diagnostics are shared from the native baseline; they are not independent per-arm coverage audits. Actual settings matched the requested desk snapshot.

## Settled modeled comparison

Return PF is the unit-return PF of funded modeled settled orders. Sized-dollar PF weights those same net returns by modeled order size and is a separate diagnostic. Highest-step columns count settled virtual orders whose recorded relation portion reached that arm's maximum step; for all-relations arms any enabled relation can satisfy this condition. A separate check found that every counted highest-step order had a positive relation addition above its recorded base. Empty samples are shown as unavailable.

| Arm: relation · increment · steps | Settled orders | Unit-return PF | Sized-dollar PF | Highest-step closes | Highest-step positive | Highest-step PF |
|---|---:|---:|---:|---:|---:|---:|
| Relate off | 7785 | 0.752695 | 0.752695 | — | — | — |
| Config · 0.2 · 2 | 7785 | 0.752695 | 0.752695 | 0 | — | — |
| Config · 0.2 · 3 | 7785 | 0.752695 | 0.752695 | 0 | — | — |
| Config · 0.2 · 4 | 7785 | 0.752695 | 0.752695 | 0 | — | — |
| Config · 0.2 · 5 | 7785 | 0.752695 | 0.752695 | 0 | — | — |
| Config · 0.2 · 10 | 7785 | 0.752695 | 0.752695 | 0 | — | — |
| Config · 0.6 · 5 | 7785 | 0.752695 | 0.752695 | 0 | — | — |
| Config · 2.6 · 5 | 7785 | 0.752695 | 0.752695 | 0 | — | — |
| Overall · 0.2 · 2 | 7785 | 0.752695 | 0.656951 | 1224 | 16.75% | 0.099518 |
| Overall · 0.2 · 3 | 7785 | 0.752695 | 0.630352 | 592 | 12.16% | 0.046456 |
| Overall · 0.2 · 4 | 7785 | 0.752695 | 0.610812 | 304 | 3.62% | 0.002394 |
| Overall · 0.2 · 5 | 7785 | 0.752695 | 0.610812 | 0 | — | — |
| Overall · 0.2 · 10 | 7785 | 0.752695 | 0.610812 | 0 | — | — |
| Additive all · 0.2 · 2 | 7785 | 0.752695 | 0.485348 | 3451 | 40.57% | 0.307293 |
| Additive all · 0.2 · 3 | 7785 | 0.752695 | 0.445908 | 1803 | 25.40% | 0.146698 |
| Additive all · 0.2 · 4 | 7785 | 0.752695 | 0.410629 | 1162 | 9.72% | 0.039908 |
| Additive all · 0.2 · 5 | 7785 | 0.752695 | 0.410557 | 6 | 0.00% | 0.000000 |
| Additive all · 0.2 · 10 | 7785 | 0.752695 | 0.410557 | 0 | — | — |
| Additive all · 0.6 · 5 | 7785 | 0.752695 | 0.239175 | 6 | 0.00% | 0.000000 |
| Additive all · 2.6 · 5 | 7785 | 0.752695 | 0.108663 | 6 | 0.00% | 0.000000 |
| Shared all · 0.2 · 5 | 7785 | 0.752695 | 0.698591 | 6 | 0.00% | 0.000000 |
| Config Active 2 · 0.2 · 5 | 7785 | 0.752695 | 0.752695 | 0 | — | — |
| Auto · all relations | 5676 | 0.568415 | 0.305642 | — | — | — |

The off baseline and all manual arms had **9,784 opened / 7,785 settled / 1,999 held orders** and **71 opened / 59 closed / 12 held positions**. Auto had **7,150 / 5,676 / 1,474 orders** and **71 / 59 / 12 positions**. Per-config arms did not reach the 60-accepted-close qualification floor on this window, so no highest-step results exist for those arms. The all-relation five-step sample contained only six highest-step closes, all losses; it cannot establish a reliable step ranking.

An additional [modeled order identity audit](order-identity-audit.json) independently inspected each of the 23 overlapping arms. Across 222,398 arm-records it found zero repeated full config/symbol/side/entry identities, zero collisions under the engine's canonical entry key, zero repeated closed-event keys, zero malformed identities and zero unknown settled return bases. The arms reuse observations: the sum is not 222,398 independent trades. In the Relate-off arm, 574 configurations produced 5,323 Normal and 4,461 Trailing orders; DCA, Axis and Historic Exit were disabled. There were 552 symbol/side/time onsets with several configurations, with up to 106 distinct orders at one onset. These are separately identified simulated orders sharing market exposure, not independent statistical samples or venue fills. The audit reconciles 71/59/12 positions and 9,784/7,785/1,999 orders and recomputes settled PF **0.752695** from gross unit returns. Reproduce the retained baseline with `node scripts/audit-modeled-orders.mjs docs/relate-evidence-20261027/allocation-off-raw.json.gz`; the per-arm raw hashes are in the receipt. This is an identity and arithmetic check, not proof that all orders were economically desirable or funded.

The Relate-off settled sample had **4,239 wins and 3,546 losses** (54.45% positive). Its average net unit win was **0.453%**, versus an average net unit loss of **0.719%**; with those average magnitudes, break-even would require about **61.36%** wins. Normal settled PF was **0.774320** on 4,228 orders, and Trailing PF was **0.715004** on 3,557 orders. The large order count and a majority of winners therefore do not establish a positive result on this window.

An additional [stability investigation](stability-diagnostic/README.md) attributes much of this loss to a correlated two-hour period and independently reruns Last-N, simultaneous per-symbol and same-onset crowding policies. Some symbol caps improved full-window modeled PF but reduced the number of orders sharply and still lost during the shock; the crowding limits reduced full-window PF. A [second historical window](stability-second-window/README.md) produced modeled settled PF below 1 for all ten corresponding policies. The comparisons were selected after the first window was examined, and no settings were promoted. Their preserved raw sessions include minute-candle, recorded-selection and return-arithmetic audits.

The all-relation 2.6-ratio five-step arm's sized-dollar PF was **0.108663** and the uncapped model exceeded available margin for **495 minutes**. It is financially infeasible under this test's account assumptions.

The present Auto search uses unit-return PF and positive rate as its primary score. On an identical qualifying Active subset, changing the hypothetical ratio or step depth does not change that unit-return score; ties therefore prefer ratio **0.2** and the step count nearest the configured manual value. The separately calculated hypothetical sized PF does not select a winner. Higher ratios are mathematically dominated under this score and are folded out of the calculation; they are not separately simulated with funded feedback. A causal, independently validated allocation study is still needed to establish which sizing ratio performs best.

### Post-hoc account-cap sensitivity

As an additional diagnostic, the same already-generated order streams were reallocated with a 0.2× balance cap per symbol/direction position and a 1× gross exposure cap. Starting balance, unit size, leverage, costs and dates were unchanged. This replay applies caps **after** strategy decisions were made; zero-funded or scaled orders could still have influenced the original Relate history. It is not a fresh simulation with funded feedback, an exchange test or evidence of a profitable strategy.

| Arm | Settled funded unit PF | Sized-dollar PF | Funded orders opened / settled / held | Funded positions opened / closed / held | Settled / held orders receiving zero allocation | Modeled net |
|---|---:|---:|---:|---:|---:|---:|
| Relate off | 0.752695 | 0.752695 | 9,784 / 7,785 / 1,999 | 71 / 59 / 12 | 0 / 0 | −$12.62 |
| Auto, all relations | 0.568415 | 0.305642 | 7,150 / 5,676 / 1,474 | 71 / 59 / 12 | 0 / 0 | −$74.13 |
| Additive all, 0.2, 5 steps | 0.763781 | 0.410310 | 9,688 / 7,689 / 1,999 | 71 / 59 / 12 | 96 / 0 | −$73.99 |
| Additive all, 2.6, 5 steps | 1.005802 | 1.061101 | 7,426 / 5,916 / 1,510 | 75 / 63 / 12 | 1,869 / 489 | +$8.55 |

The last row's slightly positive PF arises in this allocation-only reconstruction, after thousands of allocations were removed or scaled. It cannot be promoted without a causal re-run whose Relate learning and admissions use the funded record and then an independent test. The position count can increase when removed orders split one overlapping symbol/direction episode into multiple funded episodes. All four sensitivity reports passed 67/67 internal consistency checks; details and cap counts are in [allocation-sensitivity.json](allocation-sensitivity.json).

The four original modeled order streams are retained as compressed `allocation-*-raw.json.gz` files with hashes in that receipt. For example, this reproduces the 2.6-ratio row after decompressing it; every reported total was verified equal on the corrected source:

```sh
gzip -dc docs/relate-evidence-20261027/allocation-additive-r26-raw.json.gz > /tmp/cts-relate-r26.json
CTS_CORE_LIVE=0 CTS_CORE_WORKERS=1 CTS_CORE_COMPARE=0 CTS_CORE_VARIANTS=0 \
  node --experimental-strip-types --no-warnings scripts/core-session.mjs --replay /tmp/cts-relate-r26.json \
  --balance 10000 --sizing fixed --notional 2 --leverage 10 \
  --max-position-x 0.2 --max-exposure-x 1 --out /tmp/cts-relate-r26-report \
  --html /tmp/cts-relate-r26-html --chunk-allocations --quiet true
```

## Signal Last-4 versus Last-6

Two separate focused checks varied only Signal config-validation Last-N (4 versus 6); the separate Signal guard remained Last-4. Both used the same 12-symbol window, 24 hours of available prehistory, 0.15% modeled cost, unchanged admission thresholds, and the modeled post-Base live gate beginning at the trade start. The first used EMA cross and RSI reversal with 48-hour holds; the second added Stoch RSI and used a one-hour hold. Neither produced active contexts or settled orders: **125/125** candidate entries inactive in both first-arm runs and **322/322** inactive in both shorter-hold runs. Therefore both execution PFs are unavailable and neither Last-N choice is demonstrated superior. These focused checks do not cover every Signal source or grid.

A separate, earlier archived Binance USD-M window, **16 October 21:00–17 October 21:00 UTC**, had 150 hours of evaluated Signal prehistory and an additional indicator warm-up. It used 12 symbols (BTC, ETH, BNB, SOL, XRP, DOGE, ADA, LINK, AVAX, LTC, DOT and BCH), 103 enabled Signal sources, 1-minute and 5-minute lanes, a reduced Normal/Trailing protection grid and a one-hour configured hold. The Signal representative Base gate was disabled; each exact Signal config still had to pass its own admission gates. Relate, Block, DCA and Axis were off. Funding was modeled at $10,000 starting balance, $2 fixed unit, 10× leverage and 0.15% round-trip cost; account position and exposure caps were off. Actual initial settings were identical except for Signal config-validation Last-N; the separate Signal guard stayed Last-4. The reported Last-4 total was reproduced on the same final source as Last-6.

| Signal config Last-N | Modeled settled unit-return PF | Wins / losses | Orders opened / settled / held | Positions opened / closed / held | Modeled net |
|---|---:|---:|---:|---:|---:|
| 4 | 0.248539 | 11 / 13 | 24 / 24 / 0 | 4 / 4 / 0 | −$0.214068 |
| 6 | 0.693775 | 14 / 7 | 21 / 21 / 0 | 5 / 5 / 0 | −$0.042646 |

Last-6 was higher on this particular sample, but both settled PFs were below 1. The samples are small, overlapping and retrospective, so this is not evidence of a profitable setting or a reason to promote Last-6 automatically. After the DCA/Axis audit correction, full-history reruns on the corrected source reproduced the totals above and every hourly context result; each passed **56/56** native report checks without memory fallback or abort. The audit retained all **3,296** configured Signal tapes, including rejected cells, and compared **1,977,600** exact config × symbol × direction decisions at 25 hourly clocks per arm with an independent scalar calculation. It found no missing configured cells and matched every funded settlement to a source tape.

| Signal config Last-N | At 16 October 21:00 UTC: passed contexts / evaluated | Start pooled qualified-history PF | At 17 October 21:00 UTC: passed contexts / evaluated | End pooled qualified-history PF |
|---|---:|---:|---:|---:|
| 4 | 195 / 79,104 (0.2465%) | 2.596721 | 175 / 79,104 (0.2212%) | 2.603215 |
| 6 | 174 / 79,104 (0.2200%) | 2.595649 | 165 / 79,104 (0.2086%) | 2.605620 |

The denominator includes empty contexts. At the start, **69,472/79,104 (87.82%)** contexts in each arm failed the full-history close-count gate; **27,776** were empty. The settings required at least 12 full-window closes, separate from Last-N readiness. These are first-failure categories and do not show that lowering the sample requirement would produce profitable trades. Qualified-history PF pools overlapping configuration histories and is a selection statistic, not the later modeled settled PF. The **6/412 representative Signal pair** passes are a separate diagnostic, not this exact-context denominator. Settings and receipts are [signal-desk-last4.json](signal-desk-last4.json), [signal-desk-last6.json](signal-desk-last6.json), and [signal-last4-last6.json](signal-last4-last6.json). Per-config and grouped audit data and pre-rerun protocols are retained alongside them; their hashes are in the numerical receipt. The archived input's SHA-256 is `e21d39b0b7583685e2fe355f6261e0860deff3057ca5c81b43a6c3cf374e2f03`.

To repeat the Last-4 audit from this repository at the sealed economic source (for Last-6 substitute `6` in the desk, protocol and output directory names):

```sh
mkdir -p /tmp/cts-signal-last4
cp docs/relate-evidence-20261027/signal-audit-v5-last4-protocol.json /tmp/cts-signal-last4/protocol.json
CTS_CORE_LIVE=0 CTS_CORE_WORKERS=2 CTS_CORE_COMPARE=0 CTS_CORE_VARIANTS=0 \
  node --experimental-strip-types --no-warnings scripts/core-session.mjs \
  --feed scripts/studies/signals-coverage/feed.json.gz --symbols 12 --pre 150 --run 24 \
  --end-at 2026-10-17T21:00:00Z --evaluation-from 2026-10-10T15:00:00Z \
  --live-since 2026-10-16T21:00:00Z --selection-hours 100 --replay-preload-all \
  --signals on --desk docs/relate-evidence-20261027/signal-desk-last4.json \
  --frozen-session /tmp/cts-signal-last4/protocol.json \
  --balance 10000 --sizing fixed --notional 2 --leverage 10 --caps off \
  --dump /tmp/cts-signal-last4/raw.json --dump-only --tape-trades-all --quiet true
CTS_CORE_LIVE=0 CTS_CORE_WORKERS=1 CTS_CORE_COMPARE=0 CTS_CORE_VARIANTS=0 \
  node --experimental-strip-types --no-warnings scripts/core-session.mjs \
  --replay /tmp/cts-signal-last4/raw.json \
  --frozen-session /tmp/cts-signal-last4/protocol.json \
  --balance 10000 --sizing fixed --notional 2 --leverage 10 --caps off \
  --out /tmp/cts-signal-last4/session --html /tmp/cts-signal-last4/report \
  --chunk-allocations --quiet true
CTS_CORE_LIVE=0 node --experimental-strip-types --no-warnings scripts/audit-signal-coverage.mjs \
  /tmp/cts-signal-last4 /tmp/cts-signal-last4/coverage-standalone
```

The protocol validates the complete runtime settings, boundaries, funding and feed/source bytes before computation. It intentionally rejects a different source tree or feed rather than treating a different run as the same evidence.

## Provenance and limits

[results.json](results.json) contains every row, order/position counts, net, equity, drawdown, margin and highest-step details. [feed-receipt.json](feed-receipt.json) and [reproduction-feed.json.gz](reproduction-feed.json.gz) seal the market input. Source inventories are [source-manifest.json](source-manifest.json) and [source-expanded-manifest.json](source-expanded-manifest.json); [relate-experiment.mjs](relate-experiment.mjs) is the research-only same-tape capture hook used for the expanded sweep. The feed and inputs are already examined, so this is not an unseen holdout. Broad-grid and live-demo results must be reported separately when completed.

The original expanded study predates the later audit and ladder-cap corrections. Its changed economic source files are preserved in [relate-source-overlay.tar.gz](relate-source-overlay.tar.gz), SHA-256 `551aaf0951504f78b4410b52efdf0586b856dd6e48263ddba678dcc2f61505d5`. Applying this overlay to a disposable checkout of implementation checkpoint `d0237255b9a9e44e94bf33e26a95b26cfde0ec13` and removing the later-added `src/core/validation-progress.ts` reproduced all 162 files and the complete source inventory SHA-256 `e0e8636c4fae198d17a85dad040c55ffb3c5637a584eaacf0b62a6a91e3b89cb`. A repeat from that reconstructed source matched the baseline digest and every arm's modeled trade, open-order, validation, per-range step and skip arrays; see [reproduction-verification.json](reproduction-verification.json). Use the sealed study source for reproduction, not as a replacement for the corrected working source.

To repeat the 23-arm experiment from the repository with its installed dependencies:

```sh
CTS_STUDY_REPO="$PWD"
git worktree add --detach /tmp/cts-relate-repro d0237255b9a9e44e94bf33e26a95b26cfde0ec13
tar -xzf "$CTS_STUDY_REPO/docs/relate-evidence-20261027/relate-source-overlay.tar.gz" -C /tmp/cts-relate-repro
rm /tmp/cts-relate-repro/src/core/validation-progress.ts
ln -s "$CTS_STUDY_REPO/node_modules" /tmp/cts-relate-repro/node_modules
mkdir -p /tmp/cts-relate-study
cd /tmp/cts-relate-repro
MALLOC_ARENA_MAX=2 MALLOC_MMAP_THRESHOLD_=1048576 CTS_CORE_LIVE=0 CTS_CORE_WORKERS=2 CTS_CORE_COMPARE=0 CTS_CORE_VARIANTS=0 \
  node --experimental-strip-types --no-warnings scripts/core-session.mjs \
  --feed "$CTS_STUDY_REPO/docs/relate-evidence-20261027/reproduction-feed.json.gz" \
  --symbols 12 --pre 24 --run 24 --end-at 2026-10-27T13:00:00Z \
  --evaluation-from 2026-10-25T13:00:00Z --selection-hours 24 --replay-preload-all \
  --signals off --desk "$CTS_STUDY_REPO/docs/relate-evidence-20261027/desk-reduced.json" \
  --balance 10000 --sizing fixed --notional 2 --leverage 10 --caps off --max-wait-min 20 \
  --dump /tmp/cts-relate-study/native.json --dump-only --relate-experiment /tmp/cts-relate-study/arms --quiet true
```

The output is a research replay, with no exchange orders. Remove the disposable worktree with `git -C "$CTS_STUDY_REPO" worktree remove --force /tmp/cts-relate-repro` when it is no longer needed.

The separate synthetic [Relate benchmark](relate-benchmark.json) used 50 symbols, eight Auto sources, 12,500 bootstrap closes and 500 update-plus-decision operations. Its median and p95 update-plus-decision times were **1.751 ms** and **2.572 ms**, with **91.8 MiB** maximum RSS. These numbers measure the isolated adjustment function, not a warmed live cycle, market-data latency, exchange execution or the full-grid simulation. Run `node --experimental-strip-types --no-warnings scripts/perf/relate-bench.ts` to repeat the benchmark.

A later behavior-preserving optimization folds the ratio iterations that cannot win the existing unit-PF tie break. In three alternating synthetic runs, median update-plus-decision time changed from **2.038–2.280 ms** to **0.157–0.167 ms** and p95 from **2.384–2.644 ms** to **0.403–1.035 ms**; the [receipt](relate-auto-fold-benchmark.json) includes all runs and memory samples. Exact complete decisions matched the previous implementation on 1,000 varied histories, and an independent scalar test checks all ratio/step/Active combinations for several capped histories and overflow. This does not change the existing tie break or establish causal funded-feedback optimization; independently funded candidate simulations and a holdout are still needed.
