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

  it("focus narrows the combos; unknown focus falls back to every combo", () => {
    assert.deepEqual(
      allCombos(["follow|rsi-mom-14-25"]).map((c) => `${c.bot}|${c.ind}`),
      ["follow|rsi-mom-14-25"],
    );
    assert.equal(allCombos(["nope|nothing"]).length, allCombos().length);
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
    metrics: { pf, n: 10, perDay: 1, wr: 0.5, net: 1, greenHours: 0.5, period: "", source: "" },
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
