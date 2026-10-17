# Twenty-symbol development results — 17 October 2026

## Measured scope

Four offline development cases completed successfully in [GitHub Actions run 39074495099](https://github.com/mxssnx-creator/CTS-A-O/actions/runs/39074495099), CI head `cc1b68395765040a62cbd336b7659d09796eabf2`. The main outcome tables below record those completed cases. The later replay scheduling/resource correction at `fdabcdb3f9daf17160873f98962dc265f9142159` was measured separately; its verified economic parity and resource results appear in the final section.

Evaluated prehistory: **12 October 2026 03:00–09:00 UTC**. Trading: **09:00–15:00 UTC**, six complete hours. Twenty forced symbols were processed; nineteen produced settled orders. Native Binance USD-M public candles were replayed offline. The source differs from older BingX runs; no venue execution or venue parity is demonstrated. Older candles initialize indicators only behind `evaluationFromT`; config selection remains six evaluated hours.

All four cases use $10 starting balance, 10× leverage, equity sizing 0.1% per order unit, and modeled round-trip costs 0.15%. The strategy/PF/sample/drawdown grids are unchanged between controls. Baseline and corrected frozen `actualSettings` and `actualWf` compare exactly. The two entry variants change only `wf.lastN` from 0 to 5/15 and `wf.lastNMinPf` from 1 to 1.2, retaining stricter range floors.

**Capital risk limits are uncapped in these frozen cases:** `live.maxPositionX=0` and `live.maxExposureX=0`; stop-risk and worst-backstop budgets are unset. Live is disabled. The exchange position ceiling remains 100 Symbol×Direction positions; it is separate from config/order counts and does not limit this simulated gross exposure. These are the actual tested settings, not recommended live settings.

## Combined and separately qualified cohorts

Primary PF uses canonical net unit returns from the book-allocated settled cohort after Base/config validation; external Block/coordination execution multipliers are removed. Sized-dollar PF and cash P&L retain actual modeled allocation sizes. Intrinsic ladder semantics remain. “Funded” below means positive allocation in the simulated book, not verified exchange funding or fills.

| Case | Engine funded closes | Engine unit PF | Signal funded closes | Signal PF | Executed configs | Unit-PF-positive hours | Sized-cash-positive hours |
|---|---:|---:|---:|---|---:|---:|---:|
| Baseline | 126,380 | 0.765632477 | 0 | empty / unavailable | 30,109 | 4/6 | 4/6 |
| Corrected | 126,380 | 0.765632477 | 0 | empty / unavailable | 30,109 | 4/6 | 4/6 |
| Entry Last-N 5 | 87,179 | 1.267875180 | 0 | empty / unavailable | 22,383 | 5/6 | 4/6 |
| Entry Last-N 15 | 94,903 | 1.112511245 | 0 | empty / unavailable | 23,176 | 4/6 | 5/6 |

No Signal type executed a settled order: Normal, capped Trailing and trailing-only remain **empty**, not PF 0 or passing.

The corrected case's initial historical-generator diagnostic measured 126 Signal pairs: all 126 had insufficient entries, so it generated/evaluated zero extra historic candidates. This diagnostic is not a count of every later exact-config activation. The first simulated step had zero Signal configs in its engine selection, while the later paper snapshot represented 116 Signal configs. Walk-forward recorded 25 `sig:signalValid` and one `sig:signalPf` rejection; the later paper path recorded 384 `sig:exec:signalInactive` and 14 `sig:exec:signalValid` rejections. These phases and denominators differ. A later paper-active config is not a funded settled Signal execution. The displayed Signal representative Base diagnostic uses PF 1.0; the corrected source retains its own historical/Last-N Signal minimum PF 1.1. Zero executions alone justify neither lowering that floor nor waiving missing history. The Signal correction therefore demonstrates no measured execution improvement in this development window. Baseline and corrected engine orders have identical identity/unit-return fingerprints and identical cash results.

## Actual account feasibility

**Every case has `total.feasible=false`.** The report model’s peak margin is $295–$376 against a $10 starting account. Baseline/corrected marked equity crosses zero. Positive settled PF or cash in an entry variant does not establish a fundable portfolio, acceptable risk, or profitable exchange execution. The model retains its orders rather than simulating exchange liquidation.

| Case | Settled sized net $ | End balance $ | End marked equity $ | Minimum marked equity $ | Equity max DD | Peak modeled margin $ | Open orders at endpoint |
|---|---:|---:|---:|---:|---:|---:|---:|
| Baseline | -1.543603 | 8.456397 | -9.934586 | -13.871554 | 238.4879% | 375.706615 | 22,808 |
| Corrected | -1.543603 | 8.456397 | -9.934586 | -13.871554 | 238.4879% | 375.706615 | 22,808 |
| Entry Last-N 5 | 12.395141 | 22.395141 | 12.788254 | 4.537476 | 54.6934% | 295.038812 | 12,419 |
| Entry Last-N 15 | 9.261089 | 19.261089 | 7.795166 | 4.847846 | 53.5457% | 315.558664 | 14,467 |

Baseline/corrected equity first reaches zero at **12 October 13:20 UTC**. Equity/feasibility fields above are retained report-model diagnostics; independent reconciliation recomputed settled unit returns and cash, not the missing full minute-by-minute equity timeline. Endpoint marks remain separate from settled PF.

## Strategy types and directions

Engine trailing-only has no settled orders. Every Signal strategy type has no settled orders. The nonempty type cohorts are:

| Case | Type | Funded closes | Unit PF | Sized net $ |
|---|---|---:|---:|---:|
| Corrected | dca | 500 | 10.168229114 | 0.34031741 |
| Corrected | normal | 32,870 | 0.990477867 | 2.80977755 |
| Corrected | trailing | 93,010 | 0.645880975 | -4.69369765 |
| Entry Last-N 5 | dca | 477 | 9.720952032 | 0.35182783 |
| Entry Last-N 5 | normal | 22,396 | 2.221202928 | 8.46288559 |
| Entry Last-N 5 | trailing | 64,306 | 0.940345316 | 3.58042783 |
| Entry Last-N 15 | dca | 483 | 9.832436606 | 0.35510941 |
| Entry Last-N 15 | normal | 24,974 | 1.698292337 | 7.34038330 |
| Entry Last-N 15 | trailing | 69,446 | 0.864380198 | 1.56559653 |

Baseline type/direction results equal corrected results exactly. Both directions actually execute; long performance remains materially negative in every case.

| Case | Direction | Funded closes | Unit PF | Sized net $ |
|---|---|---:|---:|---:|
| Corrected | Long | 79,590 | 0.232366515 | -21.52574939 |
| Corrected | Short | 46,790 | 19.585727016 | 19.98214670 |
| Entry Last-N 5 | Long | 41,568 | 0.235851207 | -9.02411994 |
| Entry Last-N 5 | Short | 45,611 | 20.157657782 | 21.41926120 |
| Entry Last-N 15 | Long | 48,816 | 0.232572125 | -11.99713694 |
| Entry Last-N 15 | Short | 46,087 | 19.992913197 | 21.25822618 |

## All six trading hours

Times are UTC on 12 October. Each cell retains **funded closes / unit PF / sized net $**. The rows contain engine orders only because all Signal execution cohorts are empty. Unit PF and sized-cash sign can differ because order sizes differ.

| Hour | Baseline = corrected | Entry Last-N 5 | Entry Last-N 15 |
|---|---|---|---|
| 09:00 | 6,298 / 1.044362 / -0.02822089 | 4,292 / 1.118663 / -0.07164008 | 5,236 / 0.974325 / -0.09345262 |
| 10:00 | 19,594 / 2.194260 / +0.39197506 | 12,154 / 1.309820 / -0.04142873 | 13,424 / 1.579479 / +0.07958891 |
| 11:00 | 21,819 / 1.832258 / +1.84913142 | 17,861 / 2.765207 / +2.85724532 | 18,885 / 2.613080 / +2.64325478 |
| 12:00 | 26,507 / 1.344581 / +3.03744379 | 17,644 / 2.276557 / +3.97722558 | 19,130 / 1.954709 / +3.75279951 |
| 13:00 | 12,744 / 0.842402 / +0.47980361 | 8,726 / 1.342849 / +1.06891133 | 9,659 / 1.307400 / +1.07921754 |
| 14:00 | 39,418 / 0.428864 / -7.27373568 | 26,502 / 0.799163 / +4.60482784 | 28,569 / 0.663225 / +1.79968112 |

## Base → config validation → execution

Base processed **854 engine pairs; 104 passed** in every case. Micro passed 102/700 at applied floor 1.05; Minimal passed 53/854 at 1.10; these overlap and must not be added to obtain the total. Wide, Short, General and Long admitted no pairs. The last three ranges each first failed the minimum-close check on all 89 evaluated pairs. These empty ranges were not disabled to improve the headline.

| Run-start config evaluation | Evaluated | Passed |
|---|---:|---:|
| Baseline | 76,754 | 32,507 |
| Corrected | 76,754 | 32,507 |
| Entry Last-N 5 | 76,744 | 32,507 |
| Entry Last-N 15 | 76,744 | 32,507 |

These are **run-start** counts, not distinct configs passing at any hour and not the later paper/current selection snapshot. The entry gate is evaluated again at each candidate’s causal entry. More validated config copies do not imply more independent market opportunities or feasible capital allocation.

Run-start first failing gates for baseline/corrected: net 14,050; Last-N 11,854; DDT 7,140; DDR 6,718; insufficient closes 2,227; PF 1,394; LCB 582; range gate 268; green-hour gate 14. A further 1,248 built cells were type-off rather than economically evaluated. Entry variants have the same passing count and ten fewer evaluated/DDR-rejected retained cells (76,744 evaluated; DDR 6,708); their full gate breakdowns are retained. No threshold was lowered to turn these rejections into passes.

## Attribution in losing hours

The independent reconciliation retains positive exact-config contributors inside cash-losing hours as descriptive evidence only. Early 09:00 leaders have only **one settled close**; the entry-5 10:00 leaders have **two**, so they provide no basis for extending those configs. At baseline/corrected 14:00, `follow|mc-rsi2-20@m5|tp1.6|sl4.4|tr0|h192|mn` and its `h288` sibling each have 13 winning closes over 13 symbols, unit-net sum +0.1885 and sized net +$0.01776103. Their no-loss ratio is unbounded, not an exact finite PF; their hourly sample is below the planned 50-close pruning threshold. The overlapping sibling copies are not independent tests.

No settings were fitted to those hours. No range was pruned. Twenty-two-symbol/24-hour selection and the untouched final comparison remain required before any research-only disabled subset can be considered. These development results authorize no live promotion.

## Processing performance

| Case | Session seconds | Compute seconds | Reported peak RSS MB |
|---|---:|---:|---:|
| Baseline | 187 | 45.531 | 10,625 |
| Corrected | 185 | 44.494 | 11,555 |
| Entry Last-N 5 | 177 | 43.162 | 11,169 |
| Entry Last-N 15 | 198 | 49.112 | 10,370 |

Each case used four workers on its own CI runner. The initial high peak RSS motivated the separately verified rerun below; these short cases do not certify memory use for every symbol count or long session. Successful CI completion is a software/evidence result, not a profitability result.

## Source seals and reconciliation artifacts

Economic baseline: `2860c3fd8ce6e5a277e7d164453e10fe0ba6eef1`. Economic correction: `7b554b95c910e4a00a82894945acde29c12d3a3f`. Common study/launch checkpoint recorded by the protocols: `19e1885eced46a44c69b064d6e089c9b3ce0d702`; CI job head is the `cc1b683...` commit above. Exact source-file seals, rather than these labels alone, define each executed arm.

Feed SHA256: `84e29bb4e729e6f4e213ba1c8e6eb8c1a11ecbc0a8b3f65e958a4563040f8019`.

| Case | Job | Artifact ID | Exact source seal SHA256 |
|---|---|---:|---|
| baseline20 | [success 117519407536](https://github.com/mxssnx-creator/CTS-A-O/actions/runs/39074495099/job/117519407536) | 12116836984 | `d723325d5c5372b089a9cb72ea86ebff4aa1686e55e20729f520bfd9265cdb82` |
| corrected20 | [success 117519407563](https://github.com/mxssnx-creator/CTS-A-O/actions/runs/39074495099/job/117519407563) | 12116199419 | `6d899f4d947c49546edf0ccf93d048ca870f458756149bf3f240b4049fddfb12` |
| dev20-entry5 | [success 117519407568](https://github.com/mxssnx-creator/CTS-A-O/actions/runs/39074495099/job/117519407568) | 12116358737 | `6d899f4d947c49546edf0ccf93d048ca870f458756149bf3f240b4049fddfb12` |
| dev20-entry15 | [success 117519407532](https://github.com/mxssnx-creator/CTS-A-O/actions/runs/39074495099/job/117519407532) | 12116343818 | `6d899f4d947c49546edf0ccf93d048ca870f458756149bf3f240b4049fddfb12` |

All GitHub ZIP digests were verified before safe relative-path extraction. The full local artifact roots are `runs/exact-signal-study-ci/{baseline20,corrected20,dev20-entry5,dev20-entry15}/`. Each root preserves:

- `artifact.zip` — exact downloaded GitHub artifact.
- `frozen/<case>/protocol.json` and `desk.json` — complete normalized settings, WF, source seals and windows.
- `evidence/raw.json` — causal simulation output.
- `evidence/html/data.json` — exact per-close allocation rows plus report/account data.
- `evidence/audit.json` — independently generated CI arithmetic/cohort audit.
- `launcher.json` — commands, exit statuses, timing and recorded file digests.
- `compact-independent-summary.json` — compact local result extraction.
- `independent-reconciliation.json` and `.md` — local unrounded math, streamed checksum verification, row fingerprints and descriptive losing-hour contributors.

For every case, local `math.fsum` recomputed canonical unit gains/losses and sized cash from unrounded allocation rows, matched the report to rounding precision, and verified raw/protocol/audit file SHA256 values. Baseline/corrected funded identity/unit-return fingerprint:

`9d25e733975ac4edd1aae485ea4ae1b8893d8b3ec5b3299c15fb27baf620ea70`

Entry-5 fingerprint: `43fd7a392fe233a885bc56059f1f0d1374fdac02cc400cf24c5cfb8868fdb436`. Entry-15 fingerprint: `14033c343babadd2d0e9bc2490723a08c321d352cc55747534225afd9ed83d3b`. A resource-only rerun must preserve these economic decisions under the same frozen settings, source feed and window, or explain and re-evaluate any difference before claiming parity.

| Case | GitHub artifact ZIP SHA256 |
|---|---|
| baseline20 | `59576d76fe721c79c80f290f93d13af85465a47c9a1b824c6470130b053be20b` |
| corrected20 | `f7a0c5d0a42aa73d7f17b977abcc36fb87e0e1400d7a38edfd373c34cdca04bf` |
| dev20-entry5 | `3e9371003c08074d231e53dfeff1f05aeeb20c2164c68bfc0d304e0aad8a74ee` |
| dev20-entry15 | `2f8ee195dae2a654ca571d8a985a10da346684bfa14c2e5a9c8ace273ef4fa62` |

## Resource rerun: exact economic parity verified

The four development cases were repeated in [Actions run 39075908889](https://github.com/mxssnx-creator/CTS-A-O/actions/runs/39075908889), job head `eaddfb67bea98599f1b43113fdabf4318bad90c9`. All four strict reports/audits completed successfully. The protocols record common checkpoint `dd9d77edb04e8e1a5e7762f0c0413b014bb19dbb` plus exact executed source-file seals.

Common instrumentation explicitly disables the unrequested preset-comparison benchmark with `CTS_CORE_COMPARE=0`. The corrected replay runtime loads the full fixed symbol universe before computing; its old runtime loaded progressively. The baseline economic-source patch explicitly restores legacy progressive loading, so it is a control for the baseline policy, not evidence that every runtime received identical batching. Comparison/report code and normalized economic settings remain matched.

For **every case**, independent review verified the following against its original case:

- Frozen `actualSettings` and `actualWf` are equal.
- Every settled order’s config, symbol, direction, entry/exit timestamp and canonical unit return has the identical ordered SHA256 fingerprint.
- Every settled order’s unit notional, sized return, allocated notional and sized cash P&L has the identical ordered allocation fingerprint.
- Full account total summaries remain equal, including endpoint equity and feasibility.
- Raw, protocol and CI audit file SHA256 values match their recorded seals.

Thus the PF, cash results, empty Signal cohorts, hourly tables and capital-risk failures above are unchanged. This is measured economic parity for these fixed development sessions, not proof for all later/live sessions.

| Case | Old → new wall seconds | Old → new peak RSS MB | Old → new strategy compute seconds | Settled unit rows | Settled allocation rows |
|---|---:|---:|---:|---|---|
| baseline20 | 187 → 150 | 10,625 → 3,492 | 45.531 → 55.470 | identical | identical |
| corrected20 | 185 → 49 | 11,555 → 3,315 | 44.494 → 43.409 | identical | identical |
| dev20-entry5 | 177 → 59 | 11,169 → 3,074 | 43.162 → 54.821 | identical | identical |
| dev20-entry15 | 198 → 57 | 10,370 → 2,998 | 49.112 → 51.850 | identical | identical |

Corrected20 elapsed time fell **73.5%** (185→49 s) and reported peak RSS fell **71.3%** (11,555→3,315 MB). Direct strategy compute is not uniformly faster: entry-5 and entry-15 compute time increased in these executions. The measured improvement primarily removes unnecessary background work and constrains replay scheduling; it must not be described as a universal indicator-compute speedup.

| Case | Settled unit-return fingerprint | Settled allocation/cash fingerprint |
|---|---|---|
| baseline20 | `9d25e733975ac4edd1aae485ea4ae1b8893d8b3ec5b3299c15fb27baf620ea70` | `195d7a8bbc9789880427ba966389b089451915219713beed92c5d4a6a8f9c437` |
| corrected20 | `9d25e733975ac4edd1aae485ea4ae1b8893d8b3ec5b3299c15fb27baf620ea70` | `195d7a8bbc9789880427ba966389b089451915219713beed92c5d4a6a8f9c437` |
| dev20-entry5 | `43fd7a392fe233a885bc56059f1f0d1374fdac02cc400cf24c5cfb8868fdb436` | `ee02fcac01989afb99bc6c0942fdd3f4f63f7cdc0c03aa05827f764b11a0dd09` |
| dev20-entry15 | `14033c343babadd2d0e9bc2490723a08c321d352cc55747534225afd9ed83d3b` | `8bedd28bb85dc517dfe00e6276fd4d8ed8c4631afea0ba50ff510540048257de` |

New corrected/entry-5/entry-15 exact source seal: `e0c944be623bcda9835ed4bfafc59a7d1a217b554e3f68a80b9bf14fcee0adb5`. New baseline exact source seal: `1e2a192f6c5d368f759a4d5a68643071dd3d6086ed853cb0fab0c8a2da55a071`.

| Case | New frozen protocol SHA256 |
|---|---|
| baseline20 | `40147321ccff29690443211315f41af241c69b4e0e161e1d686650781a31bbb1` |
| corrected20 | `24ca440bc375e221e1af6e346204414991438ae265a8f1e4b0f17d1f17002f99` |
| dev20-entry5 | `507e56e8db0a7e85af0eb4644b6a2d71784c6bf892861dca51ab4912f99f29e1` |
| dev20-entry15 | `a4aa6f5b832d605983052b11467d9660813779f9672a43efdd857a061e8cee98` |

All new evidence is preserved under `runs/exact-signal-study-ci-v2/<case>/`: the exact `artifact.zip`, `frozen/<case>/protocol.json`, `desk.json`, `evidence/raw.json`, `evidence/html/data.json`, `evidence/audit.json`, `launcher.json` and local `independent-economic-parity.json`. The four-case aggregate is `runs/exact-signal-study-ci-v2/development-economic-parity.json`.

| Case | New GitHub artifact ID | Verified ZIP SHA256 |
|---|---:|---|
| baseline20 | 12117470740 | `b36a30915e20c6541ad851b8dafeaf6eb31a172d165812de93a06e4d745daf6a` |
| corrected20 | 12116724418 | `735338c05d66d215a68b2df1d8fd9bc72ed6bdfbfeef786ae7a5430267acd262` |
| dev20-entry5 | 12117092183 | `2018138b88c61c59629440332c5aad1b7a68e9d3126dc6bbd4943016cd966953` |
| dev20-entry15 | 12116619642 | `0323711b5dda403df37fd285feca0e400839865b0a2308ac12e89215b4d01b59` |

The resource improvement does not repair the uncapped portfolio’s financial infeasibility or supply missing Signal execution evidence. No promotion or research pruning follows from these development reruns.
