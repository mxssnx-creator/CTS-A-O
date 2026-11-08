# Fee, step PF and replay audit — 2026-11-08

## Policy and scope

Configured fallback fees are maker 0.0005 (0.05%) and taker 0.0008 (0.08%) per side. Slippage is a fee ratio of 0.1: 10% of the applicable fee, not 10% of position notional. Modeled round-trip allowances are 0.176% taker/taker, 0.143% maker/taker and 0.110% maker/maker. Account-specific rates supersede fallback estimates only within their symbol/account scope and freshness window. Unknown selected symbols keep their fallback.

Actual fill prices already contain slippage. Measured fees, confirmed zero and explicit normalized rebates do not receive another modeled allowance. LIMIT alone is not maker evidence. No private fee endpoints or credentials were read for this audit, and no real-money service was started.

The manual step rule is `max(existing lane/range floor, min(maxSetting, 1 + floor(tpPercent * 10) / 10 * ratio))`, with the target grid bounded to 0.2–3.5%. New settings default enabled/ratio/max to true/0.2/2. Stricter existing floors remain. Signals keep their independent policy. A qualifying historical PF is an admission rule, not a promise about later results.

## Final measured results

Eight cached symbols: ADA, AVAX, BCH, BNB, BTC, DOGE, DOT, ETH. Evaluated prehistory is 2026-11-06 19:00–2026-11-07 07:00 UTC; the scored period is November 7 07:00–19:00. This is 12h prehistory plus 12h scored, not a 24h scored test. CTS-A-O additionally receives 25h of indicator-only warmup, for 49h of physical candles; its evaluated and scored windows stay unchanged. CTS-A uses generated prices rather than this exchange feed.

| Project / evidence | Modeled settled closes | Settled return PF | Open-position outcome |
|---|---:|---:|---|
| CTS-G selected parent replay, new cost | 17 | 10.602 | 8 held; closed + marked PF 0.931 |
| CTS-G same replay, legacy fixed 0.12% | 17 | 9.312 | closed + marked PF 1.135 |
| CTS-A-O final native runtime | 34,629 | 8.30590 | 15,532 allocations / 7 positions held; final equity −9.77912 from a 10-unit book |
| CTS-A synthetic Axis + Block | 9 | 0.80985 | synthetic evidence only |

CTS-A-O's final closed balance is 17.69987, but open mark-to-market is −27.47900. The allocation model exceeds feasible exposure for 541 minutes; six hours are green and six red. It reports 50,161 opened allocations and 34,629 settled allocations. These are modeled counts, not exchange orders. The high settled PF does not make the configuration viable. Report checks are 75/77: complete-combination and complete-kind coverage still fail. Base passes 114/2,240 returned evaluations; downstream config passes are 4,971/53,622. Signals build 125,970 tapes but seat none.

The same-warmup fee-only baseline had 34,711 closes and PF 8.37235. The final step policy reduces closes by 82 and lowers settled PF slightly; it is not presented as a performance improvement. Initial 24h-physical-feed runs had zero closes. Additional indicator warmup changes the available candidate cohort, so the warmed run is not a controlled speed comparison to those initial runs.

## Micro, Axis, Block and parity limits

CTS-G's isolated Micro run constrained TP and trailing ranges and disabled the separate Short Range pack: 168 sets, 1.49% Base validity, zero executions. CTS-A-O's separate Micro grid tested 48 source/timeframe/profile combinations plus automatic legacy focus, with 1/5/15m timeframes, 15-minute hold, targets 1/1.5/2 cost units, SL ratios 1/1.5/2 and four trailing choices. It evaluated 816 Micro pairs, passed none and executed none; median evaluated PF was 0.1051. Micro indications do execute in the Minimal range, which is distinct from the separately named Micro range.

CTS-G native Pulse parent management was driven offline on an explicit OHLC tick path for all 17 selected entries: 17/17 exit reasons and exit minutes match. Tick-market fills and fee-only settlement estimates differ from barrier-fill paper prices, and those differences are retained. This is not complete account-level, funding, Block lifecycle or exchange-fill parity. Axis replay now keeps held parents in continuation slots and orders last-N/loss streaks by settlement.

CTS-G cached replay with hourly diagnostic sampling took 7 seconds versus 38 seconds cold; closed and held lists match. A later fresh-cache stage-statistics check took 21 seconds under different concurrency. CTS-A-O final compute took 185.0 seconds, total 189 seconds, with a 562ms worst foreground slice; it does not establish a strict sub-500ms cycle. CTS-A synthetic Minimal/Axis/Axis+Block results are 1/6/9 closes and PF 0/0.8453/0.8099, taking about 3.33/2.02/1.97 seconds.

No profitable preset is promoted. Complete causal processed-stage runtime integration in CTS-A-O, complete timestamped exchange replay in CTS-A, account-feasible sizing, Micro/Signals coverage and consistently positive marked results remain outstanding. No future PF guarantee follows from these tests.

## Implementation and verification

The model default uses fee-relative slippage. Higher modeled costs are validated, never silently reduced to 0.15%. Legacy explicit absolute slippage retains its meaning. Version 38 migrates only the exact former factory tuple, keeps a durable backup and invalidates migrated preset PF evidence; custom settings stay intact.

The BingX adapter exposes read-only commission lookup. The runtime refreshes one symbol at a time after protection work, scopes cache identity by account fingerprint and recomputes the conservative selected-symbol budget. Stale or failed reads fall back; they cannot retain an indefinitely cheap cost. Actual fill fee reconciliation remains independent.

Verification: fee/account-refresh tests, migration/seat tests (45), focused Axis/Micro cost and gap tests (16), TypeScript check and build passed. The broader 86-test run was made before expectation updates: five obsolete default/cap assertions and one trailing return-cost assertion failed; those cases passed on targeted reruns. Test changes preserve their price/quantity/ownership assertions while updating the requested fee model.

Open issues: incomplete Base coverage and persistent processed Main-to-Real adapter integration documented in the operations handoff. The warmed run admits configurations but does not solve those issues. Bybit rate parsing is tested, but the existing Bybit primitives are not yet connected to this executor.

## Step PF, relations and unresolved stage adapter
New `gates.stepPf` settings expose enabled/ratio/max, default true/0.2/2 for new defaults. The manual CTS-G formula is neutral 1 + target-percent-grid × ratio; round down to the 0.1% grid, bounded to 0.2–3.5%. Keep stricter configured range/type floors; Signals retain their separate policy. Trailing-only uses its activation distance; ATR protections use their documented nominal distance. Exact Base cells, downstream selection, entry, native admission and cell statistics resolve the same rule. Selection-cache provenance includes the policy. Legacy settings without the property remain readable and custom floors are not replaced.
Stable-02 relation volume now matches each entry's symbol/direction/indication/type/config keys. Global relation summaries are diagnostic, not the multiplier of an unrelated entry.
Validation: 122 focused tests passed after the changes. A separate processed-stage/ownership suite passed 99 tests with one explicit existing TODO: persistent processed Main → Real is not integrated into the runtime. That failed causal predecessor fixture remains visible. These changes do not establish complete runtime/live parity or high executed PF. A high settled PF with negative marked equity is not a successful preset.

The CI independent-config suite passed 80/80 after replacing a strict floating-point equality for estimated fees with a 1e-15 tolerance. Confirmed-zero checks stay exact. The final native run is `ao-stage-verified`, not an earlier zero-output or intermediate step-policy run.
