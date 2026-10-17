# Expanded Signal protection grid — 2026-10-16

This is the follow-up to the earlier 39-cell Signal grid validation. The earlier
report remains historical; this document records the expanded defaults and the
replay that exercised them.

## Defaults

Percentages below are stored as decimal fractions in settings.

| Signal protection | TP values | Related ratio values | Fixed stop ratio | Cells |
|---|---|---|---:|---:|
| Normal TP + SL | 1%, 1.5%, 2.5%, 3%, 4%, 5%, 6% | SL/TP: 0.5, 0.75, 1, 1.5, 2, 3 | — | 42 |
| Capped Trailing | 1%, 1.5%, 3%, 4%, 5%, 6%, 8% | trail/TP: 0.2, 0.3, 0.4, 0.6, 0.8 | SL/TP: 3 | 35 |
| Trailing-only | existing 1.5%, 3%, 6% hard SL | existing 0.5%, 1%, 2% trail distance | — | 9 |

The standard grid is **86 cells per source/range combination**. The minimum
trailing distance is 0.2%, so the 1% TP × 0.2 trail/TP cell remains buildable.
Signal reference-grid floor handling is applied after lane scaling. Historic or
custom distances that fall below their lane-scaled minimum remain rejected.

Only settings that matched the prior defaults were migrated to the new arrays;
custom saved settings are retained. The current migration path is version 25 to
26. Range volume-factor settings remain independent: each range supports 0.2–5
in 0.2 increments, neutral 1 by default, with Micro set to 2.5. Focused sizing
tests cover the Micro multiplier and caps; the replay below does not attribute
its Signal results to that multiplier.

## Processing and coverage

The offline cached-feed replay used ATOM-USDT, APT-USDT, NEAR-USDT, and DOT-USDT;
48 hours of prehistory; and a 12-hour scored window from 2026-10-14 09:00 to
21:00 UTC. The engine used 1/5/15/30-minute lanes. Signals used the 15-minute
lane and the two enabled Signal ranges (short and medium). The catalog contained
100 sources, of which 63 were active for this run.

| Check | Result |
|---|---:|
| Active source/range combinations | 126 |
| Standard cells per combination | 86 |
| Requested / unique configurations | 10,836 / 10,836 |
| Mapped / built configurations | 10,836 / 10,836 |
| Missing / unbuilt configurations | 0 / 0 |
| Additional historic candidate rows | 297 |
| Total processed Signal rows | 11,133 |
| Signal processing steps | 12 / 12 |
| Sim replay consistency checks | 65 / 65 |
| Engine compute time / peak RSS | about 12 s / 833 MB |

All enabled engine ranges also processed every step:

| Range | Steps | Validated config-steps | Entry candidates | Engine order events |
|---|---:|---:|---:|---:|
| Micro | 12 / 12 | 4,450 | 402 | 358 |
| Minimal | 12 / 12 | 12,672 | 1,825 | 1,755 |
| Short | 12 / 12 | 2,347 | 15 | 12 |
| General | 12 / 12 | 2,739 | 8 | 7 |
| Long | 12 / 12 | 2,346 | 77 | 65 |
| Wide | 12 / 12 | 365 | 17 | 16 |
| Signals | 12 / 12 | 1,200 | 1,496 | 38 |

The replay's configured Signal rows were all mapped and built, but only 10 of
126 representative Signal pairs passed its diagnostic gate. Strategy gating
still controls what can trade; a complete parameter grid is not a promise that
every config will qualify or receive a funded order.

## Replay result and limits

Across funded settled orders, the 12-hour replay ended with $0.43 closed-order
net profit and return PF 15.08, with $10.17 ending equity after marking open
positions. Eight of 12 full hours were green, three were flat, and one was
negative. The Signal subset had 13 funded orders, return PF 1.05, and six wins
to seven losses. Funded settled outcomes by range were:

| Range | Orders | Return PF | Net |
|---|---:|---:|---:|
| Micro | 288 | 108.03 | +$0.04 |
| Minimal | 1,463 | 13.32 | +$0.39 |
| Short | 0 | — | $0.00 |
| General | 0 | — | $0.00 |
| Long | 0 | — | $0.00 |
| Wide | 11 | 290.63 | about $0.00 |
| Signals | 13 | 1.05 | about $0.00 |

Large PF values on small samples are not evidence of stable edge.

This is a short retrospective replay on four symbols, not held-out evidence.
It does **not** show positive PF in every hour, every range, or every Signal
source, and it does not validate venue fills or guarantee future profitability.
No trailing values were tuned from this sample. Keep qualification gates and
range-specific settings intact pending a predeclared held-out comparison.

The feed used for the replay has SHA-256
`50605bcacd8a97d3074ba8501c1497d92abf24d90f99ce7979c98ff5f81b9a79a`.
The local run captured `signalProgress` with 100% mapping/build counts and
65/65 consistency checks. The source report and hourly result are retained in
the run workspace at `runs/trailing-config-expanded-20261016/`; the raw 41 MB
capture is not committed.

## Verification

| Verification | Result |
|---|---:|
| Signal discovery, history, and config tests | 49 / 49 passed |
| Range defaults, migration, execution sizing/caps, walk-forward tests | 357 / 357 passed |
| Settings/UI and platform checks | 77 / 77 passed |
| Scripts test suite | 455 passed, 0 failed, 8 standard skips |
| Desktop/phone functional UI checks | passed |
| TypeScript typecheck (`npm run typecheck -- --pretty false`) | passed |
| Production build (client, SSR, core worker) | passed |
| Scoped ESLint | 0 errors; 4 unused-variable warnings |
| Isolated Base-count invariants | 2 / 2 passed |

The full all-core suite was not completed in this validation pass; this report
claims the focused suites above, the scripts/UI checks, production build, and
expanded-grid replay only. The build's database migration step skipped because
`DATABASE_URL` is unset in this workspace; PGLite migrates itself.

## Reproduction pointers

- Grid definition and normalizer: `src/core/signal-config.ts`
- Default migration: `src/core/server/runtime.server.ts`
- Signal generation and parity coverage: `src/core/signals.ts`,
  `src/core/signal-discovery.test.ts`, and `src/core/signals.test.ts`
- Replay capture: `runs/trailing-config-expanded-20261016/`
- Feed: `runs/trailing-range-hourly-20261016/feed.json`
