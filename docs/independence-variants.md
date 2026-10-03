# Why the desk turned negative, and the independent-config fix

All runs below use one fixed market window: 12 symbols (SAND, EVAA, LYN, MOVR, QNT, 2Z, INIT, NIGHT, PUMP,
GRIFFAIN, WLD, MERL), 24 h pre-historic + 24 h simulated, ending 2026-10-02 23:00 UTC, every bot × indication
combo, `scripts/core-session.mjs --end-at`. Dollar results are at a fixed $5 per volume unit on $1,000 (the live
desks size each unit at the exchange minimum, not at a share of equity). "Unit PF" ignores the Block multiplier.

| run | settings | orders | PF | net | max DD | positive hours | engine PF | signals |
|---|---|---:|---:|---:|---:|---:|---:|---|
| E1 | current desk (Normal on, tactics on, last-N 50 / 25, signals last 10, symbol gate proven, Block 0.25 · 3 steps · 4×) | 601 | 1.19 | +$70 | 16 % | 11 / 18 | 1.58 | 199 · PF 0.89 |
| E2 | earlier positive settings (Normal only Block-raised, DCA Active / Axis off, Block 0.5 · 7 steps · 8×, tactics off, no last-N, symbol gate veto) | 2,548 | 1.69 | +$903 | 24 % | 17 / 23 | 1.58 | 598 · PF 1.98 |
| F1 | E2 + signal coordination (confirm) | 2,537 | 1.68 | +$890 | 24 % | 17 / 23 | 1.58 | 587 · PF 1.95 |
| F3 | E2 + signals on their own Block record | 2,512 | 1.52 | +$626 | 23 % | 17 / 23 | 1.58 | 533 · PF 1.28 |
| F4 | E2 + independent configs, signals without the Base gate | 26,627 | 1.54 | +$6,811 | 48 % | 15 / 23 | 1.57 | 448 · PF 0.92 |

## Findings

1. **Selection, not the indications, made the desk negative.** The last-N seat validation (last 50 for a seat,
   last 25 at entry, last 10 for signals), the trend / volatility tactics, Normal entries without Block and the
   "proven" symbol gate cut the orders to a quarter and the PF from 1.69 to 1.19 on the same tapes.
2. **One config per indication.** Seats were keyed per bot × indication × family: of all TP / SL / trailing
   variants of an indication only the best scored one traded, DCA / Axis had to beat the pair's best base config
   (so they never traded), and a pair needed 60 % of its configs passing. `wf.seatPer: "config"` makes every config
   its own seat, judged only on its own window: 10× the orders at about the same PF (engine 1.57 vs 1.58), DCA
   818 orders. The regression test `src/core/sim/independence.test.ts` checks that siblings never change a
   config's seat or trades.
3. **Signals** are positive with their Base gate (E2: PF 1.98); without it every signal pair trades and the signal
   PF falls to 0.92 (F4). On the old desk settings the pooled Block multiplier turned per-unit positive signals
   (+25 %, PF 1.04) into −475 % — on the E2 settings the pooled Block helps them (F3: own record only, PF 1.28).
   Signal acceptance stays keyed per source × symbol × direction × type: keyed per exit config no signal ever had
   the closes it needs.
4. **Sizing.** At 2 % of equity per unit, compounding, Block up to 8× and unlimited orders, the positive E2 trades
   end at −$9,055 (drawdown 154 %): the equity-share sizing, not the trades. The desks size at the exchange minimum.
5. **By range** (F4, unit PF): Long 1.76 (10,725 orders), General 1.63 (10,811), Short 1.14 (2,949), Wide 1.02,
   Minimal 0.47 (876).

## Performance (same pass)

- Base partial progression (`CTS_CORE_BASE_SLICES`), preset comparison off on the desks (`CTS_CORE_COMPARE=0`):
  twin compute 270–300 s → 100–150 s.
- Control ledger mirrored in memory (no two `LIKE` scans of `live_orders` per 250 ms tick), non-blocking snapshot
  (`node:sqlite` online backup instead of `VACUUM INTO`), the live tick runs between Paper / Adjust / Audit.
- Storage benchmark: in-memory SQLite beats Redis on every hot operation (Redis 2–10× slower at p50, worse at
  p99, twice the memory, a second process); the stalls were JSON on large blobs, the per-tick ledger reads and the
  blocking snapshot.
