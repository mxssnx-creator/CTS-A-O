// Every strategy lane is processed on its own: an Active mode or a pooled gate never vetoes another lane's entries.
import assert from "node:assert/strict";
import { it } from "node:test";
import { CandidateDirectionBook } from "./walkforward.ts";
import { RelateBook } from "./relate-volume.ts";
import { DEFAULT_RELATE_ADJUSTMENT } from "../config.ts";

it("the direction gate keeps one record per strategy type: a losing DCA side does not close the Normal side", () => {
  const book = new CandidateDirectionBook();
  for (let i = 0; i < 8; i++) book.add({ side: 1, r: -0.01, open: false, cfg: `follow|x|dca${i}`, type: "dca" });
  for (let i = 0; i < 8; i++) book.add({ side: 1, r: 0.01, open: false, cfg: `follow|x|n${i}`, type: "normal" });
  assert.ok(book.tailSum(1, 8, { cfg: "follow|x|n0", type: "normal" }).sum > 0, "Normal long is judged on Normal closes");
  assert.ok(book.tailSum(1, 8, { cfg: "follow|x|dca0", type: "dca" }).sum < 0, "DCA long on DCA closes");
  assert.equal(book.tailSum(1, 8, { cfg: "follow|x|ax", type: "axis" }).n, 0, "Axis has its own (empty) record");
  assert.equal(book.tailSum(-1, 8, { cfg: "follow|x|n0", type: "normal" }).n, 0, "sides stay separate");
});

it("Relate Active never vetoes an entry of any type: below its step the base is allowed at unit volume", () => {
  const config = { ...DEFAULT_RELATE_ADJUSTMENT, enabled: true, auto: false, activeStep: 3, ratio: 0.2, steps: 5,
    minTrades: 10, lastN: 250 };
  for (const strategy of ["normal", "trailing", "dca", "dca-active", "axis"]) {
    const id = { cfg: `follow|x|${strategy}`, sym: "A", side: 1, ind: "x@m5", strategy, coordination: "ordinary", range: "mc" };
    const b = new RelateBook(config);
    for (let i = 0; i < 9; i++) b.add({ ...id, r: 0.01, accepted: true, relateMeasured: true, relateBase: 1 });
    b.add({ ...id, r: -0.01, accepted: true, relateMeasured: true, relateBase: 1 });
    const d = b.decide(id);
    assert.equal(d.allowed, true, strategy);
    assert.equal(d.volume, 1, `${strategy}: no raise below the active step`);
  }
});
