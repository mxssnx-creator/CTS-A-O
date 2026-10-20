import assert from "node:assert/strict";
import { it } from "node:test";
import { addValidation, cohortPf, emptyCohort } from "./audit-micro-stages.mjs";
it("stage PF includes only individually passing configs and the actual seated subset", () => {
  const checks = [
    ["pass", 1, 30, 2, 6, 3],
    ["rejected-winner", 0, 100, 9, 90, 10],
    ["passed-but-unseated", 1, 20, 1.5, 3, 2],
  ];
  assert.equal(cohortPf(addValidation(emptyCohort(), checks)).pf, 9 / 5);
  assert.deepEqual(
    cohortPf(addValidation(emptyCohort(), checks, new Set(["pass", "rejected-winner"]))),
    { configs: 1, closes: 30, gp: 6, gl: 3, unknownReturns: 0, pf: 2, pfState: "measured" },
  );
});
it("empty, missing evidence and the no-loss gate convention never become measured finite profitability", () => {
  assert.equal(cohortPf(emptyCohort()).pf, null);
  assert.equal(cohortPf({ ...emptyCohort(), closes: 1, gp: 1 }).pfState, "no-loss-gate-score-4");
  assert.equal(cohortPf({ ...emptyCohort(), closes: 2, gp: 1, gl: 1, unknownReturns: 1 }).pf, null);
});
it("source-hour selection assigns exact-hour settlements to the same completed hour as central statistics", async () => {
  const { mkdtempSync, writeFileSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { stageAudit } = await import("./audit-micro-stages.mjs");
  const dir = mkdtempSync(join(tmpdir(), "micro-stage-hour-"));
  const H = 3600000;
  try {
    writeFileSync(
      join(dir, "protocol.json"),
      JSON.stringify({
        source: { sha256: "test" },
        actualSettings: { cost: 0.0015 },
        window: { tradeStartT: 0, endT: 2 * H },
      }),
    );
    const cfg = "follow|micro-1-drawdown-turn-fast@m1|tp1|sl1|tr0|h60|mc";
    writeFileSync(
      join(dir, "raw.json"),
      JSON.stringify({
        trades: [H, H + 1, 2 * H].map((exitT, i) => ({
          cfg,
          sym: "A",
          side: 1,
          entryT: exitT - 1,
          exitT,
          r: [0.02, -0.01, 0.005][i],
          mult: 1,
        })),
        validation: [],
        engine: { baseEvaluated: 1, basePassed: 1, mainPairs: 1, baseByRange: [] },
        funnel: { counts: { basePassed: 1, poolConfigs: 1 } },
      }),
    );
    const result = await stageAudit(dir);
    assert.equal(result.perIndication[0].activeHours, 2);
    assert.equal(result.perIndication[0].positiveHours, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
