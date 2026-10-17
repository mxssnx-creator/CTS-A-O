import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { CoreRuntime, compareTapeBytes, compareWorkers, computeKey } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { STRATEGY_PRESETS } from "../config.ts";
import { closePool, runOnWorkers, workerActivity } from "./pool.server.ts";
import type { ConfigTape } from "../sim/walkforward.ts";

process.env.CTS_CORE_STATE = "off";
process.env.CTS_CORE_AUTOSTART = "0";
process.env.CTS_CORE_WORKERS = "2";
const runtimes: CoreRuntime[] = [];
afterEach(async () => { for (const rt of runtimes.splice(0)) rt.dispose(); await closePool(); });

type Inner = {
  gen: number; stopped: boolean; busy: boolean; memPressured: boolean; memFallback: number; workersBroken: boolean;
  compareInput: Record<string, unknown> | null; compareRetryAt: number;
  dirty: boolean; resetUniverse: boolean; paperStepped: boolean; comparing: Promise<void> | null;
  cycle(): Promise<void>; syncMarket(gen: number): Promise<boolean>; schedule(ms: number): void;
  compareAvailableBytes(): number; comparePresets(gen?: number): Promise<void>;
  compareOnWorkers(messages: Array<Record<string, unknown>>, size: number, progress: (value: number) => void, signal: AbortSignal): Promise<Array<{ results: Array<{ name: string } & Record<string, unknown>> }>>;
  drive<T, R>(name: string, work: Generator<T, R>, step: (value: T) => void, gen?: number): Promise<R>;
};
const prior = { at: 42, startT: 0, endT: 1, presets: { preserved: { stats: { n: 123 } } } };
function fixture(tapes: ConfigTape[] = []) {
  const rt = new CoreRuntime(new CoreDb(":memory:"), { symbols: 1 }, { market: "synthetic" }); runtimes.push(rt);
  const inner = rt as unknown as Inner; inner.stopped = false;
  rt.db.kvSet("presetSims", prior);
  rt.status.compare = { running: false, done: 1, total: 1, at: prior.at };
  inner.compareInput = { tapes, wf: rt.wf, wu: { nowT: 1000, baseTf: 1 }, startT: 0, endT: 1000,
    gen: inner.gen, key: computeKey(rt.settings, rt.wf) };
  const state = { packs: 0, workers: 0 };
  const originalDrive = inner.drive.bind(rt);
  inner.drive = (name, ...args) => { if (name === "Pack tapes") state.packs++; return originalDrive(name, ...args); };
  inner.compareAvailableBytes = () => 8e9;
  inner.compareOnWorkers = async (messages, _size, progress) => {
    state.workers++; progress(1);
    return messages.map((m) => ({ results: (m.presets as Array<{ name: string }>).map(({ name }) => ({ name,
      stats: { n: 1 }, hourly: [], byKind: {}, skips: {}, blocks: [], stable: true })) }));
  };
  return { rt, inner, state };
}

test("Compare admission can return zero and accounts for its packed copy before allocating", () => {
  assert.equal(compareWorkers(8, 400e6, 800e6), 0);
  assert.equal(compareWorkers(8, 400e6, 1800e6), 0, "copy plus one worker cannot fit beside the hard reserve");
  assert.equal(compareWorkers(8, 400e6, 1800e6, false), 1, "already-packed check does not allocate a second copy");
  assert.equal(compareWorkers(2, 400e6, 8e9), 2);
  assert.ok(compareTapeBytes([{ n: 1, open: [], pending: [] } as unknown as ConfigTape]) > 2048);
});

test("low memory defers before any SAB pack or worker spawn and preserves previous results", async () => {
  const { rt, inner, state } = fixture([{ n: 1, open: [], pending: [],
    get exitT() { throw new Error("SAB packing must not inspect this tape under low memory"); } } as unknown as ConfigTape]);
  inner.compareAvailableBytes = () => 500e6;
  const positions = rt.paper.positions, selected = rt.paper.selected;
  await inner.comparePresets();
  assert.equal(state.packs, 0); assert.equal(state.workers, 0);
  assert.deepEqual(rt.db.kvGet("presetSims"), prior);
  assert.equal(rt.status.compare?.at, prior.at); assert.equal(rt.status.compare?.done, 1);
  assert.match(rt.status.compare?.deferred ?? "", /insufficient memory/);
  assert.ok(inner.compareInput); assert.ok(inner.compareRetryAt > Date.now());
  assert.equal(inner.memPressured, false); assert.equal(inner.memFallback, 0);
  assert.equal(rt.paper.positions, positions); assert.equal(rt.paper.selected, selected);
});

test("a memory drop after packing defers without spawning or falling back in process", async () => {
  const { rt, inner, state } = fixture(); let reads = 0;
  inner.compareAvailableBytes = () => ++reads <= 2 ? 8e9 : 500e6;
  await inner.comparePresets();
  assert.equal(state.packs, 1); assert.equal(state.workers, 0);
  assert.deepEqual(rt.db.kvGet("presetSims"), prior); assert.ok(inner.compareInput);
});

test("a cached pre-pack reading cannot increase the originally admitted worker count", async () => {
  const { inner } = fixture([{ n: 5_000_000, open: [], pending: [] } as unknown as ConfigTape]);
  inner.compareAvailableBytes = () => 2.2e9;
  // Model a large packed payload without allocating it; only admission/concurrency is under test.
  inner.drive = async <T, R>(_name: string, _work: Generator<T, R>) => ({ sab: new SharedArrayBuffer(8), meta: "" }) as R;
  let used = 0; const normal = inner.compareOnWorkers;
  inner.compareOnWorkers = (messages, n, ...args) => { used = n; return normal(messages, n, ...args); };
  await inner.comparePresets();
  assert.equal(used, 1, "the post-pack check cannot spend pre-pack headroom a second time");
});

test("pressure cancels only Compare's active worker call, preserves foreground state and retries", async () => {
  const { rt, inner, state } = fixture(); let available = 8e9, ownCanceled = false;
  inner.compareAvailableBytes = () => available;
  const normal = inner.compareOnWorkers;
  const unrelated = runOnWorkers<{ ok: boolean }>([{ type: "sleep", ms: 800 }], 1, 10_000);
  inner.compareOnWorkers = async (_messages, _size, progress, signal) => {
    state.workers++;
    signal.addEventListener("abort", () => { ownCanceled = true; }, { once: true });
    const owned = runOnWorkers([{ type: "sleep", ms: 5000 }], 1, 10_000, undefined, false, signal);
    await new Promise((resolve) => setImmediate(resolve));
    available = 500e6;
    // Exercise the real worker-progress observer too: it must abort through its signal rather than throw.
    assert.doesNotThrow(() => progress(0.5));
    await owned;
    return [];
  };
  await inner.comparePresets();
  assert.equal(ownCanceled, true); assert.equal((await unrelated)[0].ok, true, "another call is not globally aborted");
  assert.equal(workerActivity().inFlight, 0);
  assert.equal(inner.memPressured, false); assert.equal(inner.memFallback, 0); assert.equal(inner.workersBroken, false);
  assert.deepEqual(rt.db.kvGet("presetSims"), prior); assert.ok(inner.compareInput);
  assert.match(rt.status.compare?.deferred ?? "", /hard reserve/);
  available = 8e9; inner.compareOnWorkers = normal;
  await inner.comparePresets();
  const saved = rt.db.kvGet<{ presets: Record<string, unknown> }>("presetSims");
  assert.deepEqual(Object.keys(saved?.presets ?? {}).sort(), Object.keys(STRATEGY_PRESETS).sort());
  assert.equal(rt.status.compare?.deferred, undefined); assert.equal(inner.compareInput, null);
});

test("normal headroom completes every Compare preset and publishes one replacement result", async () => {
  const { rt, inner, state } = fixture();
  await inner.comparePresets();
  assert.equal(state.packs, 1); assert.equal(state.workers, 1);
  assert.equal(rt.status.compare?.running, false); assert.equal(rt.status.compare?.done, Object.keys(STRATEGY_PRESETS).length);
  assert.equal(inner.compareInput, null); assert.equal(inner.compareRetryAt, 0);
  assert.notDeepEqual(rt.db.kvGet("presetSims"), prior);
});

test("stopping a runtime cancels its Compare call without requeueing or replacing results", async () => {
  const { rt, inner } = fixture(); let started!: () => void;
  const ready = new Promise<void>((resolve) => { started = resolve; });
  inner.compareOnWorkers = async (_messages, _size, _progress, signal) => {
    started();
    return await new Promise((_, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true }));
  };
  const comparing = inner.comparePresets(); await ready;
  rt.stop(); await comparing;
  assert.equal(inner.compareInput, null); assert.equal(inner.compareRetryAt, 0);
  assert.equal(rt.status.compare?.running, false);
  assert.deepEqual(rt.db.kvGet("presetSims"), prior);
});

test("an ordinary cycle retries a deferred comparison after recovery without recomputing Base", async () => {
  const { rt, inner, state } = fixture();
  inner.compareAvailableBytes = () => 500e6;
  await inner.comparePresets(); assert.ok(inner.compareInput);
  inner.compareAvailableBytes = () => 8e9;
  inner.compareRetryAt = Date.now() - 1;
  inner.dirty = false; inner.resetUniverse = false; inner.paperStepped = true;
  inner.syncMarket = async () => false; inner.schedule = () => undefined;
  const computes = rt.status.computes;
  await inner.cycle(); await inner.comparing;
  assert.equal(rt.status.computes, computes, "no synthetic/Base computation is needed for the retry");
  assert.equal(state.packs, 1); assert.equal(state.workers, 1);
  assert.equal(inner.compareInput, null); assert.equal(rt.status.compare?.deferred, undefined);
  assert.notDeepEqual(rt.db.kvGet("presetSims"), prior);
});

test("watchdog generation replacement releases only its obsolete Compare job", async () => {
  const { rt, inner } = fixture(); let started!: () => void;
  const ready = new Promise<void>((resolve) => { started = resolve; });
  inner.compareOnWorkers = async (_messages, _size, _progress, signal) => {
    started(); return await new Promise((_, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true }));
  };
  const comparing = inner.comparePresets(); await ready;
  rt.status.state = "running"; rt.status.heartbeat = Date.now() - 240_000; inner.schedule = () => undefined;
  const generation = inner.gen; rt.ensureAlive(); await comparing;
  assert.equal(inner.gen, generation + 1); assert.equal(inner.compareInput, null);
  assert.equal(rt.status.compare?.running, false); assert.deepEqual(rt.db.kvGet("presetSims"), prior);
});

for (const restart of ["watchdog", "stop/start"] as const) {
  test(`${restart} does not let a cycle waiting for Compare adopt the replacement generation`, async () => {
    const { rt, inner } = fixture(); let started!: () => void;
    const ready = new Promise<void>((resolve) => { started = resolve; });
    inner.compareOnWorkers = async (_messages, _size, _progress, signal) => {
      started(); return await new Promise((_, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true }));
    };
    inner.comparing = inner.comparePresets().finally(() => { inner.comparing = null; });
    await ready;
    let marketCalls = 0, releaseMarket!: () => void;
    const marketGate = new Promise<void>((resolve) => { releaseMarket = resolve; });
    inner.syncMarket = async () => { marketCalls++; await marketGate; return false; };
    inner.schedule = () => undefined;
    inner.dirty = false; inner.resetUniverse = false; inner.paperStepped = true;
    const waiting = inner.cycle();
    assert.equal(inner.busy, true);
    const generation = inner.gen;
    if (restart === "watchdog") {
      rt.status.state = "running"; rt.status.heartbeat = Date.now() - 240_000;
      rt.ensureAlive();
    } else { rt.stop(); rt.start(); }
    assert.equal(inner.gen, generation + 1);
    const replacement = inner.cycle();
    try {
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(marketCalls, 1, "only the replacement cycle may enter the market/compute path");
      assert.equal(inner.busy, true, "the superseded cycle must not clear its replacement's busy flag");
    } finally { releaseMarket(); await Promise.all([waiting, replacement]); }
  });
}
