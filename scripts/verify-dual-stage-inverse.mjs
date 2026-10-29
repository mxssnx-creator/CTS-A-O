#!/usr/bin/env node
// Independent scalar audit: no strategy, stage-policy, PF or position-count implementation imports.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createReadStream, readFileSync, existsSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
const dir = process.argv[2];
if (!dir) throw new Error("usage: verify-dual-stage-inverse.mjs STUDY_DIRECTORY");
const p = JSON.parse(readFileSync(`${dir}/protocol.json`)), reported = JSON.parse(readFileSync(`${dir}/results.json`));
const sha = (b) => createHash("sha256").update(b).digest("hex");
for (const [file, expected] of Object.entries(p.sourceSha256)) {
  const snapshot = `${dir}/source-snapshot/${file}`;
  assert.equal(sha(readFileSync(existsSync(snapshot) ? snapshot : file)), expected, `source changed: ${file}`);
}
const near = (a, b) => a === null || b === null ? assert.equal(a, b) :
  assert.ok(Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(a), Math.abs(b)), `${a} != ${b}`);
const pf = (gp, gl) => gl > 0 ? gp / gl : gp > 0 ? 4 : 0;
let windows = 0, prices = 0, contexts = 0;
const win = (trades, at, n) => {
  windows++;
  const last = trades.filter((t) => t.exitT < at).sort((a, b) => a.exitT - b.exitT || a.entryT - b.entryT).slice(-n);
  assert.ok(last.every((t) => Number.isFinite(t.r) && t.entryT <= t.exitT && t.exitT < at));
  const gp = last.reduce((a, t) => a + Math.max(0, t.r), 0), gl = last.reduce((a, t) => a + Math.max(0, -t.r), 0);
  return { n: last.length, pf: last.length < n ? null : pf(gp, gl), mean: last.length < n ? null : (gp - gl) / n,
    state: last.length < n ? "insufficient" : gp > gl && pf(gp, gl) >= p.minPf ? "qualified" : "failed", gp, gl };
};
const dual = (trades, at, n) => {
  const a = win(trades, at, 50), b = win(trades, at, n);
  return { state: a.state === "insufficient" || b.state === "insufficient" ? "insufficient"
    : a.state === "qualified" && b.state === "qualified" ? "qualified" : "failed", primary: a, secondary: [b] };
};
const compareGate = (actual, expected) => {
  assert.equal(actual.state, expected.state); assert.equal(actual.primary.n, expected.primary.n); near(actual.primary.pf, expected.primary.pf);
  assert.equal(actual.secondary.length, 1); assert.equal(actual.secondary[0].n, expected.secondary[0].n);
  near(actual.secondary[0].pf, expected.secondary[0].pf);
};
const negative = (trades, at) => {
  const a = win(trades, at, 50), b = win(trades, at, 5), c = win(trades, at, 10),
    mean = b.mean !== null && c.mean !== null ? (b.mean + c.mean) / 2 : null;
  return { primary: a, mean, state: a.state === "insufficient" || b.state === "insufficient" || c.state === "insufficient" ? "insufficient"
    : a.state === "qualified" && mean < 0 ? "qualified" : "failed" };
};
const orderRows = (result, ctx) => [...result.trades.map((t) => ({ ...t, closed: true })), ...(result.open ? [{ ...result.open,
  kind: ctx.kind, exitT: Infinity, closed: false }] : [])];
const entryTimes = (result, ctx) => new Set(orderRows(result, ctx).map((o) => o.entryT));
const policyKey = (n) => JSON.stringify([50, n, "static", [5, 10, 15, 20, 25]]);
const checkSet = (result, ctx, stage, side, parent, policy, variant = "direct") => {
  if (!p.setIdentityPolicy) return; // Earlier numerical-only experiments retain their explicitly older source.
  assert.equal(p.setIdentityPolicy, "upstream-admission-v1");
  const id = JSON.parse(result.setId), identity = JSON.parse(id[2]);
  assert.equal(id[0], stage); assert.equal(id[1], result.parentSetId);
  if (parent !== undefined) assert.equal(id[1], parent);
  assert.deepEqual(identity, [ctx.cfg, ctx.sym, side, ctx.kind, ctx.relation, p.economicRevision]);
  assert.equal(id[4], variant); near(id[5], p.minPf); assert.equal(id[6], policy); assert.equal(result.admissionPolicy, policy);
};
const emptyDecisions = () => ({ qualified: 0, failed: 0, insufficient: 0, unknown: 0, parentMissing: 0 });
const stageNames = ["main", "inverseMain", "real", "inverseReal", "active", "inverseActive"];
const aggregate = new Map();
for (const b of p.secondarySamples) for (const m of p.secondarySamples) aggregate.set(`${b}|${m}`, {
  historical: { base: 0, main: 0, inverseMain: 0, mainGp: 0, mainGl: 0, inverseGp: 0, inverseGl: 0, baseGp: 0, baseGl: 0 },
  decisions: Object.fromEntries(stageNames.map((s) => [s, emptyDecisions()])),
  stages: Object.fromEntries(stageNames.map((s) => [s, []])),
  readiness: { matchedMainEntries: 0, maxMainOwnClosedN: 0, mainFullPrimaryWindows: 0,
    matchedInverseEntries: 0, maxInverseOwnClosedN: 0, inverseFullPrimaryWindows: 0 },
});
const keys = new Set();
for await (const line of createInterface({ input: createReadStream(`${dir}/contexts.jsonl`), crlfDelay: Infinity })) {
  const c = JSON.parse(line), key = JSON.stringify([c.cfg, c.sym, c.side, c.tf, c.kind, c.relation]);
  assert.ok(!keys.has(key)); keys.add(key); contexts++;
  assert.ok(p.symbols.includes(c.sym) && p.tfs.includes(c.tf) && [1, -1].includes(c.side));
  const checkPrices = (r, side) => {
    const seen = new Set();
    for (const t of r.trades) {
      assert.equal(t.cfg, c.cfg); assert.equal(t.sym, c.sym); assert.equal(t.side, side);
      assert.ok(!seen.has(t.entryT)); seen.add(t.entryT);
      assert.ok(t.entryT >= p.from && t.exitT <= p.end && t.exitT >= t.entryT);
      assert.ok((t.exitT - t.entryT) / 60_000 <= p.holdMinutes);
      near(t.r, side * (t.exit - t.entry) / t.entry - p.cost); prices++;
    }
    if (r.open) { assert.equal(r.open.cfg, c.cfg); assert.equal(r.open.sym, c.sym); assert.equal(r.open.side, side); }
  };
  checkPrices(c.raw, c.side);
  for (const b of p.secondarySamples) {
    const base = c.bases[b], parents = entryTimes(base.main, c), inverseParents = entryTimes(base.inverseMain, c);
    checkSet(base.main, c, "main", c.side, undefined, policyKey(b));
    if (p.setIdentityPolicy) {
      const root = JSON.parse(base.main.parentSetId);
      assert.equal(root[0], "base"); assert.equal(root[1], null); assert.equal(root[6], policyKey(b));
      assert.deepEqual(JSON.parse(root[2]), [c.cfg, c.sym, c.side, c.kind, c.relation, p.economicRevision]);
    }
    checkSet(base.inverseMain, c, "main", -c.side, base.main.setId, JSON.stringify([50, true, [5, 10]]), "inverse");
    checkPrices(base.main, c.side); checkPrices(base.inverseMain, -c.side);
    for (const t of orderRows(base.main, c)) assert.equal(dual(c.raw.trades, t.entryT, b).state, "qualified");
    for (const t of orderRows(base.inverseMain, c)) { assert.ok(parents.has(t.entryT)); assert.equal(negative(base.main.trades, t.entryT).state, "qualified"); }
    for (const d of base.mainDecisions) { assert.ok(d.entryT >= p.start); compareGate(d, dual(c.raw.trades, d.entryT, b)); }
    for (const d of base.inverseDecisions) {
      assert.ok(d.entryT >= p.start);
      if (!parents.has(d.entryT)) assert.equal(d.state, "parentMissing");
      else { const e = negative(base.main.trades, d.entryT); assert.equal(d.state, e.state); near(d.primaryPf, e.primary.pf); near(d.mean, e.mean); }
    }
    for (const m of p.secondarySamples) {
      const data = base.cases[m], a = aggregate.get(`${b}|${m}`), checkpoint = {
        base: dual(c.raw.trades, p.start, b), main: dual(base.main.trades, p.start, m), inverseMain: dual(base.inverseMain.trades, p.start, m) };
      for (const name of ["base", "main", "inverseMain"]) compareGate(data.checkpoint[name], checkpoint[name]);
      if (checkpoint.base.state === "qualified") {
        a.historical.base++; a.historical.baseGp += checkpoint.base.primary.gp; a.historical.baseGl += checkpoint.base.primary.gl;
        for (const name of ["main", "inverseMain"]) if (checkpoint[name].state === "qualified") {
          a.historical[name]++;
          a.historical[name === "main" ? "mainGp" : "inverseGp"] += checkpoint[name].primary.gp;
          a.historical[name === "main" ? "mainGl" : "inverseGl"] += checkpoint[name].primary.gl;
        }
      }
      for (const [name, source, parent, side] of [["real", base.main, parents, c.side], ["inverseReal", base.inverseMain, inverseParents, -c.side]]) {
        const result = data[name]; checkPrices(result, side);
        checkSet(result, c, "real", side, source.setId, policyKey(m), name === "real" ? "direct" : "inverse");
        for (const t of orderRows(result, c)) { assert.ok(parent.has(t.entryT)); assert.equal(dual(source.trades, t.entryT, m).state, "qualified"); }
        for (const d of data.decisions[name]) {
          if (!parent.has(d.entryT)) assert.equal(d.state, "parentMissing");
          else {
            const expected = dual(source.trades, d.entryT, m); compareGate(d, expected);
            if (name === "real") {
              a.readiness.matchedMainEntries++;
              a.readiness.maxMainOwnClosedN = Math.max(a.readiness.maxMainOwnClosedN, expected.primary.n);
              if (expected.primary.n === 50) a.readiness.mainFullPrimaryWindows++;
            } else {
              a.readiness.matchedInverseEntries++;
              a.readiness.maxInverseOwnClosedN = Math.max(a.readiness.maxInverseOwnClosedN, expected.primary.n);
              if (expected.primary.n === 50) a.readiness.inverseFullPrimaryWindows++;
            }
          }
        }
        const activeName = name === "real" ? "active" : "inverseActive", selected = data[activeName];
        checkSet(selected, c, "active", side, result.setId, JSON.stringify(15), name === "real" ? "direct" : "inverse");
        const expected = orderRows(result, c).filter((t) => win(result.trades, t.entryT, 15).state === "qualified");
        assert.deepEqual(orderRows(selected, c), expected, "Active mirrors exactly the final-qualified Real orders");
        for (const d of data.decisions[activeName]) {
          const w = win(result.trades, d.entryT, 15); assert.equal(d.state, w.state); assert.equal(d.n, w.n); near(d.pf, w.pf);
        }
      }
      const decisions = { main: base.mainDecisions, inverseMain: base.inverseDecisions, ...data.decisions };
      const results = { main: base.main, inverseMain: base.inverseMain, ...data };
      for (const name of stageNames) {
        for (const d of decisions[name]) { assert.ok(Object.hasOwn(a.decisions[name], d.state)); a.decisions[name][d.state]++; }
        a.stages[name].push(...orderRows(results[name], c).filter((t) => t.entryT >= p.start && t.entryT < p.end)
          .map((t) => ({ ...t, tf: c.tf, kind: c.kind })));
      }
    }
  }
  if (contexts % 1200 === 0) process.stderr.write(`independently audited ${contexts} contexts\n`);
}
assert.equal(contexts, reported.contextCount); assert.equal(contexts, 4800); assert.equal(reported.cases.length, 25);
function counts(orders) {
  const groups = new Map();
  for (const t of orders) { const k = `${t.sym}|${t.side}`, a = groups.get(k) ?? []; a.push(t); groups.set(k, a); }
  let openedPositions = 0, closedPositions = 0, openPositions = 0;
  for (const ts of groups.values()) {
    ts.sort((a, b) => a.entryT - b.entryT); let end = -Infinity, existed = false;
    for (const t of ts) {
      if (t.entryT >= end) { if (existed && Number.isFinite(end)) closedPositions++; openedPositions++; end = t.exitT; existed = true; }
      else end = Math.max(end, t.exitT);
    }
    if (existed && Number.isFinite(end)) closedPositions++; else if (existed) openPositions++;
  }
  return { openedPositions, closedPositions, openPositions, openedOrders: orders.length,
    settledOrders: orders.filter((o) => o.closed).length, openOrders: orders.filter((o) => !o.closed).length };
}
function compareStats(actual, orders) {
  const c = counts(orders); for (const [key, n] of Object.entries(c)) assert.equal(actual[key], n, key);
  const closed = orders.filter((o) => o.closed), gp = closed.reduce((a, t) => a + Math.max(0, t.r), 0), gl = closed.reduce((a, t) => a + Math.max(0, -t.r), 0);
  near(actual.grossProfit, gp); near(actual.grossLoss, gl); near(actual.returnPf, closed.length && gl ? gp / gl : null);
  assert.equal(actual.noLoss, closed.length > 0 && gp > 0 && gl === 0);
  const reasons = {}; for (const t of closed) reasons[t.reason] = (reasons[t.reason] ?? 0) + 1; assert.deepEqual(actual.reasons, reasons);
}
const historicalBase = [];
for (const c of reported.cases) {
  const a = aggregate.get(`${c.baseSecondaryN}|${c.mainSecondaryN}`), h = a.historical;
  for (const [k, value] of Object.entries(h)) if (Object.hasOwn(c.historical, k)) near(c.historical[k], value);
  near(c.historical.mainPercentOfBase, h.base ? 100 * h.main / h.base : null);
  near(c.historical.inverseMainPercentOfBase, h.base ? 100 * h.inverseMain / h.base : null);
  near(c.historical.mainPf, h.mainGl ? h.mainGp / h.mainGl : null); near(c.historical.inverseMainPf, h.inverseGl ? h.inverseGp / h.inverseGl : null);
  for (const name of stageNames) {
    const expected = a.decisions[name], d = c.decisions[name], total = Object.values(expected).reduce((a, n) => a + n, 0);
    for (const k of Object.keys(expected)) assert.equal(d[k], expected[k]); assert.equal(d.evaluated, total); near(d.percent, total ? 100 * d.qualified / total : null);
    compareStats(c.stages[name], a.stages[name]);
    for (const [key, g] of Object.entries(c.groups)) {
      const [kind, tf] = key.split("|"); compareStats(g[name], a.stages[name].filter((t) => t.kind === kind && t.tf === +tf));
    }
  }
  if (c.mainSecondaryN === 15) historicalBase.push({ secondaryN: c.baseSecondaryN, passed: h.base, evaluated: contexts,
    percent: 100 * h.base / contexts, historicalPrimaryPf: h.baseGl ? h.baseGp / h.baseGl : null });
}
const audit = { status: "pass", contexts, independentlyScoredWindows: windows, independentlyCheckedPriceReturns: prices,
  historicalBase, readiness: [...aggregate].map(([key, a]) => ({ case: key, ...a.readiness })),
  verifierSha256: sha(readFileSync(new URL(import.meta.url))), scope: p.scope };
writeFileSync(`${dir}/audit.json`, JSON.stringify(audit, null, 2) + "\n");
process.stdout.write(JSON.stringify(audit, null, 2) + "\n");
