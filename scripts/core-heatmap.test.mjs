import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { Script } from "node:vm";
import { unitR } from "./lib/eval-orders.mjs";

const script = fileURLToPath(new URL("./core-heatmap.mjs", import.meta.url));

function report(inputFlag, { cells = { "1|1|0": { n: 10, w: 6, gp: 0.02, gl: 0.01, tapes: 1 } }, unit = true, unitCells = cells, weightedCells = cells, extraWindows = [] } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "cts-heatmap-accounting-"));
  try {
    writeFileSync(join(dir, "sim-a.json"), JSON.stringify({
      startT: 1_790_000_000_000, endT: 1_790_086_400_000, endAgo: 0,
      symbols: ["A-USDT"], tapes: 1, base: cells, wf: weightedCells, ...(unit ? { wfUnit: unitCells } : {}),
    }));
    extraWindows.forEach((w, i) => writeFileSync(join(dir, `sim-extra-${i}.json`), JSON.stringify({
      startT: 1_790_000_000_000, endT: 1_790_086_400_000, endAgo: i + 1, symbols: ["A-USDT"], tapes: 1, ...w,
    })));
    writeFileSync(join(dir, "paper.json"), JSON.stringify({
      tag: "CTST_", conn: "bingx-vst-02", hours: 2, at: "2026-10-14T10:00:00Z",
      cells: Object.fromEntries(Object.entries(cells).map(([k, c]) => [k, { ...c, usd: 1, seats: 1 }])),
    }));
    // Even a profitable aggregate report cannot prove which individual cell earned it.
    writeFileSync(join(dir, "exchange.json"), JSON.stringify({
      pf: 0.2, pfBasis: "closed-position-net-usdt", net: -5.44,
    }));
    execFileSync(process.execPath, ["--experimental-strip-types", "--no-warnings", script, "--sim", join(dir, "sim-"), inputFlag, join(dir, "paper.json"),
      "--exchange", join(dir, "exchange.json"), "--html", join(dir, "report.html"), "--md", join(dir, "report.md")],
    { stdio: "pipe" });
    const html = readFileSync(join(dir, "report.html"), "utf8");
    const md = readFileSync(join(dir, "report.md"), "utf8");
    const page = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
    assert.ok(page);
    new Script(page); // Keep the generated standalone report executable after its field names change.
    const data = JSON.parse(page.match(/const D = (.*);\n/)?.[1] ?? "null");
    return { html, md, data, page };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function render(page) {
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) elements.set(id, { innerHTML: "", textContent: "", style: {}, dataset: {}, addEventListener() {}, querySelector() { return element(`${id}:head`); } });
    return elements.get(id);
  };
  const ctx = { document: { documentElement: { dataset: { theme: "light" } }, getElementById: element }, matchMedia: () => ({ matches: false }), innerWidth: 1200, innerHeight: 800 };
  new Script(page).runInNewContext(ctx);
  return { elements, ctx, run: (code) => new Script(code).runInNewContext(ctx) };
}

describe("heatmap evidence provenance", () => {
  it("labels profitable forward paper as paper, while losing cash execution remains unverified per cell", () => {
    const { html, md, data } = report("--paper");
    const cell = data.rows.find((x) => x.tp === 1 && x.sl === 1 && x.tr === 0);
    assert.equal(cell.paperPf, 2);
    assert.equal(cell.paperQualified, true);
    assert.equal(cell.executionVerified, false);
    assert.equal("livePf" in cell, false);
    assert.equal("working" in cell, false);
    assert.equal(data.meta.paper.basis, "forward-paper-return");
    assert.equal(data.meta.paper.executionVerified, false);
    assert.equal(data.meta.exchange.reportedPf, 0.2);
    assert.equal(data.meta.exchange.cellAttributionAvailable, false);
    assert.match(md, /No cell is verified for execution profitability/);
    assert.match(html, /Paper return PF/);
    assert.doesNotMatch(md, /live PF|working cells/i);
  });

  it("accepts legacy --live input only as the same explicitly labeled paper source", () => {
    const { data, md } = report("--live");
    assert.equal(data.meta.paper.basis, "forward-paper-return");
    assert.equal(data.meta.paper.closes, 10);
    assert.equal("live" in data.meta, false);
    assert.match(md, /Forward paper/);
  });

  it("renders no-loss convention, measured 99, tiny losses and empty samples from actual embedded JSON", () => {
    const cells = {
      "1|0.5|0": { n: 10, w: 10, gp: 0.02, gl: 0, tapes: 1 },
      "1|0.75|0": { n: 10, w: 9, gp: 0.99, gl: 0.01, tapes: 1 },
      "1|1|0": { n: 10, w: 4, gp: 1e-15, gl: 2e-15, tapes: 1 },
      "1|1.25|0": { n: 0, w: 0, gp: 0, gl: 0, tapes: 1 },
      "1|1.5|0": { n: 10, w: 6, gp: 0.010996, gl: 0.01, tapes: 1 },
    };
    const { data, md, page } = report("--paper", { cells });
    const row = (sl) => data.rows.find((r) => r.tp === 1 && r.sl === sl && r.tr === 0);
    for (const prefix of ["sim", "wf", "paper", "wfWeighted"]) {
      assert.equal(row(0.5)[`${prefix}Pf`], data.meta.noLossGateScore);
      assert.equal(row(0.5)[`${prefix}NoLoss`], true);
      assert.equal(row(0.5)[`${prefix}PfConvention`], "no-loss-sentinel");
      assert.equal(row(0.5)[`${prefix}ReturnGp`], 0.02);
      assert.equal(row(0.5)[`${prefix}ReturnGl`], 0);
      assert.equal(row(0.75)[`${prefix}Pf`], 99);
      assert.equal(row(0.75)[`${prefix}NoLoss`], false);
      assert.equal(row(0.75)[`${prefix}PfConvention`], "gross-return-ratio");
      assert.equal(row(1)[`${prefix}Pf`], 0.5);
      assert.equal(row(1)[`${prefix}ReturnGl`], 2e-15);
      assert.equal(row(1)[`${prefix}NoLoss`], false);
      assert.equal(row(1.25)[`${prefix}Pf`], null);
      assert.equal(row(1.25)[`${prefix}NoLoss`], false);
      assert.equal(row(1.25)[`${prefix}PfConvention`], "unavailable");
    }
    assert.equal(row(1).paperQualified, false, "tiny actual losses must not become a profitable no-loss score");
    assert.equal(row(1.5).paperQualified, false, "formatting must not round a sub-threshold ratio into qualification");
    assert.ok(Math.abs(row(1.5).paperPf - 1.0996) < 1e-12);
    assert.equal(data.meta.returnSumUnits, "fraction");
    assert.match(md, /\| No losses \|/);
    assert.match(md, /\| 99\.00 \|/);
    assert.match(md, /not a measured finite PF ratio/);
    const lines = md.split("## Every cell")[1].trim().split("\n");
    const columns = (line) => line.split("|").slice(1, -1).map((v) => v.trim());
    const headers = columns(lines[0]);
    for (const [sl, expected] of [[0.5, "No losses"], [0.75, "99.00"], [1, "0.50"], [1.25, "–"]]) {
      const values = columns(lines.find((line) => line.startsWith(`| ${data.rows.indexOf(row(sl)) + 1} |`)));
      for (const name of ["sim PF", "WF unit return PF", "WF weighted/unknown diagnostic PF", "paper return PF"]) assert.equal(values[headers.indexOf(name)], expected);
    }
    const ui = render(page);
    for (const k of ["simPf", "wfPf", "paperPf", "wfWeightedPf"]) {
      ui.run(`metric = ${JSON.stringify(k)}; render();`);
      const panels = ui.elements.get("panels").innerHTML;
      for (const [sl, expected] of [[0.5, "No losses"], [0.75, "99.00"], [1, "0.50"], [1.25, "–"]]) {
        const i = data.rows.indexOf(row(sl));
        assert.match(panels, new RegExp(`data-i="${i}"[^>]*>${expected}</td>`));
        ui.run(`showTip({dataset:{i:${i}}},0,0);`);
        assert.match(ui.elements.get("tip").innerHTML, new RegExp(expected));
      }
    }
    const listing = ui.elements.get("rows").innerHTML;
    assert.match(listing, /<td>No losses<\/td>/);
    assert.match(listing, /<td>99\.00<\/td>/);
    assert.match(ui.elements.get("foot").textContent, /not a measured finite ratio/);
    const noLossOnly = report("--paper", { cells: { "1|1|0": cells["1|0.5|0"] } });
    assert.match(render(noLossOnly.page).elements.get("tiles").innerHTML, /best sim cell \(PF No losses\)/);
    assert.match(render(noLossOnly.page).elements.get("tiles").innerHTML, /best forward paper cell, ≥ 5 closes \(PF No losses\)/);
  });

  it("retains legacy weighted/unknown WF diagnostics without inventing unit-return qualification", () => {
    const { data, md, page } = report("--paper", { unit: false });
    const cell = data.rows.find((r) => r.tp === 1 && r.sl === 1 && r.tr === 0);
    assert.equal(cell.wfN, 0);
    assert.equal(cell.wfPf, null);
    assert.equal(cell.wfPfBasis, "unavailable");
    assert.equal(cell.wfWeightedN, 10);
    assert.equal(cell.wfWeightedPf, 2);
    assert.equal(cell.wfWeightedPfBasis, "weighted-simulation-or-legacy-unknown-diagnostic");
    assert.equal(data.meta.simulation.unitWfWindows, 0);
    assert.equal(data.meta.simulation.legacyWfOnlyWindows, 1);
    assert.equal(data.meta.simulation.stageQualificationVerified, false);
    assert.match(md, /Unit-return results available for 0\/1 windows/);
    assert.match(md, /qualification bypass/);
    const ui = render(page);
    assert.match(ui.elements.get("sub").textContent, /legacy weighted\/unknown values remain separate diagnostics/);
    assert.match(ui.elements.get("foot").textContent, /not actual stage qualification/);
  });

  it("never pools a legacy weighted window into known unit-return WF evidence", () => {
    const { data } = report("--paper", { extraWindows: [{ wf: { "1|1|0": { n: 10, w: 9, gp: 0.99, gl: 0.01 } } }] });
    const cell = data.rows.find((r) => r.tp === 1 && r.sl === 1 && r.tr === 0);
    assert.equal(cell.wfN, 10);
    assert.equal(cell.wfPf, 2);
    assert.equal(cell.wfWeightedN, 20);
    assert.equal(cell.wfWeightedPf, 50.5);
    assert.equal(data.meta.simulation.unitWfWindows, 1);
    assert.equal(data.meta.simulation.legacyWfOnlyWindows, 1);
  });

  it("normalizes direct simulated WF trades only and records probe bypass, model cost and weighted diagnostics", () => {
    const source = readFileSync(new URL("./core-heatmap-sim.mjs", import.meta.url), "utf8");
    const begin = source.indexOf("const wf = {};"), end = source.indexOf("process.stderr.write", begin);
    assert.ok(begin > 0 && end > begin);
    let written;
    const ctx = {
      unitR, wfSim: { trades: [{ cfg: "a", r: 0.0136, mult: 1 }, { cfg: "a", r: -0.068, mult: 6.8 }] },
      byId: new Map([["a", { protect: {} }]]), cellOf: () => "1|1|0", acc: () => ({ tapes: 0, n: 0, w: 0, gp: 0, gl: 0, unknownReturns: 0 }),
      rt: { settings: { cost: 0.002 }, wf: { validLastN: 0 }, status: { symbols: ["A-USDT"] } },
      o: { probe: { perRange: 0, perCell: 1 }, toggles: { block: false, blockActive: false } },
      endAgo: 0, a: 0, b: 86400000, cellTapes: [], t0: Date.now(), base: {}, out: "test",
      writeFileSync: (_path, text) => { written = JSON.parse(text); },
    };
    new Script(source.slice(begin, end)).runInNewContext(ctx);
    const unit = written.wfUnit["1|1|0"], weighted = written.wf["1|1|0"];
    assert.ok(Math.abs(unit.gp / unit.gl - 1.36) < 1e-12);
    assert.ok(Math.abs(weighted.gp / weighted.gl - 0.2) < 1e-12);
    assert.equal(unit.n, 2);
    assert.equal(weighted.n, 2);
    assert.equal(written.evidence.stageQualification, false);
    assert.equal(written.evidence.executionVerified, false);
    assert.equal(written.evidence.cost, 0.002);
    assert.equal(written.evidence.qualificationBypass.validLastN, 0);
    assert.equal(written.evidence.qualificationBypass.probe.perCell, 1);
    assert.equal(written.evidence.qualificationBypass.block, false);
    assert.match(written.evidence.wfUnitSource, /direct in-memory/);
    assert.match(written.evidence.wfWeightedSource, /weighted simulation diagnostic/);
    const { data, md, page } = report("--paper", { unitCells: written.wfUnit, weightedCells: written.wf });
    const cell = data.rows.find((r) => r.tp === 1 && r.sl === 1 && r.tr === 0);
    assert.ok(Math.abs(cell.wfPf - 1.36) < 1e-12);
    assert.ok(Math.abs(cell.wfWeightedPf - 0.2) < 1e-12);
    assert.match(md, /WF unit return PF/);
    assert.match(md, /WF weighted\/unknown diagnostic PF/);
    const ui = render(page);
    ui.run(`showTip({dataset:{i:${data.rows.indexOf(cell)}}},0,0);`);
    assert.match(ui.elements.get("tip").innerHTML, /unit closes · return PF 1\.36/);
    assert.match(ui.elements.get("tip").innerHTML, /Weighted\/unknown WF diagnostic: 2 closes · PF 0\.20/);
    const invalidCtx = { ...ctx, wfSim: { trades: [{ cfg: "a", r: 0.0136, mult: 1 }, { cfg: "a", r: -0.068, mult: 0 }, { cfg: "a", r: -0.01, unitR: null }] } };
    new Script(source.slice(begin, end)).runInNewContext(invalidCtx);
    assert.equal(written.wfUnit["1|1|0"].n, 3);
    assert.equal(written.wfUnit["1|1|0"].unknownReturns, 2);
    assert.equal(written.wfUnit["1|1|0"].gp, null, "unknown sums survive producer JSON serialization explicitly");
    const unknown = report("--paper", { unitCells: written.wfUnit, weightedCells: written.wf,
      extraWindows: [{ wfUnit: { "1|1|0": { n: 2, w: 1, gp: 0.02, gl: 0.01 } } }] });
    const unscored = unknown.data.rows.find((r) => r.tp === 1 && r.sl === 1 && r.tr === 0);
    assert.equal(unscored.wfN, 5, "unknown and known samples both remain counted");
    assert.equal(unscored.wfUnknownReturns, 2);
    assert.equal(unscored.wfPf, null);
    assert.equal(unscored.wfNet, null);
    assert.equal(unscored.wfNoLoss, false);
    assert.equal(unscored.wfPfBasis, "unavailable");
    const unknownUi = render(unknown.page);
    unknownUi.run('metric = "wfPf"; render();');
    assert.match(unknownUi.elements.get("panels").innerHTML, /Unavailable/);
    assert.match(unknown.md, /Unavailable/);
    // Legacy NaN → null without an explicit unknown count must also poison the entire primary group.
    const legacyUnknown = report("--paper", { unitCells: { "1|1|0": { n: 2, w: 1, gp: 0.02, gl: NaN } } });
    const invalid = legacyUnknown.data.rows.find((r) => r.tp === 1 && r.sl === 1 && r.tr === 0);
    assert.equal(invalid.wfN, 2);
    assert.equal(invalid.wfPf, null);
    assert.equal(invalid.wfUnknownReturns, 2);
  });
});
