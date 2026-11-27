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

Subsequent outcome: the compute aborted at 2,511 seconds, at 73% of strategy-tape construction, when available
memory fell to 1,161 MB against the 1,200 MB hard reserve (sampled process RSS 3,958 MB at the abort). Concurrent
verification workloads added pressure and are a confounder. The engine began a memory-fallback retry that would
carry Micro and Low-Range; it was stopped because a fresh replay has no prior complete cohort to carry. No final
hourly, validation or trade-performance result was produced. A new attempt must reserve headroom, avoid concurrent
heavy checks, verify actual range coverage, and not represent a fallback as a full run.

A replacement feed has been prepared with all hourly ranking candles ending by the simulation start and
with ticker prices, 24h change and approximate quote-volume ranking inputs derived only from the preceding
24h of minute candles. Its SHA-256 is `473cbedf03091d8301f8925bc41e340231d772c191a91f98250e69ea12db46a5`.
It retains the same fixed 12 symbols, evaluated window, seven-day Signal rule and earlier physical warmup.
Approximate turnover is a historical ranking proxy, not a claim of exact exchange quote-volume data.

An independently tested fixed-exit tape optimization indexes immutable price ranges only for sufficiently
long holds, preserving exit order, entry-time stop ceilings, complete trade excursion fields and pending/open
states. The paired offline benchmark script is `scripts/perf/benchmark-fixed-tapes.mjs`; source and result
digests must match. On one BTC one-minute case with 34 tapes and 936 closes, a 12-pair warm benchmark observed
median CPU 41.02 → 33.43 ms for 480-bar holds in isolation, with identical digest; another run under concurrent
load measured 38.70 → 50.54 ms. The 15-bar case did not consistently improve. These variable single-symbol
measurements do not establish a faster complete run or lower peak memory.

The replacement replay was launched with source tree `9f18b87ead6f3d25fad980ce5c63bf557f611a2a`
(remote commit `6dfd4d6a3dd4c429bf7df502c015456a9ff511e8`), three workers, a 256 MiB retained-history
budget and a 128 MiB decoded cache. No other heavy verification is run concurrently. The launcher stops if the
memory guard aborts the compute instead of accepting an incomplete fallback. At this checkpoint the replacement
had just begun; its hourly results, post-Base PF, validated percentage and executed PF are unavailable.

The replacement execution session was subsequently interrupted at 1,266 seconds, with Base at 59% and
sampled RSS approximately 1,526 MB. The memory guard had not fired. No raw result or report was completed,
so hourly results and post-Base/settled PF remain unavailable. Reproduce the same source tree and causal feed
above rather than interpreting this partial Base progress as a completed test.
