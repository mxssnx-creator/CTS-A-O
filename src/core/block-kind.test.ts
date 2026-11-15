import assert from "node:assert/strict";
import { test } from "node:test";
import { configId, kindOfId, parseConfigId } from "./pipeline/pipeline.ts";
import { kindExecutable } from "./sim/walkforward.ts";
import { DEFAULT_TOGGLES } from "./config.ts";

const p = { tp: 0.012, sl: 0.008, trail: 0, hold: 16 } as const;

test("block is its own strategy kind: its config id round-trips, is recognised and carries the same protection", () => {
  const id = configId("follow", "rsi-mom-14-20@m15", { ...p }, "block");
  assert.equal(id.endsWith("|blk"), true);
  assert.equal(kindOfId(id), "block");
  const parsed = parseConfigId(id);
  assert.ok(parsed, "a block id parses");
  assert.equal(parsed.protect.tp, p.tp);
  assert.equal(parsed.protect.sl, p.sl);
  assert.equal(parsed.protect.hold, p.hold);
  // the ordinary normal id of the same protection is unchanged and still normal
  const normal = configId("follow", "rsi-mom-14-20@m15", { ...p }, "normal");
  assert.equal(kindOfId(normal), "normal");
  assert.notEqual(normal, id);
});

test("block executes only with the block switch; normal does not depend on it", () => {
  assert.equal(kindExecutable("block", { ...DEFAULT_TOGGLES, block: true }), true);
  assert.equal(kindExecutable("block", { ...DEFAULT_TOGGLES, block: false }), false);
  // unchanged: normal still runs with normal on, whatever block says
  assert.equal(kindExecutable("normal", { ...DEFAULT_TOGGLES, normal: true, block: false }), true);
});
