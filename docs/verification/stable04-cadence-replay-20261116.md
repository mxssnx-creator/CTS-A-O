# Stable-04 twelve-symbol replay checkpoint — 16 November 2026

This replay is in progress, not an acceptance result. It uses the application tree
`2b65fd299a35381cf0469fa0e34e9cd3d64159b2` (remote checkpoint `6e719949932d545f5e13e13263854ee6adf384d9`).
Later branch commits add timestamp disorder rejection and avoid a redundant calculation when on-run tactics are
enabled. The tested feed is ordered and gap-free, and the run leaves on-run tactics off; nevertheless it is an
earlier tree and must be identified as such.

- Offline fixed cohort: AVAX, DOT, ATOM, APT, BTC, ETH, BNB, DOGE, ADA, BCH, ETC and ARB versus USDT.
- Frozen input SHA-256 `feb93f3f9ed93f8f90df803b765cc454f447cca806fa1a532a81311a51456d5d`;
  273,036 one-minute/hourly bars. Older physical candles provide indicator and seven-day onset warmup.
- Evaluated prehistory: 2026-10-14 21:00 UTC to 2026-10-15 21:00 UTC. Simulated trading: 2026-10-15 21:00 UTC
  to 2026-10-16 21:00 UTC. Signals use the seven-day, 2/day rule and independent Last-15 settings.
- The optional processed-stage adapter is explicitly on in this test, with **12** validation and Real samples;
  these are additional processed-parent windows and must not be mislabeled as Signal's 15-position policy.
- Four workers, decoded-history cache 256 MiB, no exchange, account, order or live connection.
- All 12 available symbols are included. The ranking clock and frozen ticker metadata are at the window end,
  so the order of this fixed cohort may contain future information. This is not a valid forward symbol-selection
  study; obtain a separately sealed pre-start ranking before using it for that purpose.

Last observation: Base completed after approximately 21 minutes; historic Signal configuration fitting reached
96% at 1,356 seconds, with approximately 2,176 MB sampled process RSS. No final hourly output, post-Base PF,
validated count/percentage or modeled execution PF had been produced at this checkpoint. A result may only be
reported if the replay finishes and its raw outputs and checks are inspected; no profitability claim follows
from its progress or unit tests.
