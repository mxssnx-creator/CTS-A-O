import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { spawnSync } from "node:child_process";

const script = fileURLToPath(new URL("./core-live-promote.mjs", import.meta.url));
const guard = fileURLToPath(new URL("./lib/core-test-offline-guard.cjs", import.meta.url));
const CFG = "sweep|trend-adx@m15c|tp0|sl4.5|tr2|h64|sh|to";
const key = (l) => JSON.stringify([l.cfg, l.sym, l.side]);
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const put = (p, value) => writeFileSync(p, `${JSON.stringify(value, null, 2)}\n`);

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "cts-live-promotion-"));
  const dbPath = join(dir, "reference.sqlite");
  const patchPath = join(dir, "target.json");
  const statePath = join(dir, "state.json");
  const evidencePath = join(dir, "evidence.json");
  const db = new DatabaseSync(dbPath);
  db.exec("CREATE TABLE live_lane_trades(cfg TEXT,r REAL,exit_t INTEGER,reason TEXT)");
  const insert = db.prepare("INSERT INTO live_lane_trades VALUES (?,?,?,?)");
  for (let i = 0; i < 30; i++) insert.run(CFG, i === 29 ? null : 0.02, Date.now() - i * 1000, "exit");
  db.close();
  put(patchPath, { why: "operator selection", settings: { live: { source: "signals", kinds: ["trailing-only"], ratio: 3 } } });
  put(statePath, { on: { sh: true }, closes: 30 });
  const asOf = Date.now() - 1000;
  const window = { fromT: asOf - 1_000_000, toT: asOf, asOf };
  const identity = { cfg: CFG, sym: "A-USDT", side: 1 };
  const base = (i) => ({ ...identity, id: `slice-${i}`, entryT: asOf - 100_000 + i * 1000,
    exitT: asOf - 99_000 + i * 1000, eligibilityId: "after-base-1" });
  const returns = Array.from({ length: 20 }, (_, i) => i % 2 ? -0.01 : 0.02);
  const lane = { ...identity, source: "trend-adx@m15c", group: "sh", kind: "trailing-only",
    eligibility: { id: "after-base-1", stage: "after-base", passed: true, at: asOf - 2_000_000 },
    model: { ...window, complete: true, basis: "unit-net-returns", closes: returns.map((unitR, i) => ({ ...base(i), unitR })) },
    execution: { ...window, complete: true, basis: "owned-net-returns", executionSource: "verified-venue", closes: returns.map((netReturn, i) => ({ ...base(i),
      ownedQty: 1, entryNotional: 100, entryFillIds: ["owned-entry"], exitFillIds: [`owned-exit-${i}`],
      grossPnl: netReturn * 100 + 0.2, fees: 0.2, funding: 0, netPnl: netReturn * 100, netReturn })) } };
  const evidence = { schema: "cts-live-promotion/v2", referenceId: "cts-ao-reference", complete: true,
    ...window, validUntilT: asOf + 60_000, lanes: [lane] };
  const run = (args = []) => {
    const childEnv = { ...process.env, CTS_CORE_LIVE: "0", CTS_CORE_WORKERS: "0", CTS_CORE_COMPARE: "0" };
    for (const name of Object.keys(childEnv)) if (/^(BINGX|BINANCE|BYBIT|OKX)/i.test(name) || name === "NODE_OPTIONS") delete childEnv[name];
    // Cold TypeScript imports share CPU/memory with the other offline test processes. Bound bootstrap separately
    // from the promotion evidence checks below; a killed bootstrap is never accepted as a fail-closed result.
    const result = spawnSync(process.execPath, ["--require", guard, "--max-old-space-size=256", "--experimental-strip-types", "--no-warnings", script,
      "--ref-db", dbPath, "--patch", patchPath, "--state", statePath, ...args],
    { env: childEnv, encoding: "utf8", timeout: 30_000 });
    const diagnostics = JSON.stringify({ args, status: result.status, signal: result.signal,
      error: result.error && { code: result.error.code, message: result.error.message },
      stdout: result.stdout, stderr: result.stderr });
    assert.equal(result.error, undefined, `promotion CLI failed to start or finish: ${diagnostics}`);
    assert.equal(result.signal, null, `promotion CLI was terminated: ${diagnostics}`);
    return result;
  };
  const proofArgs = ["--evidence", evidencePath, "--reference-id", evidence.referenceId];
  return { dir, dbPath, patchPath, statePath, evidencePath, evidence, run, proofArgs,
    close: () => rmSync(dir, { recursive: true, force: true }) };
}

test("legacy nominal rows including NULL cannot retain old ON or manufacture owned-execution proof", () => {
  const f = fixture();
  try {
    const dbBefore = readFileSync(f.dbPath);
    const result = f.run();
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /nominal reference own rows 30 \(not funded-execution proof\)/);
    const live = read(f.patchPath).settings.live;
    assert.deepEqual(live.promotedLanes, []);
    assert.deepEqual(live.excludeRanges, ["mc", "mn", "mp", "sh", "gn", "lg", "wide"]);
    assert.deepEqual(live.kinds, ["trailing-only"]);
    assert.equal(live.ratio, 3);
    assert.ok(Object.values(read(f.statePath).on).every((on) => !on));
    assert.deepEqual(readFileSync(f.dbPath), dbBefore, "reference database remains read-only");
  } finally { f.close(); }
});

test("verified complete exact evidence produces a byte-hash-bound proof with original kinds and default thresholds", () => {
  const f = fixture();
  try {
    put(f.evidencePath, f.evidence);
    const result = f.run(f.proofArgs);
    assert.equal(result.status, 0, result.stderr);
    const state = read(f.statePath);
    assert.deepEqual(state.opts, { lastN: 30, minN: 20, onPf: 1.2, offPf: 1 });
    assert.equal(state.on.sh, true);
    const live = read(f.patchPath).settings.live;
    assert.deepEqual(live.kinds, ["trailing-only"]);
    assert.equal(live.promotedLanes.length, 1);
    const proof = live.promotedLanes[0];
    assert.equal(key(proof), key(f.evidence.lanes[0]));
    assert.equal(proof.modelPf, 2);
    assert.equal(proof.executionPf, 2);
    assert.equal(proof.executionCloses.length, 20);
    assert.equal(proof.proofId, createHash("sha256").update(readFileSync(f.evidencePath)).digest("hex"));
    assert.equal(proof.validUntilT, f.evidence.validUntilT);
    assert.equal(proof.executionSource, "verified-venue");
    assert.match(result.stdout, /post-Base qualified virtual PF 2\.00 n=20, owned venue execution PF 2\.00 n=20 → on/);
    const again = f.run(f.proofArgs);
    assert.equal(again.status, 0, again.stderr);
    // The first hysteresis continuation records the off threshold; a further identical run is unchanged.
    const third = f.run(f.proofArgs);
    assert.equal(third.status, 0, third.stderr);
    assert.match(third.stdout, /unchanged/);
  } finally { f.close(); }
});

test("winning sibling cannot promote losing opposite side or a distinct protection config", () => {
  const f = fixture();
  try {
    for (const change of [{ side: -1 }, { cfg: CFG.replace("sl4.5", "sl6") }]) {
      const sibling = structuredClone(f.evidence.lanes[0]);
      Object.assign(sibling, change);
      for (const tape of ["model", "execution"]) for (const c of sibling[tape].closes) Object.assign(c, change);
      for (const c of sibling.model.closes) c.unitR = -0.01;
      f.evidence.lanes.push(sibling);
    }
    put(f.evidencePath, f.evidence);
    const result = f.run(f.proofArgs);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(read(f.patchPath).settings.live.promotedLanes.map(key), [key(f.evidence.lanes[0])]);
    for (const sibling of f.evidence.lanes.slice(1)) assert.equal(read(f.statePath).byIdentity[key(sibling)], false);
  } finally { f.close(); }
});

test("expired, future, NULL and incomplete artifact evidence revokes previously ON exact identities", () => {
  for (const edit of [
    (e) => { e.validUntilT = Date.now() - 1; },
    (e) => { e.asOf = Date.now() + 60_000; e.toT = e.asOf; },
    (e) => { e.lanes[0].execution.closes.at(-1).netReturn = null; },
    (e) => { e.lanes[0].execution.closes.at(-1).ownedQty = 0; },
    (e) => { e.lanes[0].execution.closes[1].exitFillIds = e.lanes[0].execution.closes[0].exitFillIds; },
    (e) => {
      const c = e.lanes[0].execution.closes.at(-1);
      c.ownedQty = 1e-14; c.entryNotional = 1e-12; c.fees = 0; c.funding = 0;
      c.netPnl = c.netReturn * c.entryNotional; c.grossPnl = c.netPnl;
    },
    (e) => {
      for (const c of e.lanes[0].execution.closes) {
        c.grossPnl = 0.2; c.fees = 0.2; c.funding = 0; c.netPnl = 0; c.netReturn = 5e-11;
      }
    },
    (e) => { e.lanes[0].model.complete = false; },
    (e) => { e.lanes[0].execution.toT--; },
  ]) {
    const f = fixture();
    try {
      put(f.evidencePath, f.evidence);
      let result = f.run(f.proofArgs);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(read(f.patchPath).settings.live.promotedLanes.length, 1);
      edit(f.evidence);
      put(f.evidencePath, f.evidence);
      result = f.run(f.proofArgs);
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(read(f.patchPath).settings.live.promotedLanes, []);
    } finally { f.close(); }
  }
});

test("unreadable/malformed artifacts and unbound reference identity fail closed; dry mode never mutates", () => {
  const f = fixture();
  try {
    const patchBefore = readFileSync(f.patchPath);
    const stateBefore = readFileSync(f.statePath);
    let result = f.run(["--dry"]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /would write the patch/);
    assert.deepEqual(readFileSync(f.patchPath), patchBefore);
    assert.deepEqual(readFileSync(f.statePath), stateBefore);
    for (const content of ["{invalid", JSON.stringify(f.evidence)]) {
      writeFileSync(f.evidencePath, content);
      result = f.run(["--evidence", f.evidencePath]);
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(read(f.patchPath).settings.live.promotedLanes, []);
    }
    rmSync(f.evidencePath);
    result = f.run(f.proofArgs);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /artifact unreadable or invalid JSON/);
    assert.deepEqual(read(f.patchPath).settings.live.promotedLanes, []);
  } finally { f.close(); }
});

test("invalid threshold arguments fail before changing the target patch", () => {
  const f = fixture();
  try {
    const before = readFileSync(f.patchPath);
    const result = f.run(["--min-n", "0"]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Invalid promotion thresholds/);
    assert.deepEqual(readFileSync(f.patchPath), before);
  } finally { f.close(); }
});
