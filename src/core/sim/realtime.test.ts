import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { barsFromCandles, headBars, resample, syntheticCandles } from "../market/bars.ts";
import { makeUniverse } from "../pipeline/pipeline.ts";
import { DEFAULT_AXIS, DEFAULT_DCA } from "../config.ts";
import { signalId } from "../signal-config.ts";
import type { Bars, Protect } from "../domain/types.ts";
import { buildTapes, type ConfigTape } from "./walkforward.ts";
import { RealtimeTapeBook, RealtimeTapeSet, type RealtimeTapeGroup } from "./realtime.ts";
import { appendTape } from "./tape-append.ts";

const M = 60_000;
const slice = (b: Bars, a: number, z = b.n): Bars => ({
  ...b,
  n: z - a,
  t: b.t.slice(a, z),
  o: b.o.slice(a, z),
  h: b.h.slice(a, z),
  l: b.l.slice(a, z),
  c: b.c.slice(a, z),
  v: b.v.slice(a, z),
});

describe("validated-cohort realtime continuations", () => {
  it("retains independent engine/Signal source histories on 20 symbols and 1/5/15m", () => {
    const start = Date.UTC(2026, 9, 1),
      seedEnd = start + 3510 * M;
    const all = Array.from({ length: 20 }, (_, i) => `S${i}-USDT`).flatMap((sym) => {
      const candles = syntheticCandles(sym, 1, 3600, start + 3600 * M);
      return [1, 5, 15].map((tf) => ({
        ...barsFromCandles(sym, tf, resample(candles, 1, tf)),
        lanes: [1, 5, 15],
      }));
    });
    const mainAll = all.map((b) =>
      slice(
        b,
        b.t.findIndex((t) => t >= seedEnd - 1950 * M),
      ),
    );
    const mainSeed = mainAll.map((b) => headBars(b, seedEnd));
    const sigSeed = all.map((b) => headBars(b, seedEnd));
    const protects: Protect[] = [
      { tp: 0.009, sl: 0.006, trail: 0, hold: 18 },
      { tp: 0.015, sl: 0.009, trail: 0.004, trailStep: 0.7, hold: 36, trailMax: 0.025 },
    ];
    const pairs = (ind: string) => [1, 5, 15].map((tf) => `follow|${ind}@m${tf}`);
    const groups: RealtimeTapeGroup[] = [
      {
        key: "main",
        pairs: pairs("inverse-known-trend-ema"),
        protects,
        floors: { minSl: 0, minTrail: 0 },
      },
      {
        key: "sig",
        pairs: pairs(signalId("ema-cross", "short")),
        protects,
        bars: sigSeed,
        floors: { minSl: 0, minTrail: 0 },
      },
    ];
    const build = (bs: Bars[], g: RealtimeTapeGroup) =>
      buildTapes(
        makeUniverse(bs),
        g.protects,
        0.002,
        undefined,
        new Set(g.pairs),
        undefined,
        undefined,
        g.floors,
      );
    const initial = groups.flatMap((g) => build(g.key === "main" ? mainSeed : sigSeed, g));
    assert.ok(initial.length >= 12);
    assert.ok(
      build(sigSeed, groups[0]).reduce((n, tp) => n + tp.n, 0) >
        build(mainSeed, groups[0]).reduce((n, tp) => n + tp.n, 0),
      "longer history really changes the independent reference sample",
    );
    const current = new Map(initial.map((tp) => [tp.id, tp]));
    const set = new RealtimeTapeSet(mainSeed, groups, 0.002);
    for (const minutes of [1, 2, 5, 15, 30]) {
      const ends = set.ends(),
        cut = all.map((b) => headBars(b, seedEnd + minutes * M));
      const tails = cut
        .map((b) => {
          const i = b.t.findIndex((t) => t > ends[`${b.sym}|${b.tfMin}`]);
          return slice(b, i < 0 ? b.n : i);
        })
        .filter((b) => b.n > 0);
      const delta = set.advance(tails);
      for (const tp of delta.tapes) current.set(tp.id, appendTape(current.get(tp.id)!, tp));
      const expected = groups.flatMap((g) =>
        build(
          (g.key === "main" ? mainAll : all).map((b) => headBars(b, seedEnd + minutes * M)),
          g,
        ),
      );
      assert.equal(current.size, expected.length);
      for (const tp of expected) assert.deepEqual(current.get(tp.id), tp, `${minutes}m ${tp.id}`);
    }
    assert.throws(
      () =>
        new RealtimeTapeSet(
          mainSeed,
          [{ ...groups[0], bars: mainAll.map((b) => headBars(b, seedEnd - M)) }, groups[1]],
          0.002,
        ),
      /endpoints differ/,
    );
    assert.throws(() => set.advance([{ ...all[0], sym: "UNKNOWN" }]), /unknown realtime series/);
    assert.throws(() => set.advance([]), /new bootstrap/);
  });

  it("matches full tapes exactly over 1/5/15m, both sides and every simulator family", () => {
    const start = Date.UTC(2026, 9, 1),
      initialEnd = start + 2100 * M;
    const all: Bars[] = [];
    for (const sym of ["BTC-USDT", "ETH-USDT"]) {
      const cs = syntheticCandles(sym, 1, 2200, start + 2200 * M);
      for (const tf of [1, 5, 15])
        all.push({ ...barsFromCandles(sym, tf, resample(cs, 1, tf)), lanes: [1, 5, 15] });
    }
    const protects: Protect[] = [
      { tp: 0.009, sl: 0.006, trail: 0, hold: 24 },
      { tp: 0.015, sl: 0.009, trail: 0.004, trailStep: 0.7, hold: 36 },
    ];
    const dcaOpt: NonNullable<RealtimeTapeGroup["dcaOpt"]> = {
      protects: protects.slice(0, 1),
      dca: { ...DEFAULT_DCA, step: 0.003 },
      axis: {
        ...DEFAULT_AXIS,
        modes: ["revert", "desk"],
        ranges: ["atr"],
        levelsSet: [2],
        centerMin: 30,
      },
    };
    const pairs = ["trend-ema", "inverse-known-trend-ema", signalId("ema-cross", "short")].flatMap(
      (ind) => [1, 5, 15].map((tf) => `follow|${ind}@m${tf}`),
    );
    const initial = all.map((b) => headBars(b, initialEnd));
    const baseline = buildTapes(makeUniverse(initial), protects, 0.0015, dcaOpt, new Set(pairs));
    assert.ok(baseline.length > 30);
    const ids = new Set(baseline.filter((_, i) => i % 4 !== 0).map((tp) => tp.id));
    const floors = { minSl: 0, minTrail: 0, onlyIds: ids };
    const group: RealtimeTapeGroup = { key: "selected", protects, pairs, dcaOpt, floors };
    const book = new RealtimeTapeBook(initial, [group], 0.0015);
    const current = new Map(baseline.filter((tp) => ids.has(tp.id)).map((tp) => [tp.id, tp]));
    let added = 0;
    for (const minutes of [1, 2, 5, 8, 15, 16, 30, 35, 59, 60, 90]) {
      const cut = all.map((b) => headBars(b, initialEnd + minutes * M));
      const ends = book.ends();
      const appends = cut
        .map((b) => {
          const i = b.t.findIndex((t) => t > ends[`${b.sym}|${b.tfMin}`]);
          return slice(b, i < 0 ? b.n : i);
        })
        .filter((b) => b.n > 0 && b.t[0] > ends[`${b.sym}|${b.tfMin}`]);
      const result = book.advance(appends);
      for (const delta of result.tapes) {
        added += delta.n;
        current.set(delta.id, appendTape(current.get(delta.id)!, delta));
      }
      const expected = buildTapes(
        makeUniverse(cut),
        protects,
        0.0015,
        dcaOpt,
        new Set(pairs),
        undefined,
        undefined,
        floors,
      );
      assert.equal(current.size, expected.length);
      for (const tp of expected) assert.deepEqual(current.get(tp.id), tp, `${minutes}m ${tp.id}`);
    }
    assert.ok(added > 0);
    const types = new Set([...current.values()].map((tp) => tp.kind));
    for (const kind of ["normal", "trailing", "dca", "dca-active", "axis"])
      assert.ok(types.has(kind as ConfigTape["kind"]));
    assert.ok([...current.keys()].some((id) => id.includes("|axd-")));
    const sides = new Set([...current.values()].flatMap((tp) => [...tp.side]));
    assert.deepEqual([...sides].sort(), [-1, 1]);
  });

  it("keeps earlier tape prefixes immutable across capacity reuse, empty deltas and forks", () => {
    const b = barsFromCandles("A", 1, syntheticCandles("A", 1, 600, 600 * M));
    const all = buildTapes(
      makeUniverse([b]),
      [{ tp: 0.005, sl: 0.005, trail: 0, hold: 10 }],
      0.0015,
      undefined,
      new Set(["follow|trend-ema"]),
    );
    const tape = all[0];
    assert.ok(tape.n > 2);
    const part = (a: number, z: number): ConfigTape => ({
      ...tape,
      n: z - a,
      exitT: tape.exitT.slice(a, z),
      entryT: tape.entryT.slice(a, z),
      r: tape.r.slice(a, z),
      entry: tape.entry.slice(a, z),
      exit: tape.exit.slice(a, z),
      symI: tape.symI.slice(a, z),
      side: tape.side.slice(a, z),
      reason: tape.reason.slice(a, z),
      bars: tape.bars.slice(a, z),
      vol: tape.vol.slice(a, z),
      level: tape.level.slice(a, z),
      gp: tape.gp.slice(a, z + 1).map((v) => v - tape.gp[a]),
      gl: tape.gl.slice(a, z + 1).map((v) => v - tape.gl[a]),
      rs: tape.rs.slice(a, z + 1).map((v) => v - tape.rs[a]),
      r2: tape.r2.slice(a, z + 1).map((v) => v - tape.r2[a]),
    });
    const first = part(0, 1),
      second = appendTape(first, part(1, 2));
    const snapshot = structuredClone(second);
    const third = appendTape(appendTape(second, part(0, 0)), part(2, 3));
    assert.deepEqual(second, snapshot);
    assert.deepEqual(appendTape(second, part(2, 3)), third);
    assert.throws(() => appendTape(third, part(1, 2)), /overlaps/);
  });
});
