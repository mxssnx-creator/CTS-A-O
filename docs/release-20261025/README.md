# 25 October 2026: Axis, publication and lossless reporting release

PRs #203 and #204 correct quote-funded Axis average entry, preserve held Minimal Plus configs during publication, carry independent Exit Base proof into reports, separate Signal Exit coverage from ordinary engine counts, and externalize large minute selection journals without discarding evidence. Gates, modeled round-trip cost (0.15% once), minute prices, Signal 150h history and Last-4 remain intact.

## Measured 12-symbol / 12-hour results

Counts are opened / closed-or-settled / held. Positions are funded symbol-direction episodes; config orders are independent and may share positions. Range position subsets overlap.

| Run | Positions | Orders | Primary return PF | Peak equity drawdown | Compute | Native/export wall | Peak RSS |
|---|---|---|---:|---:|---:|---:|---:|
| Ordinary EMA | 15 / 4 / 11 | 7,076 / 4,882 / 2,194 | 1.336606 | 22.5921% | 100.857s | 131.278s | 1,489.105 MiB |
| Signals, later control | 4 / 2 / 2 | 863 / 280 / 583 | 0.065995 | 1.1745% | 677.087s | 729.917s | 2,142.816 MiB |

PF is neutral at 1. These are post-Base funded settled cohorts, not raw historical PF or venue fills. Historical qualification cannot guarantee future returns. Ordinary cash-PF reconciliation is 0.990164 with net -$0.008482 on $10 starting equity; margin exceeded equity for 196 minutes. This is not financial or live-readiness evidence. No X02 connection or venue order was changed.

Ordinary EMA is one indication family, not the entire system. It passed 80/80 native checks, 4,882 exact funded-close comparisons and independent frozen Base/funding/hourly audits with zero missing, mismatched or unknown allocation evidence. Exit proof covers all 11 settled Exit orders. Minimal Plus orders were 5,743/3,765/1,978 (PF 1.46722), Wide 317/105/212 (PF 5.47335), Minimal 1,001/1,001/0 (PF 0.05782), and Exit 15/11/4 (11 no-loss closes; no finite ratio).

The fresh Signal native run exited 1 because its report incorrectly compared 10 Signal Exit configs with an ordinary engine population of zero. That failure and original report are preserved. Regenerating only the report with the corrected population check passes 69/69; raw simulation, protocol, historical journals and allocation inputs are unchanged. Do not describe the original native command as all-pass. The corrected report passes 29/29 strict release parity sections, with every previous check unchanged and the new independent Exit check separately validated. All 280 settled and 583 held allocations match the earlier control exactly.

Independent Signal history audit passes 39,402,168 scalar comparisons with zero missing configured cells: 126,289 configs, 10,999,508 closed histories, 118 sources and 663 source lanes. At endpoint, 34.3132% of exact contexts have Last-4 (denominator 3,030,936 includes empty contexts); 104,465/126,289 configs (82.72%) have at least one ready context. These are different denominators. Of 94 own-valid unselected candidates audited, 66 fail recent-history and 28 fail Block; zero entry-ready omissions were found among audited settled candidates. This does not certify every future or live candidate. Hourly closed P&L: 0 positive, 4 negative, 8 flat. Worst measured main-loop slice was 420ms, not a live venue SLA.

## Correctness and performance

Quote-funded Axis entry uses sum(weights)/sum(weights/price), preserving physical notional/quantity and exact single-leg price. Independent long/short weighted fixtures fail the old arithmetic. Minimal Plus keeps rejected held configs for exit management only and publishes exact rejection counts with the matching tapes. Original eligibility thresholds and causal boundary remain unchanged. Order lifecycle fixture teardown now flushes buffered state before closing SQLite and asserts persisted empty orders; production policy is unchanged.

Focused verification includes 201 ownership/order lifecycle tests, 106 publication/order-side tests and 97 combined report/storage/audit tests. Complete final CI is recorded in the handoff. Same-input report-only benchmark: 19.929s to 15.071s (24.4% faster), peak RSS 2,006.121 to 1,698.848 MiB (15.3% lower), HTML 198.4 MB to 2.49 MB. Lossless sidecar retains all 160 clocks and 1,428,676 keys; 29 session and 44 data fields remain semantically identical after hydration. This benchmark measures reporting, not trading throughput.

## Provenance and limitations

Ordinary source: cb4a1ca7591a76b20cdc5a479719094cbe66399342ec1af3a7ae419a26b3e517.
Signal frozen native/audit source: 9b8d3062c50e486f88228bfe6cb02ad63d3f48dd4a971156eb6e0d66784fda74 (b6aa8de checkout). Corrected report commit: d6da8b8159a233e21c32c4b854dd34606238bd21.
Signal full history SHA-256: 93918ea7fe50934848d1cd342ecee325d4f3e2dccbd141e7eadc62cc81a0bac9.

The broader all-family ordinary workflow 40226266532 remains separate old-source evidence; its completion is not implied here. Fractional Exit tactics, full-family economic validation and causal per-leg minute equity work remain unfinished. Later Signal PF is below 1. No thresholds were waived and no claimed position increase is supported by this control. Before any live reload, take a consistent database/settings/state backup, reconcile owned positions and reevaluate incompatible cached Axis qualifications. Unrestricted X02 VST activation remains unmet under the user's stability condition.

See archives.json for complete preserved raw evidence, including original failures and corrected independent audits. Existing details: ../axis-entry-20261025.md and ../selection-storage-20261025/.
