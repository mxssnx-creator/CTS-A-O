import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_STAGE_CHAIN, checkStageChainSettings, checkDualStagePolicy, dualStageGate,
  mergeStageSettings, negativeMainTrigger, shortWindowLimit, type StageObservation } from "./stage-policy.ts";
import { StageChainBook } from "./stage-chain.ts";

const rows = (rs: Array<number | null>): StageObservation[] => rs.map((unitReturn, i) =>
  ({ orderId: `o-${i}`, entryT: i * 2, exitT: i * 2 + 1, knownT: i * 2 + 1, unitReturn }));

test("both Base and Main enforce the50% long/short ceiling, including auto and multiple choices", () => {
  for (const stage of ["base", "main"] as const) for (const long of [20, 30, 40, 50]) {
    const p = { ...structuredClone(DEFAULT_STAGE_CHAIN[stage]), primaryN: long, secondaryN: long / 2 };
    assert.equal(shortWindowLimit(p), long / 2); checkDualStagePolicy(p);
    assert.throws(() => checkDualStagePolicy({ ...p, secondaryN: long / 2 + 1 }), /cannot exceed|invalid long\/short/);
    assert.throws(() => checkDualStagePolicy({ ...p, maxShortRatio: .51 }), /at most50%/);
    assert.throws(() => checkDualStagePolicy({ ...p, secondaryMode: "multiple", secondaryWindows: [1, long / 2 + 1] }));
    const auto = dualStageGate(rows(Array(50).fill(.01)), { ...p, secondaryMode: "auto" }, 1.1, 101,
      new Map([[25, rows(Array(50).fill(.05))]]));
    assert.ok(auto.secondary.every((w) => w.requestedN <= long / 2), "an optimizer cannot bypass the ceiling");
  }
  for (const realN of [1, 5, 15, 25]) checkStageChainSettings({ ...structuredClone(DEFAULT_STAGE_CHAIN), realN });
});

test("minimal1/2/3 checks the declared sign of its own closed net results without relabeling negative PF", () => {
  const source = rows([...Array(47).fill(.02), -.001, -.002, -.003]);
  for (const n of [1, 2, 3]) {
    const p = { ...structuredClone(DEFAULT_STAGE_CHAIN.base), minimal: { enabled: true, n, polarity: "negative" as const } };
    const negative = dualStageGate(source, p, 1.1, 101);
    assert.equal(negative.state, "qualified"); assert.equal(negative.minimal!.criterion, "net-sign");
    assert.equal(negative.minimal!.pf, 0, "negative evidence is not reported as a positive PF");
    assert.equal(negative.minimal!.n, n); assert.ok(negative.minimal!.mean! < 0);
    assert.equal(negative.primary.state, "qualified"); assert.equal(negative.secondary[0].state, "qualified");
    assert.equal(dualStageGate(source, { ...p, minimal: { ...p.minimal, polarity: "positive" } }, 1.1, 101).state, "failed");
    const future = source.map((x) => ({ ...x })); future[49].knownT = 110;
    assert.ok(dualStageGate(future, p, 1.1, 101).minimal!.rows.every((x) => x.knownT < 101));
  }
  const p = { ...structuredClone(DEFAULT_STAGE_CHAIN.base), minimal: { enabled: true, n: 1, polarity: "positive" as const } };
  assert.equal(dualStageGate(rows([...Array(49).fill(.02), 0]), p, 1.1, 101).state, "failed", "flat is neither sign");
  assert.equal(dualStageGate(rows([...Array(49).fill(.02), null]), p, 1.1, 101).state, "unknown");
});

test("all84 eligible Base long/short/minimal policies have independent set identities and histories", () => {
  const ids = new Set<string>(); let variants = 0;
  for (const long of [20, 30, 40, 50]) for (const short of [5, 10, 15, 20, 25]) {
    if (short > long / 2) continue;
    for (const n of [1, 2, 3]) for (const polarity of ["positive", "negative"] as const) {
      const s = mergeStageSettings(DEFAULT_STAGE_CHAIN, { base: { primaryN: long, secondaryN: short,
        minimal: { enabled: true, n, polarity } } });
      const book = new StageChainBook("model", s), base = book.base({ baseConfigId: "cfg-a", symbol: "A", side: 1,
        kind: "normal", lane: "m1", economicRevision: "source-v1" }, 1.1), main = book.main(base.id, "main");
      assert.equal(book.gate(base.id, 0).state, "insufficient");
      assert.ok(!ids.has(main.id)); ids.add(main.id); variants++;
      for (let i = 0; i < long; i++) {
        book.enter(base.id, `o-${i}`, `p-${i}`, 2 * i);
        book.close(base.id, `o-${i}`, 2 * i, "final", 2 * i + 1, i >= long - 3 ? -.001 : .02, true);
      }
      const result = book.enter(main.id, "new", "new-position", 2 * long);
      assert.equal(result.ok, polarity === "negative");
      assert.equal(book.gate(main.id, 2 * long).state, "insufficient", "its raw Base wins do not become Main results");
      assert.deepEqual(StageChainBook.restore(book.snapshot()).summaries(), book.summaries());
    }
  }
  assert.equal(variants, 84);
});

test("Main negative1/2/5/10 tails are independent inverse triggers and retain unknown observations", () => {
  for (const n of [1, 2, 5, 10]) {
    const s = mergeStageSettings(DEFAULT_STAGE_CHAIN, { negativeMain: { windows: [n] } });
    const sample = rows([...Array(40).fill(.02), ...Array(10).fill(-.001)]);
    assert.equal(negativeMainTrigger(sample, s, 1.1, 101).qualified, true);
    sample[49].unitReturn = null;
    assert.equal(negativeMainTrigger(sample, s, 1.1, 101).qualified, false);
  }
  const mixed = rows([...Array(40).fill(.05), ...Array(5).fill(-.02), ...Array(5).fill(.001)]);
  assert.equal(negativeMainTrigger(mixed, mergeStageSettings(DEFAULT_STAGE_CHAIN,
    { negativeMain: { combination: "mean" } }), 1.1, 101).qualified, true);
  assert.equal(negativeMainTrigger(mixed, mergeStageSettings(DEFAULT_STAGE_CHAIN,
    { negativeMain: { combination: "all" } }), 1.1, 101).qualified, false, "AND requires every selected tail to be negative");
});

test("partial settings patches preserve the independent Main policy and cloned signed-minimal controls", () => {
  const next = mergeStageSettings(DEFAULT_STAGE_CHAIN, { base: { minimal: { n: 3, polarity: "negative" } } });
  assert.equal(next.base.minimal!.n, 3); assert.equal(next.base.minimal!.enabled, false);
  assert.deepEqual(next.main, DEFAULT_STAGE_CHAIN.main);
  next.base.secondaryWindows.push(2); next.negativeMain.windows.push(1);
  assert.ok(!DEFAULT_STAGE_CHAIN.base.secondaryWindows.includes(2));
  assert.deepEqual(DEFAULT_STAGE_CHAIN.negativeMain.windows, [5, 10]);
});
