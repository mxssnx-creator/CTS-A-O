import assert from "node:assert/strict";
import { test } from "node:test";
import { profitFactor as modeledPf } from "./metrics/stats.ts";
import { profitFactor as botPf, botStatsFromRows, type LaneRow } from "./bot-stats.ts";
import { pooledPf } from "./pipeline/pipeline.ts";
import { gateMinimalPlus } from "./minimal-coord.ts";
import { SignalAcceptIndex, SignalGuard, EngineSideIndex, acceptKey, engineSideKey, acceptOnWindow } from "./signals.ts";
import { exchangeAcceptIndex } from "./live-record.ts";
import { liveRecords } from "./live-record.ts";
import { liveGate, liveGroupGates, sideTapeOf } from "./live-validation.ts";
import { lastNOk, type ConfigTape } from "./sim/walkforward.ts";

const H = 3_600_000, M = 60_000;

test("equal gains and losses have PF 1 regardless of return magnitude", () => {
  for (const magnitude of [1, 1e-6, 1e-13, 1e-100]) {
    assert.equal(modeledPf(magnitude, magnitude), 1);
    assert.equal(botPf([magnitude, -magnitude]), 1);
    assert.equal(pooledPf([{ pf: 1, net: 0, gp: magnitude, gl: magnitude }]).pf, 1);
    assert.equal(botPf([magnitude / 2, -magnitude]), .5);
    assert.equal(botPf([magnitude * 2, -magnitude]), 2);
  }
  assert.equal(botPf([1e-13]), Infinity, "a real no-loss sample is separate");
  assert.equal(botPf([-1e-13]), 0, "a real loss-only sample stays zero");
  assert.equal(botPf([0]), 0, "a flat sample has no ratio in the legacy gate score");
  assert.ok(Number.isNaN(botPf([1, Number.MIN_VALUE * -1])), "an overflowed ratio is unknown");
});

test("every Signal, direction and attributed-record window sees tiny balanced returns as neutral", () => {
  const tiny = 1e-13, ind = "sig-ema-cross-s@m1", sym = "X-USDT";
  const tape = { id: `follow|${ind}|tp1|sl1|tr0|h20`, ind, kind: "normal", n: 2,
    syms: [sym], symI: [0, 0], side: [1, 1], exitT: [H + M, H + 2 * M], r: [tiny, -tiny] };
  const key = acceptKey(ind, sym, 1, "normal", tape.id);
  for (const lazy of [false, true]) {
    const signal = new SignalAcceptIndex([tape], lazy);
    const stats = signal.stats(key, 2 * H, 2);
    assert.equal(stats.n, 2); assert.equal(stats.pf, 1);
    assert.equal(acceptOnWindow(() => stats, { minPf: 1.05, hours: 2, minTrades: 2 }), false);
  }
  const engine = new EngineSideIndex();
  for (const _ of engine.fill([{ ...tape, ind: "ema-9-21@m1", protect: { tag: "mn" } }])) { /* drain */ }
  assert.deepEqual(engine.stats(engineSideKey("normal", "mn", 1), 2 * H, 2), { n: 2, pf: 1 });
  const guard = new SignalGuard();
  guard.addAccept("own", tiny, H + M); guard.addAccept("own", -tiny, H + 2 * M);
  assert.deepEqual(guard.acceptStats("own", 2 * H, 2), { n: 2, pf: 1 });
  const cfg = "follow|ema-9-21@m1|tp1|sl1|tr0|h20|mn";
  const observed = exchangeAcceptIndex([tiny, -tiny].map((r, i) => ({ cfg, sym, side: 1, exitT: H + (i + 1) * M, r })));
  assert.deepEqual(observed.stats(engineSideKey("normal", "mn", 1), 2 * H, 2), { n: 2, pf: 1 });
});

test("expired large history cannot erase balanced tiny returns from current acceptance windows", () => {
  const ind = "sig-ema-cross-s@m1", sym = "X-USDT", tiny = 1e-20;
  const tape = { id: `follow|${ind}|tp1|sl1|tr0|h20`, ind, kind: "normal", n: 4,
    syms: [sym], symI: [0, 0, 0, 0], side: [1, 1, 1, 1],
    exitT: [H + M, H + 2*M, 2*H + M, 2*H + 2*M], r: [1, -1, tiny, -tiny] };
  const key = acceptKey(ind, sym, 1, "normal", tape.id);
  for (const lazy of [false, true]) {
    assert.deepEqual(new SignalAcceptIndex([tape], lazy).stats(key, 3*H, 1), { n: 2, pf: 1 });
  }
  const engine = new EngineSideIndex();
  for (const _ of engine.fill([{ ...tape, ind: "ema-9-21@m1", protect: { tag: "mn" } }])) { /* drain */ }
  assert.deepEqual(engine.stats(engineSideKey("normal", "mn", 1), 3*H, 1), { n: 2, pf: 1 });
  const append = new EngineSideIndex();
  const engineTape = { ...tape, ind: "ema-9-21@m1", protect: { tag: "mn" } };
  for (const _ of append.fill([{ ...engineTape, n: 2 }])) { /* drain */ }
  for (const _ of append.append([{ ...engineTape, n: 2, exitT: tape.exitT.slice(2), r: [2*tiny, -tiny] }])) { /* drain */ }
  assert.deepEqual(append.stats(engineSideKey("normal", "mn", 1), 3*H, 1), { n: 2, pf: 2 });
  const unknownThenKnown = { ...tape, r: [NaN, -1, tiny, -tiny] };
  assert.deepEqual(new SignalAcceptIndex([unknownThenKnown]).stats(key, 3*H, 1), { n: 2, pf: 1 },
    "an expired unknown return must not contaminate a later known window");
  assert.ok(Number.isNaN(new SignalAcceptIndex([unknownThenKnown]).stats(key, 2*H, 1).pf),
    "a window containing the unknown return is not certified");
});

test("a tiny neutral Minimal Plus history cannot pass a higher configured PF floor", () => {
  const n = 50, gp = new Float64Array(n + 1), gl = new Float64Array(n + 1);
  for (let i = 1; i <= n; i++) { gp[i] = gp[i - 1] + (i % 2 ? 1e-14 : 0); gl[i] = gl[i - 1] + (i % 2 ? 0 : 1e-14); }
  const tape = { id: "follow|ema|tp1|sl1|tr0|h20|mp", n, gp, gl };
  assert.deepEqual(gateMinimalPlus([tape], { enabled: true, lastN: 50, minPf: 1.05 }), []);
  const noLoss = { ...tape, gl: new Float64Array(n + 1) };
  assert.deepEqual(gateMinimalPlus([noLoss], { enabled: true, lastN: 50, minPf: 1.05 }), [noLoss]);
});

test("a sufficiently large family with an unknown return is not certified as passing", () => {
  const rows: LaneRow[] = Array.from({ length: 200 }, (_, i) => {
    const side = i % 2 ? -1 : 1, cfg = "follow|ema|tp1|sl1|tr0|h20|mn", sym = `S${i % 40}`;
    const at = i * 15 * M;
    return { id: `${cfg}|${sym}|${side}|${at}`, cfg, sym, side, entry: 100,
      exit: 100 + side * 1.2, exit_t: at + M, r: i === 0 ? NaN : .01, reason: "exit" };
  });
  const result = botStatsFromRows(rows).families[0];
  assert.notEqual(result.verdict, "pass");
  assert.ok(result.why.some(x => /unknown|unavailable|non.?finite/i.test(x)));
});

test("historical, owned and grouped Last-N recover tiny windows from their original returns", () => {
  const cfg = "follow|ema-9-21@m1|tp1|sl1|tr0|h20|mn", tiny = 1e-20;
  const exits = [H, H+M, 2*H+M, 2*H+2*M];
  const values = [2, -1, tiny, -tiny];
  const record = liveRecords(values.map((r, i) => ({ cfg, exitT: exits[i], r }))).get(cfg)!;
  assert.deepEqual(liveGate(record, 0, 3*H, 2, 1.05), { ok: false, n: 2, pf: 1 });
  assert.deepEqual(liveGroupGates([record], 0, 3*H, 2, 1.05).get("Minimal"), { ok: false, n: 2, pf: 1 });
  const side = sideTapeOf({ id: cfg, exitT: Float64Array.from(exits), r: Float64Array.from(values), side: Int8Array.from([1,1,1,1]) }, 1);
  assert.deepEqual(liveGate(side, 0, 3*H, 2, 1.05), { ok: false, n: 2, pf: 1 });
  assert.equal(lastNOk(record as unknown as ConfigTape, 3*H, 2, 1.05), false);
  const winners = liveRecords([2, -1, tiny, tiny].map((r, i) => ({ cfg, exitT: exits[i], r }))).get(cfg)!;
  assert.equal(lastNOk(winners as unknown as ConfigTape, 3*H, 2, 1.05), true, "genuine no-loss tail retains its own evidence");
  const { r: _removed, ...legacy } = record;
  assert.deepEqual(liveGate(legacy, 0, 3*H, 2, 1.05), { ok: false, n: 2, pf: null, unknown: 1 },
    "ambiguous legacy prefixes without source returns cannot certify an invented ratio");
});

test("Minimal Plus rescans a tiny no-loss tail and fails closed without original returns", () => {
  const r = [2, -1, ...Array(50).fill(1e-20)];
  const gp = new Float64Array(r.length+1), gl = new Float64Array(r.length+1);
  for (let i=0; i<r.length; i++) { gp[i+1]=gp[i]+Math.max(0,r[i]); gl[i+1]=gl[i]+Math.max(0,-r[i]); }
  const tape = { id: "follow|ema|tp1|sl1|tr0|h20|mp", n: r.length, gp, gl, r };
  assert.deepEqual(gateMinimalPlus([tape], { enabled: true, lastN: 50, minPf: 1.05 }), [tape]);
  const { r: _removed, ...legacy } = tape;
  assert.deepEqual(gateMinimalPlus([legacy], { enabled: true, lastN: 50, minPf: 1.05 }), []);
});
