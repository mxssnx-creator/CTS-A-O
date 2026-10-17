import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { BaseConfigJobRunner, type BaseConfigJob } from "./base-config-job.server.ts";
import type { BaseConfigChunkMessage, BaseConfigChunkReply } from "./pool.server.ts";
import { axisRangeVariants, axisVariants, defaultWalkForward } from "../sim/walkforward.ts";
import { protectKind } from "../pipeline/pipeline.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Protect } from "../domain/types.ts";

const wf = defaultWalkForward(DEFAULT_SETTINGS);
const protects: Protect[] = Array.from({ length: 70 }, (_, i) => ({ tp: (i + 1) / 1000,
  sl: 0.002, trail: i % 2 ? 0.001 : 0, hold: 32, tag: i < 35 ? "sh" : "gn" }));
const jobOf = (patch: Partial<BaseConfigJob> = {}): BaseConfigJob => ({ key: "metadata", settingsAt: 1,
  pairs: ["follow|one@m1"], protects, kinds: ["normal", "trailing", "dca", "dca-active", "axis"],
  dcaOpt: { protects: wf.dcaProtects, dca: wf.dca, axis: { ...DEFAULT_SETTINGS.axis } },
  common: { bars: [{ n: 100_000 }] as BaseConfigJob["common"]["bars"], cost: 0.002, floors: {},
    options: { gates: { minPf: 1.1, minTrades: 3, maxDdr: 0 }, cost: 0.002, cutT: 100, fromT: 0 } }, ...patch });
const runnerOf = (patch: Partial<ConstructorParameters<typeof BaseConfigJobRunner>[0]> = {}) => new BaseConfigJobRunner({
  ready: () => true, foreground: () => false, memoryOkay: () => true, available: () => true,
  run: async () => { throw new Error("metadata test must supply a reply without simulation"); }, publish: () => undefined, ...patch,
});
const cellId = (pair: string, kind: string, p: Protect) => `${pair}|${kind}|${p.tag ?? ""}|${p.tp}|${p.sl}|${p.trail}|${p.hold}`;
const cellsOf = (m: BaseConfigChunkMessage) => m.kinds.includes("axis")
  ? Array.from({ length: m.floors.countAxisWindow!.limit }, (_, i) => ({
    id: `${m.pair}|axis|${m.floors.countAxisWindow!.offset + i}`, tag: "", kind: "axis" }))
  : m.dcaOpt ? m.dcaOpt.protects.flatMap((p) => m.kinds.map((kind) => ({ id: cellId(m.pair, kind, p), tag: p.tag ?? "", kind })))
    : m.protects.map((p) => ({ id: cellId(m.pair, protectKind(p), p), tag: p.tag ?? "", kind: protectKind(p) }));
const replyOf = (m: BaseConfigChunkMessage): BaseConfigChunkReply => {
  const [bot, ind] = m.pair.split("|");
  const counts = new Map<string, { tag: string; kind: string; n: number }>();
  const cells = cellsOf(m);
  for (const cell of cells) {
    assert.ok(!m.seen.includes(cell.id), "a configured cell is never repeated within a pair");
    const key = `${cell.tag}|${cell.kind}`;
    const row = counts.get(key) ?? { tag: cell.tag, kind: cell.kind, n: 0 }; row.n++; counts.set(key, row);
  }
  return { seen: cells.map((cell) => cell.id), rows: [...counts.values()].map(({ tag, kind, n }) => ({ bot, ind, tag, kind,
    configured: n, evaluated: 0, pfPassed: 0, passed: 0, notEvaluated: { "metadata-only": n }, minPf: 1.1, floorPf: 1.1,
    cost: m.options.cost, cutT: m.options.cutT, fromT: m.options.fromT, closes: 0, gp: 0, gl: 0, firstEntryT: null, lastExitT: null })) };
};
async function drain(t: TestContext, runner: BaseConfigJobRunner) {
  for (let i = 0; runner.snapshot?.summary.state !== "complete" && i < 10_000; i++) {
    t.mock.timers.tick(25); await Promise.resolve();
    assert.notEqual(runner.snapshot?.summary.state, "error", runner.snapshot?.summary.error);
  }
  assert.equal(runner.snapshot?.summary.state, "complete");
}

test("many identical pair scopes plan once and materialize only the admitted chunks", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let filters = 0, calls = 0;
  let ready = false;
  const grid = new Proxy(protects, { get(target, key, receiver) {
    if (key === "filter") filters++;
    return Reflect.get(target, key, receiver);
  } });
  const pairs = Array.from({ length: 10_000 }, (_, i) => `follow|metadata${i}@m1`);
  const job = jobOf({ pairs, protects: grid });
  const runner = runnerOf({ ready: () => ready, run: async (m) => { calls++; return replyOf(m); } });
  try {
    runner.request(job);
    assert.equal(filters, 1, "the same configured grid is planned once for all pair scopes");
    assert.equal(calls, 0);
    assert.equal(runner.snapshot!.summary.totalChunks, 5 * pairs.length);
    assert.equal(runner.snapshot!.summary.plannedConfigured, (70 + 4 * 2 + 8) * pairs.length);
    assert.equal(runner.snapshot!.summary.configured, 0, "planning never claims an evaluated cell");
    runner.request(job); assert.equal(filters, 1, "an unchanged request retains its current plan");
    ready = true;
    for (let i = 0; i < 2; i++) { t.mock.timers.tick(25); await Promise.resolve(); }
    assert.equal(calls, 2, "only the two admitted chunks are materialized and dispatched");
    assert.equal(filters, 1, "driving another slice does not plan the whole grid again");
  } finally { runner.cancel("test"); }
});

test("lazy chunks cover every enabled cell exactly once across pair scopes, strategy kinds and bounded sizes", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  for (const bars of [100_000, 500_000, 4_000_000]) {
    const pairs = ["follow|wide@m1", "revert|range@m5", "follow|empty@m15", "follow|unrestricted@m30"];
    const tags = { [pairs[0]]: ["", "sh", "gn"], [pairs[1]]: ["sh"], [pairs[2]]: [] };
    const seed = jobOf();
    const axis = { ...DEFAULT_SETTINGS.axis, modes: ["revert", "desk"] as const,
      ranges: ["atr", "linear", "geo", "fib"] as const, levelsSet: [2, 3, 4], hybrids: [false, true], perRange: true };
    const job = jobOf({ pairs, dcaOpt: { ...seed.dcaOpt!, protects: Array.from({ length: 35 }, (_, i) => ({ ...wf.dcaProtects[0], tp: (i + 1) / 100 })),
      axis: { ...axis, modes: [...axis.modes], ranges: [...axis.ranges] } },
      common: { ...seed.common, bars: [{ n: bars }] as BaseConfigJob["common"]["bars"],
        floors: { pairTags: tags, pairTps: { [pairs[1]]: { sh: [0.003] } } } } });
    const messages: BaseConfigChunkMessage[] = [];
    const runner = runnerOf({ run: async (m) => { messages.push(m); return replyOf(m); } });
    try {
      runner.request(job); const planned = runner.snapshot!.summary.plannedConfigured;
      await drain(t, runner);
      const expected: string[] = [];
      for (const pair of pairs) {
        for (const p of protects) expected.push(cellId(pair, protectKind(p), p));
        if (pair === pairs[0] || pair === pairs[3])
          for (const p of job.dcaOpt!.protects) for (const kind of ["dca", "dca-active"]) expected.push(cellId(pair, kind, p));
        const rangeTags = tags[pair as keyof typeof tags];
        const axisN = (pair === pairs[0] || pair === pairs[3] ? axisVariants(job.dcaOpt!.axis!, job.dcaOpt!.protects).length : 0)
          + (rangeTags ? axisRangeVariants(job.dcaOpt!.axis!, protects, rangeTags, job.common.floors.pairTps?.[pair]).length : 0);
        for (let i = 0; i < axisN; i++) expected.push(`${pair}|axis|${i}`);
      }
      const actual = messages.flatMap((m) => cellsOf(m).map((cell) => cell.id));
      assert.deepEqual(actual, expected, "all original cell identities and their order survive lazy slicing");
      assert.equal(new Set(actual).size, actual.length);
      assert.equal(actual.length, planned); assert.equal(runner.snapshot!.summary.configured, planned);
      assert.equal(runner.snapshot!.summary.doneChunks, runner.snapshot!.summary.totalChunks);
      assert.equal(runner.snapshot!.summary.donePairs, pairs.length);
      assert.equal(runner.snapshot!.summary.evaluated, 0); assert.equal(runner.snapshot!.summary.passed, 0);
      assert.equal(runner.snapshot!.rows.reduce((n, row) => n + row.notEvaluated["metadata-only"], 0), planned);
      for (const message of messages) assert.ok(cellsOf(message).length <= 32, "no message exceeds the existing worker cell cap");
    } finally { runner.cancel("test"); }
  }
});

test("plan replacement preserves foreground yielding and discards canceled source replies without reusing old chunks", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let foreground = true;
  let release!: (reply: BaseConfigChunkReply) => void;
  const messages: BaseConfigChunkMessage[] = [];
  const runner = runnerOf({ foreground: () => foreground, run: async (m) => {
    messages.push(m);
    if (messages.length === 1) return new Promise((resolve) => { release = resolve; });
    return replyOf(m);
  } });
  try {
    runner.request(jobOf()); t.mock.timers.tick(25); await Promise.resolve();
    assert.equal(messages.length, 0, "foreground keeps all count chunks queued");
    foreground = false; t.mock.timers.tick(250); await Promise.resolve();
    assert.equal(messages.length, 1);
    const latest = jobOf({ key: "new-source", settingsAt: 2, pairs: ["revert|latest@m5"], protects: protects.slice(0, 1), dcaOpt: undefined, kinds: ["normal"] });
    runner.request(latest); release(replyOf(messages[0])); await Promise.resolve(); await Promise.resolve();
    assert.equal(runner.snapshot!.summary.doneChunks, 0, "an old source reply cannot publish against a replacement plan");
    await drain(t, runner);
    assert.equal(runner.snapshot!.summary.key, latest.key); assert.equal(runner.snapshot!.summary.configured, 1);
    assert.deepEqual(messages[1].seen, []); assert.equal(messages[1].pair, latest.pairs[0]);
    runner.request(jobOf({ ...latest, key: "canceled" })); runner.cancel("stopped");
    t.mock.timers.tick(1000); await Promise.resolve();
    assert.equal(messages.length, 2, "canceling a new plan prevents dispatch");
    assert.equal(runner.snapshot!.summary.state, "cancelled");
  } finally { runner.cancel("test"); }
});
