import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

test("training selection keeps funded Micro evidence independent of winning siblings and refuses reuse or later windows", () => {
  const dir = mkdtempSync(join(tmpdir(), "micro-selection-"));
  try {
    const endT = Date.parse("2026-10-20T00:00:00Z"),
      startT = endT - 12 * 3600000;
    const winner = "micro-1-break-channel-fast",
      loser = "micro-1-break-channel-failure-fast",
      sibling = "micro-1-break-channel-wide-fast",
      unfunded = "micro-1-break-channel-activity-fast";
    const trades = [winner, loser, sibling, unfunded].flatMap((id) =>
      Array.from({ length: 120 }, (_, i) => {
        const exitT = startT + Math.floor(i / 20) * 3600000 + ((i % 20) + 1) * 60000;
        return {
          cfg: `follow|${id}@m1|tp1|sl1|tr0|h60|${id === sibling ? "mn" : "mc"}`,
          sym: "A",
          side: 1,
          entryT: exitT - 60000,
          exitT,
          r: id === loser ? -0.01 : i % 3 ? 0.01 : -0.005,
          mult: 1,
          vol: 1,
        };
      }),
    );
    const write = (file, x) => writeFileSync(join(dir, file), JSON.stringify(x));
    const protocol = { source: { sha256: "test-source" }, window: { tradeStartT: startT, endT } };
    write("protocol.json", protocol);
    write("raw.json", { trades, window: { startT, endT } });
    mkdirSync(join(dir, "report"));
    const allocations = trades.map((t, closeIndex) => ({
      ...t,
      closeIndex,
      unitNotional: t.cfg.includes(unfunded) ? 0 : 2,
      volume: 1,
      allocatedNotional: t.cfg.includes(unfunded) ? 0 : 2,
    }));
    write("report/data.json", {
      window: { startT, endT },
      total: { orders: 360, fundedOrders: 360, zeroAllocatedOrders: 120, unknownAllocations: 0 },
      sizedOrders: allocations,
    });
    const run = (out) =>
      spawnSync(
        process.execPath,
        ["--no-warnings", resolve("scripts/select-micro-24-research.mjs"), dir, join(dir, out)],
        { encoding: "utf8" },
      );
    let r = run("selected");
    assert.equal(r.status, 0, r.stderr);
    const result = JSON.parse(readFileSync(join(dir, "selected/selection.json")));
    assert.deepEqual(result.focus, [winner]);
    assert.equal(result.selected[0].n, 120);
    assert.equal(result.selected[0].distinctOnsets, 120);
    assert.equal(result.selected[0].activeHours, 6);
    assert.equal(result.selected[0].positiveHours, 6);
    assert.equal(
      result.evidence.find((x) => x.id.startsWith(loser)).pf,
      0,
      "losing training rows remain in evidence",
    );
    assert.ok(!result.evidence.some((x) => x.id.startsWith(sibling) || x.id.startsWith(unfunded)));
    assert.notEqual(run("selected").status, 0, "a sealed result cannot be reselected");
    write("protocol.json", {
      ...protocol,
      window: { ...protocol.window, endT: endT + 12 * 3600000 },
    });
    assert.notEqual(run("later").status, 0, "later test outcomes are not training inputs");
    write("protocol.json", protocol);
    trades[0].mult = null;
    write("raw.json", { trades, window: { startT, endT } });
    assert.notEqual(run("unknown").status, 0, "missing unit provenance cannot rank a source");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
