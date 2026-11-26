import assert from "node:assert/strict";
import { test } from "node:test";
import { ProcessedReplay, ProcessedSummaryReplay, type ProcessedReplayPolicy } from "./processed-replay.ts";
import type { ProcessedOpen } from "./processed-set.ts";

const context = (i: number) => ({ id: `follow|config:${i}|[ind]`, ind: `indicator|${i % 3}`, kind: i % 2 ? "axis" : "normal" });
const drain = <T>(g: Generator<number, T>): T => { for (let r = g.next(); ; r = g.next()) if (r.done) return r.value; };

const scenarios: Array<[string, Partial<ProcessedReplayPolicy>]> = [
  ["ordinary", {}],
  ["negative windows", { negativeFilter: { windows: [1, 3], mode: "any", maxPf: 1 } }],
  ["signed blocks", { blocks: { validation: { long: 2, short: 0, minimal: 1,
    shortPolarity: "positive" as const, minimalPolarity: "negative" as const },
    real: { long: 2, short: 0, minimal: 1, shortPolarity: "positive" as const, minimalPolarity: "negative" as const } } }],
];
for (const [name, extra] of scenarios) {
  test(`summary-only ledger matches full ledger across chronological ${name} events`, () => {
    const policy: ProcessedReplayPolicy = { validationN: 3, realN: 3, reportDetail: "summary", ...extra };
    const full = new ProcessedReplay(policy, .0015), lean = new ProcessedSummaryReplay(policy, .0015);
    const pending: Array<{ full: ProcessedOpen; lean: ProcessedOpen; exit: number; r: number | null }> = [];
    let rng = 1234567;
    const random = (n: number) => (((rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0) >>> 8) % n);
    const identities = Array.from({ length: 5 }, (_, i) => ["X-USDT", "Y-USDT"].flatMap(sym =>
      ([1, -1] as const).map(side => ({ identity: full.identity(context(i), sym, side, 1.1), minPf: 1.1 })))).flat();
    identities.push({ identity: { ...identities[0].identity, economicRevision: "foreign" }, minPf: 1.1 });
    for (let tick = 0; tick < 450; tick++) {
      const now = 1000 + tick * 10;
      pending.sort((a, b) => a.exit - b.exit);
      while (pending.length && pending[0].exit <= now) {
        const p = pending.shift()!;
        full.settle(p.full, p.exit, p.r);
        lean.settle(p.lean, p.exit, p.r);
      }
      const used = new Set<string>();
      for (let n = 0; n < 4; n++) {
        const i = random(5), sym = random(2) ? "X-USDT" : "Y-USDT", side = random(2) ? 1 : -1;
        const key = `${i}:${sym}:${side}`;
        if (used.has(key)) continue;
        used.add(key);
        assert.deepEqual(lean.preview(context(i), sym, side, now, 1.1), full.preview(context(i), sym, side, now, 1.1));
        const a = full.enter(context(i), sym, side, now, 1.1), b = lean.enter(context(i), sym, side, now, 1.1);
        assert.deepEqual([b.stage, b.validation, b.real], [a.stage, a.validation, a.real]);
        const r = [0.02, -0.01, 0, null, 0.015][random(5)];
        // A close can share a later entry's timestamp; it must not be counted by that entry.
        pending.push({ full: a, lean: b, exit: now + 10 * (1 + random(8)), r });
        assert.throws(() => lean.enter(context(i), sym, side, now, 1.1), /duplicate/);
        assert.throws(() => full.enter(context(i), sym, side, now, 1.1), /duplicate/);
      }
      if (tick % 37 === 0) assert.deepEqual(drain(lean.reportGen(now, identities, "summary")),
        drain(full.reportGen(now, identities, "summary")));
    }
    pending.sort((a, b) => a.exit - b.exit);
    for (const p of pending) { full.settle(p.full, p.exit, p.r); lean.settle(p.lean, p.exit, p.r); }
    assert.deepEqual(drain(lean.reportGen(10000, identities, "summary")), drain(full.reportGen(10000, identities, "summary")));
    assert.throws(() => drain(lean.reportGen(10000, identities, "full")), /no modeled checkpoint/);
  });
}

test("summary ledger keeps both prior and same-time close windows when many held orders settle together", () => {
  const policy: ProcessedReplayPolicy = { validationN: 3, realN: 3, reportDetail: "summary" };
  const full = new ProcessedReplay(policy, .0015), lean = new ProcessedSummaryReplay(policy, .0015);
  const tp = context(0), held: Array<{ full: ProcessedOpen; lean: ProcessedOpen }> = [];
  for (let i = 0; i < 3; i++) {
    const at = 100 + i * 2;
    const a = full.enter(tp, "X-USDT", 1, at, 1.1), b = lean.enter(tp, "X-USDT", 1, at, 1.1);
    full.settle(a, at + 1, .02); lean.settle(b, at + 1, .02);
  }
  for (let i = 0; i < 8; i++) {
    const at = 200 + i;
    held.push({ full: full.enter(tp, "X-USDT", 1, at, 1.1), lean: lean.enter(tp, "X-USDT", 1, at, 1.1) });
  }
  for (const item of held) { full.settle(item.full, 1000, -.02); lean.settle(item.lean, 1000, -.02); }
  assert.deepEqual(lean.preview(tp, "X-USDT", 1, 1000, 1.1), full.preview(tp, "X-USDT", 1, 1000, 1.1));
  assert.equal(lean.preview(tp, "X-USDT", 1, 1000, 1.1).validation.state, "qualified");
  assert.deepEqual(lean.preview(tp, "X-USDT", 1, 1001, 1.1), full.preview(tp, "X-USDT", 1, 1001, 1.1));
  assert.equal(lean.preview(tp, "X-USDT", 1, 1001, 1.1).validation.state, "failed");
});

test("shared context slots never share histories across configs or policy identities", () => {
  const policy: ProcessedReplayPolicy = { validationN: 2, realN: 2, reportDetail: "summary" };
  const full = new ProcessedReplay(policy, .0015), lean = new ProcessedSummaryReplay(policy, .0015);
  const tp = { id: 'config|["one"]', ind: 'indicator|["one"]', kind: "normal" };
  const symbol = 'X|["USDT"]';
  for (let i = 0; i < 2; i++) {
    const a = full.enter(tp, symbol, 1, 10 + i * 2, 1.1), b = lean.enter(tp, symbol, 1, 10 + i * 2, 1.1);
    full.settle(a, 11 + i * 2, .02); lean.settle(b, 11 + i * 2, .02);
  }
  const cases: Array<[typeof tp, string, 1 | -1, number, string]> = [
    [tp, symbol, 1, 1.1, "qualified"],
    [{ ...tp, id: "different" }, symbol, 1, 1.1, "insufficient"],
    [{ ...tp, ind: "different" }, symbol, 1, 1.1, "insufficient"],
    [{ ...tp, kind: "axis" }, symbol, 1, 1.1, "insufficient"],
    [tp, "different", 1, 1.1, "insufficient"],
    [tp, symbol, -1, 1.1, "insufficient"],
    [tp, symbol, 1, 1.2, "insufficient"],
  ];
  for (const [config, sym, side, floor, expected] of cases) {
    const actual = lean.preview(config, sym, side, 20, floor);
    assert.deepEqual(actual, full.preview(config, sym, side, 20, floor));
    assert.equal(actual.validation.state, expected);
  }
  let at = 30;
  for (const [config, sym, side, floor] of cases.slice(1)) {
    for (let i = 0; i < 2; i++, at += 2) {
      const a = full.enter(config, sym, side, at, floor), b = lean.enter(config, sym, side, at, floor);
      assert.deepEqual([b.stage, b.validation, b.real], [a.stage, a.validation, a.real]);
      full.settle(a, at + 1, .02); lean.settle(b, at + 1, .02);
    }
  }
  for (const [config, sym, side, floor] of cases) {
    const actual = lean.preview(config, sym, side, at, floor);
    assert.deepEqual(actual, full.preview(config, sym, side, at, floor));
    assert.equal(actual.validation.state, "qualified");
  }
});
