import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  EngineSideIndex,
  SignalAcceptIndex,
  acceptKey,
  engineSideKey,
  type AcceptTape,
  type SideTape,
} from "./signals.ts";

const H = 3_600_000;
const drain = (g: Generator) => {
  for (const _ of g);
};
const tape = (ind: string, n: number, offset = 0): SideTape & AcceptTape => ({
  id: `${ind}|tp1|sl2`,
  ind,
  kind: "normal",
  protect: { tag: "sh" },
  n,
  syms: ["A", "B"],
  symI: Array.from({ length: n }, (_, i) => (i + offset) % 2),
  side: Array.from({ length: n }, (_, i) => ((i + offset) % 3 ? 1 : -1)),
  exitT: Array.from({ length: n }, (_, i) => H + ((i + offset) * H) / 7),
  entryT: Array.from({ length: n }, (_, i) => H / 2 + ((i + offset) * H) / 7),
  r: Array.from({ length: n }, (_, i) => ((i + offset) % 5 ? -0.003 : 0.008)),
});
const near = (a: { n: number; pf: number }, b: { n: number; pf: number }) => {
  assert.equal(a.n, b.n);
  assert.ok(Object.is(a.pf, b.pf) || Math.abs(a.pf - b.pf) < 1e-11, `${a.pf} != ${b.pf}`);
};
describe("acceptance generations after incremental closes", () => {
  it("retains losses, exact groups and earlier snapshots while appending same-hour and new-hour closes", () => {
    const first = [tape("trend-ema@m1", 21), tape("inverse-known-trend-ema@m5", 21)];
    const index = new EngineSideIndex();
    drain(index.fill(first));
    const key = engineSideKey("normal", "sh", 1);
    const before = index.stats(key, 20 * H, 24);
    const next = index.fork();
    for (let from = 21; from < 49; from += 7) {
      drain(next.append(first.map((tp) => tape(tp.ind, 7, from))));
      const expected = new EngineSideIndex();
      drain(expected.fill(first.map((tp) => tape(tp.ind, from + 7))));
      for (const side of [-1, 1])
        for (const ind of [undefined, ...first.map((tp) => tp.ind)])
          for (const hours of [1, 3, 12, 24])
            for (const time of [3.1, 4, 5, 6, 8, 20])
              near(
                next.stats(engineSideKey("normal", "sh", side, ind), time * H, hours),
                expected.stats(engineSideKey("normal", "sh", side, ind), time * H, hours),
              );
      assert.deepEqual(
        index.stats(key, 20 * H, 24),
        before,
        "previous research snapshot remains immutable",
      );
    }
    assert.ok(next.stats(key, 20 * H, 24).pf < 1, "losing evidence remains losing");
  });

  it("updates only the matching exact Signal config and leaves unrelated or earlier generations intact", () => {
    const a = tape("sig-ema-cross-s@m1", 21),
      b = tape("sig-macd-cross-s@m5", 21);
    const old = new SignalAcceptIndex([a, b]),
      next = old.fork();
    const updated = tape(a.ind, 49);
    drain(next.fill([updated]));
    const full = new SignalAcceptIndex([updated, b]);
    for (const tp of [a, b])
      for (const sym of tp.syms)
        for (const side of [-1, 1]) {
          const key = acceptKey(tp.ind, sym, side, tp.kind, tp.id);
          for (const t of [3, 5, 9, 20])
            for (const hours of [1, 6, 24])
              near(next.stats(key, t * H, hours), full.stats(key, t * H, hours));
          if (tp === b) assert.deepEqual(next.stats(key, 20 * H, 24), old.stats(key, 20 * H, 24));
        }
    const key = acceptKey(a.ind, "A", 1, a.kind, a.id);
    assert.ok(next.stats(key, 20 * H, 24).n > old.stats(key, 20 * H, 24).n);
  });
});
