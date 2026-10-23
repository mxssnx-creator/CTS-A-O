import assert from "node:assert/strict";
import { it } from "node:test";
import { signalSeatSymbols, signalSeatTapesGen, sigActiveKey } from "./signals.ts";

it("indexed seat selection retains exact symbol/side/type ownership, stable order and bounded slices", () => {
  const syms = Array.from({ length: 12 }, (_, i) => `S${i}-USDT`);
  const tapes = Array.from({ length: 1301 }, (_, i) => ({
    id: `follow|sig-ema-cross-s@m5|cell-${i}`, bot: "follow", ind: "sig-ema-cross-s@m5",
    kind: i % 2 ? "trailing" : "normal", syms, heldOnly: i === 600,
  }));
  const active = new Set(tapes.filter((_, i) => i % 100 === 0).map(t =>
    sigActiveKey(t.bot, t.ind, syms[3], -1, t.kind, t.id)));
  const wrong = tapes[5];
  active.add(sigActiveKey(wrong.bot, wrong.ind, "OUTSIDE", 1, wrong.kind, wrong.id));
  active.add(sigActiveKey(wrong.bot, wrong.ind, syms[0], 1, "normal", wrong.id));
  active.add(sigActiveKey(wrong.bot, "sig-rsi-reversal-s@m5", syms[0], 1, wrong.kind, wrong.id));
  active.add(sigActiveKey(wrong.bot, wrong.ind, syms[0], 1, wrong.kind));
  active.add("malformed|cfg=%ZZ");
  for (let i = 0; i < 260; i++) active.add(`broad-discovery-${i}`);
  const expected = tapes.filter(t => !t.heldOnly && signalSeatSymbols(t, active).size > 0);
  for (const fast of [false, true]) {
    const gen = signalSeatTapesGen(tapes, active, fast);
    let slices = 0;
    for (;;) {
      const result = gen.next();
      if (result.done) {
        assert.deepEqual(result.value, fast ? tapes.filter(t => !t.heldOnly) : expected);
        assert.equal(result.value.some(t => t.heldOnly), false);
        break;
      }
      slices++;
    }
    assert.equal(slices, Math.floor(tapes.length / 128) + (fast ? 0 : Math.floor(active.size / 128)));
  }
  assert.deepEqual(signalSeatTapesGen(tapes, undefined).next(), { value: [], done: true });
  assert.equal(expected.length, 13);
});
