import assert from "node:assert/strict";
import { test } from "node:test";
import type { Trade } from "../domain/types.ts";
import { ProcessedValidationBook } from "./processed-validation.ts";

const trade = (change: Partial<Trade> = {}): Trade => ({ cfg: "follow|indicator|cell", sym: "A", side: 1,
  entryT: 1, exitT: 2, entry: 100, exit: 99, r: -.01, mult: 1, kind: "normal", reason: "sl",
  bars: 1, mfe: 0, mae: 0, ...change });
const get = (b: ProcessedValidationBook, cfg = "follow|indicator|cell", sym = "A", side = 1, kind = "normal") =>
  b.verdict(cfg, sym, side, kind, 3, 1.1);

test("processed validation preserves config, symbol, side and strategy identity", () => {
  const b = new ProcessedValidationBook(3);
  b.close(trade({ markedOpen: true, r: .5 }));
  assert.equal(get(b).n, 0, "an open mark is not a close");
  for (let i = 0; i < 3; i++) {
    b.close(trade());
    b.close(trade({ sym: "B", r: .1 }));
    b.close(trade({ side: -1, r: .1 }));
    b.close(trade({ kind: "trailing", r: .1 }));
    b.close(trade({ cfg: "follow|indicator|other-cell", r: .1 }));
  }
  assert.equal(get(b).state, "failed");
  assert.equal(get(b, "follow|indicator|cell", "B").state, "qualified");
  assert.equal(get(b, "follow|indicator|cell", "A", -1).state, "qualified");
  assert.equal(get(b, "follow|indicator|cell", "A", 1, "trailing").state, "qualified");
  assert.equal(get(b, "follow|indicator|other-cell").state, "qualified");
});

test("processed warmup, unknown evidence and recovery never invent returns", () => {
  const b = new ProcessedValidationBook(3);
  b.close(trade({ r: .02, mult: 2 }));
  assert.deepEqual(get(b), { ok: true, state: "warming", n: 1, pf: null });
  b.close(trade({ r: -.02, mult: undefined }));
  assert.equal(get(b).state, "unknown", "missing execution weighting stays in the chronological sample");
  b.close(trade({ r: .02, mult: 2 }));
  b.close(trade({ r: .02, mult: 2 }));
  assert.equal(get(b).state, "unknown");
  b.close(trade({ r: .02, mult: 2 }));
  assert.equal(get(b).state, "qualified", "only three subsequent known closes replace the unknown");
  assert.equal(get(b, "", "A").state, "unknown");
});
