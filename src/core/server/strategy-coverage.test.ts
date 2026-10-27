import assert from "node:assert/strict";
import { test } from "node:test";
import type { ConfigTape } from "../sim/walkforward.ts";
import { strategyCoverageGen } from "./strategy-coverage.ts";

function run(tapes: Pick<ConfigTape, "ind" | "kind" | "heldOnly" | "carried">[]) {
  const gen = strategyCoverageGen(tapes);
  let yields = 0;
  for (;;) {
    const r = gen.next();
    if (r.done) return { result: r.value, yields };
    yields++;
  }
}

test("coverage reports every published strategy separately, including Signal, carried and held-only tapes", () => {
  const tapes: Pick<ConfigTape, "ind" | "kind" | "heldOnly" | "carried">[] = [
    { ind: "ema@m1", kind: "normal" },
    { ind: "ema@m1", kind: "trailing" },
    { ind: "ema@m1", kind: "trailing-only" },
    { ind: "ema@m1", kind: "dca" },
    { ind: "sig-ema@m1", kind: "dca-active" },
    { ind: "ema@m1", kind: "axis", heldOnly: true, carried: true },
    { ind: "sig-ema@m1", kind: "exit", heldOnly: true },
  ];
  const { result } = run(tapes);
  assert.equal(result.total, 7);
  assert.equal(Object.values(result.byKind).reduce((n, row) => n + row.engine + row.signals, 0), 7);
  assert.deepEqual(result.byKind.axis, { engine: 1, signals: 0, heldOnly: 1, carried: 1 });
  assert.deepEqual(result.byKind["dca-active"], { engine: 0, signals: 1, heldOnly: 0, carried: 0 });
  assert.deepEqual(result.byKind.exit, { engine: 0, signals: 1, heldOnly: 1, carried: 0 });
  assert.equal(result.byKind.normal.engine, 1);
});

test("coverage leaves an absent kind absent and yields during a large completed cohort", () => {
  const { result, yields } = run(Array.from({ length: 1025 }, () => ({ ind: "ema@m1", kind: "normal" as const })));
  assert.equal(result.total, 1025);
  assert.equal(result.byKind.normal.engine, 1025);
  assert.equal(result.byKind.axis, undefined);
  assert.equal(yields, 4);
});
