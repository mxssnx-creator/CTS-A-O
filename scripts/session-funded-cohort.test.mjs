import assert from "node:assert/strict";
import { it } from "node:test";
import { fundedSessionCohort } from "./lib/session-funded-cohort.mjs";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stageAudit } from "./audit-micro-stages.mjs";
import { auditSimulationParity } from "./audit-simulation-parity.mjs";

const fixture = () => {
  const rows = [0.04, -0.02, 0.5].map((r, i) => ({
    cfg: `source-${i}`,
    sym: "A",
    side: 1,
    entryT: 10 + i,
    exitT: 20 + i,
    r,
    mult: 1,
    vol: 1,
  }));
  const raw = {
    trades: rows,
    window: { startT: 0, endT: 100 },
    study: { protocolSha256: "frozen" },
  };
  const book = {
    window: raw.window,
    study: raw.study,
    total: { orders: 2, fundedOrders: 2, zeroAllocatedOrders: 1, unknownAllocations: 0 },
    sizedOrders: rows.map((x, closeIndex) => ({
      ...x,
      closeIndex,
      unitNotional: closeIndex === 2 ? 0 : 2,
      volume: 1,
      allocatedNotional: closeIndex === 2 ? 0 : 2,
    })),
  };
  return { raw, book };
};
it("funded stage and parity cohorts exclude a known unfunded winner while keeping every virtual close", () => {
  const { raw, book } = fixture(),
    x = fundedSessionCohort(raw, book);
  assert.deepEqual(
    x.trades.map((t) => t.cfg),
    ["source-0", "source-1"],
  );
  assert.equal(x.virtualTrades.length, 3);
  assert.equal(x.funding.zeroAllocatedCloses, 1);
  assert.equal(
    x.trades.reduce((n, t) => n + Math.max(0, t.r), 0) /
      -x.trades.reduce((n, t) => n + Math.min(0, t.r), 0),
    2,
  );
});
it("missing, duplicate, wrong-identity, invalid and unknown funding cannot certify a primary execution cohort", () => {
  for (const mutate of [
    (b) => b.sizedOrders.pop(),
    (b) => {
      b.sizedOrders[1].closeIndex = 0;
    },
    (b) => {
      b.sizedOrders[0].cfg = "sibling";
    },
    (b) => {
      b.sizedOrders[0].unitNotional = null;
    },
    (b) => {
      b.sizedOrders[0].volume = 2;
    },
    (b) => {
      b.sizedOrders[0].allocatedNotional = 3;
    },
    (b) => {
      b.total.unknownAllocations = 1;
    },
    (b) => {
      b.study = { protocolSha256: "other" };
    },
  ]) {
    const { raw, book } = fixture();
    mutate(book);
    assert.throws(() => fundedSessionCohort(raw, book));
  }
});
it("archived all-funded evidence is sufficient only with exactly zero exclusions and unknowns", () => {
  const { raw, book } = fixture();
  delete book.sizedOrders;
  assert.throws(() => fundedSessionCohort(raw, book), /per-close allocation evidence/);
  book.total = { orders: 3, fundedOrders: 3, zeroAllocatedOrders: 0, unknownAllocations: 0 };
  assert.equal(fundedSessionCohort(raw, book).trades.length, 3);
  book.total.unknownAllocations = 1;
  assert.throws(() => fundedSessionCohort(raw, book), /Unknown allocation/);
});
it("saved stage and exact-tape audits reproduce primary report PF on the same funded cohort", async () => {
  const dir = mkdtempSync(join(tmpdir(), "micro-funded-audits-"));
  try {
    const { raw, book } = fixture();
    raw.engine = { baseEvaluated: 3, basePassed: 3, baseByRange: [] };
    raw.funnel = { counts: { basePassed: 3, poolConfigs: 3 } };
    raw.validation = [];
    raw.tapeTrades = raw.trades.map((x) => ({
      id: x.cfg,
      trades: [[x.sym, x.side, x.entryT, x.exitT, x.r]],
    }));
    writeFileSync(join(dir, "raw.json"), JSON.stringify(raw));
    writeFileSync(
      join(dir, "protocol.json"),
      JSON.stringify({
        source: { sha256: "fixture" },
        window: raw.window,
        actualSettings: { cost: 0.0015 },
      }),
    );
    mkdirSync(join(dir, "report"));
    writeFileSync(join(dir, "report/data.json"), JSON.stringify(book));
    const stages = await stageAudit(dir),
      parity = await auditSimulationParity(join(dir, "raw.json"));
    assert.equal(stages.fundedModeledExecution.closes, 2);
    assert.equal(stages.fundedModeledExecution.pf, 2);
    assert.equal(parity.totalExecutions, 2);
    assert.equal(parity.execution.pf, 2);
    assert.equal(parity.tape.pf, 2);
    assert.equal(parity.funding.zeroAllocatedCloses, 1);
    assert.equal(parity.ok, true);
    book.sizedOrders[0].unitNotional = null;
    writeFileSync(join(dir, "report/data.json"), JSON.stringify(book));
    await assert.rejects(stageAudit(dir), /Unknown funding/);
    await assert.rejects(auditSimulationParity(join(dir, "raw.json")), /Unknown funding/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
