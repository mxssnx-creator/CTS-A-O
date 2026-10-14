import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SeriesCache } from "./cache.ts";
import {
  TACTIC_TECHNIQUES,
  TACTIC_TIMEFRAMES,
  tacticSnapshot,
  tacticSpecs,
  tacticState,
} from "./tactic.ts";
import { INDICATION_BY_ID, indicationState, laneInd, laneOf } from "./registry.ts";
import { INDICATION_KINDS, type Bars, type Trade } from "../domain/types.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { allCombos, configId, parseConfigId } from "../pipeline/pipeline.ts";
import { defaultWalkForward, makeTape, orderCfgKey, walkForward } from "../sim/walkforward.ts";
import { DEFAULT_SETTINGS } from "../config.ts";

const T0 = Date.UTC(2026, 8, 1);
const H = 3_600_000;
const head = (b: Bars, n: number): Bars => ({
  ...b,
  n,
  t: b.t.slice(0, n),
  o: b.o.slice(0, n),
  h: b.h.slice(0, n),
  l: b.l.slice(0, n),
  c: b.c.slice(0, n),
  v: b.v.slice(0, n),
});

function fromChanges(changes: readonly number[], tfMin = 15, volume?: readonly number[]): Bars {
  const n = changes.length;
  const b: Bars = {
    sym: "T-USDT",
    tfMin,
    n,
    t: new Float64Array(n),
    o: new Float64Array(n),
    h: new Float64Array(n),
    l: new Float64Array(n),
    c: new Float64Array(n),
    v: new Float64Array(n),
  };
  let price = 100;
  for (let i = 0; i < n; i++) {
    b.t[i] = T0 + i * tfMin * 60_000;
    b.o[i] = price;
    price += changes[i];
    b.c[i] = price;
    b.h[i] = Math.max(b.o[i], price) + 0.25;
    b.l[i] = Math.min(b.o[i], price) - 0.25;
    b.v[i] = volume?.[i] ?? 1000;
  }
  return b;
}

const last = (xs: Int8Array) => xs[xs.length - 1];

describe("Tactic is a first-class independent indication kind", () => {
  it("registers ten techniques/ranges and all seven independent/combined lane modes without aliases", () => {
    const specs = tacticSpecs();
    assert.equal(specs.length, 10);
    assert.ok(INDICATION_KINDS.includes("tactic"));
    assert.equal(TACTIC_TECHNIQUES.length, 5);
    assert.deepEqual(TACTIC_TIMEFRAMES, [1, 5, 15, 30]);
    for (const s of specs) {
      assert.equal(INDICATION_BY_ID.get(s.id)?.kind, "tactic");
      assert.equal(s.kind, "tactic");
      assert.ok(!s.id.startsWith("sig-"));
    }
    const focus = specs.map((s) => `follow|${s.id}`);
    const combos = allCombos(focus, [], TACTIC_TIMEFRAMES);
    assert.equal(combos.length, 10 * 7);
    assert.equal(new Set(combos.map((c) => `${c.bot}|${c.ind}`)).size, combos.length);
    assert.equal(allCombos(focus, ["tactic"], TACTIC_TIMEFRAMES).length, 0);
    for (const s of specs) {
      const lanes = combos
        .filter((c) => laneOf(c.ind).base === s.id)
        .map((c) => {
          const l = laneOf(c.ind);
          return `${l.tf}${l.combined ? "c" : ""}`;
        });
      assert.deepEqual(lanes.sort(), ["1", "1c", "5", "5c", "15", "15c", "30"].sort());
      for (const c of combos.filter((x) => laneOf(x.ind).base === s.id)) {
        const id = configId(c.bot, c.ind, { tp: 0.01, sl: 0.01, trail: 0, hold: 32 });
        assert.equal(parseConfigId(id)?.ind, c.ind);
        assert.equal(orderCfgKey(id), id);
      }
    }
  });

  it("executes two techniques/ranges with the same protect and onset independently, equal to their solo runs", () => {
    const now = T0 + 400 * H;
    const p = { tp: 0.01, sl: 0.01, trail: 0, hold: 32 };
    const inds = ["tactic-trend-s@m15", "tactic-trend-m@m15", "tactic-pullback-s@m15"];
    const tapes = inds.map((ind) => {
      const cfg = configId("follow", ind, p);
      const trade = (r: number, entryT: number): Trade => ({
        cfg,
        sym: "A",
        side: 1,
        entryT,
        exitT: entryT + H / 2,
        entry: 100,
        exit: 100 * (1 + r),
        r,
        kind: "normal",
        reason: r > 0 ? "tp" : "sl",
        bars: 2,
        mfe: 0,
        mae: 0,
      });
      const trades = Array.from({ length: 100 }, (_, i) =>
        trade(i % 20 === 19 ? -0.01 : 0.01, now - (120 - i) * H),
      );
      trades.push(trade(0.01, now - H));
      return makeTape(cfg, "follow", ind, p, "normal", ["A"], trades, [], []);
    });
    const o = {
      ...defaultWalkForward(DEFAULT_SETTINGS),
      simH: 6,
      lastN: 0,
      validLastN: 0,
      seatPer: "config" as const,
      portfolio: 0,
      symGate: "off" as const,
      robustFrac: 0,
      preGate: false,
      toggles: { ...DEFAULT_SETTINGS.toggles, block: false, blockActive: false },
      gates: {
        ...DEFAULT_SETTINGS.gates,
        minPf: 1.3,
        maxDdtH: 1000,
        maxDdr: 0,
        minGreen: 0,
        stableBlocks: 0,
        lossPrior: false,
      },
      coord: {
        enabled: false,
        hourLock: 0,
        cooldown: "off" as const,
        conflict: false,
        confirm: false,
      },
      maxOpen: 0,
      maxPerSymbol: 0,
      maxPerSide: 0,
      entryCrowd: undefined,
      engineSideAccept: undefined,
    };
    const universe = {
      bars: [],
      caches: [],
      startT: T0,
      endT: now,
      splitT: T0,
      nowT: now,
      baseTf: 60,
    } as never;
    const together = walkForward(universe, tapes, o);
    assert.equal(together.trades.length, tapes.length, JSON.stringify(together.skips));
    for (const tape of tapes)
      assert.deepEqual(
        together.trades.filter((t) => t.cfg === tape.id),
        walkForward(universe, [tape], o).trades,
      );
  });
});

describe("Tactic context and closed-bar techniques", () => {
  it("each technique fires on both sides of a varied market and remains prefix-stable on every supported timeframe", () => {
    for (const tf of TACTIC_TIMEFRAMES) {
      const full = barsFromCandles(
        "A-USDT",
        tf,
        syntheticCandles("A-USDT", tf, 2000, T0 + 50 * 24 * H, 7),
      );
      const cache = new SeriesCache(full);
      for (const spec of tacticSpecs()) {
        const state = spec.fn(cache);
        assert.ok(
          state.some((x) => x === 1),
          `${spec.id} ${tf}m long events`,
        );
        assert.ok(
          state.some((x) => x === -1),
          `${spec.id} ${tf}m short events`,
        );
        for (const cut of [39, 76, 811, 1501]) {
          const prefix = spec.fn(new SeriesCache(head(full, cut)));
          assert.deepEqual(prefix, state.slice(0, cut), `${spec.id} ${tf}m prefix ${cut}`);
        }
      }
      for (const range of ["short", "medium"] as const)
        assert.deepEqual(
          tacticSnapshot(cache, range, 810),
          tacticSnapshot(new SeriesCache(head(full, 811)), range),
        );
    }
  });

  it("mirrors long and short techniques exactly on reflected prices", () => {
    const full = barsFromCandles(
      "A-USDT",
      15,
      syntheticCandles("A-USDT", 15, 2000, T0 + 50 * 24 * H, 11),
    );
    const mirrored = head(full, full.n);
    const axis = Math.max(...full.h) + Math.min(...full.l);
    for (let i = 0; i < full.n; i++) {
      mirrored.o[i] = axis - full.o[i];
      mirrored.c[i] = axis - full.c[i];
      mirrored.h[i] = axis - full.l[i];
      mirrored.l[i] = axis - full.h[i];
    }
    const a = new SeriesCache(full);
    const b = new SeriesCache(mirrored);
    for (const spec of tacticSpecs()) {
      const state = spec.fn(a);
      const inverse = spec.fn(b);
      assert.ok(
        state.some((x) => x !== 0),
        `${spec.id} nonempty`,
      );
      for (let i = 0; i < state.length; i++)
        assert.equal(inverse[i], -state[i] || 0, `${spec.id} mirror ${i}`);
    }
  });

  it("distinguishes trending pullbacks from ranging reversals and explains the adaptive method", () => {
    const up = new SeriesCache(fromChanges(Array(200).fill(0.1)));
    assert.equal(last(tacticState(up, "trend")), 1);
    assert.equal(tacticSnapshot(up).regime, "trend");
    assert.equal(tacticSnapshot(up).adaptiveMethod, "trend");
    const pullback = new SeriesCache(fromChanges([...Array(200).fill(0.1), -0.8, -0.8, 1.1]));
    assert.equal(last(tacticState(pullback, "pullback")), 1);
    assert.equal(tacticSnapshot(pullback).adaptiveMethod, "pullback");
    const chop = Array.from(
      { length: 200 },
      (_, i) => 0.5 * Math.sin(i * 1.5) + 0.3 * Math.sin(i * 0.6),
    );
    const range = new SeriesCache(fromChanges([...chop, -1, 0.1]));
    assert.equal(tacticSnapshot(range).regime, "range");
    assert.equal(last(tacticState(range, "mean-reversion")), 1);
    assert.equal(last(tacticState(range, "trend")), 0);
    assert.equal(tacticSnapshot(range).adaptiveMethod, "mean-reversion");
    for (const method of tacticSnapshot(range).methods) assert.ok(method.reasons.length > 0);
  });

  it("uses prior structure and prior volume for breakout, with mirrored behavior and no fake zero-volume participation", () => {
    const changes = [...Array.from({ length: 100 }, (_, i) => (i % 2 ? 0.1 : -0.1)), 2];
    const volume = [...Array(100).fill(1000), 2000];
    const k = new SeriesCache(fromChanges(changes, 15, volume));
    assert.equal(last(tacticState(k, "breakout")), 1);
    assert.equal(tacticSnapshot(k).structure.breakout, 1);
    assert.ok(tacticSnapshot(k).structure.high! < k.b.c[k.b.n - 1]);
    const short = new SeriesCache(
      fromChanges(
        changes.map((x) => -x),
        15,
        volume,
      ),
    );
    assert.equal(last(tacticState(short, "breakout")), -1);
    const noVolume = new SeriesCache(fromChanges(changes, 15, Array(changes.length).fill(0)));
    assert.equal(last(tacticState(noVolume, "breakout")), 0);
    assert.equal(tacticSnapshot(noVolume).volumeRatio, 0);
  });

  it("stays neutral during warmup and after a gap or invalid closed bar until a full fresh warmup", () => {
    const b = fromChanges(Array(300).fill(0.1));
    for (const range of ["short", "medium"] as const) {
      const warmup = tacticSnapshot(new SeriesCache(b), range).warmupBars;
      for (const spec of tacticSpecs().filter((s) =>
        s.id.endsWith(range === "short" ? "-s" : "-m"),
      ))
        assert.ok(
          spec
            .fn(new SeriesCache(b))
            .slice(0, warmup - 1)
            .every((x) => x === 0),
        );
      const gap = head(b, b.n);
      for (let i = 150; i < gap.n; i++) gap.t[i] += gap.tfMin * 60_000;
      const state = tacticState(new SeriesCache(gap), "trend", range);
      assert.ok(state.slice(150, 150 + warmup - 1).every((x) => x === 0));
      assert.equal(state[150 + warmup], 1);
      for (const column of ["t", "o", "h", "l", "c", "v"] as const) {
        const invalid = head(b, b.n);
        invalid[column][150] = NaN;
        const cache = new SeriesCache(invalid);
        const state = tacticState(cache, "trend", range);
        assert.ok(
          state.slice(150, 150 + warmup).every((x) => x === 0),
          `${range} ${column} warmup`,
        );
        assert.equal(state[150 + warmup], 1, `${range} ${column} recovery`);
        assert.equal(tacticSnapshot(cache, range, 150).ready, false);
        assert.equal(tacticSnapshot(cache, range).ready, true);
      }
    }
    const empty = tacticSnapshot(new SeriesCache(head(b, 0)));
    assert.equal(empty.ready, false);
    assert.equal(empty.closedAt, null);
    assert.ok(empty.methods.every((x) => x.state === 0));
  });

  it("combined lanes see only completed higher bars and cannot read poisoned future prices", () => {
    const full = fromChanges(Array(4000).fill(0.005), 1);
    const cut = 3507;
    const combined = laneInd("tactic-trend-s", 1, true);
    const state = indicationState(combined, new SeriesCache(full))!;
    assert.ok(
      state.slice(2000, cut).some((x) => x === 1),
      "combined trend has real entries",
    );
    const prefix = indicationState(combined, new SeriesCache(head(full, cut)))!;
    assert.deepEqual(prefix, state.slice(0, cut));
    const poison = head(full, full.n);
    for (let i = cut; i < poison.n; i++) {
      poison.o[i] = 50;
      poison.c[i] = i % 2 ? 5 : 500;
      poison.h[i] = 1000;
      poison.l[i] = 1;
      poison.v[i] = 1_000_000;
    }
    assert.deepEqual(indicationState(combined, new SeriesCache(poison))!.slice(0, cut), prefix);
    for (const tf of TACTIC_TIMEFRAMES) {
      const b = fromChanges(Array(1200).fill(0.01), tf);
      const plain = indicationState(laneInd("tactic-trend-s", tf), new SeriesCache(b))!;
      assert.ok(
        plain.some((x) => x === 1),
        `${tf}m independent entries`,
      );
      const live = tacticSnapshot(new SeriesCache(b));
      assert.equal(live.closedAt, b.t[b.n - 1] + tf * 60_000);
    }
  });
});
