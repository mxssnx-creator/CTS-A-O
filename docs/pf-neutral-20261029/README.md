# PF neutral at one — 29 October 2026

The neutral point is **1.00** in calculations, gates, screens, charts and report tools. Ratios below one remain losses; ratios above one remain profits. Range qualification thresholds have not been lowered. Empty, flat, missing and true no-loss evidence retain distinct states. The fix does not turn the losing forward cohort into a profitable one.

## Reproduced defects and repairs

- Several Signal acceptance/guard, paper/statistics and Minimal Plus paths used an absolute `1e-12` loss cutoff. Equal gains/losses of `1e-20` became Infinity or a no-loss sentinel; a losing sample could pass Minimal Plus or paper-coordination admission. They now use the shared dimensionless ratio without discarding nonzero losses.
- The same cutoff existed in standalone validation, family, gate, desk, Block and live-summary scripts. Actual CLI regressions reproduced PF9 for equal tiny gains/losses and an incorrectly enabled paper range. These now return PF1 and preserve the qualification threshold. Unknown managed/unmanaged paper totals cannot keep the opening gate enabled.
- Statistics displayed a secondary PF-minus-one value. That secondary display is removed; headings and help explain the 1.00 baseline. Equal PF heatmap cells no longer receive a positive tint. Signed net-return charts still use their explicitly labelled zero baseline.
- A targeted browser smoke test initially passed on a Loading shell. It now waits for the exact rendered PF Settings explanation. The standalone report regression also guards the serialized client against inaccessible top-level helpers; its real heatmap function is exercised on neutral, profitable, losing, empty and unknown inputs.

The shared core helper is `src/core/metrics/profit-factor.mjs`. Existing no-loss score conventions (4, 9, 99 or infinity, depending on the existing caller) remain explicit scoring conventions, not finite measured ratios. Internal empty/flat zero scores are not relabelled as measured PF1 or admitted as profitable.

## Final actual-runtime replay

Frozen local checkpoint **a397ef1c0d5c681ca6f13cc755822a2de6026695**, matching published source **7a05b91227320c3ba22da2b854f31a6ce8378a13**. Economic/report source SHA256 **67a8752724b5371a9953f1ff19ada5cfcd7fc9685dabd8554507105bbb9463c5**. The concurrent independent Last-N audit from merged PR #237 is included. Later documentation-only commits do not change this source.

Eight prespecified symbols: ADA, APT, ARB, ATOM, AVAX, BCH, BNB and BTC USDT. Trading 8 October 2026 12:00 to 9 October 12:00 UTC; 24h evaluated prehistory and 24h older indicator-only warmup: **72h total**. Modeled round-trip cost remains **0.15%**, once. This is the frozen 51-focus-pair diagnostic grid with automatic Micro sources, not an exhaustive parameter sweep.

| Cohort | Result |
| --- | --- |
| Base validation | 143 / 1,398 = 10.2289% |
| Initial config validation | 405 / 1,276 = 31.7398% |
| Passing historical finite mean PF | 17.399524089 across 399 finite sets, plus 6 separate no-loss sets |
| Later funded model closed return PF | **0.273050872975075**, 3,108 closes |
| Positions opened / closed / held | 52 / 49 / 3 |
| Orders opened / closed / held | 3,116 / 3,108 / 8 |
| Verified exchange PF | Unavailable |
| Elapsed / peak RSS | 11.826s / 558.8 MiB |

The report exits 1 with **76/78** checks, exactly the prior coverage limits: 1,461/1,634 expected Base combinations and 13/16 indication categories. The 30m startup has 96 bars rather than 120. This is not complete catalogue coverage. Full study history was not extended beyond the operator's 72h limit, and no coverage gate was weakened.

`before-after.json` certifies all **2,468 candidate histories**, **24 validation steps**, **25 Signal selection snapshots**, **3,108 funded closes**, **8 held orders**, every closed/held allocation, initial selected IDs, Base pair rows and funded totals identical to the previous Main replay. `parity.json` independently matches all 3,108 exact config × symbol × direction × entry × exit returns to their source tapes, with zero missing or mismatched rows. Order and allocation SHA256s are retained.

## Verification and deliverables

- Bounded core regressions:47 passed. Script numerical/variant/Base/order, actual coordinator/validation CLI, display and 1h report replay checks pass; browser-smoke verdict checks: 40 passed; standalone report checks: 3 passed. Logs distinguish the initial reproduced failures from corrected runs. The independent Last-N diagnostic's 2 tests pass. Do not add overlapping suite counts as distinct tests.
- Typecheck and full production/core-worker builds pass. Scoped lint has no errors and two existing React refresh export warnings.
- Hosted bounded verification on the exact published source: [run 40967442788](https://github.com/mxssnx-creator/CTS-A-O/actions/runs/40967442788). Desktop and mobile development and production screenshots were visually inspected; the Settings form is rendered, the exact PF-neutral explanation is present, and there are no browser errors, horizontal overflow or production divergence. Evidence is in `browser/` and `browser-verification.json`. Default full workflows are intentionally skipped because they contain legacy market fixtures longer than 72h; no full-CI claim is made.
- [report.html](report.html) is the fresh self-contained detailed session report and heatmaps. [evidence.tar.gz](evidence.tar.gz) contains the frozen protocol/settings, raw data and checksummed sidecars, report data, run logs, memory/timing receipt and parity proofs. [checksums.json](checksums.json) seals both artifacts. The original main-processing report remains in its own historical audit directory.
- To compare an extracted `replay` directory with the earlier archived Main replay: `node docs/pf-neutral-20261029/verify-replay.mjs BEFORE_DIR AFTER_DIR OUTPUT_JSON`. Its readers fully hydrate held allocations and verify sidecar hashes; unloaded arrays cannot masquerade as zero holdings.

An earlier optional 114-variant attempt was cancelled because it was not needed for this consistency check; the final run explicitly disables variants and Compare. Its incomplete attempt is not counted as a pass. The corrected standalone renderer was then rerun on the frozen 72h input above.

## Unresolved work and release boundary

The real forward loss remains. This release changes arithmetic consistency and presentation, not market outcomes or the incomplete persistent Base→Main→Real→Active adapter. That adapter remains disabled in the combined WIP branch. Historical validated PF cannot guarantee later PF or authorize hiding later losses. Actual venue ownership, Bybit execution and a selected production deployment are not established by this replay. The development preview has synthetic market data and live exchange execution disabled.
