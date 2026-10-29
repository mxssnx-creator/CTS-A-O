import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { OwnedWorker } from "./owned-worker.server.ts";
import { TickMathBook, type TickPosition, type TickMathResult } from "./tick-math.ts";

const positions = (n: number): TickPosition[] =>
  Array.from({ length: n }, (_, i) => ({
    cfg: `follow|trend-ema@m${[1, 5, 15][i % 3]}|test-${i}`,
    sym: `S${i % 20}`,
    side: i % 2 ? -1 : 1,
    entryT: 0,
    entryI: 0,
    entry: 100,
    stop: i % 2 ? 102 : 98,
    target: i % 2 ? 96 : 104,
    peak: 100,
    trailOn: false,
    trail: 0.008,
    trailDist: 0.005,
    mtm: -0.0015,
    vol: 1 + (i % 3),
  }));

describe("private serial realtime worker", () => {
  it("publishes observed adverse gap marks once for long and short stops", async () => {
    const worker = new OwnedWorker(128), initial = positions(2).map(p => ({ ...p, trail: 0 }));
    const units = Float64Array.of(1, 1), cost = .0012;
    try {
      await worker.run({ type: "tick-init", positions: initial, units, cost, baseTfMin: 1,
        trailFree: false, prices: { S0: 100, S1: 100 }, now: 60_000 }, 5_000);
      const result = (await worker.run<{ result: TickMathResult }>({ type: "tick-advance",
        prices: { S0: 97, S1: 103 }, now: 60_001 }, 5_000)).result;
      assert.equal(Object.keys(result.hits ?? {}).length, 2);
      assert.deepEqual(Object.values(result.hits!).map(hit => hit.px).sort((a, b) => a! - b!), [97, 103]);
      assert.equal(result.patches[0].values.hitPx, 97);
      assert.equal(result.patches[1].values.hitPx, 103);
      assert.ok(Math.abs(result.patches[0].values.mtm! - (-.03 - cost)) < 1e-12);
      assert.ok(Math.abs(result.patches[1].values.mtm! - (-.03 - cost)) < 1e-12);
      const later = await worker.run<{ result: TickMathResult }>({ type: "tick-advance",
        prices: { S0: 96, S1: 104 }, now: 60_002 }, 5_000);
      assert.equal(later.result.hits, null);
    } finally { worker.dispose(); }
  });
  it("retains deadline close reasons and exact marks across flat frames on both directions", async () => {
    const worker = new OwnedWorker(128), M = 60_000;
    const initial = positions(2).map((p) => ({ ...p, trail: 0, executionTfMin: 1, holdEndT: 2 * M }));
    const units = Float64Array.of(10, 20), reference = new TickMathBook(structuredClone(initial), units, .0015, 1, false);
    try {
      for (let minute = 1; minute <= 3; minute++) {
        const now = minute * M, prices = { S0: 100, S1: 100 };
        const reply = await worker.run<{ result: TickMathResult }>({
          type: minute === 1 ? "tick-init" : "tick-advance", prices, now,
          ...(minute === 1 ? { positions: initial, units, cost: .0015, baseTfMin: 1, trailFree: false } : {}),
        }, 5_000);
        assert.deepEqual(reply.result, reference.advance(prices, now));
        if (minute === 2) {
          assert.equal(Object.keys(reply.result.hits ?? {}).length, 2);
          assert.ok(Object.values(reply.result.hits!).every((hit) => hit.reason === "time"));
        } else assert.equal(reply.result.hits, null);
      }
    } finally { worker.dispose(); }
  });
  it("rejects overlap, terminates timed-out work and resumes without affecting another owner", async () => {
    const worker = new OwnedWorker(128),
      other = new OwnedWorker(128);
    try {
      const active = worker.run({ type: "sleep", ms: 300 }, 5_000);
      await assert.rejects(worker.run({ type: "sleep", ms: 1 }, 5_000), /already processing/);
      await active;
      const survivor = other.run<{ ok: boolean }>({ type: "sleep", ms: 100 }, 5_000);
      await assert.rejects(worker.run({ type: "sleep", ms: 60_000 }, 50), /timeout/);
      assert.equal((await survivor).ok, true);
      assert.equal((await worker.run<{ ok: boolean }>({ type: "sleep", ms: 1 }, 5_000)).ok, true);
      const canceled = worker.run({ type: "sleep", ms: 60_000 }, 5_000);
      worker.dispose(new Error("connection stopped"));
      await assert.rejects(canceled, /connection stopped/);
    } finally {
      worker.dispose();
      other.dispose();
    }
  });

  it("matches local protection/mark math on 20 symbols, Long/Short and 1/5/15m across retained frames", async () => {
    const worker = new OwnedWorker(128);
    const initial = positions(2_000),
      local = structuredClone(initial);
    const units = Float64Array.from(initial, (_, i) => 10 + (i % 7));
    const reference = new TickMathBook(local, units, 0.0015, 1, false);
    try {
      for (let frame = 0; frame < 40; frame++) {
        const now = 1000 + frame * 60_000;
        const prices = Object.fromEntries(
          Array.from({ length: 20 }, (_, s) => [
            `S${s}`,
            100 + 1.4 * Math.sin(frame * 0.35 + s / 3),
          ]).filter((_, s) => (frame + s) % 7 !== 0), // intermittent missing quotes, including the first frame
        );
        const reply = await worker.run<{ result: TickMathResult }>(
          {
            type: frame ? "tick-advance" : "tick-init",
            prices,
            now,
            ...(frame
              ? {}
              : { positions: initial, units, cost: 0.0015, baseTfMin: 1, trailFree: false }),
          },
          5_000,
        );
        const expected = reference.advance(prices, now);
        assert.deepEqual(reply.result, expected);
        const scalarOpen = local.reduce((sum, p, i) => sum + p.mtm * (p.vol ?? 1) * units[i], 0);
        assert.ok(Math.abs(reply.result.open - scalarOpen) < 1e-8, "unquoted held marks remain in equity");
        for (const patch of reply.result.patches) Object.assign(initial[patch.index], patch.values);
        const defined = (p: TickPosition) =>
          Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined));
        for (let i = 0; i < initial.length; i++)
          assert.deepEqual(defined(initial[i]), defined(local[i]));
      }
    } finally {
      worker.dispose();
    }
  });

  it("publishes every repaired trailing-only control from the worker, including legacy TP/free flags", async () => {
    const worker = new OwnedWorker(128);
    const initial = positions(2).map((p, i) => ({
      ...p,
      cfg: `follow|sig-ema-cross-s@m1|tp4|sl8|tr1|h20|to|tm2.5|case${i}`,
      stop: i ? 108 : 92,
      trailOnly: undefined,
      trailFree: true,
      target: i ? 96 : 104,
    }));
    const local = structuredClone(initial),
      units = new Float64Array([10, 10]);
    try {
      const reference = new TickMathBook(local, units, 0.002, 1, true);
      const reply = await worker.run<{ result: TickMathResult }>(
        {
          type: "tick-init",
          positions: initial,
          units,
          cost: 0.002,
          baseTfMin: 1,
          trailFree: true,
          prices: { S0: 100, S1: 100 },
          now: 1000,
        },
        5000,
      );
      reference.advance({ S0: 100, S1: 100 }, 1000);
      for (const patch of reply.result.patches) Object.assign(initial[patch.index], patch.values);
      for (let i = 0; i < initial.length; i++) {
        for (const field of ["stop", "target", "trailOnly", "trailFree", "trailMax"] as const)
          assert.equal(initial[i][field], local[i][field]);
        assert.equal(initial[i].target, 0);
        assert.equal(initial[i].trailOnly, true);
        assert.equal(initial[i].trailFree, false);
      }
    } finally {
      worker.dispose();
    }
  });
});
