import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { Script } from "node:vm";

const script = fileURLToPath(new URL("./core-heatmap.mjs", import.meta.url));

function report(inputFlag) {
  const dir = mkdtempSync(join(tmpdir(), "cts-heatmap-accounting-"));
  try {
    const cell = { n: 10, w: 6, gp: 0.02, gl: 0.01, tapes: 1 };
    writeFileSync(join(dir, "sim-a.json"), JSON.stringify({
      startT: 1_790_000_000_000, endT: 1_790_086_400_000, endAgo: 0,
      symbols: ["A-USDT"], tapes: 1, base: { "1|1|0": cell }, wf: { "1|1|0": cell },
    }));
    writeFileSync(join(dir, "paper.json"), JSON.stringify({
      tag: "CTST_", conn: "bingx-vst-02", hours: 2, at: "2026-10-14T10:00:00Z",
      cells: { "1|1|0": { ...cell, usd: 1, seats: 1 } },
    }));
    // Even a profitable aggregate report cannot prove which individual cell earned it.
    writeFileSync(join(dir, "exchange.json"), JSON.stringify({
      pf: 0.2, pfBasis: "closed-position-net-usdt", net: -5.44,
    }));
    execFileSync(process.execPath, [script, "--sim", join(dir, "sim-"), inputFlag, join(dir, "paper.json"),
      "--exchange", join(dir, "exchange.json"), "--html", join(dir, "report.html"), "--md", join(dir, "report.md")],
    { stdio: "pipe" });
    const html = readFileSync(join(dir, "report.html"), "utf8");
    const md = readFileSync(join(dir, "report.md"), "utf8");
    const page = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
    assert.ok(page);
    new Script(page); // Keep the generated standalone report executable after its field names change.
    const data = JSON.parse(page.match(/const D = (.*);\n/)?.[1] ?? "null");
    return { html, md, data };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
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
});
