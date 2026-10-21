// Prefix invariance (no look-ahead): everything decided or closed by a cut T is identical whether the series ends at T
// or runs on. Covers combo entry signals (Micro mc-*, a plain/short indication, a combined lane) and the tapes of the
// real grid (Micro, Minimal, Short, General, Long, Wide cells), and that every entry fills at the OPEN of the bar after
// the signal bar.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { allCombos, makeUniverse } from "../pipeline/pipeline.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import { entrySignal } from "../bots/bots.ts";
import { barsFromCandles, headBars, resample, syntheticCandles } from "../market/bars.ts";
import { buildTapes, defaultWalkForward, tapeTrades } from "./walkforward.ts";
import type { Bars } from "../domain/types.ts";

const LANES = [1, 5, 15] as const;
function lanes(seed: number, syms: number): Bars[] {
  const out: Bars[] = [];
  for (let s = 0; s < syms; s++) {
    const c1 = syntheticCandles(`S${s}`, 1, 3 * 24 * 60, seed + s) as any;
    for (const tf of LANES) {
      const b = barsFromCandles(`S${s}`, tf, tf === 1 ? c1 : resample(c1, 1, tf));
      b.lanes = LANES;
      out.push(b);
    }
  }
  return out;
}

describe("prefix invariance", () => {
  const all = lanes(7, 3);
  const full = makeUniverse(all);
  const cutT = Math.floor((full.startT + (full.nowT - full.startT) * 0.7) / 900_000) * 900_000;
  const cut = makeUniverse(all.map((b) => headBars(b, cutT)));
  const idx = (u: typeof full, b: Bars) => u.bars.findIndex((x) => x.sym === b.sym && x.tfMin === b.tfMin);

  it("combo entry signals on the cut series equal the full series' on every bar of the cut", () => {
    const inds = ["mc-tpull-8", "mc-rsi3-10", "mc-wick-2", "trend-ema", "bb-walk"];
    let compared = 0;
    for (const base of inds)
      for (const tf of [5, 15])
        for (const suffix of ["", "c"])
          for (const bot of ["follow", "revert"] as const) {
            const ind = `${base}@m${tf}${suffix}`;
            for (const b of cut.bars) {
              if (b.tfMin !== tf) continue;
              const a = entrySignal(bot, ind, full.caches[idx(full, b)], DEFAULT_SETTINGS.tactics);
              const d = entrySignal(bot, ind, cut.caches[idx(cut, b)], DEFAULT_SETTINGS.tactics);
              if (!a || !d) continue;
              compared++;
              for (let i = 0; i < b.n; i++) assert.equal(a[i], d[i], `${bot}|${ind} ${b.sym} bar ${i}`);
            }
          }
    assert.ok(compared > 20);
    assert.ok(allCombos().length > 0);
  });

  it("tapes: closed trades with exit <= T are identical (entry, exit, price, r); entries fill at the next bar's open", () => {
    const wf = defaultWalkForward(DEFAULT_SETTINGS);
    const only = new Set(["mc-tpull-8@m5", "mc-rsi3-10@m5", "mc-wick-2@m5", "mc-tpull-8@m1", "trend-ema@m15"].flatMap((i) => ["follow", "revert"].map((b) => `${b}|${i}`)));
    const floors = { minSl: 0, minTrail: 0 };
    const tf = buildTapes(full, wf.protects, DEFAULT_SETTINGS.cost, undefined, only, DEFAULT_SETTINGS.tactics, null, floors);
    const tc = buildTapes(cut, wf.protects, DEFAULT_SETTINGS.cost, undefined, only, DEFAULT_SETTINGS.tactics, null, floors);
    const key = (t: any) => `${t.cfg}|${t.sym}|${t.side}|${t.entryT}|${t.exitT}|${t.entry}|${t.exit}|${t.r}`;
    const byId = new Map(tf.map((t) => [t.id, t]));
    const tags = new Set<string>();
    let n = 0;
    for (const tp of tc) {
      const f = byId.get(tp.id);
      assert.ok(f, `full tape for ${tp.id}`);
      const A = tapeTrades(f).filter((t) => t.exitT <= cutT).map(key);
      const B = tapeTrades(tp).map(key);
      assert.deepEqual(B, A, tp.id);
      tags.add(tp.protect.tag ?? "wide");
      n += B.length;
    }
    for (const tp of tf) {
      const lane = +(/@m(\d+)/.exec(tp.ind)?.[1] ?? 1);
      for (const tr of tapeTrades(tp)) {
        const b = full.bars.find((x) => x.sym === tr.sym && x.tfMin === lane)!;
        const i = b.t.indexOf(tr.entryT);
        assert.ok(i >= 1 && tr.entry === b.o[i] || Math.abs(tr.entry - b.o[i]) <= 1e-6 * tr.entry, `${tp.id} entry is bar open`);
      }
    }
    assert.ok(n > 1000, `compared ${n} trades`);
    for (const t of ["mc", "mn", "sh"]) assert.ok(tags.has(t), `range ${t} covered`);
  });
});
