import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { amendEndpointReport } from "./amend-endpoint-report.mjs";
import { readSessionDump, writeSessionDump } from "./lib/session-dump.mjs";

const H = 3_600_000, M = 60_000;
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const jsonSha = (value) => sha(JSON.stringify(value));
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) <= 1e-11, `${actual} != ${expected}`);
const root = fileURLToPath(new URL("../", import.meta.url));
function snapshot(dir) {
  const entries = {};
  const visit = (path) => {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const file = join(path, entry.name);
      if (entry.isDirectory()) visit(file);
      else entries[relative(dir, file)] = sha(readFileSync(file));
    }
  };
  visit(dir);
  return entries;
}
function fixture() {
  const mark = 90, cost = 0.0015, unitNotional = 10, mult = 2, volume = 4;
  const engineUnitR = (mark - 100) / 100 + (mark - 90) / 90 - 2 * cost;
  const engineMtmR = engineUnitR * mult;
  const bookMtmR = ((mark - 95) / 95 - cost) * volume;
  const bookSizedPnl = bookMtmR * unitNotional;
  const cfg = "dca|ema-9-21@m1|tp50|sl50|tr0|h99";
  const trades = [0.01, -0.02].map((r, i) => ({ cfg: `normal-${i}`, sym: "TEST-USDT", side: i ? -1 : 1, entryT: H + (i + 1) * M, exitT: H + (i + 3) * M, r, mult: 1, vol: 1 }));
  const open = { cfg, sym: "TEST-USDT", side: 1, entryT: H + 10 * M, entry: 95, mtmR: engineMtmR, mult, vol: volume, kind: "dca" };
  const key = `${cfg}|TEST-USDT|1|${open.entryT}`;
  const study = { frozen: true, protocolSha256: "a".repeat(64), sourceSha256: "b".repeat(64), originalRun: "frozen-endpoint-fixture" };
  const raw = {
    study, window: { startT: H, endT: 2 * H }, settings: { cost }, trades, openEnd: [open],
    closes: { "TEST-USDT": Array.from({ length: 60 }, (_, i) => [H + i * M, mark]) },
    tapeTrades: [{ id: cfg, trades: [] }], validation: [{ t: H, real: [cfg], checks: [[cfg, 1, 30, 1.2, 0.012, 0.01]] }],
  };
  const sizedOrders = trades.map((row, closeIndex) => ({ key: `${row.cfg}|${row.sym}|${row.side}|${row.entryT}`, closeIndex, cfg: row.cfg, sym: row.sym, side: row.side, entryT: row.entryT, exitT: row.exitT,
    unitR: row.r, sizedReturn: row.r, volume: 1, unitNotional, allocatedNotional: unitNotional, sizedPnl: row.r * unitNotional }));
  const sizedOpenOrders = [{ key, openIndex: 0, cfg, sym: open.sym, side: open.side, entryT: open.entryT,
    unitR: engineUnitR, sizedReturn: engineMtmR, volume, unitNotional, rawUnitNotional: unitNotional, rawGot: 40, allocatedNotional: 40, roundoffZeroed: false, sizedPnl: engineMtmR * unitNotional }];
  const balanceEnd = 99.9, equityEnd = balanceEnd + bookSizedPnl;
  const report = {
    study, at: "2026-10-17T00:00:00Z", window: raw.window, settings: { balance0: 100, cost },
    total: { orders: 2, fundedOrders: 2, gpR: 0.01, glR: 0.02, pf: 0.5, net: -0.1, balanceEnd, equityEnd,
      openEnd: { recorded: true, orders: 1, positions: 1, mtm: bookSizedPnl } },
    hours: [{ t: H, orders: 2, pf: 0.5, net: -0.1, balance: balanceEnd, equity: equityEnd, openAtEnd: { orders: 1, positions: 1, mtm: bookSizedPnl } }],
    curve: [{ t: H, bal: 100, eq: 100 }, { t: 2 * H, bal: balanceEnd, eq: equityEnd }],
    sizedOrders, sizedOpenOrders, checks: [{ name: "original settled fixture", ok: true }], checksOk: true,
    definitions: { mtm: "original modeled minute aggregate: average entry and final volume" },
    originalExtra: { value: "must survive the amendment exactly" },
  };
  return { raw, report, engineUnitR, engineMtmR, bookMtmR, bookSizedPnl };
}
async function inputs(t, chunked) {
  const dir = mkdtempSync(join(tmpdir(), "cts-endpoint-amendment-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const source = join(dir, "source"); mkdirSync(source);
  const rawFile = join(source, "raw.json"), reportFile = join(source, "data.json");
  const sample = fixture();
  if (chunked) {
    await writeSessionDump(rawFile, sample.raw, { maxChunkBytes: 512, arrayFields: ["trades"] });
    await writeSessionDump(reportFile, sample.report, { maxChunkBytes: 1024, arrayFields: ["sizedOrders", "sizedOpenOrders"] });
  } else {
    writeFileSync(rawFile, JSON.stringify(sample.raw));
    writeFileSync(reportFile, JSON.stringify(sample.report));
  }
  return { ...sample, dir, source, rawFile, reportFile, outDir: join(dir, "amended") };
}

function assertPhysicalEvidence(file, evidence) {
  const bytes = readFileSync(file), header = JSON.parse(bytes);
  assert.equal(evidence.path, resolve(file));
  assert.deepEqual(evidence.manifest, { sha256: sha(bytes), bytes: bytes.length });
  const manifests = {
    ...(header.tapeTradesSidecar ? { tapeTrades: header.tapeTradesSidecar } : {}),
    ...(header.validationSidecar ? { validation: header.validationSidecar } : {}),
    ...header.arraySidecars,
  };
  assert.deepEqual(Object.keys(evidence.sidecars ?? {}).sort(), Object.keys(manifests).sort());
  for (const [field, manifest] of Object.entries(manifests)) {
    const recorded = evidence.sidecars[field];
    assert.equal(recorded.sha256, manifest.sha256);
    assert.equal(recorded.chunks.length, manifest.chunks.length);
    for (const chunk of manifest.chunks) {
      const actual = readFileSync(join(resolve(file, ".."), chunk.path));
      const bound = recorded.chunks.find((part) => part.path === chunk.path);
      assert.ok(bound, `receipt binds ${field} chunk ${chunk.path}`);
      assert.equal(bound.sha256, sha(actual));
      assert.equal(bound.bytes, actual.length);
    }
  }
}
function allocationRows(report) {
  return [
    ...report.sizedOrders.map((r) => ["settled", r.closeIndex, r.key, r.unitNotional, r.rawUnitNotional ?? null, r.allocatedNotional, r.volume, r.rawGot ?? null, r.roundoffZeroed ?? false]),
    ...report.sizedOpenOrders.map((r) => ["open", r.openIndex, r.key, r.unitNotional, r.rawUnitNotional ?? null, r.allocatedNotional, r.volume, r.rawGot ?? null, r.roundoffZeroed ?? false]),
  ];
}

for (const chunked of [false, true]) {
  test(`${chunked ? "chunked" : "flat"} amendment supplements dual endpoint marks without changing original execution, study, or curves`, async (t) => {
    const x = await inputs(t, chunked), before = snapshot(x.source);
    const result = await amendEndpointReport(x);
    assert.equal(result.reportFile, join(x.outDir, "data.json"));
    assert.equal(result.receiptFile, join(x.outDir, "receipt.json"));
    const revised = await readSessionDump(result.reportFile);
    const { sizedOpenOrders: originalOpen, ...originalRest } = x.report;
    const { sizedOpenOrders: revisedOpen, reportRevision, ...revisedRest } = revised;
    assert.deepEqual(revisedRest, originalRest, "every settled, sizing, hourly, curve, metric, study, and unknown legacy field is unchanged");
    assert.ok(reportRevision && typeof reportRevision === "object");
    assert.equal(revisedOpen.length, originalOpen.length);
    for (const [i, old] of originalOpen.entries()) {
      const row = revisedOpen[i];
      for (const [key, value] of Object.entries(old)) assert.deepEqual(row[key], value, `original endpoint field ${key} is immutable`);
      near(row.engineMarkSizedReturn, x.engineMtmR);
      near(row.engineMarkUnitReturn, x.engineUnitR);
      near(row.engineMarkSizedPnl, old.sizedPnl);
      near(row.bookMtmR, x.bookMtmR);
      near(row.bookSizedPnl, x.bookSizedPnl);
      near(row.engineMinusBookMarkUsd, old.sizedPnl - x.bookSizedPnl);
      assert.equal(row.markPrice, 90);
      assert.equal(row.markT, 2 * H);
      assert.equal(row.markBarOpenT, 2 * H - M);
      assert.match(row.engineMarkBasis, /engine|ladder|intrinsic/i);
      assert.match(row.bookMarkBasis, /average|arithmetic|aggregate|book/i);
      assert.notEqual(row.engineMarkBasis, row.bookMarkBasis);
    }
    const receipt = JSON.parse(readFileSync(result.receiptFile, "utf8"));
    assert.deepEqual(receipt, result.receipt);
    assert.equal(receipt.schema, "cts-endpoint-report-amendment-v1");
    assertPhysicalEvidence(x.rawFile, receipt.inputs.raw);
    assertPhysicalEvidence(x.reportFile, receipt.inputs.report);
    assertPhysicalEvidence(result.reportFile, receipt.output.report);
    assert.ok(receipt.amendment.files.length > 0);
    for (const file of receipt.amendment.files) assert.equal(file.sha256, sha(readFileSync(resolve(root, file.path))));
    assert.match(receipt.amendment.sha256, /^[a-f0-9]{64}$/);
    assert.equal(receipt.unchanged.settledOrdersSha256, jsonSha(x.report.sizedOrders));
    assert.equal(receipt.unchanged.rawSettledTradesSha256, jsonSha(x.raw.trades));
    assert.equal(receipt.unchanged.allocationNotionalsSha256, jsonSha(allocationRows(x.report)));
    assert.equal(receipt.unchanged.hoursSha256, jsonSha(x.report.hours));
    assert.equal(receipt.unchanged.curveSha256, jsonSha(x.report.curve));
    assert.equal(receipt.unchanged.studySha256, jsonSha(x.report.study));
    assert.equal(receipt.reconciliation.rows, 1);
    assert.equal(receipt.reconciliation.differingRows, 1);
    assert.equal(receipt.reconciliation.checksOk, true);
    near(receipt.reconciliation.engineSizedPnl, -2.06);
    near(receipt.reconciliation.bookSizedPnl, x.bookSizedPnl);
    near(receipt.reconciliation.engineMinusBookMarkUsd, -2.06 - x.bookSizedPnl);
    near(receipt.reconciliation.reportedAccountMtm, x.report.total.openEnd.mtm);
    near(receipt.reconciliation.equityMinusBalance, x.report.total.equityEnd - x.report.total.balanceEnd);
    near(revisedOpen.reduce((sum, row) => sum + row.bookSizedPnl, 0), revised.total.equityEnd - revised.total.balanceEnd);
    assert.deepEqual(snapshot(x.source), before, "original manifests and every physical chunk retain their bytes");
    assert.deepEqual((await readSessionDump(x.rawFile)).study, x.raw.study, "a report amendment never reseals original source evidence");

    const sealed = snapshot(x.outDir);
    await assert.rejects(() => amendEndpointReport(x), /exist|overwrite|empty|output/i);
    assert.deepEqual(snapshot(x.outDir), sealed, "an existing amendment and receipt cannot be overwritten");
  });
}

for (const input of ["raw", "report"]) {
  test(`corrupt ${input} sidecar evidence is rejected before creating an amended report`, async (t) => {
    const x = await inputs(t, true), file = input === "raw" ? x.rawFile : x.reportFile;
    const header = JSON.parse(readFileSync(file, "utf8"));
    const manifest = input === "raw" ? header.validationSidecar : header.arraySidecars.sizedOpenOrders;
    const chunk = join(x.source, manifest.chunks[0].path);
    writeFileSync(chunk, readFileSync(chunk, "utf8") + "\n");
    const before = snapshot(x.source);
    await assert.rejects(() => amendEndpointReport(x), /sidecar|chunk|byte|sha|checksum/i);
    assert.equal(existsSync(x.outDir), false);
    assert.deepEqual(snapshot(x.source), before, "failed validation cannot modify original evidence");
  });
}

test("amendment output rejects the original source directory and any pre-existing directory", async (t) => {
  const x = await inputs(t, true), before = snapshot(x.source);
  await assert.rejects(() => amendEndpointReport({ ...x, outDir: x.source }), /exist|overwrite|empty|output/i);
  assert.deepEqual(snapshot(x.source), before);
  const empty = join(x.dir, "pre-existing"); mkdirSync(empty);
  await assert.rejects(() => amendEndpointReport({ ...x, outDir: empty }), /exist|overwrite|empty|output/i);
  assert.deepEqual(readdirSync(empty), []);
});

test("the CLI writes the verified amendment and receipt through its public argument contract", async (t) => {
  const x = await inputs(t, true), before = snapshot(x.source);
  const run = spawnSync(process.execPath, [fileURLToPath(new URL("./amend-endpoint-report.mjs", import.meta.url)),
    "--raw", x.rawFile, "--report", x.reportFile, "--out", x.outDir], { encoding: "utf8", timeout: 10_000 });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  const summary = JSON.parse(run.stdout);
  assert.equal(summary.reportFile, join(x.outDir, "data.json"));
  assert.equal(summary.receiptFile, join(x.outDir, "receipt.json"));
  assert.equal(summary.checksOk, true);
  assert.equal(summary.rows, 1);
  near(summary.bookSizedPnl, x.bookSizedPnl);
  assert.deepEqual((await readSessionDump(summary.reportFile)).sizedOrders, x.report.sizedOrders);
  assert.deepEqual(snapshot(x.source), before);
});

test("empty endpoint arrays do not waive finite ordered windows or a known finite cost", async (t) => {
  for (const invalid of [
    { window: {}, cost: 0.0015 },
    { window: { startT: H, endT: null }, cost: 0.0015 },
    { window: { startT: 2 * H, endT: H }, cost: 0.0015 },
    { window: { startT: H, endT: 2 * H }, cost: null },
  ]) {
    const x = await inputs(t, false);
    x.raw.window = invalid.window;
    x.report.window = invalid.window;
    x.raw.settings.cost = invalid.cost;
    x.report.settings.cost = invalid.cost;
    x.raw.openEnd = [];
    x.report.sizedOpenOrders = [];
    x.report.total.openEnd = { recorded: true, orders: 0, positions: 0, mtm: 0 };
    x.report.total.equityEnd = x.report.total.balanceEnd;
    writeFileSync(x.rawFile, JSON.stringify(x.raw));
    writeFileSync(x.reportFile, JSON.stringify(x.report));
    const before = snapshot(x.source);
    await assert.rejects(() => amendEndpointReport(x), /window|time|finite|start|end|cost/i);
    assert.equal(existsSync(x.outDir), false);
    assert.deepEqual(snapshot(x.source), before);
  }
});

test("an explicitly unknown original endpoint P&L cannot be replaced by inferred engine aliases", async (t) => {
  const x = await inputs(t, false);
  x.report.sizedOpenOrders[0].sizedPnl = null;
  writeFileSync(x.reportFile, JSON.stringify(x.report));
  const before = snapshot(x.source);
  await assert.rejects(() => amendEndpointReport(x), /original|engine|mark|unknown|pnl|evidence/i);
  assert.equal(existsSync(x.outDir), false);
  assert.deepEqual(snapshot(x.source), before);
});

test("an endpoint allocation with a contradictory order key cannot gain amended evidence", async (t) => {
  const x = await inputs(t, false);
  x.report.sizedOpenOrders[0].key = "another-config|TEST-USDT|1|0";
  writeFileSync(x.reportFile, JSON.stringify(x.report));
  const before = snapshot(x.source);
  await assert.rejects(() => amendEndpointReport(x), /original|allocation|identity|order|key/i);
  assert.equal(existsSync(x.outDir), false);
  assert.deepEqual(snapshot(x.source), before);
});
