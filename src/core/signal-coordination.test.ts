import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS } from "./config.ts";
import type { Trade } from "./domain/types.ts";
import { exchangeAcceptIndex, laneKeyOf, liveRecords } from "./live-record.ts";
import { liveGate } from "./live-validation.ts";
import { diffPositions } from "./server/paper-rows.ts";
import {
  acceptKey,
  acceptPreferExchange,
  SignalAcceptIndex,
  sideAcceptKey,
  sigActiveKey,
} from "./signals.ts";
import {
  defaultWalkForward,
  dupKey,
  makeTape,
  openDupKey,
  orderCfgKey,
  walkForward,
} from "./sim/walkforward.ts";

const H = 3_600_000;
const ind = "sig-ema-cross-s@m15";
const cfg = (i: number, indication = ind, trail = 0) =>
  `follow|${indication}|tp${i}|sl1|tr${trail}|h32`;

describe("Signal config identity through execution and persistence", () => {
  it("keeps sources, parameter ranges, timeframe lanes and exit types independent", () => {
    const ids = [
      cfg(1),
      cfg(1, "sig-ema-cross-m@m15"),
      cfg(1, "sig-rsi-reversal-s@m15"),
      cfg(1, "sig-ema-cross-s@m30"),
      cfg(2),
      cfg(1, ind, 0.5),
    ];
    const closed = {
      sym: "A",
      side: 1 as const,
      entryT: H,
      exitT: 2 * H,
      r: 0.01,
      kind: "normal" as const,
    };
    const opened = { sym: "A", side: 1 as const, entryT: H, entry: 100, stop: 99, target: 101 };
    assert.equal(new Set(ids.map(orderCfgKey)).size, ids.length);
    assert.equal(new Set(ids.map((id) => dupKey({ ...closed, cfg: id }))).size, ids.length);
    assert.equal(new Set(ids.map((id) => openDupKey({ ...opened, cfg: id }))).size, ids.length);
    const positions = ids.flatMap((id) => [1, -1].map((side) => ({ ...opened, cfg: id, side })));
    assert.equal(diffPositions(null, positions).next.size, ids.length * 2);
    const lanes = positions.map((p) => ({ ...p, id: `${p.cfg}|${p.sym}|${p.entryT}` }));
    assert.equal(new Set(lanes.map(laneKeyOf)).size, ids.length * 2);
  });

  it("retains engine alias deduplication independently of Signal identity", () => {
    const engine = "follow|ema-9-21@m15|tp1|sl1|tr0|h32";
    const alias = "follow|ema-cross-9-21@m15|tp1|sl1|tr0|h32";
    assert.equal(orderCfgKey(engine), orderCfgKey(alias));
    assert.notEqual(orderCfgKey(engine), orderCfgKey(cfg(1)));
    assert.equal(
      orderCfgKey(`${engine}|ax-linear2|axis`),
      orderCfgKey(`${engine}|ax-linear3|axis`),
    );
  });

  it("judges the return PF of each exact config independently", () => {
    const winner = cfg(1);
    const loser = cfg(2);
    const records = liveRecords([
      { cfg: winner, exitT: H, r: 0.03 },
      { cfg: loser, exitT: H, r: -0.02 },
      { cfg: winner, exitT: 2 * H, r: -0.01 },
      { cfg: loser, exitT: 2 * H, r: 0.01 },
    ]);
    assert.equal(liveGate(records.get(winner)!, 0, 3 * H, 2, 1.3).ok, true);
    assert.equal(liveGate(records.get(loser)!, 0, 3 * H, 2, 1.3).ok, false);
    assert.equal(liveGate(records.get(winner)!, 0, 3 * H, 2, 1.3).pf, 3);
    assert.equal(liveGate(records.get(loser)!, 0, 3 * H, 2, 1.3).pf, 0.5);
  });

  it("executes concurrent qualified ranges and types while a high-PF sibling cannot qualify a losing config", () => {
    const now = Date.UTC(2026, 8, 1) + 400 * H;
    const ids = [cfg(1), cfg(1, "sig-ema-cross-m@m15"), cfg(1, ind, 0.5)];
    const losing = cfg(2);
    const tape = (id: string, returns: number[]) => {
      const indication = id.split("|")[1];
      const kind = id.includes("|tr0|") ? ("normal" as const) : ("trailing" as const);
      const trade = (r: number, entryT: number): Trade => ({
        cfg: id,
        sym: "A",
        side: 1,
        entryT,
        exitT: entryT + H / 2,
        entry: 100,
        exit: 100 * (1 + r),
        r,
        kind,
        reason: r > 0 ? "tp" : "sl",
        bars: 2,
        mfe: 0,
        mae: 0,
      });
      return makeTape(
        id,
        "follow",
        indication,
        { tp: 0.01, sl: 0.01, trail: kind === "normal" ? 0 : 0.005, hold: 32 },
        kind,
        ["A"],
        [...returns.map((r, i) => trade(r, now - (20 - i) * H)), trade(0.01, now - H)],
        [],
        [],
      );
    };
    const qualified = ids.map((id) => tape(id, [0.02, -0.01, 0.02, -0.01]));
    const unqualified = tape(losing, [0.01, -0.02, 0.01, -0.02]);
    const o = {
      ...defaultWalkForward(DEFAULT_SETTINGS),
      simH: 6,
      lastN: 0,
      validLastN: 4,
      signalValidLastN: 4,
      gates: { ...DEFAULT_SETTINGS.gates, minPf: 1.3, maxDdtH: 1_000, maxDdr: 0, lossPrior: false },
      signalActive: new Set(
        [...qualified, unqualified].map((tp) => sigActiveKey(tp.bot, tp.ind, "A", 1, tp.kind, tp.id)),
      ),
      signalRank: undefined,
      signalGuardN: 0,
      signalCluster: undefined,
      signalAccept: undefined,
      signalSideAccept: undefined,
      signalSourceGate: undefined,
      coord: {
        enabled: false,
        hourLock: 0,
        cooldown: "off" as const,
        conflict: false,
        confirm: false,
      },
      maxPerSymbol: 0,
      maxOpen: 0,
      maxPerSide: 0,
      signalPerSymbol: 0,
      signalMaxOpen: 0,
      signalMaxPositions: 0,
      entryCrowd: undefined,
    };
    const universe = {
      bars: [],
      caches: [],
      startT: 0,
      endT: now,
      splitT: 0,
      nowT: now,
      baseTf: 60,
    } as never;
    const both = walkForward(universe, [...qualified, unqualified], o);
    assert.deepEqual(
      both.trades.map((x) => x.cfg).sort(),
      ids.slice().sort(),
      JSON.stringify(both.skips),
    );
    assert.equal(both.skips["sig:signalValid"], 1);
    for (const own of qualified) {
      const alone = walkForward(universe, [own], o);
      assert.deepEqual(
        both.trades.filter((x) => x.cfg === own.id),
        alone.trades,
      );
    }
    const paper = both.trades.map((x) => ({ ...x, stop: 99, target: 101 }));
    assert.equal(diffPositions(null, paper).next.size, ids.length);
    assert.equal(
      new Set(both.trades.map((x) => laneKeyOf({ ...x, id: `${x.cfg}|${x.sym}|${x.entryT}` })))
        .size,
      ids.length,
    );
  });
});

describe("Signal acceptance parity on actual settled returns", () => {
  it("keeps each source range, timeframe and type's acceptance sample independent", () => {
    const rows = [
      { cfg: cfg(1), sym: "A", side: 1, entryT: 0, exitT: H, r: -0.01 },
      { cfg: cfg(2), sym: "A", side: 1, entryT: 0, exitT: H + 1, r: -0.01 },
      { cfg: cfg(1, "sig-ema-cross-m@m15"), sym: "A", side: 1, entryT: 0, exitT: H + 2, r: 0.03 },
      { cfg: cfg(1, "sig-ema-cross-s@m30"), sym: "A", side: 1, entryT: 0, exitT: H + 3, r: 0.03 },
      { cfg: cfg(1, ind, 0.5), sym: "A", side: 1, entryT: 0, exitT: H + 4, r: 0.03 },
    ];
    const exchange = exchangeAcceptIndex(rows);
    const keys = [
      acceptKey(ind, "A", 1, "normal", cfg(1)),
      acceptKey(ind, "A", 1, "normal", cfg(2)),
      acceptKey("sig-ema-cross-m@m15", "A", 1, "normal", cfg(1, "sig-ema-cross-m@m15")),
      acceptKey("sig-ema-cross-s@m30", "A", 1, "normal", cfg(1, "sig-ema-cross-s@m30")),
      acceptKey(ind, "A", 1, "trailing", cfg(1, ind, 0.5)),
    ];
    assert.equal(new Set(keys).size, keys.length);
    assert.deepEqual(exchange.stats(keys[0], 2 * H, 24), { n: 1, pf: 0 });
    assert.deepEqual(exchange.stats(keys[1], 2 * H, 24), { n: 1, pf: 0 });
    assert.deepEqual(exchange.stats(acceptKey(ind, "A", 1, "normal"), 2 * H, 24), { n: 0, pf: 0 }, "no pooled qualification is synthesized");
    for (const key of keys.slice(2))
      assert.deepEqual(exchange.stats(key, 2 * H, 24), { n: 1, pf: Infinity });
    // The explicitly broader side safety coordinator counts onsets across types only once.
    assert.equal(exchange.stats(sideAcceptKey(1), 2 * H, 24).n, 3);
  });

  it("counts an onset once across parallel configs while retaining every close in return PF", () => {
    const tapes = Array.from({ length: 20 }, (_, i) => ({
      id: cfg(i + 1),
      ind,
      kind: "normal",
      n: 2,
      syms: ["A"],
      symI: [0, 0],
      side: [1, 1],
      entryT: [0, 2 * H],
      exitT: [H + i, 3 * H + i],
      r: [i < 15 ? 0.01 : -0.01, 0.01],
    }));
    const rows = tapes.flatMap((t, i) =>
      t.r.map((r, k) => ({
        cfg: cfg(i + 1),
        sym: "A",
        side: 1,
        entryT: t.entryT[k],
        exitT: t.exitT[k],
        r,
      })),
    );
    const sim = new SignalAcceptIndex(tapes);
    const exchange = exchangeAcceptIndex(rows);
    for (const tp of tapes) for (const at of [H + 10.5, 2 * H, 4 * H]) {
      const key = acceptKey(ind, "A", 1, "normal", tp.id);
      assert.deepEqual(exchange.stats(key, at, 48), sim.stats(key, at, 48));
    }
    assert.deepEqual(exchange.stats(acceptKey(ind, "A", 1, "normal", cfg(1)), 4 * H, 48), { n: 2, pf: Infinity });
    assert.deepEqual(exchange.stats(acceptKey(ind, "A", 1, "normal", cfg(20)), 4 * H, 48), { n: 2, pf: 1 });
    assert.ok(Math.abs(exchange.stats(sideAcceptKey(1), 4 * H, 48).pf - 7) < 1e-12);
    assert.equal(exchange.stats(sideAcceptKey(1), 4 * H, 48).n, 2);
    assert.equal(exchange.stats(sideAcceptKey(-1), 4 * H, 48).n, 0);
  });

  it("keeps mixed-sign settled partial slices in PF instead of netting away their losses", () => {
    const rows = [
      { cfg: cfg(1), sym: "A", side: 1, entryT: 0, exitT: H, r: 0.03 },
      { cfg: cfg(1), sym: "A", side: 1, entryT: 0, exitT: 2 * H, r: -0.02 },
    ];
    const exchange = exchangeAcceptIndex(rows);
    const key = acceptKey(ind, "A", 1, "normal", cfg(1));
    assert.deepEqual(exchange.stats(key, 1.5 * H, 24), { n: 1, pf: Infinity });
    assert.deepEqual(exchange.stats(key, 3 * H, 24), { n: 1, pf: 1.5 });
    assert.deepEqual(exchange.stats(sideAcceptKey(1), 3 * H, 24), { n: 1, pf: 1.5 });
  });

  it("parallel config replicas cannot prematurely satisfy the actual execution sample floor", () => {
    const exchange = exchangeAcceptIndex(
      Array.from({ length: 20 }, (_, i) => ({
        cfg: cfg(i + 1),
        sym: "A",
        side: 1,
        entryT: 0,
        exitT: H + i,
        r: -0.01,
      })),
    );
    const key = acceptKey(ind, "A", 1, "normal", cfg(1));
    const rule = { minPf: 1.3, minTrades: 3, hours: 24 };
    assert.equal(exchange.stats(key, 2 * H, 24).n, 1);
    let fallback = 0;
    assert.equal(
      acceptPreferExchange(exchange, key, 2 * H, rule, () => {
        fallback++;
        return true;
      }),
      true,
    );
    assert.equal(fallback, 1);
  });

  it("counts separate symbols, sides and onset times independently; unknown onsets retain legacy counts", () => {
    const rows = [
      { cfg: cfg(1), sym: "A", side: 1, entryT: 0, exitT: H, r: 0.01 },
      { cfg: cfg(2), sym: "A", side: 1, entryT: 0, exitT: H + 1, r: 0.01 },
      { cfg: cfg(1), sym: "B", side: 1, entryT: 0, exitT: H + 2, r: 0.01 },
      { cfg: cfg(1), sym: "A", side: 1, entryT: H, exitT: H + 3, r: 0.01 },
      { cfg: cfg(1), sym: "A", side: -1, entryT: 0, exitT: H + 4, r: -0.01 },
    ];
    const exchange = exchangeAcceptIndex(rows);
    assert.equal(exchange.stats(sideAcceptKey(1), 2 * H, 24).n, 3);
    assert.equal(exchange.stats(sideAcceptKey(-1), 2 * H, 24).n, 1);
    const legacy = exchangeAcceptIndex(rows.map(({ entryT: _entryT, ...x }) => x));
    assert.equal(legacy.stats(sideAcceptKey(1), 2 * H, 24).n, 4);
  });
});
