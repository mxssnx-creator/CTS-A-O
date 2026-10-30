import assert from "node:assert/strict";
import { test } from "node:test";
import { acceptKey, acceptOnWindow, acceptPreferExchange, EngineSideIndex, engineSideKey,
  SignalAcceptIndex, SignalGuard, type AcceptTape, type SideTape } from "./signals.ts";

const H = 3_600_000;
const signal: AcceptTape = {
  id: "follow|sig-ema-cross-s@m1|test", ind: "sig-ema-cross-s@m1", kind: "normal",
  n: 3, syms: ["A"], symI: [0, 0, 0], side: [1, 1, 1],
  exitT: [H, 2 * H, 3 * H], entryT: [H - 1, 2 * H - 1, 3 * H - 1], r: [NaN, .04, -.02],
};
const key = acceptKey(signal.ind, "A", 1, signal.kind, signal.id);
const drain = (g: Generator<number, void>) => { for (const _ of g) { /* complete the index */ } };

test("eager, lazy and generic Signal indexes retain unknown returns only in their own window", () => {
  const indexes = [new SignalAcceptIndex([signal]), new SignalAcceptIndex([signal], true),
    new SignalAcceptIndex([signal, { ...signal, n: 0 }])];
  for (const index of indexes) {
    assert.ok(Number.isNaN(index.stats(key, 3 * H, 3).pf), "unknown close cannot become a valid ratio");
    assert.equal(index.stats(key, 3 * H, 3).n, 3);
    assert.deepEqual(index.stats(key, 3 * H, 2), { n: 2, pf: 2 }, "old unknown must expire");
    assert.deepEqual(index.stats(key, 3 * H, 1), { n: 1, pf: 0 }, "real losses remain losses");
  }
});

test("Engine side windows and same-hour append recover when unknown evidence ages out", () => {
  const make = (times: number[], returns: number[]): SideTape => ({ ind: "ema-9-21@m1", kind: "normal",
    n: times.length, protect: { tag: "sh" }, side: times.map(() => 1), exitT: times, r: returns });
  const first = make([H, 2 * H], [NaN, .01]), rest = make([2 * H, 3 * H], [.03, -.02]);
  const index = new EngineSideIndex(); drain(index.fill([first]));
  const next = index.fork(); drain(next.append([rest]));
  const side = engineSideKey("normal", "sh", 1);
  assert.ok(Number.isNaN(next.stats(side, 4 * H, 3).pf));
  const recovered = next.stats(side, 4 * H, 2);
  assert.equal(recovered.n, 3);
  assert.ok(Math.abs(recovered.pf - 2) < 1e-12);
  assert.ok(Number.isNaN(index.stats(side, 3 * H, 2).pf), "append must not rewrite the old generation");
  assert.deepEqual(index.stats(side, 3 * H, 1), { n: 1, pf: Infinity });
});

test("unknown evidence cannot use a sparse-window or exchange-to-model warmup pass", () => {
  const rule = { hours: 1, minTrades: 3, minPf: 1.1 };
  assert.equal(acceptOnWindow(() => ({ n: 1, pf: NaN }), rule), false);
  assert.equal(acceptOnWindow(() => ({ n: 0, pf: 0 }), rule), true, "the existing empty warmup policy is unchanged");
  const exchange = { stats: () => ({ n: 1, pf: NaN }) };
  assert.equal(acceptPreferExchange(exchange, "own", 3 * H, rule, () => true), false);
});

test("the exact Signal guard cannot approve a complete window containing an unknown return", () => {
  const guard = new SignalGuard();
  guard.add("own", .01, H); guard.add("own", NaN, 2 * H);
  assert.equal(guard.disabled("own", 2), true);
  guard.add("own", .02, 3 * H);
  assert.equal(guard.disabled("own", 1), false, "the old unknown expires from the Last-N tail");
});

test("Signal indexes match an independent rolling reference across symbols and both directions", () => {
  const values = [.04, -.02, NaN, 0, .01, Infinity, -.01, .02, -.02, .03, -Infinity, .02];
  const n = 48, tape: AcceptTape = { ...signal, n, syms: ["A", "B"],
    symI: Array.from({ length: n }, (_, i) => i % 2),
    side: Array.from({ length: n }, (_, i) => i % 4 < 2 ? 1 : -1),
    exitT: Array.from({ length: n }, (_, i) => (i + 1) * H / 4),
    entryT: Array.from({ length: n }, (_, i) => (i + 1) * H / 4 - 1),
    r: Array.from({ length: n }, (_, i) => values[i % values.length]),
  };
  const indexes = [new SignalAcceptIndex([tape]), new SignalAcceptIndex([tape], true),
    new SignalAcceptIndex([tape, { ...tape, n: 0 }])];
  for (const sym of ["A", "B"]) for (const side of [1, -1])
    for (const t of [H, 3 * H, 6 * H, 9 * H, 12 * H, 16 * H]) for (const hours of [1, 3, 6]) {
      const rows = Array.from({ length: n }, (_, i) => i).filter((i) => tape.syms[tape.symI[i]] === sym &&
        tape.side[i] === side && tape.exitT[i] > t - hours * H && tape.exitT[i] <= t);
      const returns = rows.map((i) => tape.r[i]);
      const gp = returns.reduce((sum, r) => sum + Math.max(0, r), 0),
        gl = returns.reduce((sum, r) => sum + Math.max(0, -r), 0);
      const expected = returns.some((r) => !Number.isFinite(r)) ? NaN : gl ? gp / gl : gp ? Infinity : 0;
      for (const index of indexes) {
        const got = index.stats(acceptKey(tape.ind, sym, side, tape.kind, tape.id), t, hours);
        assert.equal(got.n, rows.length);
        if (Number.isNaN(expected)) assert.ok(Number.isNaN(got.pf));
        else if (!Number.isFinite(expected)) assert.equal(got.pf, expected);
        else assert.ok(Math.abs(got.pf - expected) < 1e-12, `${sym}/${side}/${t}/${hours}`);
      }
    }
});

test("invalid returns from a later batch survive hourly append and expire independently", () => {
  const make = (times: number[], returns: number[]): SideTape => ({ ind: "ema-9-21@m1", kind: "normal",
    n: times.length, protect: { tag: "sh" }, side: times.map(() => 1), exitT: times, r: returns });
  for (const later of [[2 * H, 3 * H], [3 * H, 4 * H]]) {
    const a = make([H, 2 * H], [.01, .02]);
    const b = make(later, [Infinity, -.01]);
    const ix = new EngineSideIndex(); drain(ix.fill([a])); drain(ix.append([b]));
    const all = new EngineSideIndex(); drain(all.fill([a, b]));
    const own = engineSideKey("normal", "sh", 1);
    for (const t of [3 * H, 4 * H, 5 * H, 6 * H]) for (const hours of [1, 2, 4]) {
      const x = ix.stats(own, t, hours), y = all.stats(own, t, hours);
      assert.equal(x.n, y.n);
      if (Number.isNaN(y.pf)) assert.ok(Number.isNaN(x.pf));
      else if (!Number.isFinite(y.pf)) assert.equal(x.pf, y.pf);
      else assert.ok(Math.abs(x.pf - y.pf) < 1e-12);
    }
  }
});
