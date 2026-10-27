import assert from "node:assert/strict";
import { test } from "node:test";
import { makeTape, type ConfigTape } from "../sim/walkforward.ts";
import { mergeWorkerTapesGen } from "./tape-merge.ts";

function tape(bot: "follow" | "revert", ind: string, id: string): ConfigTape {
  return makeTape(id, bot, ind, { tp: .01, sl: .01, trail: 0, hold: 12 }, "normal", [], [], [], []);
}
function drain<T>(g: Generator<void, T>) {
  let yields = 0;
  for (;;) {
    const next = g.next();
    if (next.done) return { value: next.value, yields };
    yields++;
  }
}

test("worker merge preserves original pair order, reply order within a pair, and tape identities", () => {
  const a = tape("follow", "a@m1", "a"), b = tape("revert", "b@m1", "b"),
    c = tape("follow", "a@m1", "c"), unknown = tape("follow", "missing@m1", "unknown");
  a.open = [{ cfg: "a", sym: "AAA" }, { cfg: "other", sym: "BBB" }] as ConfigTape["open"];
  a.pending = [{ sym: "AAA", side: 1 }];
  const { value } = drain(mergeWorkerTapesGen([{ tapes: [b, a] }, { tapes: [unknown, c] }],
    ["follow|a@m1", "revert|b@m1"]));
  assert.deepEqual(value.map((t) => t.id), ["a", "unknown", "c", "b"]);
  assert.equal(value[0], a);
  assert.equal(value[1], unknown);
  assert.equal(a.open[0].cfg, "a");
  assert.equal(a.open[1].cfg, "other");
  assert.equal(a.pending[0].sym, "AAA");
});

test("merge can yield inside one large tape and while flattening many tapes", () => {
  const large = tape("follow", "a@m1", "large");
  large.open = Array.from({ length: 1024 }, (_, i) => ({ cfg: "large", sym: `S${i % 4}` })) as ConfigTape["open"];
  large.pending = Array.from({ length: 1024 }, (_, i) => ({ sym: `S${i % 4}`, side: 1 as const }));
  const many = Array.from({ length: 1024 }, (_, i) => tape("follow", "a@m1", `id${i}`));
  const { value, yields } = drain(mergeWorkerTapesGen([{ tapes: [large, ...many] }], ["follow|a@m1"]));
  assert.equal(value.length, 1025);
  assert.ok(yields >= 16, `bounded work within open, pending, tape and flatten loops: ${yields}`);
  assert.equal(value[0], large);
  assert.equal(value.at(-1), many.at(-1));
});
