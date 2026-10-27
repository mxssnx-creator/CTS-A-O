import test from "node:test";
import assert from "node:assert/strict";
import { auditProgression } from "./audit-low-range-progression.mjs";

const H = 3_600_000, start = 10 * H;
const id = "follow|low-range-12-edge-turn-standalone@m15|tp0.55|sl0.35|tr0|h12|sh";
const fixture = () => {
  const rows = [7, 8, 9].map((hour) => ["BTC-USDT", 1, hour * H - 60_000, hour * H, 0.01]);
  const tr = { cfg: id, sym: "BTC-USDT", side: 1, entryT: start + 600_000, exitT: start + 1_200_000,
    closeIndex: 0, unitR: 0.02, allocatedNotional: 1 };
  rows.push([tr.sym, tr.side, tr.entryT, tr.exitT, tr.unitR]);
  for (let i = 1; i <= 3; i++) rows.push(["BTC-USDT", 1, start + 1_200_000 + i * 60_000,
    start + 1_200_000 + (i + 1) * 60_000, -0.05]);
  return {
    raw: { validation: [
      { t: start, checks: [[id, 1, 3, 4, 0.03, 0]], real: [id] },
      { t: start + H, checks: [[id, 0, 0, 0, 0, 0]], real: [] },
    ], tapeTrades: [{ id, kind: "normal", protect: { tag: "sh", sl: 0.0035 }, trades: rows }] },
    report: { sizedOrders: [tr], sizedOpenOrders: [] },
    protocol: { window: { tradeStartT: start, endT: start + 2 * H }, actualWf: {
      stepH: 1, longH: 6, preH: 6, preGate: false, validLastN: 0, lastN: 0,
      gates: { minPf: 1.1, minTrades: 3, maxDdtH: 100, minDdtH: 100, maxDdr: 0, minGreen: 0 },
    } },
  };
};

test("preserves per-config progression, seats and matching owned-direction funded closes", () => {
  const { raw, report, protocol } = fixture();
  const r = auditProgression(raw, report, protocol);
  assert.equal(r.status, "passed");
  assert.equal(r.hours[0].validatedPct, 100);
  assert.equal(r.hours[1].dropped, 1);
  assert.equal(r.configs[0].passed, 1);
  assert.equal(r.matchedSourceTapeCloses, 1);
  assert.equal(r.entryDirectionChecks, 1);
  assert.equal(r.totalSettled.pf, "no-loss");
});

test("a passing sibling cannot cover a missing seat or a losing own-side history", () => {
  const { raw, report, protocol } = fixture();
  raw.validation[0].real = [];
  for (const row of raw.tapeTrades[0].trades.slice(0, 3)) row[4] = -0.01;
  const r = auditProgression(raw, report, protocol);
  assert.equal(r.status, "failed");
  assert.ok(r.violations.some((x) => x.reason.includes("not seated")));
  assert.ok(r.violations.some((x) => x.reason.includes("own direction fails")));
});

test("missing source, duplicate close and incomplete timeline fail instead of silently passing", () => {
  const { raw, report, protocol } = fixture();
  raw.validation.pop();
  raw.tapeTrades = [];
  report.sizedOrders.push({ ...report.sizedOrders[0] });
  const r = auditProgression(raw, report, protocol);
  assert.equal(r.status, "failed");
  assert.ok(r.violations.some((x) => x.reason.includes("incomplete validation")));
  assert.ok(r.violations.some((x) => x.reason.includes("missing exact source")));
  assert.ok(r.violations.some((x) => x.reason.includes("duplicate funded")));
});

test("known zero allocations stay out of funded PF while unknown allocations fail closed", () => {
  const { raw, report, protocol } = fixture();
  report.sizedOrders.push({ ...report.sizedOrders[0], closeIndex: 1, allocatedNotional: 0, unitR: -9 });
  report.sizedOpenOrders.push({ cfg: id, sym: "BTC-USDT", allocatedNotional: 0 });
  let r = auditProgression(raw, report, protocol);
  assert.equal(r.status, "passed");
  assert.equal(r.knownZeroAllocated, 1);
  assert.equal(r.endpointZeroAllocated, 1);
  assert.equal(r.totalSettled.n, 1);
  assert.equal(r.totalSettled.pf, "no-loss");
  report.sizedOrders[1].allocatedNotional = null;
  r = auditProgression(raw, report, protocol);
  assert.equal(r.status, "failed");
  assert.equal(r.unknownAllocations, 1);
});
