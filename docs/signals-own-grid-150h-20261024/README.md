# Signal 150-hour history verification

Source: `619ba50f37a7c1e9c8a10ee5167a37baf44306b48b32df7a198f0b10c3cf781e`. Final tested GitHub head `47600029d7e284fa86db3e03e1251a7d0f047f83`; PR198 merged as `1ce96f68ebabab090735e7529ad138702342d9dc`. The replay fingerprint matches the final source exactly. Offline modeled replay; no live deployment or venue orders.

150 evaluated hours, Last-4, 12 symbols and 12 trading hours. Pricing and execution remain minute-based. Hourly clocks are audit/reporting boundaries. Signal coordination uses the own Signals grid plus independent Exit. Ordinary strategy grids are not multiplied into Signals. All configured cells were built: 160,115 configs, 118 sources, 884 source/lane identities, 122/122 Exit configs.

Endpoint Last-4: 125,652/160,115 configs (78.48%) have a ready own context. Exact contexts: 1,193,674/3,842,760 (31.06%). Full minimum sample: 5.55%. All evaluation gates: 9,822 contexts across 7,221 configs. Readiness alone is not eligibility.

| Dimension | Group | Configs | Exact Last-4 ready | Configs with a ready context | Settled orders | Unit PF |
|---|---|---:|---:|---:|---:|---:|
| type | exit | 122 | 38.76% | 98.36% | 7 | 0.487 |
| parameterRange | short | 78,256 | 34.88% | 81.99% | 204 | 3.224 |
| strategyRange | Exit | 122 | 38.76% | 98.36% | 7 | 0.487 |
| lane | 15 | 36,761 | 40.19% | 78.93% | 156 | 0.423 |
| parameterRange | medium | 78,220 | 26.43% | 73.97% | 97 | 1.784 |
| lane | 30 | 33,890 | 21.19% | 63.55% | 30 | 2.99 |
| type | normal | 33,813 | 31.26% | 79.07% | 39 | 3.429 |
| strategyRange | Signals | 159,993 | 31.06% | 78.46% | 332 | 3.059 |
| lane | 1 | 45,527 | 13.64% | 81.17% | 0 | None |
| type | trailing | 106,290 | 31.01% | 78.22% | 239 | 2.549 |
| type | trailing-only | 19,890 | 30.96% | 78.73% | 54 | 6.847 |
| lane | 5 | 43,937 | 49.10% | 86.82% | 153 | 11.721 |
| parameterRange | short+medium | 3,639 | 48.56% | 99.67% | 38 | 16.249 |

14 funded modeled positions opened: 6 closed, 8 held. 436 orders opened: 339 settled, 97 held. Peak 12 positions / 250 orders. Settled unit-return PF 2.907107; cash-weighted diagnostic PF 2.703943. Equity gain 0.109625%; maximum minute-marked equity drawdown 0.292961%; maximum equity drawdown duration 6.933 hours. Open MTM −0.004823 remains separate from settled returns.

Five settled unit-return hours lost, six gained and one had no closes. Funded cash-hour results differ with sizing: eight positive, three negative, one flat. Exit PF 0.487 and 15m PF 0.423 remain negative; 1m has no executed orders. No claim of uniformly positive or future performance. DCA/Block/Axis are disabled in this frozen financial profile; lifecycle CI is separate from profitability evidence.

68/68 native reconciliation checks and 49,955,880 independent scalar comparisons passed. All 339 settled closes match exact tapes; zero missing or mismatched. No unknown funding allocations. All 229 independently valid unselected candidates were explained by retained admission rules: 79 recent-activity rejects and 150 Block-rule rejects. Do not bypass those rules to inflate order counts.

Compute 600.663 seconds; native/report wall 638.379 seconds; child peak RSS 4092.84 MiB. Independent audit 102.521 seconds, peak RSS 818.815 MB. These runs were not controlled same-host timing comparisons. The prior 100h ordinary-grid release had 203 orders and PF1.882191; both routing and history changed, so the new result cannot be attributed to history alone. Standard coordinator protection cells fell from 2670 to207 per source/lane (92.25%); complete background histories remain for reevaluation, while foreground capture is selected/held only.

Superseded 100h attempts and the first150h launcher failure are preserved in the raw archive. The launcher failure correctly rejected a mismatched frozen ordinary-engine window; the corrected run retains ordinary longH100 while Signal/Exit history is150.

Verification: all 4,289 tests pass (3,489 ordinary core, 2 slow runtime, 715 scripts, 83 app/component). Eight template-only skips; the two slow cases excluded from ordinary partitions pass separately. Types/build pass; lint has zero errors and 43 existing warnings. All three final-head workflows pass. Desktop/mobile report screenshots were visually inspected: readable content, no page/console errors or outer horizontal overflow. See release.json and verification/.

All 4 protection types, all 3 parameter ranges, both strategy ranges and all 4 lanes have Last-4-ready contexts. 112/118 sources (94.92%) have a ready context; 81 have at least one all-gates-passing context. Six sources are insufficient: r-squeeze, r-capit, r-vwap-reclaim, r-bbw-expand, r-spring, r-engulf. All 12 symbols have enough Last-4 history somewhere; 11 have an all-gates-passing context. Zero orphaned orders and zero duplicate parents.

Reproduce in a new directory: `node --experimental-strip-types --no-warnings scripts/prepare-signals-last4.mjs runs/NEW_150H 150`, then `python3 scripts/run-signals-native-case.py runs/NEW_150H last4`. The older paired-study launcher retains its explicit 100h compatibility default; pass150 for this study. Production Signal/Exit defaults are150h.
