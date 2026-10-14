import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { runInNewContext } from "node:vm";

const H = 3_600_000;
const M = 60_000;
const script = new URL("./core-session.mjs", import.meta.url).pathname;
function replay({ caps = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "cts-session-report-"));
  try {
    const raw = {
      at: "2026-10-14T00:00:00.000Z", symbols: ["TEST-USDT"],
      settings: {
        preH: 1, runH: 1, tactics: "off", signals: false, toggles: {}, block: {},
        wf: {}, gates: { minPf: 1.1 }, lanes: [1], cost: 0, focus: 0, disabledKinds: [], ranges: {},
        live: { maxPositionX: 0.75, maxExposureX: 7 },
        book: { balance: 100, notional: 5, sizing: { mode: "equityPct", pct: 0.25 }, leverage: 10 },
      },
      window: { startT: H, endT: 2 * H },
      trades: [
        { cfg: "combo|ema-9-21@m1|win", sym: "TEST-USDT", side: 1, entryT: H + M, exitT: H + 2 * M, entry: 100, exit: 150, r: 0.5, reason: "tp", vol: 1 },
        { cfg: "combo|ema-9-21@m1|loss", sym: "TEST-USDT", side: 1, entryT: H + 3 * M, exitT: H + 4 * M, entry: 150, exit: 120, r: -0.2, reason: "sl", vol: 1 },
      ],
      closes: { "TEST-USDT": Array.from({ length: 60 }, (_, i) => [H + i * M, i < 1 ? 100 : i < 3 ? 150 : 120]) },
      openEnd: [], engine: { basePassed: 0, baseEvaluated: 0, mainPairs: 0, tapes: 0, real: 0, computeMs: 0 },
    };
    writeFileSync(join(dir, "raw.json"), JSON.stringify(raw));
    const result = spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", script,
      "--replay", join(dir, "raw.json"), "--caps", caps ? "on" : "off", "--out", join(dir, "report"),
      "--html", join(dir, "html"), "--writeup", join(dir, "writeup.md"), "--quiet", "true"], {
      encoding: "utf8", timeout: 15_000, env: { ...process.env, CTS_CORE_VARIANTS: "0" },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    return {
      data: JSON.parse(readFileSync(join(dir, "html/data.json"), "utf8")),
      report: JSON.parse(readFileSync(join(dir, "report.json"), "utf8")),
      md: readFileSync(join(dir, "report.md"), "utf8"),
      writeup: readFileSync(join(dir, "writeup.md"), "utf8"),
      html: readFileSync(join(dir, "html/index.html"), "utf8"),
    };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

function summaryOf(html) {
  const done = new Error("summary captured");
  let summary;
  const app = { set innerHTML(value) { summary = value; throw done; } };
  const document = { documentElement: { dataset: {} }, querySelector: () => app, getElementById: () => app };
  const client = html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
  try { runInNewContext(client, { document, localStorage: { getItem: () => null }, matchMedia: () => ({ matches: false }) }, { timeout: 2_000 }); }
  catch (error) { if (error !== done) throw error; }
  assert.ok(summary, "generated client rendered its summary");
  return summary;
}

describe("session reports: return PF primary, simulated provenance", () => {
  it("keeps return PF primary across JSON, Markdown, write-up and the rendered HTML headline", () => {
    const { data, report, md, writeup, html } = replay();
    assert.equal(data.total.orders, 2);
    assert.equal(data.total.pf, 2.5);
    assert.ok(Math.abs(data.total.cashPf - 12.5 / 5.625) < 1e-6);
    assert.equal(report.total.pf, 2.5);
    assert.equal(report.strategies.total.pf, 2.5);
    assert.equal(data.hours[0].pf, 2.5);
    assert.equal(data.typeHours[0].pf, 2.5);
    assert.equal(data.evidence.actualExecution, false);
    assert.equal(data.evidence.pfBasis, "net-returns");
    assert.match(md, /Return PF 2\.50.*cash PF diagnostic 2\.22/);
    assert.match(md, /\| Return PF \| cash PF diagnostic \|/);
    assert.match(writeup, /\| Return PF \| cash PF diagnostic \|/);
    assert.match(writeup, /2\.50 \| 2\.22/);
    assert.match(md, /no exchange execution proof/);
    assert.doesNotMatch(md, /PF \$|ate the edge|sizing.*flattered/);
    const summary = summaryOf(html);
    assert.match(summary, /Return PF<\/div>\s*<div class="v[^"]*">2\.50/);
    assert.match(summary, /cash PF diagnostic 2\.22/);
    assert.match(summary, /no exchange execution proof/);
  });

  it("the uncapped comparison uses return PF first on the same closed-order sample", () => {
    const { data, md, html } = replay({ caps: true });
    assert.equal(data.total.uncapped.n, data.total.orders);
    assert.equal(data.total.uncapped.pf, data.total.pf);
    assert.equal(data.total.uncapped.gpR, data.total.gpR);
    assert.equal(data.total.uncapped.glR, data.total.glR);
    assert.match(md, /Without the caps:[^\n]*Return PF 2\.50.*cash PF diagnostic 2\.22/);
    assert.match(summaryOf(html), /Without the caps:[^\n]*Return PF 2\.50.*cash PF diagnostic 2\.22/);
  });
});
