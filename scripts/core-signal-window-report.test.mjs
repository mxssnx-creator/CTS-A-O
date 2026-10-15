import test from "node:test";
import assert from "node:assert/strict";
import { hourlyTypeRows, sourceDetailRows } from "./core-signal-window-report.mjs";

const H = 3_600_000;
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
