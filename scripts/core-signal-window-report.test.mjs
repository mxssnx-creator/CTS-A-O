import test from "node:test";
import assert from "node:assert/strict";
import { hourlyTypeRows, main, sourceDetailRows } from "./core-signal-window-report.mjs";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeSessionDump } from "./lib/session-dump.mjs";
import { addReturnEvidence, finishReturnEvidence, returnBucket } from "./lib/return-evidence.mjs";

const H = 3_600_000;
function readerFixture() {
  const cfg = "follow|sig-ema-cross-s@m1|tp1|sl2|tr0|h60";
  const evidence = (r) => { const bucket = returnBucket(); if (r !== undefined) addReturnEvidence(bucket, r, r); return finishReturnEvidence(bucket); };
  const trades = [0.02, -0.01].map((r, i) => ({ cfg, kind: "normal", side: i ? -1 : 1, sym: "TEST-USDT", entryT: (i + 1) * H + 1, exitT: (i + 1) * H + 2, r, mult: 1, reason: "close" }));
  const raw = {
    window: { startT: H, endT: 7 * H }, settings: { wf: { causalBase: true } }, trades, openEnd: [],
    engine: { skips: {}, skipsByRange: {} },
    tapeTrades: [{ id: cfg, trades: trades.map((x) => [x.sym, x.side, x.entryT, x.exitT, x.r]) }],
    validation: [{ t: H, real: [cfg], checks: [[cfg, 1, 30, 2, 0.02, 0.01]] }],
    signalProgress: { configs: [{ id: cfg, kind: "normal", source: "ema-cross", range: "short", lane: 1, origin: "configured", built: true,
      protect: { tp: 0.01, sl: 0.02, trail: 0, hold: 60 }, holdMinutes: 60, status: "configured",
      sides: Object.fromEntries([1, -1].map((side, i) => [side, { pre: evidence(), runCandidates: evidence(trades[i].r), unitActiveCandidates: evidence(trades[i].r), executed: evidence(trades[i].r) }])) }], steps: [], definitions: {} },
  };
  const book = { total: { orders: 2, pf: 2, balanceEnd: 100.01, equityEnd: 100.01 },
    sizedOrders: trades.map((x, closeIndex) => ({ key: `${cfg}|${x.sym}|${x.side}|${x.entryT}`, closeIndex, exitT: x.exitT, unitNotional: 1, sizedPnl: x.r })), sizedOpenOrders: [],
    checksOk: true, checks: [], hours: Array.from({ length: 6 }, (_, i) => ({ t: H + i * H, balance: 100.01, equity: 100.01, net: 0, maxDdPctSoFar: 0.01 })) };
  const protocol = { tradeStartT: H, endT: 7 * H, enabledSources: ["ema-cross"], disabledSources: [], settings: { signals: { lanes: [1] } } };
  return { raw, book, protocol };
}
test("Signal report reader preserves funded long/short cohorts and physical provenance with sidecars", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "cts-signal-report-reader-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const sample = readerFixture(), reports = [];
  for (const mode of ["legacy", "chunked"]) {
    const input = join(dir, mode); mkdirSync(input);
    for (const [name, data] of Object.entries(sample)) {
      const file = join(input, `${name}.json`);
      if (mode === "chunked" && name !== "protocol") await writeSessionDump(file, data, { maxChunkBytes: 512, arrayFields: name === "raw" ? ["trades"] : ["sizedOrders", "sizedOpenOrders"] });
      else writeFileSync(file, JSON.stringify(data));
    }
    const report = await main(["--raw", join(input, "raw.json"), "--book", join(input, "book.json"), "--protocol", join(input, "protocol.json"), "--out", join(input, "out")]);
    assert.equal(report.total.n, 2); assert.equal(report.total.pf, 2);
    assert.equal(report.total.unknownAllocations, 0);
    assert.equal(report.coverage.longCloses, 1); assert.equal(report.coverage.shortCloses, 1);
    assert.equal(report.wholeSystemSizedOrders.length, 2);
    for (const name of ["raw", "book", "protocol"]) {
      const bytes = readFileSync(join(input, `${name}.json`));
      assert.deepEqual(report.provenance[name], { sha256: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.length });
    }
    const { provenance, generatedAt, ...cohort } = report;
    reports.push(cohort);
  }
  assert.deepEqual(reports[1], reports[0]);
});
test("Signal report verifies even unloaded raw validation sidecars before publishing a cohort", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "cts-signal-report-corrupt-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const { raw, book, protocol } = readerFixture(), file = join(dir, "raw.json");
  await writeSessionDump(file, raw, { maxChunkBytes: 512, arrayFields: ["trades"] });
  writeFileSync(join(dir, "book.json"), JSON.stringify(book)); writeFileSync(join(dir, "protocol.json"), JSON.stringify(protocol));
  const manifest = JSON.parse(readFileSync(file, "utf8")), chunk = join(dir, manifest.validationSidecar.chunks[0].path);
  writeFileSync(chunk, readFileSync(chunk, "utf8") + "\n");
  await assert.rejects(() => main(["--raw", file, "--book", join(dir, "book.json"), "--protocol", join(dir, "protocol.json"), "--out", join(dir, "out")]), /sidecar|chunk|byte|sha/i);
});
function reportFixture() {
  return {
    hours: Array.from({ length: 6 }, (_, i) => ({ t: i * H, cashPfDiagnostic: 0.2 })),
    hourlyCells: Array.from({ length: 6 }, (_, i) =>
      ["normal", "trailing", "trailing-only"].flatMap((kind) =>
        ["long", "short"].map((side) => ({
          t: i * H,
          kind,
          side,
          n: 0,
          w: 0,
          gp: 0,
          gl: 0,
          unknownReturns: 0,
          unknownSizedPnl: 0,
          usd: 0,
        })),
      ),
    ).flat(),
  };
}

test("hourly type PF aggregates unit-return components and preserves separate cash PF", () => {
  const input = reportFixture();
  Object.assign(input.hourlyCells[0], {
    n: 1,
    w: 1,
    gp: 0.0136,
    cashGp: 0.002,
    cashGl: 0,
    usd: 0.002,
  });
  Object.assign(input.hourlyCells[1], { n: 1, gl: 0.01, cashGp: 0, cashGl: 0.01, usd: -0.01 });
  const result = hourlyTypeRows(input);
  assert.equal(result.length, 18);
  assert.ok(Math.abs(result[0].pf - 1.36) < 1e-12);
  assert.equal(result[0].long, 1);
  assert.equal(result[0].short, 1);
  assert.equal(result[0].pfBasis, "unit-net-returns");
  assert.equal(input.hours[0].cashPfDiagnostic, 0.2);
  assert.ok(Math.abs(result[0].cashPfDiagnostic - 0.2) < 1e-12);
  assert.equal(result[1].n, 0);
  assert.equal(result[1].pf, null);
});

test("unknown unit evidence invalidates the complete hourly sample and no-loss stays labeled", () => {
  const input = reportFixture();
  Object.assign(input.hourlyCells[0], { n: 1, w: 1, gp: 0.01 });
  Object.assign(input.hourlyCells[1], { n: 1, unknownReturns: 1, gp: null, gl: null });
  Object.assign(input.hourlyCells[2], { n: 1, w: 1, gp: 0.02 });
  const result = hourlyTypeRows(input);
  assert.equal(result[0].n, 2);
  assert.equal(result[0].unknownReturns, 1);
  assert.equal(result[0].pf, null);
  assert.equal(result[0].returnPfLabel, "unit basis unavailable");
  assert.equal(result[1].noLoss, true);
  assert.equal(result[1].returnPfLabel, "No losses");
});

test("source, range, kind and direction detail retains losing and empty siblings", () => {
  const report = {
    protocol: { enabledSources: ["a", "b"], settings: { signals: { lanes: [1] } } },
    trades: [
      {
        source: "a",
        kind: "trailing-only",
        range: "short",
        lane: 1,
        side: "long",
        unitR: 0.01,
        sizedPnl: 0.002,
      },
      {
        source: "b",
        kind: "trailing-only",
        range: "short",
        lane: 1,
        side: "long",
        unitR: -0.02,
        sizedPnl: -0.01,
      },
    ],
  };
  const rows = sourceDetailRows(report);
  assert.equal(rows.length, 24);
  assert.equal(
    rows.reduce((n, row) => n + row.n, 0),
    2,
  );
  const a = rows.find(
    (row) =>
      row.source === "a" &&
      row.kind === "trailing-only" &&
      row.range === "short" &&
      row.side === "long",
  );
  const b = rows.find(
    (row) =>
      row.source === "b" &&
      row.kind === "trailing-only" &&
      row.range === "short" &&
      row.side === "long",
  );
  assert.equal(a.noLoss, true);
  assert.equal(b.pf, 0);
  assert.equal(rows.find((row) => row.source === "b" && row.kind === "normal").pf, null);
});
