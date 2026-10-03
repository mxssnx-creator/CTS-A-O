// Range checks for a settings patch, shared by the Settings page, the preset dialog and presets (pure: testable).
import type { CoreSettings } from "./config.ts";

/** Range checks for a settings patch (Settings page and preset dialog alike). */
export function checkSettings(s: Partial<CoreSettings>) {
  const num = (v: unknown, lo: number, hi: number, name: string) => {
    if (v === undefined) return;
    if (typeof v !== "number" || !Number.isFinite(v) || v < lo || v > hi)
      throw new Error(`${name} out of range`);
  };
  num(s.symbols, 1, 120, "symbols");
  if (
    s.symbolRank !== undefined &&
    !["volatility1h", "volume", "market", "gainers", "losers"].includes(s.symbolRank)
  )
    throw new Error("unknown symbol ranking");
  num(s.historyDays, 2, 45, "historyDays");
  num(s.cycleMs, 100, 600_000, "cycle (ms)");
  num(s.tickMs, 50, 10_000, "tick (ms)");
  num(s.live?.syncMs, 250, 60_000, "exchange sync (ms)");
  num(s.symbolOffset, 0, 200, "symbol offset");
  if (s.forceSymbols !== undefined) {
    if (!Array.isArray(s.forceSymbols) || s.forceSymbols.length > 50)
      throw new Error("forced symbols: a list of at most 50");
    for (const x of s.forceSymbols)
      if (typeof x !== "string" || !/^[A-Za-z0-9]{1,20}(-?USDT)?$/i.test(x.trim()))
        throw new Error(`forced symbol ${String(x)}: like XRP or XRP-USDT`);
  }
  num(s.live?.minStopPct, 0.001, 0.2, "minimum stop");
  num(s.cost, 0, 0.02, "cost");
  num(s.armTop, 1, 40, "armTop");
  num(s.mainTop, 0, 100_000, "mainTop");
  num(s.refineTop, 1, 100, "refineTop");
  num(s.evalTop, 1, 400, "evalTop");
  num(s.paperNotional, 1, 1_000_000, "paperNotional");
  num(s.paperBalance, 1, 100_000_000, "paper balance");
  if (s.sizing) {
    if (s.sizing.mode !== undefined && !["equityPct", "fixed", "minQty"].includes(s.sizing.mode))
      throw new Error("sizing: minQty, equityPct or fixed");
    num(s.sizing.pct, 0.001, 0.25, "sizing % of equity per order");
  }
  const int = (v: unknown, name: string) => {
    if (v !== undefined && !Number.isInteger(v)) throw new Error(`${name} must be a whole number`);
  };
  int(s.symbols, "symbols");
  int(s.refineTop, "refineTop");
  int(s.evalTop, "evalTop");
  int(s.mainTop, "mainTop");
  int(s.armTop, "armTop");
  int(s.axis?.levels, "axis levels");
  int(s.dca?.levels, "dca levels");
  int(s.live?.maxPositions, "max positions");
  // tfMin is the base data timeframe (1m); older presets carry their research timeframe and are normalised
  if (s.tfMin !== undefined && ![1, 5, 15, 30, 60].includes(s.tfMin))
    throw new Error("tfMin must be 1, 5, 15, 30 or 60");
  if (s.tfs !== undefined) {
    if (!Array.isArray(s.tfs) || !s.tfs.every((x) => [1, 5, 15, 30].includes(x)))
      throw new Error("timeframes: any of 1, 5, 15, 30 (minutes)");
    if (!s.tfs.includes(1)) throw new Error("timeframes: 1m is the base and always on");
  }
  if (s.tfDays !== undefined) {
    if (typeof s.tfDays !== "object" || s.tfDays === null)
      throw new Error("lane history: days per timeframe");
    for (const [k, v] of Object.entries(s.tfDays)) {
      if (!["1", "5", "15", "30"].includes(k))
        throw new Error(`lane history: unknown timeframe ${k}`);
      num(v, 1, 45, `lane history ${k}m`);
    }
  }
  if (s.gates) {
    // legacy values are snapped into 1.05–1.50 / 2–35 h by the runtime; only nonsense is rejected
    num(s.gates.minPf, 0.5, 5, "min PF");
    num(s.gates.maxDdtH, 1, 500, "max DDT");
    if (s.gates.maxDdr !== undefined) num(s.gates.maxDdr, 0, 20, "max drawdown ratio (DDR)");
    if (s.gates.minGreen !== undefined) num(s.gates.minGreen, 0, 1, "minimum hourly success (green-hour share)");
    num(s.gates.minTrades, 1, 500, "minTrades");
    num(s.gates.quorum, 0, 1, "quorum");
  }
  if (s.protectFloor) {
    num(s.protectFloor.minSl, 0, 0.1, "minimum stop");
    num(s.protectFloor.minTrail, 0, 0.1, "minimum trailing distance");
  }
  if (s.live) {
    num(s.live.notionalUsd, 1, 500, "notionalUsd");
    num(s.live.maxPositions, 0, 10_000, "maxPositions"); // 0 = no limit
    if (
      s.live.connId !== undefined &&
      !["bingx-x01", "bingx-vst-01", "bingx-vst-02"].includes(s.live.connId)
    )
      throw new Error("unknown connection");
    if (s.live.requireReady !== undefined && typeof s.live.requireReady !== "boolean")
      throw new Error("live requireReady must be true or false");
    if (s.live.enabled !== undefined && typeof s.live.enabled !== "boolean")
      throw new Error("live.enabled must be boolean");
    if (s.live.mode !== undefined && !["overall", "entries"].includes(s.live.mode))
      throw new Error("live mode must be overall or entries");
    num(s.live.ratio, 0.1, 10, "control ratio");
    if (s.live.liveLastN !== undefined) num(s.live.liveLastN, 0, 200, "live last N");
    if (s.live.liveMinPf !== undefined) num(s.live.liveMinPf, 0, 10, "live min PF");
    if (s.live.top !== undefined && s.live.top !== "fill") num(s.live.top, 0, 100_000, "top configs");
    if (s.live.signalWeight !== undefined) num(s.live.signalWeight, 0, 10, "signal volume weight");
    if (s.live.liveGroupLastN !== undefined) num(s.live.liveGroupLastN, 0, 2000, "live group last N");
    if (s.live.maxExposureX !== undefined) num(s.live.maxExposureX, 0, 500, "max exposure × equity");
    // 0 = no per-position cap (volume from the factors and relations alone)
    if (s.live.maxNotionalUsd !== 0) num(s.live.maxNotionalUsd, 1, 5000, "max notional per position");
    num(s.live.rebalancePct, 0, 1, "rebalance threshold");
    if (s.live.marginMode !== undefined && !["cross", "isolated"].includes(s.live.marginMode))
      throw new Error("margin mode must be cross or isolated");
    if (s.live.positionMode !== undefined && !["hedge", "oneway"].includes(s.live.positionMode))
      throw new Error("position mode must be hedge or oneway");
    if (s.live.leverage !== undefined && s.live.leverage !== "max") num(s.live.leverage, 1, 150, "leverage");
    if (s.live.minFreeMargin !== undefined) num(s.live.minFreeMargin, 0, 1_000_000, "min free margin");
    if (s.live.openPaused !== undefined && typeof s.live.openPaused !== "boolean" && typeof s.live.openPaused !== "string")
      throw new Error("live: open paused must be true / false or a reason");
  }
  if (s.toggles)
    for (const [k, v] of Object.entries(s.toggles))
      if (typeof v !== "boolean") throw new Error(`toggle ${k} must be boolean`);
  if (s.tactics) {
    for (const k of ["session", "volRegime", "trendStrength", "cooldown"] as const)
      if (s.tactics[k] !== undefined && typeof s.tactics[k] !== "boolean")
        throw new Error(`tactic ${k} must be boolean`);
    num(s.tactics.cooldownBars, 0, 96, "cooldown bars");
  }
  if (s.disabledKinds !== undefined) {
    if (
      !Array.isArray(s.disabledKinds) ||
      s.disabledKinds.some((k) => typeof k !== "string" || !/^[a-z]+$/.test(k))
    )
      throw new Error("disabledKinds: list of indication types");
  }
  if (s.focus !== undefined) {
    if (!Array.isArray(s.focus) || s.focus.length > 200)
      throw new Error("focus: up to 200 bot|indication pairs");
    for (const f of s.focus)
      if (typeof f !== "string" || !/^[a-z]+\|[a-z0-9.@-]+$/.test(f))
        throw new Error(`focus entry ${String(f)} must be bot|indication`);
  }
  if (s.pinned !== undefined) {
    if (!Array.isArray(s.pinned) || s.pinned.length > 80)
      throw new Error("pinned: up to 80 bot|indication pairs");
    for (const f of s.pinned)
      if (typeof f !== "string" || !/^[a-z]+\|[a-z0-9.@-]+$/.test(f))
        throw new Error(`pinned entry ${String(f)} must be bot|indication`);
  }
  if (s.block) {
    num(s.block.ratio, 0, 2, "block ratio");
    num(s.block.maxLevel, 1, 12, "block max level");
    num(s.block.minActiveLevel, 1, 12, "block active level");
    num(s.block.maxMult, 1, 8, "block max multiple (stack ≤ 8×)");
    if (
      s.block.mode !== undefined &&
      s.block.mode !== "shared" &&
      s.block.mode !== "additive" &&
      s.block.mode !== "overall"
    )
      throw new Error("block type must be shared, additive or overall");
    // shared and overall judge one source's level (at most maxLevel): an Active minimum above it never trades
    if (
      s.block.mode !== "additive" &&
      typeof s.block.minActiveLevel === "number" &&
      typeof s.block.maxLevel === "number" &&
      s.block.minActiveLevel > s.block.maxLevel
    )
      throw new Error("block active level must not exceed the max level (shared / overall)");
    num(s.block.pause, 0, 12, "block pause (0 = none)");
    num(s.block.steps, 0, 12, "block volume steps (0 = continuous)");
    if (s.block.window !== undefined) num(s.block.window, 1, 500, "block pooled-source window (closes per level)");
    num(s.block.increase, 0.05, 1, "block increase");
    const span = (pair: unknown, lo: number, hi: number, name: string) => {
      if (pair === undefined) return;
      if (!Array.isArray(pair) || pair.length !== 2) throw new Error(`${name}: min and max`);
      num(pair[0], lo, hi, name);
      num(pair[1], lo, hi, name);
      if (pair[1] < pair[0]) throw new Error(`${name}: max must be ≥ min`);
    };
    if (s.block.ranges) {
      span(s.block.ranges.levels, 1, 12, "block level range");
      span(s.block.ranges.volRatio, 0.05, 2, "block volume-ratio range");
      span(s.block.ranges.steps, 0, 12, "block step range");
      span(s.block.ranges.increase, 0.05, 1, "block increase range");
      span(s.block.ranges.pause, 0, 12, "block pause range");
    }
    if (s.block.sources !== undefined) {
      if (typeof s.block.sources !== "object" || s.block.sources === null)
        throw new Error("block sources: object of switches");
      for (const [k, v] of Object.entries(s.block.sources))
        if (
          !["config", "overall", "symbol", "direction", "indication", "type"].includes(k) ||
          typeof v !== "boolean"
        )
          throw new Error(`block source ${k} must be a known source with an on/off value`);
    }
  }
  if (s.fees) {
    num(s.fees.taker, 0, 0.01, "taker fee");
    num(s.fees.maker, 0, 0.01, "maker fee");
    num(s.fees.slippage, 0, 0.02, "slippage");
  }
  if (s.adjust) {
    const a = s.adjust;
    if (a.enabled !== undefined && typeof a.enabled !== "boolean")
      throw new Error("adjust.enabled must be boolean");
    if (a.autoCost !== undefined && typeof a.autoCost !== "boolean")
      throw new Error("adjust.autoCost must be boolean");
    num(a.window, 5, 100, "adjust window");
    if (a.window !== undefined && !Number.isInteger(a.window))
      throw new Error("adjust window must be a whole number");
    num(a.triggerPf, 0.5, 2, "adjust trigger PF");
    num(a.recoverPf, 0.5, 3, "adjust recover PF");
    num(a.slStep, 0.0001, 0.02, "SL step");
    num(a.slMax, 0.001, 0.2, "SL max");
    num(a.trailStep, 0.0001, 0.02, "trail step");
    num(a.trailMax, 0.001, 0.2, "trail max");
    num(a.pauseH, 0, 168, "pause hours");
    if (a.triggerPf !== undefined && a.recoverPf !== undefined && a.recoverPf < a.triggerPf)
      throw new Error("recover PF must be ≥ trigger PF");
  }
  if (s.axis) {
    num(s.axis.levels, 1, 8, "axis levels");
    num(s.axis.spacing, 0.1, 5, "axis spacing (ATR)");
    num(s.axis.ratio, 0.1, 5, "axis rung ratio");
    num(s.axis.minDisp, 0, 10, "axis min displacement");
    num(s.axis.maxDisp, 0.1, 20, "axis max displacement");
    num(s.axis.center, 5, 400, "axis EMA period");
    if (s.axis.mode !== undefined && !["revert", "desk"].includes(s.axis.mode))
      throw new Error("axis mode: revert or desk");
    const ranges = ["atr", "linear", "geo", "fib", "volume"];
    if (s.axis.range !== undefined && !ranges.includes(s.axis.range))
      throw new Error("axis range: atr, linear, geo, fib or volume");
    if (s.axis.ranges !== undefined) {
      if (
        !Array.isArray(s.axis.ranges) ||
        s.axis.ranges.length < 1 ||
        !s.axis.ranges.every((r) => ranges.includes(r))
      )
        throw new Error("axis ranges: one or more of atr, linear, geo, fib, volume");
    }
    // desk mode (Stable-02): SL_ATR 0.2–2, TP_SL_RATIOS 0.2–3, TRAIL_PCTS 0.4–2.4
    num(s.axis.slAtr, 0.2, 2, "axis desk SL (ATR)");
    num(s.axis.tpRatio, 0.2, 3, "axis desk TP / SL ratio");
    num(s.axis.trailPct, 0.4, 2.4, "axis desk trailing %");
    num(s.axis.expiry, 0, 500, "axis rung expiry (bars)");
    int(s.axis.expiry, "axis rung expiry");
    if (s.axis.hybrid !== undefined && typeof s.axis.hybrid !== "boolean")
      throw new Error("axis hybrid: on / off");
    if (
      s.axis.minDisp !== undefined &&
      s.axis.maxDisp !== undefined &&
      s.axis.minDisp >= s.axis.maxDisp
    )
      throw new Error("axis min displacement must be below max");
  }
  if (s.dca) {
    num(s.dca.levels, 1, 4, "dca levels (stack ≤ 5 stages: base + 4)");
    num(s.dca.step, 0.001, 0.1, "dca step");
    if (s.dca.stepOfTp !== undefined) num(s.dca.stepOfTp, 0, 5, "dca step (× target)");
    if (s.dca.stopGap !== undefined) num(s.dca.stopGap, 0, 5, "dca stop gap (steps)");
    if (s.dca.slOfTp !== undefined) num(s.dca.slOfTp, 0.25, 5, "dca stop (× target)");
    if (s.dca.tp !== undefined) {
      if (!Array.isArray(s.dca.tp) || s.dca.tp.length > 12) throw new Error("dca targets: up to 12");
      for (const x of s.dca.tp) num(x, 0.002, 0.2, "dca target");
    }
  }
  if (s.grid) {
    const list = (xs: unknown, lo: number, hi: number, name: string) => {
      if (xs === undefined) return;
      if (!Array.isArray(xs) || xs.length < 1 || xs.length > 12)
        throw new Error(`${name}: 1–12 values`);
      for (const x of xs) num(x, lo, hi, name);
    };
    // the wide grid may be empty (the position-cost ranges cover its targets)
    if (!(Array.isArray(s.grid.tp) && s.grid.tp.length === 0)) list(s.grid.tp, 0.002, 0.2, "grid TP");
    list(s.grid.slOfTp, 0.2, 5, "grid SL×TP");
    list(s.grid.trailOfTp, 0, 1, "grid trail share");
    list(s.grid.holdH, 0.25, 72, "grid hold");
    num(s.grid.minTrail, 0, 0.1, "min trail");
    num(s.grid.minSl, 0, 0.2, "min SL");
    num(s.grid.trailStep, 0.1, 1, "trail step");
    if (s.grid.trailFree !== undefined && typeof s.grid.trailFree !== "boolean")
      throw new Error("trail free: on / off");
    const range = (r: unknown, name: string) => {
      if (!r || typeof r !== "object") return;
      const g = r as {
        tp?: unknown;
        slOfTp?: unknown;
        trailOfTp?: unknown;
        trailSlOfTp?: unknown;
        minSl?: unknown;
        minTrail?: unknown;
      };
      list(g.tp, 0.002, 0.2, `${name} TP`);
      list(g.slOfTp, 0.2, 5, `${name} SL×TP`);
      list(g.trailOfTp, 0, 1, `${name} trail share`);
      num(g.trailSlOfTp, 1, 5, `${name} trailing stop ×TP`);
      num(g.minSl, 0, 0.2, `${name} min SL`);
      num(g.minTrail, 0, 0.1, `${name} min trail`);
    };
    const short = s.grid.short;
    const minimal = s.grid.minimal;
    const general = s.grid.general;
    const long = s.grid.long;
    range(short, "short");
    range(minimal, "minimal");
    range(general, "general");
    range(long, "long");
    const micro = s.grid.micro;
    if (micro && typeof micro === "object") {
      const wide = (xs: unknown, lo: number, hi: number, name: string, max: number) => {
        if (!Array.isArray(xs) || xs.length < 1 || xs.length > max) throw new Error(`${name}: 1–${max} values`);
        for (const x of xs) num(x, lo, hi, name);
      };
      wide(micro.tp, 0.001, 0.2, "micro TP", 16);
      wide(micro.slOfTp, 0.5, 5, "micro SL×TP", 12);
      wide(micro.trailOfTp, 0, 1, "micro trail share", 8);
      if (micro.trailSlOfTp !== undefined) num(micro.trailSlOfTp, 1, 5, "micro trailing stop ×TP");
      if (micro.minSl !== undefined) num(micro.minSl, 0, 0.2, "micro min SL");
      if (micro.minTrail !== undefined) num(micro.minTrail, 0, 0.1, "micro min trail");
      const trails = (micro.trailOfTp as unknown[]).filter((x) => typeof x === "number" && x > 0);
      if (trails.length < 2) throw new Error("micro: at least two trailing configs");
    }
    const holdN = s.grid.holdH?.length ?? 2;
    const cells = (
      r: { tp?: readonly unknown[]; slOfTp?: readonly unknown[]; trailOfTp?: readonly unknown[] } | false | undefined,
    ) =>
      r && r.tp && r.slOfTp && r.trailOfTp ? r.tp.length * r.slOfTp.length * r.trailOfTp.length * holdN : 0;
    const n =
      (s.grid.tp?.length ?? 4) *
        (s.grid.slOfTp?.length ?? 4) *
        (s.grid.trailOfTp?.length ?? 3) *
        holdN +
      cells(short) +
      cells(minimal) +
      cells(general) +
      cells(long) +
      cells(micro);
    const plus = s.grid.minimalPlus;
    let plusN = 0;
    if (plus) {
      if (plus.enabled !== undefined && typeof plus.enabled !== "boolean")
        throw new Error("minimal plus: on / off");
      num(plus.lastN, 50, 500, "minimal plus last N");
      if (plus.lastN !== undefined && !Number.isInteger(plus.lastN))
        throw new Error("minimal plus last N must be a whole number");
      num(plus.minPf, 1.2, 5, "minimal plus min PF");
      if (plus.cells !== undefined) {
        if (!Array.isArray(plus.cells) || plus.cells.length > 80)
          throw new Error("minimal plus: up to 80 selected cells");
        for (const c of plus.cells) {
          num(c?.tp, 0.002, 0.2, "minimal plus cell TP");
          num(c?.sl, 0.001, 0.2, "minimal plus cell SL");
          num(c?.trail, 0, 0.1, "minimal plus cell trail");
        }
      }
      if (plus.enabled === true && !(plus.cells && plus.cells.length))
        throw new Error("minimal plus is on but no cell has cleared the last-N gate");
      if (plus.enabled === true && plus.cells) plusN = plus.cells.length * holdN;
    }
    if (n + plusN > 1200) throw new Error(`protect grid too large (${n + plusN} variants, max 1200)`);
    const rg = s.grid.rangeGate;
    if (rg !== undefined) {
      if (!rg || typeof rg !== "object") throw new Error("range gate: object");
      if (rg.enabled !== undefined && typeof rg.enabled !== "boolean") throw new Error("range gate: on / off");
      num(rg.lastN, 50, 1000, "range gate last N");
      if (rg.lastN !== undefined && !Number.isInteger(rg.lastN)) throw new Error("range gate last N must be a whole number");
      num(rg.minPf, 1.05, 5, "range gate min PF");
    }
    const rf = s.grid.rangeFit;
    if (rf !== undefined) {
      if (!rf || typeof rf !== "object") throw new Error("range fit: object");
      if (rf.enabled !== undefined && typeof rf.enabled !== "boolean") throw new Error("range fit: on / off");
      num(rf.lo, 0.05, 2, "range fit low");
      num(rf.hi, 0.5, 10, "range fit high");
      if (rf.lo !== undefined && rf.hi !== undefined && rf.lo >= rf.hi) throw new Error("range fit: low below high");
      num(rf.keep, 1, 8, "range fit targets kept");
    }
    if (s.grid.rangeSeats !== undefined && typeof s.grid.rangeSeats !== "boolean")
      throw new Error("range seats: on / off");
  }
  if (s.signals) {
    const g = s.signals;
    const bool = (v: unknown, name: string) => {
      if (v !== undefined && typeof v !== "boolean") throw new Error(`${name}: on / off`);
    };
    const list = (xs: unknown, lo: number, hi: number, name: string) => {
      if (xs === undefined) return;
      if (!Array.isArray(xs) || xs.length < 1 || xs.length > 8)
        throw new Error(`${name}: 1–8 values`);
      for (const x of xs) num(x, lo, hi, name);
    };
    bool(g.enabled, "signals");
    if (g.count !== undefined) {
      num(g.count, 10, 200, "active signals");
      if (g.count % 10 !== 0) throw new Error("active signals: steps of 10");
    }
    if (g.sources !== undefined) {
      if (typeof g.sources !== "object" || g.sources === null)
        throw new Error("signal sources: on / off per source");
      for (const [k, v] of Object.entries(g.sources)) bool(v, `signal source ${k}`);
    }
    if (g.ranges) {
      bool(g.ranges.short, "short range");
      bool(g.ranges.medium, "medium range");
      if (g.ranges.short === false && g.ranges.medium === false)
        throw new Error("signals: at least one range");
    }
    if (g.lanes !== undefined) {
      if (
        !Array.isArray(g.lanes) ||
        !g.lanes.length ||
        !g.lanes.every((x) => [1, 5, 15, 30].includes(x))
      )
        throw new Error("signal lanes: any of 1, 5, 15, 30 (minutes)");
    }
    list(g.normal?.tp, 0.002, 0.2, "signal Normal TP");
    list(g.normal?.slOfTp, 0.2, 5, "signal Normal SL×TP");
    list(g.trailing?.tp, 0.002, 0.2, "signal Trailing TP");
    list(g.trailing?.trailOfTp, 0.05, 1, "signal trail share");
    num(g.trailing?.slOfTp, 0.2, 5, "signal Trailing SL×TP");
    num(g.holdH, 0.5, 96, "signal hold");
    if (g.exits !== undefined && !["pct", "atr", "both"].includes(g.exits))
      throw new Error("signal exits: pct, atr or both");
    if (g.atr) {
      list(g.atr.sl, 0.2, 2, "signal ATR stop (× ATR)");
      list(g.atr.tpRatio, 0.2, 3, "signal ATR target ratio (× stop)");
      if (g.atr.trail !== undefined) {
        if (!Array.isArray(g.atr.trail) || g.atr.trail.length > 4)
          throw new Error("signal ATR trail: 0–4 values");
        for (const x of g.atr.trail) num(x, 0.4, 2.4, "signal ATR trail (%)");
      }
      num(g.atr.holdBars, 0, 384, "signal ATR hold (15m bars)");
      int(g.atr.holdBars, "signal ATR hold (15m bars)");
      const n =
        (g.atr.sl?.length ?? 3) * (g.atr.tpRatio?.length ?? 3) * (1 + (g.atr.trail?.length ?? 1));
      if (n > 60) throw new Error(`signal ATR grid too large (${n} configs, max 60)`);
    }
    bool(g.guard?.enabled, "signal guard");
    num(g.guard?.lastN, 2, 50, "signal guard last N");
    num(g.minTrades, 1, 100, "signal min trades");
    int(g.guard?.lastN, "signal guard last N");
    int(g.minTrades, "signal min trades");
    if (g.rank !== undefined && !["drawdown", "lowdd", "net"].includes(g.rank))
      throw new Error("signal ranking: drawdown or net");
    num(g.minBlockShare, 0, 1, "signal min positive 4-hour block share");
    bool(g.validate, "signal validation on the latest hours");
    num(g.validateH, 2, 72, "signal validation window (h)");
    num(g.minSl, 0, 0.1, "signal minimum stop");
    num(g.minTrail, 0, 0.1, "signal minimum trailing distance");
    if (g.sourceGate) {
      bool(g.sourceGate.enabled, "source stability gate");
      num(g.sourceGate.days, 1, 14, "source gate days");
      num(g.sourceGate.minShare, 0, 1, "source gate positive-day share");
      num(g.sourceGate.minTrades, 1, 100, "source gate minimum orders");
    }
    if (g.cluster) {
      bool(g.cluster.enabled, "signal loss-cluster guard");
      num(g.cluster.windowMin, 5, 720, "loss-cluster window (min)");
      num(g.cluster.minLosses, 1, 1000, "loss-cluster min losses");
      num(g.cluster.lossShare, 0.3, 1, "loss-cluster loss share");
      int(g.cluster.minLosses, "loss-cluster min losses");
    }
    if (g.accept) {
      bool(g.accept.enabled, "signal PF acceptance");
      num(g.accept.minPf, 1, 5, "signal acceptance minimum PF");
      num(g.accept.hours, 6, 336, "signal acceptance window (h)");
      num(g.accept.minTrades, 1, 200, "signal acceptance minimum trades");
      int(g.accept.hours, "signal acceptance window (h)");
      int(g.accept.minTrades, "signal acceptance minimum trades");
    }
    if (g.filter) {
      num(g.filter.trendH, 0, 48, "signal trend filter (hours)");
      num(g.filter.volFloor, 0, 0.02, "signal volatility floor");
    }
    if (g.strategies) {
      bool(g.strategies.dca, "signal DCA sets");
      bool(g.strategies.axis, "signal Axis sets");
    }
    num(g.perSymbol, 0, 1000, "signal orders per symbol");
    num(g.maxOpen, 0, 100_000, "signal open orders");
    num(g.maxPositions, 0, 10_000, "signal max positions");
    int(g.maxPositions, "signal max positions");
    int(g.perSymbol, "signal orders per symbol");
    int(g.maxOpen, "signal open orders");
  }
}

/**
 * Cross-field rules against the settings a patch produces (recover PF ≥ trigger PF, axis min < max, a signal
 * range left on): checkSettings alone only sees the fields inside the patch.
 */
export function checkMerged(cur: CoreSettings, patch: Partial<CoreSettings>) {
  const merged: Partial<CoreSettings> = {};
  if (patch.adjust) merged.adjust = { ...cur.adjust, ...patch.adjust } as CoreSettings["adjust"];
  if (patch.axis) merged.axis = { ...cur.axis, ...patch.axis } as CoreSettings["axis"];
  if (patch.signals?.ranges)
    merged.signals = {
      ranges: { ...cur.signals?.ranges, ...patch.signals.ranges },
    } as CoreSettings["signals"];
  checkSettings(merged);
}
