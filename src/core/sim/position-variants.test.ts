import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import { positionCounts } from "../position-windows.ts";
import { walkForwardVariants } from "./report-variants.ts";
import { defaultWalkForward } from "./walkforward.ts";

test("count report variants change the named global sample and never simulate ignored legacy windows", () => {
  const base = defaultWalkForward(DEFAULT_SETTINGS);
  base.gates = structuredClone(base.gates);
  base.gates.positionWindows!.byRange = { mc: { main: 75, entry: 25 } };
  base.gates.positionWindows!.byConfig = { own: { main: 50, entry: 30 } };
  base.engineSideAccept = { enabled: true, hours: 24, minTrades: 30, minPf: 1.1 };
  const before = structuredClone(base.gates.positionWindows);
  const variants = walkForwardVariants(base, { kinds: { normal: 1 }, signalTapes: 0 });
  const main = variants.filter((v) => v.id.startsWith("gate:positions-main-"));
  assert.ok(main.length > 0);
  for (const v of main) {
    assert.equal(v.status, "run");
    const n = Number(v.id.split("-").at(-1));
    const counts = positionCounts(v.opts!.gates.positionWindows!, "mc", "own");
    assert.equal(
      counts.main,
      n,
      "a stale range/config override cannot defeat the named global variation",
    );
    assert.equal(counts.entry, 30, "unrelated exact-config stages remain unchanged");
  }
  for (const v of variants.filter((v) =>
    /^gate:(lastN-|validLastN-|signalLastN-|lastNFloor-|warmup$)/.test(v.id),
  )) {
    assert.equal(v.status, "na");
    assert.equal(v.opts, undefined);
  }
  for (const v of variants.filter((v) => v.id.startsWith("gate:positions-base-"))) {
    assert.equal(
      v.status,
      "recompute",
      "Base evidence cannot be re-labelled over the same retained tapes",
    );
    assert.equal(v.opts, undefined);
  }
  assert.ok(
    variants.filter((v) => v.id.startsWith("sig:engineSide-hours")).every((v) => v.status === "na"),
  );
  assert.deepEqual(base.gates.positionWindows, before);
});
