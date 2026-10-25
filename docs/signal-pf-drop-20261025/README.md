# Signal historical-to-settled PF investigation

Verified baseline: main breakpoint5121115, economic evidence frozen9b8d30. A direct per-entry audit of the actual funded settled cohort finds280/280 own config and Last-N passes, zero invalid funded admissions. Each of the280 closes has a distinct exact config/symbol/direction context. Their pre-entry historical windows pool to PF4.309132 over5,734 config observations (overlapping market histories, not independent market events); subsequent funded settled PF is0.065995. The separate all-context endpoint validation remains PF4.608184,0.3773%(11,436/3,030,936). These are explicitly different samples and clocks.

Positions4/2/2;orders863/280/583, opened/closed-or-settled/held. The 280 settled rows are concentrated in273 ADA shorts (PF0.046633);214 of all280 entries occurred at15:50UTC on17October. All280 closes were shorts. This establishes concentration; it does not by itself establish a production bug or profitable replacement policy.

| Type | Funded closes | Own entry checks passed | Settled PF |
|---|---:|---:|---:|
| Normal | 41 | 41/41 (100%) | 0.000000 |
| Trailing | 174 | 174/174 (100%) | 0.115852 |
| Trailing-only | 58 | 58/58 (100%) | 0.088189 |
| Exit | 7 | 7/7 (100%) | No losses; no finite ratio |

128 Trailing/Trailing-only closes had favorable price movement but negative net return after0.15% round-trip cost. Including Normal raises this count to134. Approximate single-leg price-only PF is0.373414, still below1 before fees. Reconstructed gross-minus-cost differs from recorded unit return by at most6.1e-8 due to stored price precision; exact tape/unit parity was already independently verified. Never remove fees or floor negative returns to make this appear profitable.

## Predeclared retest

scripts/prepare-signal-gap-study.mjs freezes both original and later12h windows with trailRatios=[0.5], keeping Normal/Exit and existing costs, own history, PF/sample/Last4 and shared gates. This is a controlled config-only subset experiment. It tests smaller peak gaps versus activation to reduce cost-eroded trailing exits and the amount of historical computation. It has no promised PF improvement. Both scenarios were frozen before either result was observed. Source2cc4c0b4a8ecdb4343a1401527f75b5373e052085123f361e85f6d42e1c04cae. Both native runs and independent coverage/export/admission audits completed successfully; results follow. No default or live settings changed.

Reproduce the entry audit with scripts/trace-signal-entry-settlement.mjs CASE OUTPUT EXACT_SOURCE_CHECKOUT from experimental branch commit ddb3b8d8668e6f0cd29a4791617149a197b870ed. The script and full entry trace are retained on that branch. It verifies the exact source seal and actual funded allocation book, uses only exits strictly before each entry, and retains every funded return. The standalone audit script hash is recorded. Independent Exit activation is not represented by the ordinary Signal activation diagnostic, so a missing activation row is not an entry failure. Matching actual own config/Last-N checks are reported for every close.

The pending50-symbol study, all-family ordinary completion and X02 reconciliation remain separate. Preserve the baseline and every losing/failed arm; a report correction cannot be used to rewrite these economic outcomes.


## Completed paired retest

All PF values below are net unit-return PF, neutral 1. Validation is the endpoint exact config × symbol × direction cohort, including empty/insufficient contexts. Settled execution is the separate funded modeled cohort during the stated 12-hour window. Minute calculation, 150h history, Last4 and 0.15% round-trip cost were retained.

| UTC window | Historical post-Base PF | Contexts validated | Settled PF | Positions opened/closed/held | Orders opened/settled/held | Equity drawdown |
|---|---:|---:|---:|---:|---:|---:|
| Oct 16 21:00–Oct 17 09:00 | 4.613320 | 4,100/1,446,672 (0.283409%) | 8.381491 | 14/5/9 | 229/160/69 | 0.0592% |
| Oct 17 09:00–21:00 | 4.498920 | 4,911/1,446,192 (0.339581%) | 0.052474 | 5/2/3 | 813/121/692 | 1.3414% |

The earlier window improves versus the archived control PF4.888011; the later window deteriorates versus control PF0.065995. **Do not promote this setting:** narrowing trailing peak gaps does not produce robust forward performance. These were diagnostic windows already examined during development, not untouched holdout evidence. They do not establish 50-symbol or venue performance.

Coverage contains zero missing configured cells in either run, exact tape matches160/160 and121/121, and18,806,736 /18,800,496 independent scalar comparisons respectively. Both native reports pass69/69 checks; all three audit stages exit0. Full result summaries, exact denominator clocks, hourly counts and admissions are in gap-results.json; original histories and protocols remain in the preserved run evidence.

Later-window native compute386.259s versus the archived control677.087s, with60,258 versus126,289 built configs. This is a smaller explicitly configured experiment, not a same-work optimization benchmark. The runs overlapped and are not a controlled timing comparison. The reduction does not justify the worse settled PF.
