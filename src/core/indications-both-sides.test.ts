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
import { barsFromCandles, syntheticCandles, resample } from "./market/bars.ts";
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

/** A shallow established trend with a bounded lower-channel wick sweep and recovery. The richer shock
 * tape above has deep capitulations and expanding activity; those are different regimes from a guarded
 * failed-break reclaim. Keep this quiet-participation regime and its mirror in the universal coverage check. */
function channelReclaimCandles(tf: number): Candle[] {
  const n = 180;
  const step = tf * 60_000;
  const out: Candle[] = [];
  let price = 100;
  for (let i = 0; i < n; i++) {
    const o = price;
    const c = o * 1.00015;
    out.push({ t: END - (n - i) * step, o, h: c * 1.0008, l: o * 0.9992, c, v: 1_000 });
    price = c;
  }
  const at = 150;
  const priorLow = Math.min(...out.slice(at - 8, at).map((x) => x.l));
  const o = out[at].o;
  // A small wick past the old eight-bar edge, followed by a bullish body near the bar's high.
  // Constant participation and a modest range preserve each profile's ordinary activity/ATR gates.
  const c = o * 1.0002;
  out[at] = { ...out[at], o, l: priorLow - o * 0.00025, c, h: c + o * 0.00008 };
  return out;
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
 * two plain walks: their events do not coincide, so the own-activity relations fire), a 1m and a 15m series,
 * and shallow 5m/15m trend sweeps for quiet-participation reclaim regimes.
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
  for (const tf of [5, 15]) {
    const cs = channelReclaimCandles(tf);
    out.push(...makeUniverse([barsFromCandles("SWEEP-USDT", tf, cs)]).caches);
    out.push(...makeUniverse([barsFromCandles("SWEEP-USDT", tf, mirror(cs))]).caches);
  }
  return out;
}

function microWickRecovery(sym: string, seed: number) {
 const cs=richCandles(sym,1,27000,END,seed);
 // Each block supplies a quiet regime, a sustained pullback and a high-volume wick recovery.
 // The following recovery keeps a completed 15m reference while faster bars trigger independently.
 for(let at=900;at+120<cs.length;at+=900){
   let price=cs[at-1].c;
   for(let j=0;j<120;j++){
     const i=at+j,o=price;
     const ret=j<60 ? -0.001 : j<90 ? -0.01 : 0.0003;
     const c=o*(1+ret);const wick=j>=90 ? 0.0005*Math.pow(1.16,j-90) : 0.0001;
     cs[i]={...cs[i],o,c,h:Math.max(o,c)*1.00005,l:Math.min(o,c)*(1-wick),v:j>=90 ? 50000*Math.pow(1.25,j-90) : 100};
     price=c;
   }
   const ratio=price/cs[at+120].o;
   for(let i=at+120;i<cs.length;i++)cs[i]={...cs[i],o:cs[i].o*ratio,c:cs[i].c*ratio,h:cs[i].h*ratio,l:cs[i].l*ratio};
 }
 for(let at=450;at+300<cs.length;at+=900){
  let price=cs[at-1].c;
  for(let j=0;j<300;j++){
   const i=at+j,o=price;
   const r=j<180?0.0005:j<285?-0.000001:j===299?0.08:0.000002;
   const c=o*(1+r),wick=j<180?0.002:0.00001;
   cs[i]={...cs[i],o,c,h:Math.max(o,c)*(1+wick),l:Math.min(o,c)*(1-wick),v:j===299?100000:100};price=c;
  }
  const ratio=price/cs[at+300].o;
  for(let i=at+300;i<cs.length;i++)cs[i]={...cs[i],o:cs[i].o*ratio,c:cs[i].c*ratio,h:cs[i].h*ratio,l:cs[i].l*ratio};
 }
 return cs;
}

/** Coherent 1/5/15m native history with BTC/ETH peers for context-dependent families. */
function* microContextCaches(): Generator<SeriesCache[]> {
  for (const scenario of [0, 1]) {
    const series = ["BTC", "ETH", "AAA", "BBB", "CCC"].map((sym, i) => ({
      sym: `${sym}-USDT`, cs: scenario ? microWickRecovery(sym, i + 7) : richCandles(sym, 1, 27000, END, i + 7),
    }));
    for (const flipped of [false, true])
      yield makeUniverse(series.flatMap(({ sym, cs }) => [1, 5, 15].map((tf) =>
        barsFromCandles(sym, tf, resample(flipped ? mirror(cs) : cs, 1, tf)),
      ))).caches;
  }
  // Nested recovery: own closes turn up on all three frames while BTC/ETH recover more quickly.
  // Its last three minute closes still underperform, retaining a negative causal residual.
  const own: Candle[] = [], peer: Candle[] = [], n = 3000;
  let a = 100, b = 100;
  for (let i = 0; i < n; i++) {
    const j = i - (n - 45);
    let r = 0.00002 * Math.sin(i * 1.3), q = 0.00002 * Math.cos(i * 1.1);
    if (j >= 0 && j < 30) r = -0.002;
    if (j >= 30) { r = j < 40 ? 0.0001 : j < 42 ? 0.007 : j < 44 ? -0.006 : 0.001; q = 0.007; }
    const c = a * (1 + r), d = b * (1 + q), t = END - (n - i) * 60000;
    own.push({ t, o: a, c, h: Math.max(a, c) * 1.00002, l: Math.min(a, c) * 0.99998, v: i >= n - 15 ? 2000 : 1000 });
    peer.push({ t, o: b, c: d, h: Math.max(b, d) * 1.00002, l: Math.min(b, d) * 0.99998, v: 1000 });
    a = c; b = d;
  }
  for (const flipped of [false, true]) {
    const series = [["A-USDT", own], ["BTC-USDT", peer], ["ETH-USDT", peer]] as const;
    yield makeUniverse(series.flatMap(([sym, cs]) => [1, 5, 15].map((tf) =>
      barsFromCandles(sym, tf, resample(flipped ? mirror(cs) : cs, 1, tf)),
    ))).caches;
  }
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
    // Ordinary single-frame fixtures cannot exercise missing market peers or a completed multi-frame relation.
    const contextual = engine.filter((x) => x.kind === "micro" || x.kind === "inverse");
    for (const contexts of microContextCaches())
      for (const x of contextual)
        for (const k of contexts) add(counts, x.id, onsets(indicationState(x.id, k)));
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

  it("quiet-participation sweeps exercise every reclaim profile and trend subset in both directions", () => {
    const reclaims = INDICATIONS.filter((x) => x.id.startsWith("break-mc-rel-reclaim8-"));
    assert.equal(reclaims.length, 12);
    const counts = new Map<string, Count>();
    for (const x of reclaims)
      for (const k of ks.filter((x) => x.b.sym === "SWEEP-USDT")) add(counts, x.id, onsets(indicationState(x.id, k)));
    assert.deepEqual(oneWay(counts, () => false), [], "all actual profile, trend and drawdown gates stay enabled");
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
