// Worker thread for backtests: Base scoring and strategy tapes for a slice of the combos, on its own CPU core.
// Pure engine code only (explicit .ts imports), so it runs under node --experimental-strip-types.
import { parentPort } from "node:worker_threads";
import { makeUniverse, passesBase, runCombo } from "../pipeline/pipeline.ts";
import { buildTapes } from "../sim/walkforward.ts";
import { DEFAULT_PROTECT } from "../config.ts";
import type { Bars } from "../domain/types.ts";

type Msg =
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
    };

parentPort!.on("message", (m: Msg) => {
  try {
    const u = makeUniverse(m.bars);
    if (m.type === "base") {
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
      }
      parentPort!.postMessage({ id: m.id, ok: true, scores });
    } else {
      const tapes = buildTapes(
        u,
        m.protects as never,
        m.cost,
        m.dcaOpt as never,
        new Set(m.pairs),
        m.tactics as never,
        m.adjust as never,
      );
      // typed-array columns travel without copying
      const transfer = new Set<ArrayBuffer>();
      for (const t of tapes)
        for (const k of [
          "exitT",
          "entryT",
          "r",
          "entry",
          "exit",
          "symI",
          "side",
          "reason",
          "bars",
          "vol",
          "level",
          "gp",
          "gl",
          "rs",
          "r2",
        ] as const)
          transfer.add((t[k] as unknown as { buffer: ArrayBuffer }).buffer);
      parentPort!.postMessage({ id: m.id, ok: true, tapes }, [...transfer]);
    }
  } catch (err) {
    parentPort!.postMessage({
      id: m.id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});
