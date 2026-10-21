// Worker thread for backtests: Base scoring and strategy tapes for a slice of the combos, on its own CPU core.
// Pure engine code only (explicit .ts imports), so it runs under node --experimental-strip-types.
import { parentPort } from "node:worker_threads";
import {
  isPlainKind,
  baseRuns,
  forgetCombo,
  makeUniverse,
  passesBase,
  runCombo,
  seriesOf,
} from "../pipeline/pipeline.ts";
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
import type { MicroIndRule } from "../indications/micro.ts";
import { emptySignalHistDiagnostics, signalHistProtectsGen } from "../signal-hist.ts";
import {
  EXIT_HISTORY_MAX_PAIRS,
  emptyExitStrategyDiagnostics,
  exitStrategyProtectsGen,
} from "../exit-strategy.ts";
import type {
  BaseConfigChunkMessage,
  ExitStrategyMessage,
  SignalHistMessage,
} from "./pool.server.ts";
import { BaseConfigCounter } from "../base-config-counts.ts";

type Msg = { evaluationFromT?: number } & (
  | ({ id: number } & SignalHistMessage)
  | ({ id: number } & ExitStrategyMessage)
  | ({ id: number } & BaseConfigChunkMessage)
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
      completeRangeProtects?: unknown[];
      rangeMinTf?: Record<string, number>;
      microOwnInds?: MicroIndRule;
      gates?: unknown;
      /** grid.baseCells: record each pair's passed cells */
      cells?: boolean;
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
    }
);

const chunksOf = <T>(xs: T[], n: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
};

/**
 * After a reply: a full collection on this worker's own thread (it never blocks the main loop), so the universe and
 * tapes of the message just answered are freed now — left to V8, an always-busy worker's heap sat near its limit.
 * A plain collection frees the objects but V8 keeps their pages committed (RSS stays); once no further message has
 * come for IDLE_GC_MS, a last-resort collection hands the pages back to the system (a 1 GB heap of garbage: 899 MB of
 * RSS after gc(), 84 MB after the last-resort one, 14 Oct). Back-to-back messages only get the plain collection.
 */
const IDLE_GC_MS = Number(process.env.CTS_CORE_WORKER_IDLE_GC_MS || 1000);
let idleGc: ReturnType<typeof setTimeout> | null = null;
type GcFn = (o?: { type: "major"; execution: "sync"; flavor: "last-resort" }) => void;
const gcOf = () => (globalThis as { gc?: GcFn }).gc;
const collectSoon = () =>
  setImmediate(() => {
    const gc = gcOf();
    if (!gc) return;
    try {
      gc();
    } catch {
      /* not exposed */
    }
    // armed after the reply's collection: a message already waiting is delivered before it can fire and clears it
    if (idleGc) clearTimeout(idleGc);
    idleGc = setTimeout(() => {
      idleGc = null;
      try {
        gc({ type: "major", execution: "sync", flavor: "last-resort" });
      } catch {
        gc();
      }
    }, IDLE_GC_MS);
    // (never keeps an idle worker alive by itself)
    (idleGc as { unref?: () => void }).unref?.();
  });

parentPort!.on("message", (m: Msg) => {
  // a message arrived: the pending idle collection waits for the end of this one
  if (idleGc) {
    clearTimeout(idleGc);
    idleGc = null;
  }
  // (the sleep test message replies later; every other branch has replied when the handler returns)
  if ((m as { type?: string }).type !== "sleep") collectSoon();
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
    const u = makeUniverse(m.bars, m.evaluationFromT);
    if (m.type === "base-config-count") {
      if (m.protects.length > 32 && m.kinds.some(isPlainKind))
        throw new Error("Base count normal/trailing slices carry at most 32 protects");
      if (
        (m.dcaOpt?.protects.length ?? 0) *
          m.kinds.filter((k) => k === "dca" || k === "dca-active").length >
        32
      )
        throw new Error("Base count DCA slices carry at most 32 cells");
      if (
        m.kinds.includes("axis") &&
        (!m.floors.countAxisWindow ||
          m.floors.countAxisWindow.limit > 32 ||
          m.floors.countAxisWindow.limit < 1)
      )
        throw new Error("Base count Axis slices require a window of at most 32 variants");
      const counter = new BaseConfigCounter(m.options);
      const seen = new Set(m.seen);
      const before = new Set(seen);
      const g = buildTapesGen(
        u,
        m.protects,
        m.cost,
        m.dcaOpt,
        new Set([m.pair]),
        m.tactics,
        m.adjust,
        {
          ...m.floors,
          countOnly: true,
          countKinds: m.kinds,
          countSeen: seen,
          baseConfigCounter: counter,
        },
      );
      let last = 0;
      for (;;) {
        const r = g.next();
        if (r.done) {
          if (r.value.length) throw new Error("Count-only Base work retained strategy tapes");
          parentPort!.postMessage({
            id: m.id,
            ok: true,
            rows: counter.rows(),
            seen: [...seen].filter((id) => !before.has(id)),
          });
          return;
        }
        if (Date.now() - last >= 400) {
          last = Date.now();
          parentPort!.postMessage({ id: m.id, progress: r.value.done, total: r.value.total });
        }
      }
    }
    if (m.type === "signal-hist") {
      if (m.pairs.length > 2) throw new Error("Signal history messages carry at most two pairs");
      const diagnostics = emptySignalHistDiagnostics();
      const g = signalHistProtectsGen(
        u,
        m.pairs,
        m.sig,
        m.tactics,
        m.cutT,
        m.validation,
        diagnostics,
      );
      const total = m.pairs.reduce(
        (n, pair) => n + seriesOf(u, pair.split("|")[1] ?? "").length,
        0,
      );
      let yielded = 0;
      let last = 0;
      for (;;) {
        const r = g.next();
        if (r.done) {
          parentPort!.postMessage({ id: m.id, ok: true, pairProtects: r.value, diagnostics });
          return;
        }
        // The generator yields before each series. Count only completed series, so the heartbeat never claims
        // 100 % while the last one still computes; the pool marks the completed reply whole.
        const done = yielded++;
        if (Date.now() - last >= 400) {
          last = Date.now();
          parentPort!.postMessage({ id: m.id, progress: done, total });
        }
      }
    }
    if (m.type === "exit-hist") {
      if (m.pairs.length > EXIT_HISTORY_MAX_PAIRS)
        throw new Error(`Exit history messages carry at most ${EXIT_HISTORY_MAX_PAIRS} pairs`);
      const diagnostics = emptyExitStrategyDiagnostics();
      const g = exitStrategyProtectsGen(
        u,
        m.pairs,
        m.settings,
        m.tactics,
        m.cutT,
        m.validation,
        diagnostics,
      );
      // Exit history also yields once per candidate so the in-process fallback can remain responsive. This upper bound
      // covers those yields without reporting more than 100 % before every pair's validation has finished.
      const total = m.pairs.reduce(
        (n, pair) =>
          n + seriesOf(u, pair.split("|")[1] ?? "").length + m.settings.maxConfigsPerPair,
        0,
      );
      let yielded = 0;
      let last = 0;
      for (;;) {
        const r = g.next();
        if (r.done) {
          parentPort!.postMessage({ id: m.id, ok: true, pairProtects: r.value, diagnostics });
          return;
        }
        const done = yielded++;
        if (Date.now() - last >= 400) {
          last = Date.now();
          parentPort!.postMessage({ id: m.id, progress: done, total });
        }
      }
    }
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
        m.microOwnInds,
        m.gates as never,
        (m.completeRangeProtects ?? []) as never,
        m.cells === true,
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
      // the completeness record of this part's sets (merged on the main thread) — only beside floors the caller gave:
      // an empty floors object in place of none changed every stop (the floors' missing minSl made it NaN)
      const buildStats = new Map();
      const gen = buildTapesGen(
        u,
        m.protects as never,
        m.cost,
        m.dcaOpt as never,
        new Set(m.pairs),
        m.tactics as never,
        m.adjust as never,
        (m.floors ? { ...(m.floors as object), buildStats } : m.floors) as never,
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
      parentPort!.postMessage(
        { id: m.id, ok: true, tapes, buildStats: [...buildStats.values()] },
        arena ? [arena, ...others] : others,
      );
    }
  } catch (err) {
    parentPort!.postMessage({
      id: m.id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});
