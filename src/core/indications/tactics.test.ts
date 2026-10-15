// Tactics: causal, remove-only entry filters; presets: storage rules; fixed selection; focus.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { SeriesCache } from "./cache.ts";
import { FILTER_IDS, applyFilter, tacticKey, tacticWarmupBars } from "./filters.ts";
import { comboSignal, entrySignal } from "../bots/bots.ts";
import { allCombos } from "../pipeline/pipeline.ts";
import { DEFAULT_SETTINGS, DEFAULT_TACTICS } from "../config.ts";
import {
  presetKey,
  presetSettings,
  qualifies,
  upsertPreset,
  RESEARCH_PRESETS,
  type Preset,
} from "../presets.ts";
import type { Bars, Stats } from "../domain/types.ts";

const END = Date.UTC(2026, 8, 20);
const head = (b: Bars, k: number): Bars => ({
  ...b,
  n: k,
  t: b.t.slice(0, k),
  o: b.o.slice(0, k),
  h: b.h.slice(0, k),
  l: b.l.slice(0, k),
  c: b.c.slice(0, k),
  v: b.v.slice(0, k),
});

describe("tactics", () => {
  const full = barsFromCandles("AAA", 60, syntheticCandles("AAA", 60, 900, END));
  const kFull = new SeriesCache(full);
  const sig = comboSignal("follow", "rsi-mom-14-25", kFull)!;

  it("every filter only removes entries, never adds or flips one", () => {
    for (const id of FILTER_IDS) {
      const f = applyFilter(id, sig, kFull);
      for (let i = 0; i < sig.length; i++) assert.ok(f[i] === 0 || f[i] === sig[i], `${id} @${i}`);
    }
  });

  it("every filter is causal (prefix-stable)", () => {
    for (const cut of [420, 610]) {
      const kCut = new SeriesCache(head(full, cut));
      const sCut = comboSignal("follow", "rsi-mom-14-25", kCut)!;
      for (const id of FILTER_IDS) {
        const a = applyFilter(id, sig, kFull);
        const b = applyFilter(id, sCut, kCut);
        for (let i = 0; i < cut; i++) assert.equal(b[i], a[i], `${id} @${i} cut ${cut}`);
      }
    }
  });

  it("all tactics off = the plain combo signal; keys and warm-up follow the switches", () => {
    const OFF = { ...DEFAULT_TACTICS, session: false, volRegime: false, trendStrength: false, cooldown: false };
    assert.equal(tacticKey(OFF), "");
    assert.equal(entrySignal("follow", "rsi-mom-14-25", kFull, OFF), sig);
    // the default: trend strength + volatility regime
    assert.equal(tacticKey(DEFAULT_TACTICS), "volHi+adx20");
    const t = { ...OFF, session: true, volRegime: true };
    assert.equal(tacticKey(t), "euUs+volHi");
    assert.ok(tacticWarmupBars(t) >= 336);
    const e = entrySignal("follow", "rsi-mom-14-25", kFull, t)!;
    let kept = 0,
      orig = 0;
    for (let i = 0; i < sig.length; i++) {
      if (sig[i]) orig++;
      if (e[i]) kept++;
      if (e[i]) {
        const h = new Date(full.t[i]).getUTCHours();
        assert.ok(h >= 7 && h < 21, "session filter");
      }
    }
    assert.ok(kept < orig && orig > 0);
  });

  it("focus narrows the combos; a focus that matches nothing stays empty, no focus is every combo", () => {
    assert.deepEqual(
      allCombos(["follow|rsi-mom-14-25"]).map((c) => `${c.bot}|${c.ind}`),
      ["follow|rsi-mom-14-25"],
    );
    // a focus that matches nothing is empty, never a fallback to everything: falling back turned a typo (or a kind
    // disabled in the same settings) into a 50x Base with no sign of it
    assert.equal(allCombos(["nope|nothing"]).length, 0);
    // no focus at all (undefined or an empty list) is every combo
    assert.ok(allCombos().length > 0);
    assert.equal(allCombos([]).length, allCombos().length);
  });
});

describe("presets", () => {
  const st = (pf: number, n = 40): Stats =>
    ({ n, pf, net: pf > 1 ? 5 : -5, wr: 0.5, gh: 0.55, ddt: 3 }) as unknown as Stats;
  const mk = (id: string, kind: Preset["kind"], pf: number, at: number): Preset => ({
    id,
    label: id,
    info: "",
    kind,
    at,
    settings: {},
    wf: {},
    metrics: { pf, pfBasis: "unit-net-returns", unknownReturns: 0, gp: pf, gl: 1, n: 10, perDay: 1, wr: 0.5, net: 1, greenHours: 0.5, period: "", source: "" },
  });

  it("never carries the Live stage", () => {
    const p = presetSettings({
      ...DEFAULT_SETTINGS,
      live: { ...DEFAULT_SETTINGS.live, enabled: true },
    });
    assert.equal("live" in p, false);
    for (const r of RESEARCH_PRESETS) assert.equal("live" in r.settings, false);
  });

  it("key is independent of property order", () => {
    assert.equal(
      presetKey({ tfMin: 60, symbols: 40 }, { a: 1, b: [1, 2] }),
      presetKey({ symbols: 40, tfMin: 60 }, { b: [1, 2], a: 1 }),
    );
    assert.notEqual(presetKey({ tfMin: 60 }, {}), presetKey({ tfMin: 15 }, {}));
  });

  it("an auto preset is replaced only by a better run; trimming drops the oldest auto, never a saved one", () => {
    let list = upsertPreset([], mk("auto-x", "auto", 1.2, 1));
    list = upsertPreset(list, mk("auto-x", "auto", 1.1, 2));
    assert.equal(list[0].metrics.pf, 1.2);
    list = upsertPreset(list, mk("auto-x", "auto", 1.3, 3));
    assert.equal(list[0].metrics.pf, 1.3);
    let many: Preset[] = [mk("saved-a", "saved", 1, 0)];
    for (let i = 0; i < 5; i++) many = upsertPreset(many, mk(`auto-${i}`, "auto", 1.2, 10 + i), 3);
    assert.equal(many.length, 3);
    assert.ok(many.some((p) => p.id === "saved-a"));
    assert.deepEqual(
      many.filter((p) => p.kind === "auto").map((p) => p.id),
      ["auto-3", "auto-4"],
    );
  });

  it("qualifies only stable, profitable runs with enough trades", () => {
    assert.equal(qualifies(st(1.2), true, 1.1, 12), true);
    assert.equal(qualifies(st(1.2), false, 1.1, 12), false);
    assert.equal(qualifies(st(1.05), true, 1.1, 12), false);
    assert.equal(qualifies(st(1.2, 5), true, 1.1, 12), false);
  });

  it("research presets are complete and measured", () => {
    assert.ok(RESEARCH_PRESETS.length >= 3);
    for (const p of RESEARCH_PRESETS) {
      assert.equal(p.settings.tfMin, 60);
      assert.ok(p.settings.focus?.length);
      assert.ok(p.metrics.n > 1000 && p.metrics.oot && p.metrics.oot.n > 1000, p.id);
      for (const f of p.settings.focus!) assert.ok(allCombos([f]).length === 1, f);
    }
  });
});

describe("tactic: choppiness regime", () => {
  it("is off by default, joins the tactic key when on, and keeps only entries outside a sideways range", async () => {
    const { DEFAULT_TACTICS } = await import("../config.ts");
    const { tacticKey, applyFilter } = await import("./filters.ts");
    const { SeriesCache } = await import("./cache.ts");
    const { barsFromCandles } = await import("../market/bars.ts");
    const { choppiness } = await import("./research3.ts");
    assert.equal(DEFAULT_TACTICS.chopRegime, false);
    assert.ok(!tacticKey(DEFAULT_TACTICS).includes("chop"));
    assert.ok(tacticKey({ ...DEFAULT_TACTICS, chopRegime: true }).split("+").includes("chop"));
    // 60 bars of tight sideways chop, then 60 bars of a clean trend
    const T0 = Date.UTC(2026, 8, 1);
    const cs = Array.from({ length: 120 }, (_, i) => {
      const c = i < 60 ? 100 + (i % 2 ? 0.3 : -0.3) : 100 + (i - 59) * 0.4;
      return { t: T0 + i * 900_000, o: c - 0.1, h: c + 0.35, l: c - 0.35, c, v: 100 };
    });
    const k = new SeriesCache(barsFromCandles("X-USDT", 15, cs));
    const sig = new Int8Array(120).fill(1);
    const out = applyFilter("chop", sig, k);
    const ch = choppiness(k.b.h, k.b.l, k.b.c, 14);
    for (let i = 0; i < 120; i++) assert.equal(out[i], ch[i] < 61.8 ? 1 : 0, `bar ${i}`);
    assert.ok(out.slice(20, 60).every((x) => x === 0), "no entry in the chop");
    assert.ok(out.slice(90, 120).every((x) => x === 1), "entries in the trend");
  });
});

describe("tactic: trend strength and the low-ADX indications", () => {
  // act-chop fires only below ADX 18, mc-qrsi2-5 below 12, r-bb-adx-m below 20: the trend-strength tactic (ADX ≥ 20)
  // removed every one of their entries (audit, 13 Oct). They keep the other tactics.
  const END = Date.UTC(2026, 9, 1);
  const count = (ind: string, tactics: typeof DEFAULT_TACTICS) => {
    let n = 0;
    for (const seed of [3, 11, 29, 41]) {
      const k = new SeriesCache(barsFromCandles("AAA-USDT", 15, syntheticCandles("AAA-USDT", 15, 4000, END, seed)));
      const s = entrySignal("follow", ind, k, tactics)!;
      for (const x of s) if (x !== 0) n++;
    }
    return n;
  };
  it("a low-ADX indication trades under the default tactics, exactly as under its other tactics alone", () => {
    assert.ok(DEFAULT_TACTICS.trendStrength && DEFAULT_TACTICS.volRegime);
    const others = { ...DEFAULT_TACTICS, trendStrength: false };
    for (const ind of ["act-chop", "act-chop@x4@m15", "r-bb-adx-m"]) {
      const n = count(ind, DEFAULT_TACTICS);
      assert.ok(n > 0, `${ind}: ${n} entries under the default tactics`);
      assert.equal(n, count(ind, others), ind);
    }
  });
  it("every other indication still takes the trend-strength tactic", () => {
    const others = { ...DEFAULT_TACTICS, trendStrength: false };
    for (const ind of ["ema-9-21", "z-50-2.5"]) assert.ok(count(ind, DEFAULT_TACTICS) < count(ind, others), ind);
  });
});

describe("tactic: on the whole state run (tactics.onRun)", () => {
  const END = Date.UTC(2026, 9, 1);
  const cache = (seed: number) =>
    new SeriesCache(barsFromCandles("AAA-USDT", 15, syntheticCandles("AAA-USDT", 15, 3000, END, seed)));
  it("off by default; without tactics it is the onset rule exactly", () => {
    assert.equal(DEFAULT_TACTICS.onRun, undefined);
    const k = cache(5);
    const none = { session: false, volRegime: false, trendStrength: false, cooldown: false, cooldownBars: 4 };
    assert.deepEqual([...entrySignal("follow", "ema-9-21", k, { ...none, onRun: true })!], [...entrySignal("follow", "ema-9-21", k, none)!]);
  });
  it("one entry per state run, on its first bar the tactics keep; at least the onset rule's entries", () => {
    for (const seed of [3, 11]) {
      const k = cache(seed);
      for (const [bot, ind] of [["follow", "ema-9-21"], ["revert", "trend-st"], ["follow", "rsi-mom-14-20"]] as const) {
        const onset = entrySignal(bot, ind, k, DEFAULT_TACTICS)!;
        const run = entrySignal(bot, ind, k, { ...DEFAULT_TACTICS, onRun: true })!;
        const nz = (a: Int8Array) => a.reduce((s, x) => s + (x !== 0 ? 1 : 0), 0);
        assert.ok(nz(run) >= nz(onset), `${bot}|${ind} seed ${seed}: run ${nz(run)} < onset ${nz(onset)}`);
        // every onset entry is also a run entry (the run's first kept bar is its onset when the onset is kept)
        for (let i = 0; i < onset.length; i++) if (onset[i] !== 0) assert.equal(run[i], onset[i], `${ind} bar ${i}`);
        // each run entry passes the tactics: the same bar of the every-bar candidate after the filters
        const adx = k.dmi(14).adx;
        for (let i = 0; i < run.length; i++) if (run[i] !== 0) assert.ok(adx[i] >= 20, `${ind} bar ${i} ADX ${adx[i]}`);
      }
    }
  });
});
