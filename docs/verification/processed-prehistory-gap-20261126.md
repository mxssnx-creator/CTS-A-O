# Processed-stage prehistory gap — 26 November 2026

The focused 12-symbol, 24-hour replay at `e75aa87` used 24 hours of evaluated prehistory for Base and
raw configuration history. Its modeled `ProcessedReplay` book, however, is created empty at the trading
start and its entry queue starts there. Prehistory was not replayed through the owned post-Base and Real
books. A raw history pass is not evidence that an earlier modeled position was admitted and settled by
each predecessor stage. The current replay therefore does not demonstrate a fully warmed 24-hour
processed-stage prehistory.

At the end, Validation qualified 697 of 2,985,432 visible config × symbol × direction contexts
(0.02335%), with finite passing-window mean PF 2.0728; 2,757 had complete Validation windows and 2,982,675
were insufficient. Real qualified zero contexts and all had insufficient Real windows. The simulated
account opened zero funded orders, so funded execution PF was unavailable. These end-of-run coverage
counts are separate from the hourly raw-tape historical checks and from live exchange results. The
focused diagnostic covers three selected ordinary pairs plus automatic Micro and one Signal source,
not the full catalog.

A correct warmup must replay chronological, actually gate-qualified predecessor admissions and verified
settlements using information available at each decision, retain each exact config/symbol/direction
identity and cost basis, handle positions open across the warmup boundary, and keep the reported 24-hour
funded account distinct from warmup activity. Importing raw candidates directly or evaluating a past
Base gate using future evidence would produce misleading qualification. The memory changes alone did not
implement this warmup.

An **opt-in offline modeled warmup** now evaluates a frozen Base cohort before the warmup interval, then
processes that cohort chronologically through the owned stages. Historical model positions stay separate
from target account capacity and reported P&L, including when they close after the target boundary; their
settled net results still affect their own modeled stage histories. The replay requires explicit, aligned
boundaries and records them in the result. It is rejected by connected and ordinary runtimes: it neither
seeds the durable paper/venue ledger nor establishes live readiness. Unit tests cover cold windows,
same-time decisions, separate sides, boundary-spanning positions, losses and account guards; a controlled
synthetic engine test verifies the full runtime path. The 12-symbol market-data run and full-catalog memory
verification must still complete before making claims about market performance or capacity. A fixed symbol
cohort selected as of the target start is retrospective during warmup and is labeled accordingly.

The e75 focused run completed in 800.08 seconds with 77/77 report checks and peak child RSS 3,256,164
KiB. Its maximum reported loop slice was 2,332 ms, so it does not establish the 500 ms cycle objective.
The full-catalog 12-symbol replay and latest-branch runs remain separate outstanding evidence.
