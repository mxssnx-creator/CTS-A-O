# Historic Exit coordination isolation

Historic Exit has independent protection and ownership identities, but several coordination paths previously pooled
its candidates or closes with other strategies. An Exit candidate could confirm an ordinary Signal; its results could
also affect shared Block/Relate levels, direction gates, Stable-02 windows, hourly guards, and Signal side or cluster
acceptance. Conversely, a Normal-only base PF floor and shared Signal/Stable-02 state could affect Exit entries.
These are code-path defects; the available evidence does not establish how much each contributed to the observed PF.

The simulator and paper/live continuation now keep Exit coordination under its complete config identity, including
automatic Block window scores, grouped relation evidence, direction history, Stable-02 state and realized-hour state.
Signal Exit retains its own config guard but no longer contributes to the ordinary Signal side or loss cluster. An
ordinary Signal requires an ordinary engine confirmation; an Exit position is not that confirmation. Historic Exit
direction acceptance uses its own indication and timeframe lane. Normal's independent base PF setting does not gate
Exit. Existing physical account, risk, exchange netting and order-capacity limits remain shared.

Regression coverage includes positive and losing synthetic Exit histories, fixed and automatically selected Block
windows, identical close deduplication across scopes, both trade directions, Normal and Signal sources, paper
continuation, separate stops and targets, partial/pending venue-order fixtures and restart ownership. Synthetic trades
and simulated exchange fixtures are not venue fills or proof of future profitability.

For context, the previously measured Low-Range Short screen at **2026-10-09 12:00 UTC** used a candidate-history
window of 24 hours and Base Last-40. It produced 45/3900 Base cells and 25/90 (27.78%) historically validated
contexts, with validation unit PF 2.891881. A separate subsequent 24-hour modeled execution had 37 closes at
PF 0.963800; it represented 17 opened, 17 closed and zero held positions, and 37 opened, 37 closed and zero held
orders. This is an offline diagnostic, not a live qualification rule; venue-owned PF was unavailable. Detailed
historical and modeled line listings remain in `docs/trailing-audit-20261028/report.html`. This change has not yet
been measured on a new comparable funded cohort.
