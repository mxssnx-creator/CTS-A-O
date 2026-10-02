// Self-audit of the engine state: every check recomputes a number the engine published from its inputs and
// compares. Runs after each compute (cheap, O(trades · log)) and on demand; failures are surfaced on the Engine
// page and in the event log, never silently corrected.
//
//   stages     Base passed ≤ evaluated; Real selection ⊆ Main tapes
//   replay     every executed trade, replayed in entry order through the Real-stage rules (toggles, last-N,
//              Block over its sources in Shared / Additive, Block Active) with the Block feed as it stood at
//              that entry, must be allowed and carry exactly the recorded Block level and volume
//   caps       open positions never exceed max open / per symbol / per side at any instant; no duplicate
//              (config, symbol) open at once
//   numbers    stats, hourly rows and per-kind totals add up to the trade list; every trade pays the cost
//   paper      paper equity = closed results + open mark-to-market; volumes within [1, max multiple]
import { BlockBook } from "./sim/block.ts";
import { SignalGuard } from "./signals.ts";
import {
  feedBooks,
  capsOf,
  sigCfg,
  execDecision,
  signalSetAt,
  kindExecutable,
  type ConfigTape,
  type WalkForwardResult,
} from "./sim/walkforward.ts";
import { statsOf } from "./metrics/stats.ts";
import { orderKey, sizeBook, type SizingSettings } from "./sizing.ts";
import type { Trade } from "./domain/types.ts";

export interface AuditCheck {
  name: string;
  ok: boolean;
  detail: string;
}

export interface AuditReport {
  at: number;
  ok: boolean;
  checks: AuditCheck[];
  ms: number;
}

export interface AuditInput {
  sim: WalkForwardResult | null;
  tapes: readonly ConfigTape[];
  cost: number;
  base?: { evaluated?: number; passed?: number; mainPairs?: number };
  /** the stage sets of the compute that built the tapes ("bot|ind" pairs) */
  stages?: {
    passed: ReadonlySet<string>;
    main: ReadonlySet<string>;
    held: ReadonlySet<string>;
    mainTop: number;
    signalActive?: ReadonlySet<string>;
    /** proven pairs kept in Main even when this Base window missed them */
    pinned?: ReadonlySet<string>;
  };
  paper?: {
    selected: readonly string[];
    positions: ReadonlyArray<{
      cfg: string;
      sym: string;
      entryT: number;
      mtm: number;
      vol?: number;
      /** Overall: the extra volume of every raising source */
      legs?: Partial<Record<string, number>>;
    }>;
    trades: readonly Trade[];
    equity: number;
    /** sizing.balance includes `carried`, the realized P&L before the window */
    sizing: { balance: number; sizing: SizingSettings; fixedNotional: number };
    carried?: number;
  };
}

const close = (a: number, b: number, eps = 1e-6) =>
  Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));

export function auditState(inp: AuditInput): AuditReport {
  const t0 = performance.now();
  const checks: AuditCheck[] = [];
  const add = (name: string, ok: boolean, detail: string) => checks.push({ name, ok, detail });
  const byId = new Map(inp.tapes.map((t) => [t.id, t]));

  if (inp.base?.evaluated !== undefined) {
    const { evaluated = 0, passed = 0 } = inp.base;
    add("stages: Base passed ≤ evaluated", passed <= evaluated, `${passed} / ${evaluated}`);
  }

  const st = inp.stages;
  if (st) {
    const tapePairs = new Set<string>();
    for (const t of inp.tapes) tapePairs.add(`${t.bot}|${t.ind}`);
    // every validated pair gets its strategy config sets (pseudo positions) when Main takes them all
    if (st.mainTop <= 0) {
      const missing = [...st.passed].filter((k) => !tapePairs.has(k));
      add(
        "stages: every validated pair has config sets",
        missing.length === 0,
        `${st.passed.size - missing.length} / ${st.passed.size}${missing.length ? ` · missing ${missing.slice(0, 3).join(", ")}` : ""}`,
      );
    }
    const allow = new Set<string>([...st.passed, ...st.held, ...(st.pinned ?? [])]);
    const stray = [...st.main].filter((k) => !allow.has(k));
    add(
      "stages: Main ⊆ Base-validated ∪ held",
      stray.length === 0,
      `${st.main.size} Main · ${stray.length} stray${stray.length ? ` (${stray.slice(0, 3).join(", ")})` : ""}`,
    );
    if (inp.sim) {
      let badEngine = 0;
      let badSignal = 0;
      const steps = inp.sim.signalSteps;
      // ranked per step: the set the step recorded for the entry; else the compute's set
      const activeAt = (t: number) =>
        steps ? (signalSetAt(steps, t) ?? new Set<string>()) : st.signalActive;
      for (const x of inp.sim.trades) {
        const [bot, ind] = x.cfg.split("|");
        const pair = `${bot}|${ind}`;
        if (sigCfg(x.cfg)) {
          const act = activeAt(x.entryT);
          if (act && !act.has(`${pair}|${x.sym}`)) badSignal++;
        } else if (!st.main.has(pair)) badEngine++;
      }
      add(
        "stages: engine trades come from Main config sets",
        badEngine === 0,
        `${badEngine} outside Main`,
      );
      add(
        "stages: signal trades come from active signals",
        badSignal === 0,
        `${badSignal} from an inactive signal × symbol`,
      );
      let badPick = 0;
      for (const step of inp.sim.steps) for (const id of step.real) if (!byId.has(id)) badPick++;
      add("stages: Real picks are Main tapes", badPick === 0, `${badPick} picks without a tape`);
    }
  }

  const sim = inp.sim;
  if (sim) {
    const o = sim.opts;
    const trades = sim.trades;
    // every trade comes from a Main tape of an executable kind and pays the cost
    let foreign = 0;
    let offKind = 0;
    let badR = 0;
    for (const x of trades) {
      const tp = byId.get(x.cfg);
      if (!tp) foreign++;
      else if (!kindExecutable(tp.kind, o.toggles)) offKind++;
      if (!Number.isFinite(x.r) || x.exitT < x.entryT) badR++;
    }
    add(
      "lanes: trades come from Main tapes",
      foreign === 0,
      `${foreign} of ${trades.length} without a tape`,
    );
    add("lanes: only enabled strategies execute", offKind === 0, `${offKind} of a disabled kind`);
    add("numbers: finite results, exit ≥ entry", badR === 0, `${badR} invalid`);

    // replay through the Real-stage rules with the causal book
    const order = [...trades].sort(
      (a, b) => a.entryT - b.entryT || a.cfg.localeCompare(b.cfg) || a.sym.localeCompare(b.sym),
    );
    const exits = sim.feed ?? [];
    const book = new BlockBook(o.block.pause ?? 0);
    const guard = new SignalGuard();
    let ei = 0;
    let denied = 0;
    let volMismatch = 0;
    let levelMismatch = 0;
    let checked = 0;
    const firstBad: string[] = [];
    for (const x of order) {
      while (ei < exits.length && exits[ei].exitT <= x.entryT) feedBooks(exits[ei++], book, guard);
      const tp = byId.get(x.cfg);
      if (!tp) continue;
      checked++;
      const oAt = sim.signalSteps
        ? { ...o, signalActive: signalSetAt(sim.signalSteps, x.entryT) ?? new Set<string>() }
        : o;
      const d = execDecision(tp, x.entryT, oAt as never, { book, guard, sym: x.sym, side: x.side });
      if (!d.ok) {
        denied++;
        if (firstBad.length < 3) firstBad.push(`${x.cfg}@${x.sym} ${d.why}`);
        continue;
      }
      const mult = (x.mult ?? 1) / (x.coordVol ?? 1);
      if (!close(d.vol, mult)) {
        volMismatch++;
        if (firstBad.length < 3) firstBad.push(`${x.cfg}@${x.sym} vol ${mult} ≠ ${d.vol}`);
      }
      const plain = !(tp.kind.startsWith("dca") || tp.kind === "axis");
      if (plain && (x.level ?? 0) !== d.level) levelMismatch++;
    }
    add(
      "replay: every trade passes the Real rules with its recorded Block volume and level",
      denied + volMismatch + levelMismatch === 0,
      `${checked} replayed · denied ${denied} · volume ≠ ${volMismatch} · level ≠ ${levelMismatch}${firstBad.length ? ` · ${firstBad.join("; ")}` : ""}`,
    );
    if (o.toggles.block) {
      // overall: every source is its own position, each capped at max multiple − 1; the stack at 8×
      const overall = o.block.mode === "overall";
      const over = trades.filter((x) => {
        const m = x.mult ?? 1;
        if (m < 1 - 1e-9) return true;
        if (!overall) return m > o.block.maxMult + 1e-9;
        const legs = Object.values(x.legs ?? {}).map((v) => v ?? 0);
        return m > 8 + 1e-9 || legs.some((v) => v > o.block.maxMult - 1 + 1e-9);
      }).length;
      add(
        overall ? "block: every source within max multiple, stack ≤ 8×" : "block: volume within [1, max multiple]",
        over === 0,
        `${over} outside · max ${o.block.maxMult}${overall ? " per source" : ""}`,
      );
    } else {
      const scaled = trades.filter((x) => !close((x.mult ?? 1) / (x.coordVol ?? 1), 1)).length;
      add("block: off → volume 1", scaled === 0, `${scaled} scaled`);
    }

    // caps at every instant (a position closing at t frees its slot for an entry at t)
    const ev: Array<[number, number, Trade]> = [];
    for (const x of trades) {
      ev.push([x.entryT, 1, x]);
      ev.push([x.exitT, -1, x]);
    }
    ev.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    // engine orders and signal orders each within their own caps
    let symOver = 0;
    let sideOver = 0;
    let dupes = 0;
    const peak = [0, 0];
    const openN = [0, 0];
    const perSym = [new Map<string, number>(), new Map<string, number>()];
    const perSide = [new Map<number, number>(), new Map<number, number>()];
    const live = new Set<string>();
    for (const [, k, x] of ev) {
      const key = `${x.cfg}|${x.sym}`;
      const c = sigCfg(x.cfg) ? 1 : 0;
      const caps = capsOf(o, c === 1);
      if (k === 1) {
        if (live.has(key)) dupes++;
        live.add(key);
        openN[c]++;
        peak[c] = Math.max(peak[c], openN[c]);
        const s = (perSym[c].get(x.sym) ?? 0) + 1;
        perSym[c].set(x.sym, s);
        if (s > caps.perSymbol) symOver++;
        const d = (perSide[c].get(x.side) ?? 0) + 1;
        perSide[c].set(x.side, d);
        if (d > caps.perSide) sideOver++;
      } else {
        live.delete(key);
        openN[c]--;
        perSym[c].set(x.sym, (perSym[c].get(x.sym) ?? 1) - 1);
        perSide[c].set(x.side, (perSide[c].get(x.side) ?? 1) - 1);
      }
    }
    const capE = capsOf(o, false).maxOpen;
    const capS = capsOf(o, true).maxOpen;
    const lim = (x: number) => (Number.isFinite(x) ? String(x) : "no limit");
    add(
      "caps: max open",
      peak[0] <= capE && peak[1] <= capS,
      `peak ${peak[0]} / ${lim(capE)}${peak[1] ? ` · signals ${peak[1]} / ${lim(capS)}` : ""}`,
    );
    add(
      "caps: per symbol / per side",
      symOver + sideOver === 0,
      `symbol over ${symOver} · side over ${sideOver}`,
    );
    add("caps: no duplicate config × symbol open at once", dupes === 0, `${dupes}`);
    // positions (symbol × direction) never above the cap at any instant
    // (engine and signal positions are capped apart)
    const posPeakOf = (signal: boolean) => {
      const evp: Array<[number, number, string]> = [];
      for (const x of trades)
        if (sigCfg(x.cfg) === signal)
          evp.push([x.entryT, 1, `${x.sym}|${x.side}`], [x.exitT, -1, `${x.sym}|${x.side}`]);
      evp.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const per = new Map<string, number>();
      let posNow = 0;
      let posPeak = 0;
      for (const [, d, k] of evp) {
        const c = (per.get(k) ?? 0) + d;
        if (d > 0 && c === 1) posNow++;
        if (d < 0 && c === 0) posNow--;
        per.set(k, c);
        posPeak = Math.max(posPeak, posNow);
      }
      return posPeak;
    };
    if (o.maxPositions) {
      const posPeak = posPeakOf(false);
      add(
        "caps: max positions (symbol × direction)",
        posPeak <= o.maxPositions,
        `peak ${posPeak} / ${o.maxPositions}`,
      );
    }
    if (o.signalMaxPositions) {
      const posPeak = posPeakOf(true);
      add(
        "caps: max signal positions (symbol × direction)",
        posPeak <= o.signalMaxPositions,
        `peak ${posPeak} / ${o.signalMaxPositions}`,
      );
    }

    // published numbers add up
    const s = statsOf(
      [...trades].sort((a, b) => a.exitT - b.exitT),
      sim.endT,
    );
    add(
      "numbers: stats match the trade list",
      s.n === sim.stats.n && close(s.net, sim.stats.net) && close(s.pf, sim.stats.pf),
      `n ${sim.stats.n}/${s.n} · net ${sim.stats.net.toFixed(3)}/${s.net.toFixed(3)} · PF ${sim.stats.pf.toFixed(3)}/${s.pf.toFixed(3)}`,
    );
    const hn = sim.hourly.reduce((a, h) => a + h.n, 0);
    const hnet = sim.hourly.reduce((a, h) => a + h.net, 0);
    add(
      "numbers: hourly rows add up",
      hn === trades.length && close(hnet, s.net, 1e-4),
      `n ${hn}/${trades.length} · net ${hnet.toFixed(3)}/${s.net.toFixed(3)}`,
    );
    const kn = Object.values(sim.byKind).reduce((a, k) => a + k.n, 0);
    add("numbers: per-kind rows add up", kn === trades.length, `${kn}/${trades.length}`);
    // the cost: a plain position (volume 1, no DCA/Axis legs) returns exactly side·move − cost
    let costBad = 0;
    let costChecked = 0;
    for (const x of trades) {
      const tp = byId.get(x.cfg);
      if (!tp || tp.kind.startsWith("dca") || tp.kind === "axis" || (x.vol ?? 1) !== (x.mult ?? 1))
        continue;
      costChecked++;
      const unit = x.r / (x.mult ?? 1);
      if (!close(unit, (x.side * (x.exit - x.entry)) / x.entry - inp.cost, 1e-4)) costBad++;
    }
    add(
      "numbers: every plain close pays the round-trip cost",
      costBad === 0,
      `${costChecked} checked · ${costBad} off`,
    );
  }

  const p = inp.paper;
  if (p) {
    const ids = new Set(inp.tapes.map((t) => t.id));
    const orphan = p.selected.filter((id) => !ids.has(id)).length;
    add(
      "stages: Real selection ⊆ Main tapes",
      orphan === 0,
      `${orphan} of ${p.selected.length} missing`,
    );
    // recomputed independently: every order sized from the equity at its entry
    const sized = sizeBook(p.trades, p.positions, p.sizing);
    const eq =
      (p.carried ?? 0) +
      sized.pnl +
      p.positions.reduce(
        (a, x) =>
          a + x.mtm * (x.vol ?? 1) * (sized.units.get(orderKey(x)) ?? p.sizing.fixedNotional),
        0,
      );
    add(
      "paper: equity = closed + open mark-to-market",
      close(eq, p.equity, 1e-6),
      `${p.equity.toFixed(4)} vs ${eq.toFixed(4)}`,
    );
    // Overall: every source its own Block (each leg within maxMult − 1), the stack within 8×
    const blk = sim?.opts.block;
    const maxMult = blk?.maxMult ?? Infinity;
    const overall = blk?.mode === "overall";
    const badVol = p.positions.filter(
      (x) =>
        (x.vol ?? 1) < 1 - 1e-9 ||
        (x.vol ?? 1) > (overall ? 8 : maxMult) + 1e-9 ||
        Object.values(x.legs ?? {}).some((v) => (v ?? 0) > maxMult - 1 + 1e-9),
    ).length;
    add(
      "paper: position volume within [1, max multiple]",
      badVol === 0,
      `${badVol} of ${p.positions.length}`,
    );
  }

  return {
    at: Date.now(),
    ok: checks.every((c) => c.ok),
    checks,
    ms: Math.round(performance.now() - t0),
  };
}
