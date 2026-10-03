// Worker thread for backtests: Base scoring and strategy tapes for a slice of the combos, on its own CPU core.
// Pure engine code only (explicit .ts imports), so it runs under node --experimental-strip-types.
import { parentPort } from "node:worker_threads";
import { baseRuns, forgetCombo, makeUniverse, passesBase, runCombo } from "../pipeline/pipeline.ts";
import {
  buildTapesGen,
  packArena,
  unpackTapes,
  walkForward,
  type ConfigTape,
  type PackedTapes,
} from "../sim/walkforward.ts";
import { DEFAULT_PROTECT } from "../config.ts";
import type { Bars } from "../domain/types.ts";

type Msg =
  | {
      id: number;
      type: "compare";
      /** the walk-forward only needs the time frame of the universe, not its bars */
      nowT: number;
      baseTf: number;
      /** every tape in one shared buffer (packTapes) */
      packed: PackedTapes;
      wf: Record<string, unknown>;
      presets: Array<{ name: string; toggles: unknown }>;
    }
  | {
      id: number;
      type: "s1";
      bars: Bars[];
      combos: Array<{ bot: string; ind: string }>;
      cost: number;
      tactics: unknown;
      /** one representative cell per range (baseRangeProtects) and each range's shortest lane */
      rangeProtects?: unknown[];
      rangeMinTf?: Record<string, number>;
    }
  | {
      id: number;
      type: "base";
      bars: Bars[];
      combos: Array<{ bot: string; ind: string }>;
      cost: number;
      tactics: unknown;
      gates?: { minPf: number; minTrades: number };
    }
  | {
      id: number;
      type: "tapes";
      bars: Bars[];
      pairs: string[];
      protects: unknown[];
      cost: number;
      dcaOpt: unknown;
      tactics: unknown;
      adjust: unknown;
      floors?: unknown;
    };

const chunksOf = <T>(xs: T[], n: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
};

parentPort!.on("message", (m: Msg) => {
  try {
    // tests: hold the worker busy (abort / timeout handling)
    if ((m as { type?: string }).type === "sleep") {
      const ms = Number((m as { ms?: number }).ms) || 0;
      setTimeout(() => parentPort!.postMessage({ ok: true, id: (m as { id?: number }).id }), ms);
      return;
    }
    if (m.type === "compare") {
      // simulated trading of each preset on the same tapes (one walk-forward per preset)
      const u = {
        bars: [],
        caches: [],
        startT: 0,
        endT: 0,
        splitT: 0,
        nowT: m.nowT,
        baseTf: m.baseTf,
      };
      const tapes = unpackTapes(m.packed);
      const out = [];
      for (let i = 0; i < m.presets.length; i++) {
        const p = m.presets[i];
        const r = walkForward(u as never, tapes, {
          ...(m.wf as Record<string, unknown>),
          toggles: p.toggles,
        } as never);
        out.push({
          name: p.name,
          stats: r.stats,
          hourly: r.hourly,
          byKind: r.byKind,
          skips: r.skips,
          blocks: r.blocks,
          stable: r.stable,
        });
        parentPort!.postMessage({ id: m.id, progress: i + 1, total: m.presets.length });
      }
      parentPort!.postMessage({ id: m.id, ok: true, results: out });
      return;
    }
    const u = makeUniverse(m.bars);
    if (m.type === "s1") {
      // engine Base: this worker's share of the combos, slim results (stats only)
      // JSON chunks of 300 runs: cheap to transfer, parsed by the main thread one chunk per slice
      const runs = baseRuns(
        u,
        m.combos,
        m.cost,
        m.tactics as never,
        true,
        true,
        (done, total) => {
          parentPort!.postMessage({ id: m.id, progress: done, total });
        },
        (m.rangeProtects ?? []) as never,
        m.rangeMinTf,
      );
      parentPort!.postMessage({
        id: m.id,
        ok: true,
        runsJson: chunksOf(runs, 300).map((c) => JSON.stringify(c)),
      });
    } else if (m.type === "base") {
      const scores: Array<{ pair: string; score: number }> = [];
      for (const c of m.combos) {
        const r = runCombo(
          u,
          c.bot as never,
          c.ind,
          DEFAULT_PROTECT,
          m.cost,
          1,
          m.tactics as never,
        );
        if (r && (!m.gates || passesBase(r.full, m.gates)))
          scores.push({ pair: `${c.bot}|${c.ind}`, score: r.score });
        forgetCombo(u, c.bot, c.ind);
      }
      parentPort!.postMessage({ id: m.id, ok: true, scores });
    } else {
      const gen = buildTapesGen(
        u,
        m.protects as never,
        m.cost,
        m.dcaOpt as never,
        new Set(m.pairs),
        m.tactics as never,
        m.adjust as never,
        m.floors as never,
      );
      let tapes: Array<{
        exitT: unknown;
        entryT: unknown;
        r: unknown;
        entry: unknown;
        exit: unknown;
        symI: unknown;
        side: unknown;
        reason: unknown;
        bars: unknown;
        vol: unknown;
        level: unknown;
        gp: unknown;
        gl: unknown;
        rs: unknown;
        r2: unknown;
      }> = [];
      let last = 0;
      for (;;) {
        const r = gen.next();
        if (r.done) {
          tapes = r.value;
          break;
        }
        const now = Date.now();
        if (now - last >= 400) {
          last = now;
          parentPort!.postMessage({ id: m.id, progress: r.value.done, total: r.value.total });
        }
      }
      // the typed-array columns travel without copying, every tape of the reply in one arena: the main thread
      // receives one ArrayBuffer per reply, not one per tape (packArena)
      const { arena, others } = packArena(tapes as unknown as ConfigTape[]);
      parentPort!.postMessage({ id: m.id, ok: true, tapes }, arena ? [arena, ...others] : others);
    }
  } catch (err) {
    parentPort!.postMessage({
      id: m.id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});
