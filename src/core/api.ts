// Core v2 server functions. The UI polls these; the runtime runs continuously on the server.
import { createServerFn } from "@tanstack/react-start";
import type { CoreSettings } from "./config.ts";
import { checkSettings } from "./settings-check.ts";

async function rt() {
  const { coreRuntime } = await import("./server/runtime.server.ts");
  return coreRuntime();
}

type Row = Record<string, unknown>;
type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
/** Server-function payloads must be serializable; this also strips typed arrays and undefined. */
const ser = (x: unknown): Json => JSON.parse(JSON.stringify(x ?? null)) as Json;

/** Base-stage rows: stage 1, plus the Base-protect variant of pairs refined in Main (stored as stage ≥ 2). */
const BASE_ROWS =
  "(stage = 1 OR (ABS(tp - 0.026) < 1e-9 AND ABS(sl - 0.039) < 1e-9 AND trail = 0 AND hold = 32))";

/** Light status for the header (polled often). */
export const coreStatus = createServerFn({ method: "GET" }).handler(async () => {
  const r = await rt();
  const st = r.status;
  return ser({
    state: st.state,
    stage: st.stage,
    progress: st.progress,
    label: st.label,
    source: st.source,
    symbols: st.symbols.length,
    lastBarT: st.lastBarT,
    computes: st.computes,
    pending: st.pending,
    settingsAt: st.settingsAt,
    appliedSettingsAt: st.appliedSettingsAt,
    lastComputeAt: st.lastComputeAt,
    error: st.error,
    live: r.settings.live.enabled,
  });
});

export const coreOverview = createServerFn({ method: "GET" }).handler(async () => {
  const r = await rt();
  const db = r.db;
  const sim = r.sim;
  const pipe = db.kvGet<Row>("pipeline") ?? null;
  const counts = db.get<Row>(
    `SELECT (SELECT COUNT(*) FROM results WHERE ${BASE_ROWS}) AS base, (SELECT COUNT(*) FROM results WHERE stage >= 2) AS main, (SELECT COUNT(*) FROM results WHERE stage = 3) AS evaluated, (SELECT COUNT(*) FROM results WHERE armed = 1) AS armed, (SELECT COUNT(*) FROM results WHERE ${BASE_ROWS} AND is_net > 0 AND is_pf >= ?) AS basePass`,
    r.settings.gates.minPf,
  );
  const paperTrades = db.get<Row>(
    "SELECT COUNT(*) AS n, COALESCE(SUM(pnl), 0) AS pnl, COALESCE(SUM(CASE WHEN r > 0 THEN r ELSE 0 END), 0) AS gp, COALESCE(SUM(CASE WHEN r < 0 THEN -r ELSE 0 END), 0) AS gl FROM paper_trades",
  );
  return ser({
    status: r.status,
    settings: r.settings,
    wf: {
      preH: r.wf.preH,
      simH: r.wf.simH,
      portfolio: r.wf.portfolio,
      lastN: r.wf.lastN,
      longH: r.wf.longH,
      tapes: r.tapes.length,
      protects: r.wf.protects.length,
    },
    counts,
    pipeline: pipe,
    sim: sim
      ? {
          startT: sim.startT,
          endT: sim.endT,
          stats: sim.stats,
          hourly: sim.hourly,
          blocks: sim.blocks,
          byKind: sim.byKind,
          skips: sim.skips,
          stable: sim.stable,
          byConfig: sim.byConfig.slice(0, 12),
        }
      : null,
    paper: {
      selected: r.paper.selected,
      eligible: r.paper.eligible,
      positions: r.paper.positions.length,
      equity: r.paper.equity,
      trades: paperTrades,
    },
    live: db.kvGet<Row>("liveStatus") ?? null,
    db: { bytes: db.bytes() },
  });
});

export const coreResults = createServerFn({ method: "GET" })
  .validator(
    (d?: {
      stage?: number;
      bot?: string;
      ind?: string;
      sort?: string;
      limit?: number;
      q?: string;
    }) => d ?? {},
  )
  .handler(async ({ data }) => {
    const r = await rt();
    const where: string[] = [];
    const p: Array<string | number> = [];
    if (data.stage) {
      where.push(data.stage === 1 ? BASE_ROWS : "stage >= ?");
      if (data.stage !== 1) p.push(data.stage);
    }
    if (data.bot) {
      where.push("bot = ?");
      p.push(data.bot);
    }
    if (data.ind) {
      where.push("ind = ?");
      p.push(data.ind);
    }
    if (data.q) {
      where.push("id LIKE ?");
      p.push(`%${data.q}%`);
    }
    const sorts: Record<string, string> = {
      score: "score DESC",
      pf: "pf DESC",
      net: "net DESC",
      n: "n DESC",
      rank: "rank IS NULL, rank ASC",
      oos: "oos_pf IS NULL, oos_pf DESC",
      gh: "gh DESC",
    };
    const order = sorts[data.sort ?? "score"] ?? sorts.score;
    const limit = Math.min(1000, Math.max(1, Math.floor(Number(data.limit) || 200)));
    const rows = r.db.all<Row>(
      `SELECT * FROM results ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY ${order} LIMIT ${limit}`,
      ...p,
    );
    const total =
      r.db.get<{ n: number }>(
        `SELECT COUNT(*) AS n FROM results ${where.length ? `WHERE ${where.join(" AND ")}` : ""}`,
        ...p,
      )?.n ?? 0;
    return ser({ rows, total });
  });

/** Bot × indication matrix from the Base stage (best stage-1 result per pair). */
export const coreMatrix = createServerFn({ method: "GET" }).handler(async () => {
  const r = await rt();
  const rows = r.db.all<Row>(
    `SELECT bot, ind, n, pf, net, gh, is_pf, is_net, score FROM results WHERE ${BASE_ROWS}`,
  );
  const refined = r.db.all<Row>(
    "SELECT bot, ind, MAX(score) AS score, MAX(oos_pf) AS oos_pf, SUM(armed) AS armed FROM results WHERE stage >= 2 GROUP BY bot, ind",
  );
  return ser({ rows, refined, minPf: r.settings.gates.minPf });
});

export const coreConfig = createServerFn({ method: "GET" })
  .validator((d: { id: string }) => {
    if (!d?.id) throw new Error("id required");
    return d;
  })
  .handler(async ({ data }) => {
    const r = await rt();
    const row = r.db.get<Row>("SELECT * FROM results WHERE id = ?", data.id) ?? null;
    const lastn = r.db.all<Row>(
      "SELECT n, part, taken, pf, net, ddt, score FROM lastn WHERE cfg = ? ORDER BY part, n",
      data.id,
    );
    const evals = r.db.all<Row>(
      "SELECT at, win, n, pf, net, ddt, wr, pass FROM evals WHERE cfg = ? ORDER BY at DESC, win LIMIT 400",
      data.id,
    );
    const trades = r.db.all<Row>(
      "SELECT sym, side, entry_t, exit_t, entry, exit, r, reason, bars FROM tapes WHERE cfg = ? ORDER BY exit_t",
      data.id,
    );
    return ser({ row, lastn, evals, trades });
  });

export const coreSim = createServerFn({ method: "GET" }).handler(async () => {
  const r = await rt();
  const sim = r.sim;
  const presets = r.db.kvGet<Row>("presetSims") ?? null;
  const runs = r.db.all<Row>(
    "SELECT id, at, start_t, end_t, n, pf, net, gh, tph, ddt, stable FROM sim_runs ORDER BY id DESC LIMIT 60",
  );
  if (!sim) return ser({ sim: null, presets, runs });
  return ser({
    sim: {
      startT: sim.startT,
      endT: sim.endT,
      stats: sim.stats,
      hourly: sim.hourly,
      blocks: sim.blocks,
      byKind: sim.byKind,
      skips: sim.skips,
      stable: sim.stable,
      byConfig: sim.byConfig,
      steps: sim.steps.map((s) => ({
        t: s.t,
        main: s.main,
        real: s.real.length,
        taken: s.taken,
        skipped: s.skipped,
        net: s.net,
      })),
      trades: sim.trades.slice(-400).reverse(),
      opts: {
        preH: sim.opts.preH,
        simH: sim.opts.simH,
        lastN: sim.opts.lastN,
        portfolio: sim.opts.portfolio,
        toggles: sim.opts.toggles,
        block: sim.opts.block,
        dca: sim.opts.dca,
      },
    },
    presets,
    runs,
  });
});

export const coreTrading = createServerFn({ method: "GET" }).handler(async () => {
  const r = await rt();
  return ser({
    positions: r.db.all<Row>("SELECT * FROM paper_positions ORDER BY entry_t DESC"),
    trades: r.db.all<Row>("SELECT * FROM paper_trades ORDER BY exit_t DESC LIMIT 300"),
    selected: r.paper.selected,
    equity: r.paper.equity,
    live: r.db.kvGet<Row>("liveStatus") ?? null,
    liveOrders: r.db.all<Row>("SELECT * FROM live_orders ORDER BY at DESC LIMIT 200"),
    pending: r.pendingEntries().slice(0, 50),
    control: r.db.kvGet<Row>("controlStatus") ?? null,
    adjust: Object.values(r.adjustState())
      .sort((a, b) => b.level - a.level || b.at - a.at)
      .slice(0, 60),
    liveCost: r.liveCost(),
    cost: { model: r.settings.cost, fees: r.settings.fees },
    controlPreview: await controlPreview(r),
    liveSettings: r.settings.live,
  });
});

/** The Overall control positions the current paper book asks for (shown even while Live is off). */
async function controlPreview(r: Awaited<ReturnType<typeof rt>>) {
  const { controlTargets } = await import("./server/live.ts");
  const s = r.settings.live;
  const prices = new Map<string, number>();
  for (const [sym, cs] of r.candles) if (cs.length) prices.set(sym, cs[cs.length - 1].c);
  const lanes = r.paper.positions.map((p) => ({
    cfg: p.cfg,
    sym: p.sym,
    side: p.side,
    vol: p.vol ?? 1,
    sl: Math.abs(p.entry - p.stop) / p.entry || 0.05,
  }));
  return controlTargets(lanes, prices, {
    notionalUsd: s.notionalUsd,
    ratio: s.ratio ?? 1,
    maxNotionalUsd: s.maxNotionalUsd ?? s.notionalUsd * 5,
    maxPositions: s.maxPositions,
    rebalancePct: s.rebalancePct ?? 0.25,
  });
}

export const coreMarket = createServerFn({ method: "GET" }).handler(async () => {
  const r = await rt();
  const symbols = r.db.all<Row>("SELECT * FROM symbols ORDER BY quote_vol DESC");
  const spark: Record<string, number[]> = {};
  for (const [sym, cs] of r.candles) spark[sym] = cs.slice(-96).map((c) => c.c);
  return ser({ symbols, spark, tfMin: r.settings.tfMin, source: r.status.source });
});

export const coreEngine = createServerFn({ method: "GET" }).handler(async () => {
  const r = await rt();
  const mem = process.memoryUsage();
  return ser({
    status: r.status,
    settings: { gates: r.settings.gates },
    audit: r.audit,
    tables: r.db.tableStats(),
    bytes: r.db.bytes(),
    runs: r.db.all<Row>("SELECT * FROM runs ORDER BY id DESC LIMIT 40"),
    events: r.db.all<Row>("SELECT * FROM events ORDER BY id DESC LIMIT 200"),
    process: { rss: mem.rss, heap: mem.heapUsed, uptime: process.uptime(), node: process.version },
  });
});

export const coreSettings = createServerFn({ method: "GET" }).handler(async () => {
  const r = await rt();
  const { WF_KEYS } = await import("./server/runtime.server.ts");
  const wf: Record<string, unknown> = {};
  for (const k of WF_KEYS) wf[k] = r.wf[k];
  return ser({ settings: r.settings, wf });
});

export const saveCoreSettings = createServerFn({ method: "POST" })
  .validator((d: { settings?: Partial<CoreSettings>; wf?: Record<string, unknown> }) => {
    if (!d || typeof d !== "object") throw new Error("invalid");
    checkSettings(d.settings ?? {});
    return d;
  })
  .handler(async ({ data }) => {
    const r = await rt();
    r.updateSettings(data.settings ?? {}, (data.wf ?? {}) as never);
    return ser({ ok: true, settings: r.settings });
  });

/** Research presets (fixed, measured) + presets saved from the engine, with their results. */
export const corePresets = createServerFn({ method: "GET" }).handler(async () => {
  const r = await rt();
  const { RESEARCH_PRESETS } = await import("./presets.ts");
  const sim = r.sim;
  return ser({
    research: RESEARCH_PRESETS,
    saved: r.savedPresets().sort((a, b) => b.at - a.at),
    active: r.db.kvGet("activePreset") ?? null,
    backtests: r.presetBacktests(),
    job: r.backtestJob,
    gates: r.settings.gates,
    current: sim
      ? {
          pf: sim.stats.pf,
          n: sim.stats.n,
          gh: sim.stats.gh,
          wr: sim.stats.wr,
          net: sim.stats.net,
          stable: sim.stable,
          hours: (sim.endT - sim.startT) / 3_600_000,
        }
      : null,
  });
});

export const presetAction = createServerFn({ method: "POST" })
  .validator(
    (d: {
      action: "save" | "apply" | "delete" | "backtest" | "update";
      id?: string;
      label?: string;
      info?: string;
      days?: number;
      settings?: Partial<CoreSettings>;
      wf?: Record<string, unknown>;
    }) => {
      if (!d || !["save", "apply", "delete", "backtest", "update"].includes(d.action))
        throw new Error("bad action");
      if (d.action === "update") {
        if (!d.settings || typeof d.settings !== "object") throw new Error("settings required");
        if ("live" in d.settings) throw new Error("a preset never carries the Live stage");
        checkSettings(d.settings);
      }
      if (
        d.action === "backtest" &&
        (typeof d.days !== "number" || !Number.isInteger(d.days) || d.days < 1 || d.days > 12)
      )
        throw new Error("days: 1–12");
      if (d.action !== "save" && (typeof d.id !== "string" || d.id.length > 120))
        throw new Error("preset id required");
      if (d.label !== undefined && (typeof d.label !== "string" || d.label.length > 80))
        throw new Error("label: up to 80 characters");
      if (d.info !== undefined && (typeof d.info !== "string" || d.info.length > 400))
        throw new Error("info: up to 400 characters");
      return d;
    },
  )
  .handler(async ({ data }) => {
    const r = await rt();
    if (data.action === "save")
      return ser({ ok: true, preset: r.savePreset(data.label ?? "", data.info ?? "") });
    if (data.action === "apply") return ser({ ok: true, preset: r.applyPreset(data.id!) });
    if (data.action === "update")
      return ser({
        ok: true,
        preset: r.updatePreset(data.id!, data.settings!, data.wf ?? {}, data.label, data.info),
      });
    if (data.action === "backtest") {
      r.startPresetBacktest(data.id!, data.days!);
      return ser({ ok: true, job: r.backtestJob });
    }
    r.deletePreset(data.id!);
    return ser({ ok: true });
  });

export const coreControl = createServerFn({ method: "POST" })
  .validator((d: { action: "start" | "stop" | "recompute" | "resync" }) => {
    if (!["start", "stop", "recompute", "resync"].includes(d?.action))
      throw new Error("bad action");
    return d;
  })
  .handler(async ({ data }) => {
    const r = await rt();
    if (data.action === "stop") r.stop();
    else if (data.action === "start") r.start();
    else if (data.action === "resync") r.requestResync();
    else r.kick();
    return ser({ ok: true, state: r.status.state });
  });
