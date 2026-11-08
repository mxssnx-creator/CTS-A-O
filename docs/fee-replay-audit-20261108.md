# Fee and replay audit — 2026-11-08

The configured fallback is maker 0.0005 and taker 0.0008 (fractions: 0.05% and 0.08%). Slippage is a fee ratio of 0.1, i.e. 10% of the applicable fee. Taker/taker paper allowance is 0.176%, maker/taker 0.143%, maker/maker 0.110%. These are operator assumptions, not measured venue rates.

Account-specific rates supersede fallback estimates only within their symbol/account scope and freshness window. Unknown selected symbols continue to contribute their fallback. Actual fill prices already contain slippage; measured fees, confirmed zero and explicit normalized rebates are not charged an additional paper allowance. Do not treat a LIMIT order as maker evidence.

This source update does not start or deploy a trading service. Candle simulations cannot reproduce queue priority, unknown intrabar paths, latency or liquidity. No profitable configuration was promoted from this sample, and high settled-only PF does not establish high marked or future PF.

## Evidence window

8 cached symbols (ADA, AVAX, BCH, BNB, BTC, DOGE, DOT, ETH), 2026-11-06 19:00 to 2026-11-07 19:00 UTC. First 12 hours are prehistory; last 12 hours are scored. Data was already cached; no private account rates or credentials were read.

| Project / scope | Closes | Settled PF | PF including open marks |
|---|---:|---:|---:|
| CTS-G shared parent replay, new cost | 17 | 10.602 | 0.931 |
| CTS-G same replay, legacy fixed 0.12% | 17 | 9.312 | 1.135 |
| CTS-A-O native runtime, 12h selection | 0 | unavailable | unavailable |
| CTS-A synthetic Axis + Block | 9 | 0.80985 | not comparable |

CTS-G fast replay (cached, hourly diagnostic sampling) took 7 s versus 38 s for the detailed cold run. Exact closed trades and open positions matched; 60 sampled production gate/rank checks passed. Validation always remains per entry. Diagnostic sampling density is not the admission cadence.
An initial CTS-A-O run took 92.5 s with four workers versus 246.3 s with one worker, but selection settings differed, so this is not a controlled speed benchmark. Its coverage checks failed: 2,099/3,288 requested Base combos returned; 36 pairs passed Base and 0/14,042 later config evaluations passed. 608 Micro candidates failed the close-count requirement. Do not replace these zero executions with historical selected-window PF.


## Further native checks and Micro research

Adding cached indicator warmup (49h of physical candles, still only 12h evaluated prehistory + 12h scored) allowed CTS-A-O to execute 34,711 modeled closes, settled return PF 8.37235. This is **not** a successful live preset: 15,532 order allocations remain open across seven positions, the modeled $10 book ends at negative $9.79 equity, and exposure is infeasible for 541 minutes. The high settled PF conceals open losses. The run took 170.9 seconds. Most closes were Minimal; Micro indications participated but the separately named Micro range did not qualify. Requested slow lanes still lack enough prehistory.

A separate CTS-A-O Micro study tested 48 first-class source/timeframe/profile combinations plus the runtime's automatic legacy Micro focus: 1/5/15m, 15-minute hold, net targets at 1/1.5/2 times the 0.176% fallback, stop ratios 1/1.5/2 and four trailing choices. It evaluated 816 Micro pairs, passed none and executed none (3 seconds). Median evaluated Micro PF was 0.1051. This losing research grid is not a new default.

CTS-G's actual Pulse parent position manager was driven offline on an explicit OHLC tick path for the 17 replay entries. All 17 exit reasons and exit bars matched. Stub market prices and fee-only estimated settlement differ from barrier-fill paper prices; these differences are retained. This is parent lifecycle evidence, not full account execution proof. Two Axis replay defects are fixed: open positions consume continuation slots through the end, and last-N/loss streaks follow settlement order. Both new regressions pass.

## Implementation and verification

The model default uses fee-relative slippage. Higher modeled costs are validated, never silently reduced to 0.15%. Legacy explicit absolute slippage retains its meaning. Version 38 migrates only the exact former factory tuple, keeps a durable backup and invalidates migrated preset PF evidence; custom settings stay intact.

The BingX adapter exposes read-only commission lookup. The runtime refreshes one symbol at a time after protection work, scopes cache identity by account fingerprint and recomputes the conservative selected-symbol budget. Stale or failed reads fall back; they cannot retain an indefinitely cheap cost. Actual fill fee reconciliation remains independent.

Verification: fee/account-refresh tests, migration/seat tests (45), focused Axis/Micro cost and gap tests (16), TypeScript check and build passed. The broader 86-test run was made before expectation updates: five obsolete default/cap assertions and one trailing return-cost assertion failed; those cases passed on targeted reruns. Test changes preserve their price/quantity/ownership assertions while updating the requested fee model.

Open issues: zero post-Base configuration admission in both bounded market experiments; incomplete Base coverage; adapter integration documented in the existing operations handoff. The fee changes do not resolve or conceal those issues. Bybit rate parsing is tested, but the existing Bybit primitives are not yet connected to this executor.

## Step PF, relations and unresolved stage adapter
New `gates.stepPf` settings expose enabled/ratio/max, default true/0.2/2 for new defaults. The manual CTS-G formula is neutral 1 + target-percent-grid × ratio; round down to the 0.1% grid, bounded to 0.2–3.5%. Keep stricter configured range/type floors; Signals retain their separate policy. Trailing-only uses its activation distance; ATR protections use their documented nominal distance. Exact Base cells, downstream selection, entry, native admission and cell statistics resolve the same rule. Selection-cache provenance includes the policy. Legacy settings without the property remain readable and custom floors are not replaced.
Stable-02 relation volume now matches each entry's symbol/direction/indication/type/config keys. Global relation summaries are diagnostic, not the multiplier of an unrelated entry.
Validation: 122 focused tests passed after the changes. A separate processed-stage/ownership suite passed 99 tests with one explicit existing TODO: persistent processed Main → Real is not integrated into the runtime. That failed causal predecessor fixture remains visible. These changes do not establish complete runtime/live parity or high executed PF. A high settled PF with negative marked equity is not a successful preset.
