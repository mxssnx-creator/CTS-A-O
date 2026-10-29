#!/usr/bin/env node
import "./lib/core-test-offline-guard.cjs";
import assert from "node:assert/strict";
import { Worker } from "node:worker_threads";
import { barsFromCandles, headBars, syntheticCandles } from "../src/core/market/bars.ts";
import { makeUniverse } from "../src/core/pipeline/pipeline.ts";
import {
  buildTapes,
  defaultWalkForward,
  packTapes,
  walkForward,
} from "../src/core/sim/walkforward.ts";
import { appendTape } from "../src/core/sim/tape-append.ts";
import { TickMathBook } from "../src/core/server/tick-math.ts";
import { DEFAULT_SETTINGS } from "../src/core/config.ts";

const worker = new Worker(
  new URL("../.vercel/output/functions/__server.func/cts-core-worker.mjs", import.meta.url),
  { execArgv: ["--no-warnings"] },
);
let id = 0;
const request = (payload) =>
  new Promise((resolve, reject) => {
    const serial = ++id;
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("built worker timeout"));
    }, 10000);
    const cleanup = () => {
      clearTimeout(timer);
      worker.off("message", message);
      worker.off("error", error);
    };
    const error = (e) => {
      cleanup();
      reject(e);
    };
    const message = (m) => {
      if (m.id !== serial || m.ok === undefined) return;
      cleanup();
      if (m.ok) resolve(m);
      else reject(new Error(m.error));
    };
    worker.on("message", message);
    worker.once("error", error);
    worker.postMessage({ ...payload, id: serial });
  });
try {
  const b = barsFromCandles("BTC-USDT", 1, syntheticCandles("BTC-USDT", 1, 1800, 1800 * 60000));
  const first = headBars(b, 1799 * 60000),
    u = makeUniverse([first]);
  const protects = [{ tp: 0.009, sl: 0.006, trail: 0, hold: 24 }];
  const pairs = ["follow|inverse-known-trend-ema@m1"];
  const initial = buildTapes(u, protects, 0.0015, undefined, new Set(pairs));
  assert.equal(initial.length, 1);
  const floors = { minSl: 0, minTrail: 0, onlyIds: new Set(initial.map((t) => t.id)) };
  await request({
    type: "realtime-init",
    bars: [first],
    groups: [{ key: "selected", pairs, protects, floors }],
    cost: 0.0015,
  });
  const tail = {
    ...b,
    n: b.n - first.n,
    t: b.t.slice(first.n),
    o: b.o.slice(first.n),
    h: b.h.slice(first.n),
    l: b.l.slice(first.n),
    c: b.c.slice(first.n),
    v: b.v.slice(first.n),
  };
  const advanced = await request({ type: "realtime-advance", appends: [tail] });
  assert.equal(advanced.tapes.length, 1);
  const next = appendTape(initial[0], advanced.tapes[0]);
  const expected = buildTapes(
    makeUniverse([b]),
    protects,
    0.0015,
    undefined,
    new Set(pairs),
    undefined,
    undefined,
    floors,
  )[0];
  assert.deepEqual(next, expected);
  const wf = { ...defaultWalkForward(DEFAULT_SETTINGS), preH: 6, simH: 6 };
  const real = await request({
    type: "research-real",
    nowT: u.nowT,
    baseTf: u.baseTf,
    packed: packTapes(initial),
    wf,
  });
  assert.deepEqual(real.sim, walkForward(u, initial, wf));
  const positions = [-1, 1].map((side) => ({
    cfg: "follow|trend-ema@m1|built",
    sym: "BTC-USDT",
    side,
    entryT: 0,
    entry: 100,
    stop: side === 1 ? 95 : 105,
    target: side === 1 ? 115 : 85,
    peak: 100,
    trailOn: false,
    trail: 0.01,
    trailDist: 0.02,
    mtm: -0.0015,
  }));
  const units = new Float64Array([1, 1]),
    prices = { "BTC-USDT": 101 };
  const referenceBook = new TickMathBook(structuredClone(positions), units, 0.0015, 1, false);
  const reference = referenceBook.advance(prices, 60000);
  const marked = await request({
    type: "tick-init",
    positions,
    units,
    cost: 0.0015,
    baseTfMin: 1,
    trailFree: false,
    prices,
    now: 60000,
  });
  assert.deepEqual(marked.result, reference);
  // The production bundle must publish the first observed adverse quote, not the crossed stop level.
  for (const [px, now] of [[94, 60001], [106, 60002]]) {
    const frame = { "BTC-USDT": px };
    const local = referenceBook.advance(frame, now);
    const remote = await request({ type: "tick-advance", prices: frame, now });
    assert.deepEqual(remote.result, local);
    assert.equal(Object.values(remote.result.hits ?? {})[0]?.px, px);
    const closed = remote.result.patches.find((p) => p.values.stopHit === now);
    assert.equal(closed?.values.hitPx, px);
    assert.ok(Math.abs(closed.values.mtm - (-0.06 - 0.0015)) < 1e-12);
  }
  console.log(
    JSON.stringify({
      passed: true,
      worker: "packaged production bundle",
      checks: [
        "realtime incremental tape exact parity",
        "historical Real complete-result parity",
        "Long/Short tick math exact parity",
        "Long/Short stop-gap marks and one modeled cost",
      ],
      closes: next.n,
    }),
  );
} finally {
  await worker.terminate();
}
