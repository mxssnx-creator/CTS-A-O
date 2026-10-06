// Every registered indication fires both ways: on a rich synthetic market and its price mirror (K / price: rises
// become falls, highs become lows) every engine indication (INDICATIONS: base kinds, research batches, Micro, the
// Stable-02 ports and the "@x4" combined timeframes) has at least one long onset AND one short onset, and every
// signal source (SIGNAL_SOURCES, short and medium range) enters at least once long and once short through the path
// the signals use (bot "follow" on the source's own onsets). An indication that can only ever fire one way would
// trade one side of every market; it fails here unless it is on the explicit exception list below with its reason.
// (symmetry.test.ts checks the counts swap with the mirror; this file checks that both sides exist at all.)
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { INDICATIONS, indicationState, laneInd } from "./indications/registry.ts";
import { SIGNAL_SOURCES, signalId } from "./signal-config.ts";
import { comboSignal } from "./bots/bots.ts";
import { SeriesCache } from "./indications/cache.ts";
import { barsFromCandles, syntheticCandles } from "./market/bars.ts";
import { makeUniverse } from "./pipeline/pipeline.ts";
import type { Candle } from "./domain/types.ts";

const END = Date.UTC(2026, 9, 1);

/**
 * Copied from src/core/processing.test.ts (`richCandles`, not exported there): the synthetic random walk plus market
 * events every few hundred bars — a capitulation, a squeeze rally, isolated volume spikes with long wicks — so every
 * indication has its trigger somewhere. The events alternate direction.
 */
function richCandles(sym: string, tf: number, n: number, end: number, seed: number): Candle[] {
  const cs = syntheticCandles(sym, tf, n, end, seed).map((c) => ({
    ...c,
    v: 100 + ((c.t / 60_000) % 37),
  }));
  for (let at = 150; at + 60 < cs.length; at += 290) {
    const dir = Math.floor(at / 290) % 2 ? 1 : -1;
    for (let j = 0; j < 30; j++) {
      const i = at + j;
      const o = cs[i - 1].c;
      const c = o * (1 + dir * 0.006);
      cs[i] = {
        ...cs[i],
        o,
        c,
        h: Math.max(o, c) * 1.001,
        l: Math.min(o, c) * 0.999,
        v: 300 + j * 40,
      };
    }
    const i = at + 30;
    const o = cs[i - 1].c;
    const c = o * (1 - dir * 0.004);
    const ext = o * (1 + dir * 0.02);
    cs[i] = { ...cs[i], o, c, h: Math.max(o, c, ext), l: Math.min(o, c, ext), v: 2400 };
    for (let j = 1; j <= 20; j++) {
      const k = i + j;
      const o2 = cs[k - 1].c;
      const c2 = o2 * (1 - dir * 0.003);
      cs[k] = {
        ...cs[k],
        o: o2,
        c: c2,
        h: Math.max(o2, c2) * 1.001,
        l: Math.min(o2, c2) * 0.999,
        v: 400,
      };
    }
    const shift = cs[i + 20].c / cs[i + 21].o;
    for (let k = i + 21; k < cs.length; k++)
      cs[k] = {
        ...cs[k],
        o: cs[k].o * shift,
        h: cs[k].h * shift,
        l: cs[k].l * shift,
        c: cs[k].c * shift,
      };
    const f = at + 140;
    if (f + 1 < cs.length) {
      const o2 = cs[f - 1].c;
      const c2 = o2 * (1 + dir * 0.03);
      const far = o2 * (1 + dir * 0.06);
      cs[f] = { ...cs[f], o: o2, c: c2, h: Math.max(o2, far), l: Math.min(o2, far), v: 4000 };
      const sh = c2 / cs[f + 1].o;
      for (let k = f + 1; k < cs.length; k++)
        cs[k] = { ...cs[k], o: cs[k].o * sh, h: cs[k].h * sh, l: cs[k].l * sh, c: cs[k].c * sh };
    }
  }
  return cs;
}

/** Copied from src/core/indications/symmetry.test.ts (`mirror`, not exported there): the price mirror K / price. */
const mirror = (cs: readonly Candle[]) => {
  const K = cs[0].c * cs[0].c;
  return cs.map((x) => ({ ...x, o: K / x.o, c: K / x.c, h: K / x.l, l: K / x.h }));
};

/**
 * Indications allowed to fire one way only, each with its reason (an entry that does fire both ways fails as stale).
 * Empty: no registered rule is one-sided by design. A new indication that fires only one way fails this file until it
 * is fixed or listed here with a reason.
 */
const ONE_SIDED: ReadonlyMap<string, string> = new Map<string, string>([]);
const exempt = (id: string) => ONE_SIDED.has(id.replace(/@x4$/, ""));

/**
 * The documented exception of symmetry.test.ts, NOT an exception here: the Stable-02 confluence port (both ranges)
 * keeps the desk's own rule bit for bit (stable02.test.ts) — its RSI bands overlap at 45–55 and the else-if hands
 * that zone to long, so its long / short counts do not swap with the mirror. That is a long BIAS, not a one-sided
 * rule: it still has to fire short (pinned below), so it is not on ONE_SIDED.
 */
const SYMMETRY_ONLY_EXCEPTIONS: ReadonlyMap<string, string> = new Map([
  ["s2-confluence", "overlapping RSI bands 45–55, the else-if favours long (symmetry.test.ts)"],
  ["s2-confluence-m", "overlapping RSI bands 45–55, the else-if favours long (symmetry.test.ts)"],
]);

/**
 * The test market, each universe next to its price mirror in a universe of its own: five 5m symbols on a shared
 * market walk (relations that follow or fade a broad move), processing.test.ts's 5m universe (three rich series and
 * two plain walks: their events do not coincide, so the own-activity relations fire), a 1m and a 15m series.
 */
function caches(): SeriesCache[] {
  const syms = ["AAA", "BBB", "CCC", "DDD", "EEE"];
  const m = syntheticCandles("MKT-USDT", 5, 3000, END, 3);
  const five = syms.map((s, j) =>
    richCandles(`${s}-USDT`, 5, 3000, END, 7 + j).map((x, i) => {
      const f = m[i].c / m[0].c;
      return { ...x, o: x.o * f, h: x.h * f, l: x.l * f, c: x.c * f, v: (x.v * m[i].v) / 1000 };
    }),
  );
  const out: SeriesCache[] = [];
  out.push(...makeUniverse(five.map((c, j) => barsFromCandles(`${syms[j]}-USDT`, 5, c))).caches);
  out.push(
    ...makeUniverse(five.map((c, j) => barsFromCandles(`${syms[j]}-USDT`, 5, mirror(c)))).caches,
  );
  const mixed = [
    ...["GGG", "HHH", "III"].map(
      (s, i) => [`${s}-USDT`, richCandles(`${s}-USDT`, 5, 4000, END, 7 + i)] as const,
    ),
    ...["JJJ", "KKK"].map(
      (s) => [`${s}-USDT`, syntheticCandles(`${s}-USDT`, 5, 3000, END)] as const,
    ),
  ];
  out.push(...makeUniverse(mixed.map(([s, c]) => barsFromCandles(s, 5, c))).caches);
  out.push(...makeUniverse(mixed.map(([s, c]) => barsFromCandles(s, 5, mirror(c)))).caches);
  for (const [tf, n, seed] of [
    [1, 6000, 3],
    [15, 3000, 5],
  ] as const) {
    const cs = richCandles("FFF-USDT", tf, n, END, seed);
    out.push(...makeUniverse([barsFromCandles("FFF-USDT", tf, cs)]).caches);
    out.push(...makeUniverse([barsFromCandles("FFF-USDT", tf, mirror(cs))]).caches);
  }
  return out;
}

type Count = { long: number; short: number };
const add = (m: Map<string, Count>, id: string, ev: Int8Array | null) => {
  const c = m.get(id) ?? { long: 0, short: 0 };
  if (ev)
    for (let i = 0; i < ev.length; i++)
      if (ev[i] === 1) c.long++;
      else if (ev[i] === -1) c.short++;
  m.set(id, c);
};
/** Onsets of a state (where it turns to a side): what bot "follow" enters on. */
const onsets = (st: Int8Array | null) => {
  if (!st) return null;
  const out = new Int8Array(st.length);
  for (let i = 1; i < st.length; i++) if (st[i] !== 0 && st[i] !== st[i - 1]) out[i] = st[i];
  return out;
};
const oneWay = (m: Map<string, Count>, skip: (id: string) => boolean) =>
  [...m]
    .filter(([id, c]) => !skip(id) && (c.long === 0 || c.short === 0))
    .map(([id, c]) => `${id}: long ${c.long} short ${c.short}`);

describe("every indication fires long and short", { timeout: 600_000 }, () => {
  const ks = caches();

  it("the exception lists name registered indications only, each with a reason", () => {
    const ids = new Set(INDICATIONS.map((x) => x.id));
    for (const [id, why] of [...ONE_SIDED, ...SYMMETRY_ONLY_EXCEPTIONS]) {
      assert.ok(ids.has(id), `exception ${id} is not a registered indication (stale entry)`);
      assert.ok(why.trim().length > 10, `exception ${id} has a reason`);
    }
  });

  it("every engine indication has a long onset and a short onset on the rich market and its mirror", () => {
    const engine = INDICATIONS.filter((x) => !x.id.startsWith("sig-"));
    assert.ok(engine.length > 300, `${engine.length} engine indications`);
    const counts = new Map<string, Count>();
    for (const x of engine) for (const k of ks) add(counts, x.id, onsets(indicationState(x.id, k)));
    assert.equal(counts.size, engine.length);
    assert.deepEqual(oneWay(counts, exempt), []);
    // the symmetry exception fires both ways (biased, not one-sided)
    for (const id of SYMMETRY_ONLY_EXCEPTIONS.keys()) {
      const c = counts.get(id)!;
      assert.ok(c.long > 0 && c.short > 0, `${id}: long ${c.long} short ${c.short}`);
    }
    // an exception that fires both ways is stale
    const stale = [...ONE_SIDED.keys()].filter(
      (id) => counts.get(id)!.long > 0 && counts.get(id)!.short > 0,
    );
    assert.deepEqual(stale, [], "ONE_SIDED entries that fire both ways: remove them");
  });

  it("every signal source (short and medium) enters long and short through bot follow, on a signal lane", () => {
    assert.ok(SIGNAL_SOURCES.length >= 12);
    const counts = new Map<string, Count>();
    for (const src of SIGNAL_SOURCES)
      for (const range of ["short", "medium"] as const) {
        const id = signalId(src.name, range);
        for (const k of ks) add(counts, id, comboSignal("follow", laneInd(id, k.b.tfMin), k));
      }
    assert.equal(counts.size, SIGNAL_SOURCES.length * 2);
    // a signal source exempt by its underlying indication is exempt as a source too
    const underlying = new Map(
      SIGNAL_SOURCES.flatMap((s) => [
        [signalId(s.name, "short"), s.short],
        [signalId(s.name, "medium"), s.medium],
      ]),
    );
    assert.deepEqual(
      oneWay(counts, (id) => exempt(id) || exempt(underlying.get(id) ?? id)),
      [],
    );
  });

  it("the check itself: a long-only rule is reported, a two-sided one is not", () => {
    const k = ks[0];
    const n = k.b.n;
    const longOnly = new Int8Array(n);
    const both = new Int8Array(n);
    for (let i = 10; i < n; i += 50) {
      longOnly[i] = 1;
      both[i] = i % 100 === 10 ? 1 : -1;
    }
    const counts = new Map<string, Count>();
    add(counts, "x-long-only", onsets(longOnly));
    add(counts, "x-both", onsets(both));
    add(counts, "x-null", null);
    const fired = Math.ceil((n - 10) / 50);
    assert.deepEqual(counts.get("x-both"), {
      long: Math.ceil(fired / 2),
      short: Math.floor(fired / 2),
    });
    assert.deepEqual(
      oneWay(counts, () => false),
      [`x-long-only: long ${fired} short 0`, "x-null: long 0 short 0"],
    );
  });

  it("the registered signal ids are exactly the sources' short and medium ids", () => {
    const sig = INDICATIONS.filter((x) => x.id.startsWith("sig-"))
      .map((x) => x.id)
      .sort();
    const want = SIGNAL_SOURCES.flatMap((s) => [
      signalId(s.name, "short"),
      signalId(s.name, "medium"),
    ]).sort();
    assert.deepEqual(sig, want);
  });
});
