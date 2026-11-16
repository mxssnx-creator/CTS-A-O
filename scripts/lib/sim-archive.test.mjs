import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { archiveRecord, archiveSession, compareRecords, renderComparison, summarize } from "./sim-archive.mjs";

const report = (over = {}) => ({
  at: 1, symbols: ["A-USDT", "B-USDT"], window: { startT: 3_600_000, endT: 7_200_000 },
  settings: { preH: 12, runH: 12, tactics: "all", leverage: 10, focus: Array.from({ length: 2545 }, (_, i) => `f${i}`) },
  total: { orders: 10, positions: 4, pf: 2, net: 0.5, wr: 0.7, balanceEnd: 10.5 },
  strategies: { Normal: { n: 6, pf: 1.5, net: 0.2, wr: 0.6, wins: 4, losses: 2, ddtH: 1 }, Axis: { n: 4, pf: 3, net: 0.3 } },
  lanes: { "5m": { n: 10, pf: 2, net: 0.5 } },
  hours: [{ t: 0, orders: 5, pf: 2, net: 0.3, eqEnd: 10.3 }, { t: 1, orders: 5, pf: 2, net: 0.2, eqEnd: 10.5 }],
  engine: { computeMs: 1000, basePassed: 5, tapes: 100, real: 3 },
  checks: [{ ok: true }, { ok: true }],
  ...over,
});

test("a record keeps the comparable numbers and shortens long lists", () => {
  const r = summarize(report(), { label: "x", commit: "abc" });
  assert.equal(r.total.pf, 2);
  assert.deepEqual(r.settings.focus, { length: 2545 });
  assert.equal(r.settings.tactics, "all");
  assert.equal(r.hours.length, 2);
  assert.deepEqual(r.checks, { ok: 2, n: 2 });
  assert.throws(() => summarize({}), /not a session report/);
});

test("a result compared with itself differs nowhere", () => {
  const c = compareRecords(report(), report());
  assert.ok(Object.values(c.total).every((x) => x.d === 0 || x.d === null));
  assert.deepEqual(c.settings, []);
  assert.ok(c.hours.every((h) => h.net.d === 0));
});

test("changed settings, results and hours are reported with their direction", () => {
  const b = report({
    settings: { preH: 12, runH: 12, tactics: "off", leverage: 10, focus: Array.from({ length: 2545 }, (_, i) => `f${i}`) },
    total: { orders: 14, positions: 4, pf: 1.5, net: 0.2, wr: 0.7, balanceEnd: 10.2 },
    strategies: { Normal: { n: 6, pf: 1.5, net: 0.2 }, Dca: { n: 8, pf: 1.1, net: 0.01 } },
    hours: [{ t: 0, orders: 5, pf: 2, net: 0.3, eqEnd: 10.3 }],
  });
  const c = compareRecords(report(), b);
  assert.equal(c.total.orders.d, 4);
  assert.equal(c.total.pf.d, -0.5);
  assert.deepEqual(c.settings, [{ key: "tactics", a: '"all"', b: '"off"' }]);
  assert.equal(c.strategies.Axis.n.b, undefined, "a strategy missing from B shows no B value");
  assert.equal(c.strategies.Dca.n.a, undefined, "a strategy new in B shows no A value");
  assert.equal(c.hours[1].net.b, undefined, "B has one hour fewer");
  const text = renderComparison(c);
  assert.match(text, /\| orders \| 10 \| 14 \| \+4 \|/);
  assert.match(text, /`tactics`/);
});

test("a non-numeric PF such as no loss is shown, never subtracted", () => {
  const c = compareRecords(report({ total: { orders: 3, positions: 1, pf: "no loss", net: 1 } }), report());
  assert.equal(c.total.pf.d, null);
  assert.match(renderComparison(c), /\| pf \| no loss \| 2 \| – \|/);
});

test("archiving writes one file and one index row, and is idempotent for identical content", () => {
  const dir = mkdtempSync(join(tmpdir(), "sim-archive-"));
  const r = summarize(report(), { label: "My Run!", savedAt: "2026-11-16T00:00:00Z" });
  const f1 = archiveRecord(r, dir), f2 = archiveRecord(r, dir);
  assert.equal(f1, f2);
  assert.deepEqual(readdirSync(dir).sort(), ["index.json", f1.split("/").pop()].sort());
  const index = JSON.parse(readFileSync(join(dir, "index.json"), "utf8"));
  assert.equal(index.length, 1);
  assert.equal(index[0].orders, 10);
  assert.match(f1, /my-run/);
  const other = archiveSession(report({ total: { orders: 11, positions: 4, pf: 2, net: 0.5 } }), { label: "My Run!", dir });
  assert.notEqual(other, f1, "a different result is a different record");
  assert.equal(JSON.parse(readFileSync(join(dir, "index.json"), "utf8")).length, 2);
});
