import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { syntheticCandles, barsFromCandles, resample } from "../src/core/market/bars.ts";
import { SeriesCache } from "../src/core/indications/cache.ts";
import { indicationState } from "../src/core/indications/registry.ts";
import { entrySignal } from "../src/core/bots/bots.ts";
import { sideSignal, simulate } from "../src/core/sim/backtest.ts";
import { buildTapes, filterEntries } from "../src/core/sim/walkforward.ts";
import { makeUniverse } from "../src/core/pipeline/pipeline.ts";
import { DEFAULT_TACTICS } from "../src/core/config.ts";
import { tacticCooldown } from "../src/core/indications/filters.ts";
import { maskEntries } from "./core-tactic-research.mjs";
import {
  researchCells,
  validateProtocolMarket,
  freezeIS,
  qualifiesIS,
  summary,
  runIS,
  runResearch,
  sha256,
  renderMarkdown,
} from "./core-signal-research.mjs";

const protocol = JSON.parse(
  readFileSync(new URL("../docs/signal-research-protocol-20261016.json", import.meta.url)),
);
const MIN = 60_000;
const START = Math.floor(1_790_000_000_000 / (30 * MIN)) * 30 * MIN;
const candles = (n = 4800) =>
  syntheticCandles("FIXTURE-USDT", 1, n, START + (n - 1) * MIN, 53).map((c) => ({
    ...c,
    h: Math.max(c.h, c.o * 1.004),
    l: Math.min(c.l, c.o * 0.996),
  }));
const fixture = () => {
  const cs = candles();
  const p = structuredClone(protocol);
  p.data = {
    ...p.data,
    symbols: ["FIXTURE-USDT"],
    startT: START,
    isStartT: START + 300 * MIN,
    splitT: START + 3000 * MIN,
    endT: START + cs.length * MIN,
  };
  const group = researchCells(p).filter(
    (c) => c.source === "r-laguerre" && c.range === "short" && c.tf === 1,
  );
  const selected = ["normal", "trailing", "trailing-only"].flatMap((kind) => {
    const first = group.find((c) => c.kind === kind);
    return group.filter((c) => c.cfg === first.cfg);
  });
  return { market: { "FIXTURE-USDT": cs }, p, cells: selected };
};
const totals = (returns) => {
  const gp = returns.filter((r) => r > 0).reduce((a, r) => a + r, 0);
  const gl = returns.filter((r) => r < 0).reduce((a, r) => a - r, 0);
  return summary({
    n: returns.length,
    wins: returns.filter((r) => r > 0).length,
    losses: returns.filter((r) => r < 0).length,
    zero: returns.filter((r) => r === 0).length,
    gp,
    gl,
    firstEntryT: null,
    lastEntryT: null,
    firstExitT: null,
    lastExitT: null,
  });
};

describe("four-source frozen independent Signal research", () => {
  it("uses the runtime Signal grid after lane trail floors, including target0 sets", () => {
    const cells = researchCells(protocol);
    assert.equal(
      cells.reduce((n, c) => n + c.requestedAliases.length, 0),
      2320,
    );
    assert.equal(cells.length, 2320);
    assert.equal(new Set(cells.map((c) => c.cfg)).size, 1160);
    assert.equal(new Set(cells.map((c) => c.ind)).size, 32);
    const counts = Object.fromEntries(
      ["normal", "trailing", "trailing-only"].map((kind) => [
        kind,
        cells.filter((c) => c.kind === kind).length,
      ]),
    );
    assert.deepEqual(counts, { normal: 960, trailing: 928, "trailing-only": 432 });
    for (const c of cells.filter((c) => c.kind === "trailing-only")) {
      assert.equal(c.protect.tp, 0);
      assert.equal(c.protect.trailOnly, true);
      assert.ok(c.protect.sl > 0 && c.protect.trail > 0);
      assert.match(c.cfg, /\|to(?:\||$)/);
    }
    for (const c of cells) assert.equal(c.protect.hold * c.tf, 48 * 60);
    assert.ok(
      cells.every(
        (c) =>
          c.protect.trail === 0 ||
          c.protect.trail * (c.protect.trailStep ?? 1) + 1e-12 >=
            protocol.preOutcomeModelClarification.signalFloors.minTrail,
      ),
      "a trail below the lane-scaled minimum is disabled by the runtime, not widened into a new config",
    );
    assert.equal(cells.filter((c) => c.requestedAliases.length > 1).length, 0);
  });

  it("fails before scoring if frozen parameters, protects, cost, source universe or bars differ", () => {
    assert.throws(
      () => researchCells(JSON.parse(readFileSync(new URL("../docs/signal-research-protocol-20261015.json", import.meta.url)))),
      /superseded.*v2/,
    );
    for (const changed of [
      (p) => {
        p.candidates[0].short.g = 0.9;
      },
      (p) => {
        p.protects[0].sl = 0.01;
      },
      (p) => {
        p.model.roundTripCost = 0.001;
      },
    ]) {
      const p = structuredClone(protocol);
      changed(p);
      assert.throws(() => researchCells(p), /Frozen/);
    }
    const { market, p } = fixture();
    assert.equal(validateProtocolMarket(market, p).gaps, 0);
    assert.throws(() => validateProtocolMarket({ WRONG: market["FIXTURE-USDT"] }, p), /symbols/);
    assert.throws(
      () => validateProtocolMarket({ "FIXTURE-USDT": market["FIXTURE-USDT"].slice(1) }, p),
      /window/,
    );
    const missing = market["FIXTURE-USDT"].filter((_, i) => i !== 20);
    assert.throws(() => validateProtocolMarket({ "FIXTURE-USDT": missing }, p), /gap/);
  });

  it("keeps the exact return-PF threshold, sample floor, endpoint marks and every IS-qualified identity", () => {
    const pass = { id: "pass", closed: totals([1.1, -1]), withEndpointMarks: totals([1.1, -1]) };
    const screen = { ...protocol.selection, minSettled: 2 };
    assert.equal(qualifiesIS(pass, screen), true, "PF exactly1.1 passes");
    assert.equal(qualifiesIS({ ...pass, closed: totals([1.099999, -1]) }, screen), false);
    assert.equal(
      qualifiesIS({ ...pass, closed: totals([0.1]) }, screen),
      false,
      "no-loss sample cannot waive count",
    );
    assert.equal(
      qualifiesIS({ ...pass, withEndpointMarks: totals([1.1, -1, -0.01]) }, screen),
      false,
    );
    const another = { ...pass, id: "another" };
    const lost = { ...pass, id: "lost", closed: totals([-0.01, -0.01]) };
    const selection = freezeIS([pass, lost, another], { ...protocol, selection: screen });
    assert.deepEqual(
      selection.qualifiedIds,
      ["another", "pass"],
      "the entire qualified pool freezes, not a winner",
    );
    assert.throws(() => selection.qualifiedIds.push("oos-winner"), TypeError);
    assert.equal(
      totals([0.016 / 2, -0.01]).pf,
      0.8,
      "unit return PF is not the unequal-size cash PF1.6",
    );
    assert.equal(totals([0.01]).noLoss, true);
    assert.equal(totals([0.01]).exactRatio, null);
    assert.equal(totals([]).pfConvention, "empty-score-0");
  });

  it("physically rejects future bars in IS and freezes before any OOS calculation", () => {
    const { market, p, cells } = fixture();
    assert.throws(() => runIS(market, p, { cells }), /physically truncated/);
    const progress = [];
    let froze = false;
    const report = runResearch(market, p, {
      cells,
      onProgress: (x) => progress.push(x),
      onFreeze: (selection) => {
        assert.equal(
          progress.some((x) => x.startsWith("OOS")),
          false,
        );
        assert.ok(Object.isFrozen(selection));
        froze = true;
      },
    });
    assert.equal(froze, true);
    assert.equal(report.method.isSourceCandles, 3000);
    assert.equal(report.is.length, cells.length);
    assert.equal(report.oos.length, cells.length, "all unqualified losing cells remain diagnostic");
    for (const row of report.is)
      assert.ok(row.closed.firstEntryT === null || row.closed.firstEntryT >= p.data.isStartT);
    for (const row of report.oos) {
      assert.ok(row.closed.firstEntryT === null || row.closed.firstEntryT >= p.data.splitT);
      assert.ok(row.closed.lastExitT === null || row.closed.lastExitT <= p.data.endT);
      assert.equal(row.withEndpointMarks.n, row.closed.n + row.openAtEnd);
    }
  });

  it("all source/range/lane indicator and default-filter prefixes ignore poisoned future data", () => {
    const cs = candles(7200),
      cut = 4800;
    const poison = cs.map((c, i) =>
      i < cut ? c : { ...c, o: c.o * 5, h: c.h * 5, l: c.l * 5, c: c.c * 5, v: c.v * 10 },
    );
    const groups = [...new Map(researchCells(protocol).map((c) => [c.ind, c])).values()];
    for (const group of groups) {
      const a = new SeriesCache(
        barsFromCandles(
          "FIXTURE-USDT",
          group.tf,
          group.tf === 1 ? cs.slice(0, cut) : resample(cs.slice(0, cut), 1, group.tf),
        ),
      );
      const b = new SeriesCache(
        barsFromCandles(
          "FIXTURE-USDT",
          group.tf,
          group.tf === 1 ? poison : resample(poison, 1, group.tf),
        ),
      );
      assert.deepEqual(
        indicationState(group.ind, b).slice(0, a.b.n),
        indicationState(group.ind, a),
        group.ind,
      );
      assert.deepEqual(
        entrySignal("follow", group.ind, b, DEFAULT_TACTICS).slice(0, a.b.n),
        entrySignal("follow", group.ind, a, DEFAULT_TACTICS),
        `${group.ind} filtered`,
      );
      assert.deepEqual(
        filterEntries(
          entrySignal("follow", group.ind, b, DEFAULT_TACTICS),
          b.b,
          b,
          protocol.preOutcomeModelClarification.signalFilter,
        ).slice(0, a.b.n),
        filterEntries(
          entrySignal("follow", group.ind, a, DEFAULT_TACTICS),
          a.b,
          a,
          protocol.preOutcomeModelClarification.signalFilter,
        ),
        `${group.ind} Signal ATR floor`,
      );
      a.clear();
      b.clear();
    }
  });

  it("IS selection and all IS row hashes are unchanged by OOS mutations and repeats are deterministic", () => {
    const { market, p, cells } = fixture();
    const a = runResearch(market, p, { cells });
    const again = runResearch(market, p, { cells });
    assert.equal(sha256(JSON.stringify(a)), sha256(JSON.stringify(again)));
    const changed = {
      "FIXTURE-USDT": market["FIXTURE-USDT"].map((c) =>
        c.t < p.data.splitT
          ? c
          : { ...c, o: c.o * 3, h: c.h * 3, l: c.l * 3, c: c.c * 3, v: c.v * 20 },
      ),
    };
    const b = runResearch(changed, p, { cells });
    assert.deepEqual(a.is, b.is);
    assert.deepEqual(a.selection, b.selection);
    const selected = a.is
      .filter((r) => qualifiesIS(r, p.selection))
      .map((r) => r.id)
      .sort();
    assert.deepEqual(a.selection.qualifiedIds, selected);
    assert.equal(
      a.cohorts.allConfigsDiagnostic.closed.n,
      a.oos.reduce((sum, r) => sum + r.closed.n, 0),
    );
    assert.equal(
      a.cohorts.isQualifiedPool.closed.n,
      a.oos.filter((r) => selected.includes(r.id)).reduce((sum, r) => sum + r.closed.n, 0),
    );
    assert.equal(
      a.cohorts.isUnqualifiedDiagnostic.closed.n + a.cohorts.isQualifiedPool.closed.n,
      a.cohorts.allConfigsDiagnostic.closed.n,
    );
    assert.ok(a.cohorts.allConfigsDiagnostic.closed.n > 0, "the fixture exercises real trades");
    for (const dimension of [
      "bySource",
      "byRange",
      "byLane",
      "byKind",
      "bySide",
      "bySymbol",
      "hourly",
      "daily",
    ])
      assert.equal(
        Object.values(a.cohorts.allConfigsDiagnostic[dimension]).reduce(
          (sum, r) => sum + r.closed.n,
          0,
        ),
        a.cohorts.allConfigsDiagnostic.closed.n,
      );
  });

  it("matches direct engine simulation for closed returns and open marks on a fresh OOS slot", () => {
    const { market, p, cells } = fixture();
    const cell = cells.find((c) => c.kind === "trailing-only" && c.side === 1);
    const report = runResearch(market, p, { cells: [cell] });
    const k = new SeriesCache(barsFromCandles("FIXTURE-USDT", 1, market["FIXTURE-USDT"]));
    const signal = sideSignal(
      maskEntries(
        filterEntries(
          entrySignal("follow", cell.ind, k, DEFAULT_TACTICS),
          k.b,
          k,
          p.preOutcomeModelClarification.signalFilter,
        ),
        k.b,
        p.data.splitT,
      ),
      cell.side,
    );
    const sim = simulate(cell.cfg, k.b, signal, cell.protect, {
      cost: 0.002,
      cooldown: tacticCooldown(DEFAULT_TACTICS),
    });
    const expected = totals(sim.trades.map((t) => t.r));
    const row = report.oos[0];
    assert.equal(row.closed.n, expected.n);
    assert.equal(row.closed.gp, expected.gp);
    assert.equal(row.closed.gl, expected.gl);
    assert.equal(row.openAtEnd, sim.open ? 1 : 0);
    assert.ok(sim.trades.every((t) => t.entryT >= p.data.splitT && t.reason !== "tp"));
    if (sim.open) {
      assert.equal(sim.open.target, 0);
      assert.equal(row.endpointMarks.netReturnSum, sim.open.mtm);
    }
    report.evidence = { protocolSha256: "protocol", cacheSha256: "cache", sourceSha256: "source" };
    const md = renderMarkdown(report, "report");
    assert.match(md, /Retrospective/);
    assert.match(md, /not account profit/);
    assert.match(md, /Entire IS-qualified pool/);
  });

  it("matches the actual Signal tape builder's floors, entry filter and effective config deduplication", () => {
    const { market, p } = fixture();
    const cells = researchCells(p).filter(
      (c) => c.source === "r-laguerre" && c.range === "short" && c.tf === 1,
    );
    const report = runResearch(market, p, { cells });
    const b = barsFromCandles("FIXTURE-USDT", 1, market["FIXTURE-USDT"]);
    const u = makeUniverse([b], p.data.splitT);
    const tapes = buildTapes(
      u,
      p.protects,
      0.002,
      undefined,
      new Set([`follow|${cells[0].ind}`]),
      DEFAULT_TACTICS,
      null,
      {
        ...p.preOutcomeModelClarification.signalFloors,
        entry: p.preOutcomeModelClarification.signalFilter,
      },
    );
    assert.equal(tapes.length, new Set(cells.map((cell) => cell.cfg)).size);
    assert.equal(report.oos.length, tapes.length * 2);
    for (const row of report.oos) {
      const tape = tapes.find((tp) => tp.id === row.cfg);
      assert.ok(tape, row.id);
      assert.deepEqual(row.protect, tape.protect);
      const returns = [];
      for (let i = 0; i < tape.r.length; i++)
        if (tape.side[i] === row.side) returns.push(tape.r[i]);
      const expected = totals(returns);
      assert.equal(row.closed.n, expected.n);
      assert.equal(row.closed.gp, expected.gp);
      assert.equal(row.closed.gl, expected.gl);
      const open = tape.open.filter((pos) => pos.side === row.side);
      assert.equal(row.openAtEnd, open.length);
      assert.equal(
        row.endpointMarks.netReturnSum,
        open.reduce((sum, pos) => sum + pos.mtm, 0),
      );
    }
  });
});
