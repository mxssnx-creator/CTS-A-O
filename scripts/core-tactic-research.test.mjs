import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { syntheticCandles, barsFromCandles } from "../src/core/market/bars.ts";
import { comboSignal, entrySignal } from "../src/core/bots/bots.ts";
import { DEFAULT_TACTICS } from "../src/core/config.ts";
import { tacticCooldown } from "../src/core/indications/filters.ts";
import { indicationState } from "../src/core/indications/registry.ts";
import { tacticSnapshot } from "../src/core/indications/tactic.ts";
import { bothSides, simulate } from "../src/core/sim/backtest.ts";
import { profitFactor } from "../src/core/metrics/stats.ts";
import { COST, LANES, SCREEN, cacheFor, maskEntries, protectGrid, renderMarkdown, researchGroups, researchMode, researchSignal, runResearch, selectIS, sha256, summarize, validateMarket } from "./core-tactic-research.mjs";

const MIN = 60_000;
const START = Math.floor(1_790_000_000_000 / (30 * MIN)) * 30 * MIN;
const candles = (n, sym = "TEST-USDT") => syntheticCandles(sym, 1, n, START + (n - 1) * MIN, 53);
const sample = (r, i = 0) => ({ cfg: "fixture", sym: "TEST-USDT", side: 1, r, entryT: START + i * MIN, exitT: START + (i + 1) * MIN });
const row = (configId, returns) => ({ configId, closed: summarize(returns.map(sample), START + 40 * MIN), withOpenMarks: summarize(returns.map(sample), START + 40 * MIN) });

describe("bounded Tactic held-out protocol", () => {
  it("counts every technique/range/unique lane and the disclosed 24 protect cells", () => {
    assert.equal(researchGroups().length, 70);
    assert.equal(new Set(researchGroups().map((g) => g.id)).size, 70);
    assert.equal(LANES.length, 7);
    for (const { tf } of LANES) {
      const grid = protectGrid(tf);
      assert.equal(grid.length, 24);
      assert.equal(new Set(grid.map((p) => p.id)).size, 24);
      assert.deepEqual([...new Set(grid.map((p) => p.hold * tf))], [120, 480]);
    }
    assert.equal(70 * protectGrid(1).length, 1680);
    assert.equal(SCREEN.minPf, 1.1, "operator-directed threshold is frozen before OOS");
  });

  it("records default entry filters/exemptions/cooldown separately from raw onset diagnostics", () => {
    const normal = researchMode(), raw = researchMode("raw");
    assert.deepEqual(normal.tactics, DEFAULT_TACTICS);
    assert.equal(normal.cooldownBars, tacticCooldown(DEFAULT_TACTICS));
    assert.equal(raw.tactics, null);
    assert.equal(raw.cooldownBars, 0);
    const k = cacheFor("TEST-USDT", candles(3000), 1);
    for (const g of researchGroups().filter((g) => g.tf === 1 && !g.combined)) {
      assert.deepEqual(researchSignal(g, k, normal), entrySignal("follow", g.id, k, DEFAULT_TACTICS));
      assert.deepEqual(researchSignal(g, k, raw), comboSignal("follow", g.id, k));
      assert.equal(raw.effectiveFilterKeys[g.id], "");
      assert.ok(normal.effectiveFilterKeys[g.id].includes("volHi"));
      assert.equal(normal.effectiveFilterKeys[g.id].includes("adx20"), !["mean-reversion", "adaptive"].includes(g.technique));
    }
  });

  it("keeps return PF 1.36 independent of unequal-size cash PF 0.20 and exposes no-loss convention", () => {
    const x = summarize([sample(.0136), sample(-.01, 1)], START + 3 * MIN);
    assert.ok(Math.abs(x.pf - 1.36) < 1e-12);
    assert.equal(x.pf, profitFactor(x.returnGp, x.returnGl));
    const cashPf = (.0136 * (.002 / .0136)) / .01;
    assert.ok(Math.abs(cashPf - .20) < 1e-12);
    const noLoss = summarize([sample(.02)], START + 3 * MIN);
    assert.equal(noLoss.pf, profitFactor(.02, 0));
    assert.equal(noLoss.noLoss, true);
    assert.equal(noLoss.exactRatio, null);
    assert.match(noLoss.pfConvention, /sentinel 4/);
    assert.equal(summarize([], START).pf, 0);
  });

  it("selects only IS-qualifying cells before diagnostic cells and has deterministic ties", () => {
    const screen = { minClosed: 2, minPf: 1.05 };
    const qualified = row("z-qualified", [.04, -.01]);
    const lowSample = row("a-small", [.9]);
    assert.equal(selectIS([lowSample, qualified], screen).configId, "z-qualified");
    const a = row("a-tie", [.04, -.01]), b = row("b-tie", [.04, -.01]);
    assert.equal(selectIS([b, a], screen).configId, "a-tie");
    assert.equal(selectIS([row("diagnostic", [-.01])], screen).isQualified, false);
  });

  it("rejects gaps, duplicates, unequal source bounds and invalid candles", () => {
    const cs = candles(100);
    assert.equal(validateMarket({ A: cs }).gaps, 0);
    assert.throws(() => validateMarket({ A: [...cs.slice(0, 10), ...cs.slice(11)] }), /gap/);
    assert.throws(() => validateMarket({ A: [cs[0], ...cs] }), /duplicate/);
    assert.throws(() => validateMarket({ A: cs, B: cs.slice(1) }), /unequal/);
    assert.throws(() => validateMarket({ A: [{ ...cs[0], v: -1 }, ...cs.slice(1)] }), /invalid/);
  });

  it("uses next-open OOS entry boundaries, closed endpoint bounds and the shared net cost", () => {
    const cs = Array.from({ length: 8 }, (_, i) => ({ t: START + i * MIN, o: 100, c: 100, h: 100, l: 100, v: 1 }));
    cs[3].h = 102;
    const b = barsFromCandles("TEST-USDT", 1, cs);
    const s = Int8Array.from([1, 0, 1, 0, 0, 0, 0, 0]);
    const masked = maskEntries(s, b, START + 3 * MIN);
    assert.equal(masked[0], 0);
    assert.equal(masked[2], 1, "closed bar before split may enter exactly on split");
    const sims = bothSides(masked, (x) => simulate("boundary", b, x, { tp: .01, sl: .01, trail: 0, hold: 20 }, { cost: COST }));
    const ts = sims.flatMap((x) => x.trades);
    assert.equal(ts.length, 1);
    assert.equal(ts[0].entryT, START + 3 * MIN);
    assert.equal(ts[0].exitT, START + 4 * MIN);
    assert.ok(Math.abs(ts[0].r - (.01 - COST)) < 1e-12);
    const open = simulate("mark", b, masked, { tp: .5, sl: .5, trail: 0, hold: 20 }, { cost: COST });
    assert.equal(open.trades.length, 0);
    assert.ok(Math.abs(open.open.mtm + COST) < 1e-12, "unclosed endpoint mark deducts roundtrip cost");
  });

  it("all70 state/signal prefixes and context snapshots survive poisoned future bars; 30m combined deduplicates", () => {
    const cs = candles(7200), cut = 4800;
    const poison = cs.map((c, i) => i < cut ? c : { ...c, o: c.o * 10, h: c.h * 10, l: c.l * 10, c: c.c * 10, v: c.v * 50 });
    let onsets = 0, snapshots = 0;
    for (const group of researchGroups()) {
      const prefix = cacheFor("TEST-USDT", cs.slice(0, cut), group.tf);
      const full = cacheFor("TEST-USDT", poison, group.tf);
      const n = prefix.b.n;
      assert.deepEqual(indicationState(group.id, full).slice(0, n), indicationState(group.id, prefix), group.id);
      const sig = comboSignal("follow", group.id, prefix);
      assert.deepEqual(comboSignal("follow", group.id, full).slice(0, n), sig, group.id);
      assert.deepEqual(researchSignal(group, full, researchMode()).slice(0, n), researchSignal(group, prefix, researchMode()), `${group.id} default filters`);
      onsets += sig.reduce((sum, s) => sum + Number(s !== 0), 0);
      assert.deepEqual(tacticSnapshot(full, group.range, n - 1), tacticSnapshot(prefix, group.range, n - 1), group.id);
      snapshots++;
      if (group.tf === 30) assert.deepEqual(indicationState(`${group.id}c`, full), indicationState(group.id, full));
    }
    assert.equal(snapshots, 70);
    assert.ok(onsets > 100, "causal checks contain actual signals");
  });

  it("physically isolates IS selection from poisoned OOS and repeats deterministically with explicit open/closed counts", () => {
    const cs = candles(3600), splitT = START + 1800 * MIN;
    const groups = researchGroups().filter((g) => g.tf === 1 && !g.combined && ["trend", "mean-reversion"].includes(g.technique));
    const opts = { splitT, groups, grid: (tf) => protectGrid(tf).slice(0, 2), screen: { minClosed: 5, minPf: 1.05 } };
    for (const mode of ["default", "raw"]) {
    const a = runResearch({ "TEST-USDT": cs }, { ...opts, mode });
    const b = runResearch({ "TEST-USDT": cs }, { ...opts, mode });
    assert.equal(sha256(JSON.stringify(a)), sha256(JSON.stringify(b)));
    assert.ok(a.all70DiagnosticPool.closed.n > 0);
    const poison = cs.map((c) => c.t < splitT ? c : { ...c, o: c.o * 3, h: c.h * 3, l: c.l * 3, c: c.c * 3, v: c.v * 20 });
    const changed = runResearch({ "TEST-USDT": poison }, { ...opts, mode });
    assert.deepEqual(a.selectedIds, changed.selectedIds);
    assert.deepEqual(a.isCandidates, changed.isCandidates);
    assert.equal(a.selectionHash, changed.selectionHash);
    for (const r of a.results) {
      assert.ok(r.is.closed.lastExitT === null || r.is.closed.lastExitT <= splitT);
      assert.ok(r.oos.closed.firstEntryT === null || r.oos.closed.firstEntryT >= splitT);
      assert.ok(r.oos.closed.lastExitT === null || r.oos.closed.lastExitT <= a.data.endT);
      assert.equal(r.oos.withOpenMarks.n, r.oos.closed.n + r.oos.openAtEnd);
      assert.match(r.oos.withOpenMarks.pfBasis, /endpoint-open-marks/);
      assert.equal(Object.values(r.oos.context.regime).reduce((n, s) => n + s.n, 0), r.oos.closed.n);
    }
    assert.equal(a.isQualifiedSelectedPool.closed.n, a.results.filter((r) => r.isQualified).reduce((n, r) => n + r.oos.closed.n, 0));
    assert.equal(a.protocol.mode.id, mode);
    assert.ok(a.selectedIds.every((id) => id.startsWith(`${mode}|`)));
    }
  });

  it("renders standalone raw provenance and exact mode/cache/split reproduction without claiming default parity", () => {
    const groups = researchGroups().slice(0, 1);
    const report = runResearch({ "TEST-USDT": candles(1200) }, { groups, grid: (tf) => protectGrid(tf).slice(0, 1), mode: "raw" });
    const md = renderMarkdown(report, "hash", { cache: "runs/custom/market-cache.json", out: "runs/custom/report.json", markdown: "docs/custom.md" });
    assert.match(md, /Raw onset diagnostic/);
    assert.match(md, /does not reproduce the default entry filters/);
    assert.doesNotMatch(md, /This reproduces the default entry filters/);
    assert.match(md, /--mode raw --cache runs\/custom\/market-cache.json --split/);
    assert.match(md, /--out runs\/custom\/report.json --markdown docs\/custom.md/);
  });
});
