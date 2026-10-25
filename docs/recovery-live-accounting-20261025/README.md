# Post-Base admission, DCA/Block and actual exchange accounting — 25 October 2026

Status: implementation and focused correctness checks pass; full final-source CI and financial comparisons are pending. **Not certified production-ready; no X02 VST orders or live settings changes in this work.** PF 1 is neutral. All losses and insufficient/empty outcomes remain visible.

## Admission and measured costs

Native entry reads each exact config/symbol/direction Last-N through an indexed, bounded query. Versioned caches expire on new closes or a future close crossing the decision clock; unknown ownership and invalid timestamps remain unknown. Previously the first lane after every book update loaded all historical closes for every configuration. A 100,000-row synthetic comparison checks the same verdicts in 20 revisions: full rebuild median 271.317 ms, bounded read 0.359 ms. This is not venue latency or financial evidence. An initial query-plan attempt still scanned the broad timestamp index; its 62.364 ms receipt is retained. Partial exception indexes now explicitly serve corruption checks.

A qualified lane opens while unrelated exchange income retrieval remains pending. Losing pooled/sibling results cannot veto its independently passing post-Base and execution proof. Current own-context gates, ownership, funding, freshness and venue limits still apply. Same-cohort return tests detect duplicate cost deductions and mismatched identities; later settled cohorts need not have historical fitting PF.

Modeled round-trip deduction remains **0.15% (0.0015) exactly once**. Venue returns require actual entry/exit fill prices and measured fees, including explicitly measured zero fees. Estimated fees remain labeled cash diagnostics, never verified return-PF evidence. Merged configurations retain measured account net under a mixed identity instead of assigning every sibling's result to the first configuration.

Read-only BingX income history uses the selected account/key/network fingerprint, bounded pages and resumable disjoint-window splitting. It persists complete windows plus their cursor, refreshes recent records and reconciles the preceding 150 hours hourly to pick up late entries. Signed funding, trading fees, liquidation/ADL/system deductions and other trading cash enter account net once; transfers and unknown cash remain separate. Funding is whole-account evidence, not invented per-config allocation. The endpoint contract was checked against BingX's official reference: https://github.com/BingX-API/api-ai-skills/blob/main/skills/swap-account/api-reference.md .

## DCA and independent Block recovery

Requested DCA default: two additions, each 2.5 original base-notional units (total 6), at up to 2% adverse distance. Ordinary default spacing is 1%/2%; capped Signals fit both additions before the existing 2% stop, normally 0.8%/1.6%. Target-based spacing respects the cap. DCA Active remains the alternative delayed-entry mode. Exact former factory settings receive a once-only backed-up migration; custom legacy spacing remains explicit and unchanged. No claim these weights are optimal.

Combined DCA entry now equals total cost divided by acquired quantity (a harmonic price average for equal notional weights). The old arithmetic price average changed open equity when the same price reached the ticker. Tests reconcile per-leg cash, combined marks, costs and settled returns in both directions. New ladder cap identities prevent old settings from qualifying changed configurations.

Block offers independent source multipliers and opt-in recovery until each recorded extra-leg balance reaches break-even. Entry attribution survives replay and holds Config/Symbol/Direction/Indication/Type/Overall histories independently. Unknown recovery cannot authorize a raise. Volume caps still include base plus every source. Defaults are not promoted as profitable: research compares base ratio 0.2 with multipliers Config1/Overall1/Symbol4/Direction2/Indication2/Type3. Accepted-only Block Active can be empty on a cold book; the separate Active arm retains that result rather than inventing accepted history.

## Validation and planned financial comparison

- Original local full core attempt: 3,528 passed, three failed, two explicit slow exclusions, no cancellations; all three failures are retained in the log. Two were expected economic-fixture changes (DCA harmonic entry and an explicitly uncapped legacy stop example); the lifecycle hash fixture needed its archived DCA options frozen. Its original hash is preserved after repair.
- Corrected focused suite: **248/248 passed**, including exact simulation parity, negative audits, stage consistency, live promotion, DCA/Block replay and history restart. A final small unknown-recovery addition is checked separately. Types and production build passed; lint has zero errors and 43 existing warnings. Final-source complete CI remains required.
- New frozen study: ten Signal+Exit arms (control, unit DCA, weighted DCA, Active DCA, DCA+Block, each original/later window); eight complete ordinary arms (Micro minimum SL/TP ratios1/1.5/2 at both windows, plus recovery and recovery-Active). Every case uses 12 symbols, 12h trading, minute prices, production PF/sample gates and 0.15% costs. Ordinary inventory:38,402 combinations across19 families plus no-indication;1/5/15/30m; optional Wide/Minimal Plus included. Signal fitting150h, Last4,1/5/15m.
- Wider Micro ratios are research candidates, not an asserted profitable default. Full settings, source fingerprints, raw trades, funded allocations and failed runs are retained by the workflow. Reused windows are retrospective comparison, not untouched forward evidence.

## Last completed controls (previous exact source)

| Window | Settled unit PF | Orders opened / settled / held | Positions opened / closed / held |
|---|---:|---|---|
| Original | 4.96115 | 449 / 366 / 83 | 14 / 6 / 8 |
| Later | 0.067947 | 860 / 278 / 582 | 4 / 2 / 2 |

These controls are source `fc0797430294d8f287a6f021c81994fc2e4e5a5c7d2228cf8923bac2062c1c0b`, not a result of the new DCA/Block changes. Each passed68 native checks; combined78,791,856 scalar comparisons and full historical byte parity passed. The later losing cohort means the requested stable positive behavior remains unproven. Full ordinary old-source processing workflow40200402203 was still running at this checkpoint.
