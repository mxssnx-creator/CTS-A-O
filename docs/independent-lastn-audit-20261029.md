# Independent Last-N diagnostic — 29 October 2026

This is a retrospective calculation on the archived, funded-model cohort from
`docs/main-processing-audit-20261029/evidence.tar.gz`. It is not a new
simulation, not a production gate, and not evidence of exchange fills. The
diagnostic keeps each configuration, symbol and direction separate. It never
borrows a sibling context's results or uses closes at or after an entry.

The eight-symbol study used indicator-only warmup from 6 October 12:00 UTC,
evaluated prehistory from 7 October 12:00 to 8 October 12:00 UTC, then trading
to 9 October 12:00 UTC: 72 hours total. It retained the original modeled
round-trip cost of 0.15%, already included once. The requested 0.12% cost is a
different scenario and is not silently substituted in the archive.

- Base pairs: 143 / 1,398 passed (10.23%).
- Post-Base engine configs at the initial snapshot: 405 / 1,276 passed
  (31.74%); finite passing-set historical mean PF 17.399524 across 399 sets,
  plus six separate no-loss sets.
- Subsequent funded model: 3,116 / 3,108 / 8 orders and 52 / 49 / 3
  positions opened / closed / held; 3,108 closed-order return PF 0.273051.
  All 3,108 close identities and net returns match the source tape.

Each of the 405 initially selected configs was evaluated on eight symbols and
two directions, including empty contexts, for 6,480 diagnostic contexts.
Frozen range floors were applied to full Last-N windows without introducing a
per-symbol production gate. Passing historical PF is the equal-weight mean of
finite individual context PFs; no-loss contexts are reported separately.

| Initial exact-context diagnostic | Passing / all | Insufficient | Finite passing historical mean PF | Later existing funded closes | Later existing-close PF |
| --- | ---: | ---: | ---: | ---: | ---: |
| Last-5 | 323 / 6,480 (4.98%) | 5,913 | 20.073736 over 182 finite contexts; 141 no-loss | 396 | 0.220472 |
| Last-10 | 8 / 6,480 (0.12%) | 6,471 | 15.365871 over 8 finite contexts | 9 | 0.174847 |
| Last-15 through Last-50, in steps of 5 | 0 / 6,480 | 6,480 | unavailable | 0 | unavailable |

At the entry of each of the 3,108 recorded funded-model closes, the independent
Last-5 condition qualified 692 / 3,108 checks (22.27%); those same existing
closes had PF 0.174836. Last-10 qualified 18 / 3,108 (0.58%; later PF
0.161533), and Last-15 through Last-50 lacked sufficient own-context history
at every entry. The later columns filter previously recorded orders; they do
not model new allocation, changed position occupancy, or the outcome of
turning on an additional gate.

An independent Python scalar pass checked all 64,800 initial context windows
and 31,080 entry-time windows with zero mismatches. A separate 38-test synthetic
check on unmerged stage prototype `ba376e4` covered independent stage ledgers,
inverse pricing, partial and held orders, causal events and restart ownership.
That does not establish a completed persistent Base → Main → Real → Active
adapter. Signal, Historic Exit and Micro had no funded closes in this cohort.

To reproduce, extract `postfix-instrumented-v1` from the archived evidence
into a scratch directory and substitute its paths below. These commands only
read saved source/report data and create the specified audit, receipt and
self-contained HTML; they do not launch a trading simulation.

```sh
node --experimental-strip-types --no-warnings scripts/audit-independent-lastn-20261029.mjs \
  "$INPUT/raw.json" "$INPUT/html/data.json" "$OUT/audit.json"
python3 scripts/verify-independent-lastn-20261029.py "$INPUT/raw.json" \
  "$OUT/audit.json" "$OUT/verification.json"
python3 scripts/render-independent-lastn-20261029.py "$OUT/audit.json" \
  "$OUT/verification.json" "$OUT/independent-lastn.html"
```

PF is gross positive unit return divided by gross negative unit return, with
1.00 neutral. Unknown, insufficient, flat and true no-loss cases remain
distinct. The results do not demonstrate a profitable forward strategy.
