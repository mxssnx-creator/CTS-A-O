// What the Core v2 server functions return: each page's data as a plain async function of its input (api.ts wraps
// them as server functions; tests call them directly against a runtime). Server modules load on demand.
import { MAX_BACKTEST_DAYS, type CoreSettings } from "./config.ts";
import { checkMerged, checkSettings } from "./settings-check.ts";
import { closedPositions, openBook } from "./positions.ts";

/** Newest live state (in memory in the live step; the database copy trails it by up to ~1 s). */
async function liveState<T>(
  db: { kvGet<U>(k: string): U | undefined },
  key: string,
): Promise<T | null> {
  const { liveKv } = await import("./server/live.server.ts");
  return liveKv<T>(db as never, key);
}

/** The runtime of a connection (default: the primary connection). Every page reads the selected connection. */
async function rt(conn?: unknown) {
  const { runtimeFor, isConnId } = await import("./server/runtime.server.ts");
  if (conn !== undefined && conn !== null && conn !== "" && !isConnId(conn))
    throw new Error("unknown connection");
  return runtimeFor(isConnId(conn) ? conn : undefined);
}

/** Input of a read that only needs the connection. */
export const connInput = (d?: { conn?: string }) => {
  if (d?.conn !== undefined && (typeof d.conn !== "string" || d.conn.length > 40))
    throw new Error("bad connection");
  return { conn: d?.conn };
};

type Row = Record<string, unknown>;
type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
/** Server-function payloads must be serializable; this also strips typed arrays and undefined. */
const ser = (x: unknown): Json => JSON.parse(JSON.stringify(x ?? null)) as Json;

/** Input of a listing page: which list, an optional range and text filter, and the page. */
export const coreListingInput = (d?: {
  conn?: string;
  kind?: string;
  range?: string;
  q?: string;
  offset?: number;
  limit?: number;
}) => {
  const kind = d?.kind ?? "validated";
  if (!["validated", "active", "proven"].includes(kind)) throw new Error("kind: validated, active or proven");
  if (d?.range !== undefined && (typeof d.range !== "string" || d.range.length > 20)) throw new Error("bad range");
  if (d?.q !== undefined && (typeof d.q !== "string" || d.q.length > 80)) throw new Error("bad filter");
  const offset = Math.max(0, Math.floor(Number(d?.offset ?? 0)) || 0);
  const limit = Math.min(500, Math.max(1, Math.floor(Number(d?.limit ?? 100)) || 100));
  return { ...connInput(d), kind: kind as "validated" | "active" | "proven", range: d?.range, q: d?.q?.toLowerCase(), offset, limit };
};

/**
 * One page of a listing of the last paper step (CoreRuntime.listings, built once per step): the validated engine
 * configs (best score first; a range reads its own row index), the active signal units or the engine configs proven
 * live — never a scan of the tapes per request.
 */
export async function coreListingData(data: ReturnType<typeof coreListingInput>) {
  const r = await rt(data.conn);
  const L = r.listings;
  if (!L) return ser({ ready: false, kind: data.kind, total: 0, rows: [], byRange: [] });
  const q = data.q;
  let rows: unknown[];
  if (data.kind === "validated") {
    const idx = data.range ? (L.byRange[data.range]?.rows ?? []) : null;
    const all = idx ? idx.map((i) => L.validated[i]) : L.validated;
    rows = q ? all.filter((x) => x.id.toLowerCase().includes(q)) : all;
  } else if (data.kind === "active") {
    rows = q ? L.active.filter((x) => `${x.bot}|${x.ind}|${x.sym}`.toLowerCase().includes(q)) : L.active;
  } else rows = (L.proven ?? []).filter((id) => !q || id.toLowerCase().includes(q)).map((id) => ({ id }));
  return ser({
    ready: true,
    kind: data.kind,
    paperStep: L.paperStep,
    at: L.at,
    total: rows.length,
    offset: data.offset,
    rows: rows.slice(data.offset, data.offset + data.limit),
    byRange: Object.entries(L.byRange).map(([range, x]) => ({ range, validated: x.rows.length, pf: x.pf })),
    proofOn: L.proven !== null,
  });
}

/** Base-stage rows: stage 1, plus the Base-protect variant of pairs refined in Main (stored as stage ≥ 2). */
const BASE_ROWS =
  "(stage = 1 OR (ABS(tp - 0.026) < 1e-9 AND ABS(sl - 0.039) < 1e-9 AND trail = 0 AND hold = 32))";

/** Light status for the header (polled often). */
export async function coreStatusData(data: ReturnType<typeof connInput>) {
  const r = await rt(data.conn);
  const st = r.status;
  const live = await liveState<{ enabled: boolean; reason: string }>(r.db, "liveStatus");
  return ser({
    state: st.state,
    stage: st.stage,
    progress: st.progress,
    label: st.label,
    // the whole job's bar (backfill batch → compute → paper step) and the compute's start / the last one's length
    // (an ETA while computing)
    overall: st.overall ?? 0,
    // the last progress report and the current stage's start: the shell marks a busy job whose report is old as stale
    heartbeat: st.heartbeat,
    stageAt: st.stageAt ?? 0,
    computeStartedAt: st.computeStartedAt ?? 0,
    lastComputeMs: st.lastComputeMs,
    paperCompute: st.paperCompute ?? 0,
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
    // the live step's own state (enabled = armed, reason when blocked); null before its first step
    liveStatus: live ? { enabled: live.enabled, reason: live.reason } : null,
    signals: st.signals,
    baseEvaluated: st.baseEvaluated,
    basePassed: st.basePassed,
    baseBuilt: st.baseBuilt ?? 0,
    baseByRange: st.baseByRange ?? [],
    baseHistory: st.baseHistory ?? [],
  });
}

export async function coreOverviewData(data: ReturnType<typeof connInput>) {
  const r = await rt(data.conn);
  const db = r.db;
  const sim = r.sim;
  const pipe = db.kvGet<Row>("pipeline") ?? null;
  const counts = db.get<Row>(
    `SELECT (SELECT COUNT(*) FROM results WHERE ${BASE_ROWS}) AS base, (SELECT COUNT(*) FROM results WHERE stage >= 2) AS main, (SELECT COUNT(*) FROM results WHERE stage = 3) AS evaluated, (SELECT COUNT(*) FROM results WHERE armed = 1) AS armed`,
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
      // the seat validation's last N closes (engine configs / signal configs; 0 = off)
      validLastN: r.wf.validLastN ?? 0,
      signalValidLastN: r.wf.signalValidLastN ?? r.wf.validLastN ?? 0,
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
          positions: closedPositions(sim.trades),
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
      book: openBook(r.paper.positions),
      equity: r.paper.equity,
      balance: r.paper.balance ?? r.settings.paperBalance + r.paper.equity,
      startBalance: r.settings.paperBalance,
      sizing: r.settings.sizing,
      trades: paperTrades,
    },
    live: (await liveState<Row>(db, "liveStatus")) ?? null,
    liveSession: await liveSession(r),
    liveTag: (await import("./server/live.ts")).liveTag(r.settings.live.connId),
    db: { bytes: db.bytes() },
    lanes: await laneSummary(r),
  });
}

/** Per timeframe lane: Base evaluated / passed, Main tapes, simulated trades (n, PF, net), open paper positions. */
async function laneSummary(r: Awaited<ReturnType<typeof rt>>) {
  const { laneLabel } = await import("./indications/registry.ts");
  const { passesBase } = await import("./pipeline/pipeline.ts");
  const { statsOf } = await import("./metrics/stats.ts");
  const lab = (ind: string) => laneLabel(ind) || "plain";
  const rows = new Map<
    string,
    {
      lane: string;
      base: number;
      passed: number;
      tapes: number;
      trades: Array<{ r: number; exitT: number; entryT: number; sym: string; side: number }>;
      open: Array<{ sym: string; side: number }>;
    }
  >();
  const row = (lane: string) => {
    let x = rows.get(lane);
    if (!x) rows.set(lane, (x = { lane, base: 0, passed: 0, tapes: 0, trades: [], open: [] }));
    return x;
  };
  for (const c of r.pipeline?.s1 ?? []) {
    const x = row(lab(c.ind));
    x.base++;
    if (passesBase(c.full, r.settings.gates)) x.passed++;
  }
  for (const t of r.tapes) row(lab(t.ind)).tapes++;
  const indOf = (cfg: string) => cfg.split("|")[1] ?? "";
  for (const t of r.sim?.trades ?? []) row(lab(indOf(t.cfg))).trades.push(t);
  for (const p of r.paper.positions) row(lab(indOf(p.cfg))).open.push(p);
  const order = ["1m", "1m+", "5m", "5m+", "15m", "15m+", "30m", "plain"];
  return [...rows.values()]
    .sort((a, b) => order.indexOf(a.lane) - order.indexOf(b.lane))
    .map((x) => {
      const st = statsOf([...x.trades].sort((a, b) => a.exitT - b.exitT) as never);
      return {
        lane: x.lane,
        base: x.base,
        passed: x.passed,
        tapes: x.tapes,
        n: st.n,
        positions: closedPositions(x.trades),
        pf: st.pf,
        net: st.net,
        wr: st.wr,
        open: openBook(x.open),
      };
    });
}

/** Input of coreResults. */
export const coreResultsInput = (d?: {
  stage?: number;
  bot?: string;
  ind?: string;
  /** timeframe lane: "5" (independent) or "5c" (combined) */
  lane?: string;
  sort?: string;
  limit?: number;
  q?: string;
  conn?: string;
}) => {
  if (d?.lane !== undefined && d.lane !== "" && !/^(1|5|15|30)c?$/.test(d.lane))
    throw new Error("lane: 1, 5, 15 or 30, optionally combined (c)");
  return d ?? {};
};

export async function coreResultsData(data: ReturnType<typeof coreResultsInput>) {
  const r = await rt(data.conn);
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
    // a plain indication matches it in every timeframe lane
    where.push("(ind = ? OR ind LIKE ?)");
    p.push(data.ind, `${data.ind}@m%`);
  }
  if (data.lane) {
    where.push("ind LIKE ?");
    p.push(`%@m${data.lane}`);
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
}

/** Bot × indication matrix from the Base stage (best stage-1 result per pair). */
export async function coreMatrixData(data: ReturnType<typeof connInput>) {
  const r = await rt(data.conn);
  const rows = r.db.all<Row>(
    `SELECT bot, ind, n, pf, net, gh, is_pf, is_net, score FROM results WHERE ${BASE_ROWS}`,
  );
  const refined = r.db.all<Row>(
    "SELECT bot, ind, MAX(score) AS score, MAX(oos_pf) AS oos_pf, SUM(armed) AS armed FROM results WHERE stage >= 2 GROUP BY bot, ind",
  );
  return ser({ rows, refined, minPf: r.settings.gates.minPf });
}

/** Input of coreConfig. */
export const coreConfigInput = (d: { id: string; conn?: string }) => {
  if (!d?.id) throw new Error("id required");
  return d;
};

export async function coreConfigData(data: ReturnType<typeof coreConfigInput>) {
  const r = await rt(data.conn);
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
  // Base configs keep only their stats; their trades are recomputed from the current candles
  if (!trades.length) {
    const ts = r.comboTrades(data.id) ?? [];
    for (const t of ts)
      trades.push({
        sym: t.sym,
        side: t.side,
        entry_t: t.entryT,
        exit_t: t.exitT,
        entry: t.entry,
        exit: t.exit,
        r: t.r,
        reason: t.reason,
        bars: t.bars,
      });
  }
  return ser({ row, lastn, evals, trades });
}

export async function coreSimData(data: ReturnType<typeof connInput>) {
  const r = await rt(data.conn);
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
      positions: closedPositions(sim.trades),
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
}

/** latest paper closes listed on the Trading page */
const TRADES_SHOWN = 300;

export async function coreTradingData(data: ReturnType<typeof connInput>) {
  const r = await rt(data.conn);
  const units = r.paper.units;
  const { orderKey } = await import("./sizing.ts");
  const unitOf = (x: { cfg: string; sym: string; side: number; entryT: number }) =>
    units?.get(orderKey(x)) ?? r.settings.paperNotional;
  // the paper book's realized P&L (as in its equity): carried closes + every closed order's r × unit
  let realized = r.paper.carried ?? 0;
  for (const t of r.paper.trades) realized += t.r * unitOf(t);
  return ser({
    // open orders from the in-memory book (the database copy trails it): with Block level, volume and unit
    positions: [...r.paper.positions]
      .sort((a, b) => b.entryT - a.entryT)
      .map((p) => ({
        cfg: p.cfg,
        sym: p.sym,
        side: p.side,
        entry_t: p.entryT,
        entry: p.entry,
        stop: p.stop,
        target: p.target,
        mtm: p.mtm,
        vol: p.vol ?? 1,
        level: p.level ?? null,
        unit: unitOf(p),
      })),
    realized,
    // the part of it from closes before the window (no longer listed as rows)
    carried: r.paper.carried ?? 0,
    adjustWindow: r.settings.adjust.window,
    // positions = symbol × direction; orders = every lane's partial (open and closed)
    book: openBook(r.paper.positions),
    closed: { orders: r.paper.trades.length, positions: closedPositions(r.paper.trades) },
    trades: r.db.all<Row>(`SELECT * FROM paper_trades ORDER BY exit_t DESC LIMIT ${TRADES_SHOWN}`),
    tradesShown: TRADES_SHOWN,
    selected: r.paper.selected,
    equity: r.paper.equity,
    balance: r.paper.balance ?? r.settings.paperBalance + r.paper.equity,
    startBalance: r.settings.paperBalance,
    sizing: r.settings.sizing,
    live: (await liveState<Row>(r.db, "liveStatus")) ?? null,
    ...(await liveOrdersView(r)),
    liveSession: await liveSession(r),
    liveTag: (await import("./server/live.ts")).liveTag(r.settings.live.connId),
    pending: r.pendingEntries().slice(0, 50),
    control: (await liveState<Row>(r.db, "controlStatus")) ?? null,
    adjust: Object.values(r.adjustState())
      .sort((a, b) => b.level - a.level || b.at - a.at)
      .slice(0, 60),
    liveCost: r.liveCost(),
    cost: { model: r.settings.cost, fees: r.settings.fees },
    controlPreview: await controlPreview(r),
    liveSettings: r.settings.live,
    // where the connection's keys come from (never the keys): own / x01 (demo connections) / generic / none
    liveKeys: (await import("./exchange/bingx.server.ts")).keysFor(r.settings.live.connId).source,
  });
}

/**
 * The Overall control positions the current paper book asks for (shown even while Live is off): the lanes the live
 * step would send (live.kinds / source / plainOnly / excludeRanges, the selected engine configs and active signals,
 * top configs), the same sizing (unit from the last equity read, else the paper balance; minimum-quantity sizing per
 * symbol; position mode; per-position cap; exchange minimum) and live.maxSymbols. Without an exchange read the held
 * positions come from the live step's last control status, the equity caps from the last equity read (else the
 * paper balance). The account-wide scalers (gross exposure, stop risk, worst case) are applied as the live step applies
 * them, drops included, so the preview shows the sizes the desk would send.
 */
async function controlPreview(r: Awaited<ReturnType<typeof rt>>) {
  const {
    controlTargets,
    liveNetwork,
    positionCapFor,
    topConfigLanes,
    scaleToBudgets,
    riskNotional,
    symRiskDist,
    RISK_PER_POSITION_DEFAULT,
  } = await import("./server/live.ts");
  const {
    controlSettingsOf,
    laneContributions,
    liveKv,
    liveLaneFilter,
    liveUnitPeek,
    positionCapOf,
    venueMinQty,
  } = await import("./server/live.server.ts");
  const { isSignalInd } = await import("./indications/registry.ts");
  const bx = await import("./exchange/bingx.server.ts");
  const s = r.settings.live;
  const specs = await bx
    .fetchContracts(liveNetwork(s.connId))
    .catch(() => new Map<string, never>());
  const prices = new Map<string, number>();
  for (const [sym, cs] of r.candles) if (cs.n) prices.set(sym, cs.c[cs.n - 1]);
  const u = liveUnitPeek(r);
  const minQty = u.from === "minQty";
  // B = min(wallet, equity) of the account read (the live step's last status, else the connection's last read): the
  // base of every equity cap and budget, as the live step sizes. No read yet: the equity caps are not applied and the
  // panel says so — never the paper balance in its place
  const acct = liveKv<{ account?: { base?: number | null; wallet?: number | null; equity?: number | null; readAt?: number | null } }>(
    r.db as never,
    "liveStatus",
  )?.account;
  const base = acct?.base ?? u.base;
  const baseAt = acct?.base != null ? (acct.readAt ?? null) : u.at;
  const eq = base ?? 0;
  const lotUsd = (sym: string, px: number) => bx.minQtyExchange(px, specs.get(sym) ?? null) * px;
  // positions the exchange holds (the live step's last read): their lanes stay while held, they come first under maxSymbols
  const status = liveKv<{ held?: Array<{ key: string; qty: number }> }>(
    r.db as never,
    "controlStatus",
  );
  const heldKeys = new Set((status?.held ?? []).filter((h) => h.qty > 0).map((h) => h.key));
  const selected = r.paper.selected ? new Set(r.paper.selected) : null;
  const { validLane } = liveLaneFilter(s, selected, r.wf?.signalActive, r.engineProof()?.proven ?? null);
  let lanes = laneContributions(r, prices).filter(
    (l) => validLane(l) || heldKeys.has(`${l.sym}|${l.side}`),
  );
  const posCap = positionCapFor(positionCapOf(s), eq, s.maxPositionX);
  // top configs ("fill" or a number), with the live step's budget: exposure cap, risk and worst-case budgets
  const top = s.top;
  let topKept: { kept: number; of: number } | null = null;
  if (top === "fill" || (typeof top === "number" && top > 0)) {
    const maxExposureX = s.exposureScaler === false ? 0 : (s.maxExposureX ?? 0);
    const minStop = s.minStopPct ?? 0.01;
    let lw = 0;
    let lr = 0;
    let ls = 0;
    for (const l of lanes) {
      const w =
        Math.max(0, l.vol) *
        (isSignalInd(l.cfg.split("|")[1] ?? "") ? Math.max(0, s.signalWeight ?? 1) : 1);
      lw += w;
      lr += w * Math.max(0, l.risk ?? l.sl);
      ls += w * Math.min(0.2, Math.max(minStop, l.sl * 1.2));
    }
    const meanRisk = Math.max(minStop, lw > 0 ? lr / lw : 0.01);
    const meanStop = Math.max(minStop, lw > 0 ? ls / lw : 0.012);
    const budget = Math.min(
      maxExposureX > 0 && eq > 0 ? maxExposureX * eq : Infinity,
      s.maxRiskPct && s.maxRiskPct > 0 && eq > 0 ? (s.maxRiskPct * eq) / meanRisk : Infinity,
      s.maxBackstopLossPct && s.maxBackstopLossPct > 0 && eq > 0
        ? (s.maxBackstopLossPct * eq) / meanStop
        : Infinity,
    );
    const ratio = s.ratio ?? 1;
    const prev = liveKv<string[]>(r.db as never, "controlTopKept");
    const riskOf = s.positionSize === "risk" ? symRiskDist(lanes, minStop) : null;
    const t = topConfigLanes(lanes, (c) => r.paper.scores?.get(c), {
      top,
      budget,
      prefer: new Set(Array.isArray(prev) ? prev : []),
      signalWeight: s.signalWeight ?? 1,
      signalsByScore: s.signalsByScore === true,
      posCost: (sym, v) => {
        const px = prices.get(sym) ?? 0;
        const spec = specs.get(sym) ?? null;
        const unit = minQty ? lotUsd(sym, px) : u.unit;
        // positionSize "min": a position costs its ratio units, however many lanes hold it (as the live step)
        const units = s.positionSize === "min" ? 1 : v;
        // positionSize "risk": B × risk per position × ratio at the symbol's lanes' planned risk (as the live step)
        const want = riskOf
          ? riskNotional(eq, s.riskPerPositionPct ?? RISK_PER_POSITION_DEFAULT, ratio, riskOf.get(sym) ?? minStop)
          : units * ratio * unit;
        return Math.max(bx.exchangeMinNotional(spec, px), Math.min(posCap, want));
      },
    });
    lanes = t.lanes;
    topKept = { kept: t.kept, of: t.of };
  }
  // a minimum the venue has named is never undercut (the live step sizes with it as well)
  const snapPlan = (sym: string, q: number, px: number) =>
    bx.snapQtyExchange(q, px, specs.get(sym) ?? null, venueMinQty(r as never, sym)).qty;
  const plan = controlTargets(
    lanes,
    prices,
    {
      ...controlSettingsOf(s, u.unit, r.settings.signals.maxPositions, eq),
      maxNotionalUsd: posCap,
      ...(minQty ? { unitOf: lotUsd } : {}),
      heldKeys,
    },
    (sym, q, px) => bx.snapQtyExchange(q, px, specs.get(sym) ?? null, venueMinQty(r as never, sym)),
  );
  // the account-wide scalers, in the live step's order: gross exposure, stop risk, worst case — their drops decided
  // across all three at once, as the live step does (the drops are shown)
  const expoX = s.exposureScaler === false ? 0 : (s.maxExposureX ?? 0);
  const { exposure, risk, worst } = scaleToBudgets(
    plan.targets,
    eq,
    { maxExposureX: expoX, maxRiskPct: s.maxRiskPct, maxBackstopLossPct: s.maxBackstopLossPct },
    snapPlan,
    heldKeys,
  );
  for (const [k, why] of [
    ...(exposure?.dropped ?? []).map((k) => [k, "gross exposure cap"] as const),
    ...(risk?.dropped ?? []).map((k) => [k, "risk budget"] as const),
    ...(worst?.dropped ?? []).map((k) => [k, "worst-case budget"] as const),
  ])
    plan.skipped.push({ sym: k.split("|")[0], why });
  // live.maxSymbols: held symbols first, then the ranked targets
  const maxSyms = s.maxSymbols ?? 0;
  let symbolCapDropped = 0;
  if (maxSyms > 0) {
    const allowed = new Set([...heldKeys].map((k) => k.split("|")[0]));
    for (const t of plan.targets) {
      if (allowed.size >= maxSyms) break;
      allowed.add(t.sym);
    }
    const keep = plan.targets.filter((t) => allowed.has(t.sym));
    symbolCapDropped = plan.targets.length - keep.length;
    plan.targets = keep;
  }
  // the live step sizes nothing while an equity cap is on and the account was never read (held positions stay): the
  // preview shows the same — no targets, with the reason
  const eqCapped =
    (s.maxPositionX ?? 0) > 0 || expoX > 0 || (s.maxRiskPct ?? 0) > 0 || s.positionSize === "risk";
  const noBase = eqCapped && !(eq > 0) ? "no account read yet: the live step sizes nothing until the account is read" : null;
  if (noBase) plan.targets = [];
  return {
    ...plan,
    noBase,
    unit: u.unit,
    unitFrom: u.from,
    // the base the caps and budgets were applied on (null: no account read — caps on equity not applied)
    base: base ?? null,
    baseAt,
    wallet: acct?.wallet ?? u.wallet,
    equity: acct?.equity ?? u.equity,
    top: topKept,
    symbolCapDropped,
  };
}

export async function coreMarketData(data: ReturnType<typeof connInput>) {
  const r = await rt(data.conn);
  const symbols = r.db.all<Row>("SELECT * FROM symbols ORDER BY quote_vol DESC");
  const spark: Record<string, number[]> = {};
  // the last 24 h of bars (1440 / tfMin), sampled down to ~96 points
  const bars24 = Math.max(1, Math.round(1440 / Math.max(1, r.settings.tfMin || 1)));
  for (const [sym, cs] of r.candles) {
    const from = Math.max(0, cs.n - bars24);
    const len = cs.n - from;
    const step = Math.max(1, Math.ceil(len / 96));
    const out: number[] = [];
    // sampled from the newest bar backwards, so the last point is always the latest close
    for (let i = len - 1; i >= 0; i -= step) out.push(cs.c[from + i]);
    spark[sym] = out.reverse();
  }
  return ser({ symbols, spark, tfMin: r.settings.tfMin, source: r.status.source });
}

export async function coreEngineData(data: ReturnType<typeof connInput>) {
  const r = await rt(data.conn);
  const mem = process.memoryUsage();
  return ser({
    // server time of this read (the compute's elapsed / ETA are measured on the server's clock)
    at: Date.now(),
    status: r.status,
    settings: { gates: r.settings.gates },
    audit: r.audit,
    tables: r.db.tableStats(),
    bytes: r.db.bytes(),
    runs: r.db.all<Row>("SELECT * FROM runs ORDER BY id DESC LIMIT 40"),
    events: r.db.all<Row>("SELECT * FROM events ORDER BY id DESC LIMIT 200"),
    process: {
      rss: mem.rss,
      heap: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
      arrayBuffers: mem.arrayBuffers,
      uptime: process.uptime(),
      node: process.version,
    },
  });
}

export async function coreSettingsData(data: ReturnType<typeof connInput>) {
  const r = await rt(data.conn);
  const { WF_KEYS } = await import("./server/runtime.server.ts");
  const wf: Record<string, unknown> = {};
  for (const k of WF_KEYS) wf[k] = r.wf[k];
  return ser({ settings: r.settings, wf });
}

/** Input of saveCoreSettings. */
export const saveCoreSettingsInput = (d: {
  settings?: Partial<CoreSettings>;
  wf?: Record<string, unknown>;
  conn?: string;
}) => {
  if (!d || typeof d !== "object") throw new Error("invalid");
  checkSettings(d.settings ?? {});
  return d;
};

export async function saveCoreSettingsData(data: ReturnType<typeof saveCoreSettingsInput>) {
  const r = await rt(data.conn);
  checkMerged(r.settings, data.settings ?? {});
  r.updateSettings(data.settings ?? {}, (data.wf ?? {}) as never);
  return ser({ ok: true, settings: r.settings });
}

/** Research presets (fixed, measured) + presets saved from the engine, with their results. */
export async function corePresetsData(data: ReturnType<typeof connInput>) {
  const r = await rt(data.conn);
  const { ALL_RESEARCH_PRESETS } = await import("./presets.ts");
  const sim = r.sim;
  return ser({
    research: ALL_RESEARCH_PRESETS,
    saved: r.savedPresets().sort((a, b) => b.at - a.at),
    active: r.db.kvGet("activePreset") ?? null,
    backtests: r.presetBacktests(),
    job: r.backtestJob,
    queued: r.backtestQueue.length,
    maxDays: MAX_BACKTEST_DAYS,
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
}

/** The cached diagrams of one preset's latest backtest (kept apart from corePresets, which polls every few s). */
/** Input of corePresetSeries. */
export const corePresetSeriesInput = (d: { id: string; conn?: string }) => {
  if (!d || typeof d.id !== "string" || d.id.length > 120) throw new Error("preset id required");
  return d;
};

export async function corePresetSeriesData(data: ReturnType<typeof corePresetSeriesInput>) {
  const r = await rt(data.conn);
  return ser({ series: r.presetSeries(data.id) });
}

/** Input of presetAction. */
export const presetActionInput = (d: {
  action: "save" | "apply" | "delete" | "backtest" | "backtestAll" | "update";
  id?: string;
  label?: string;
  info?: string;
  days?: number;
  settings?: Partial<CoreSettings>;
  wf?: Record<string, unknown>;
  conn?: string;
}) => {
  if (!d || !["save", "apply", "delete", "backtest", "backtestAll", "update"].includes(d.action))
    throw new Error("bad action");
  if (d.action === "update") {
    if (!d.settings || typeof d.settings !== "object") throw new Error("settings required");
    if ("live" in d.settings) throw new Error("a preset never carries the Live stage");
    checkSettings(d.settings);
  }
  if (
    (d.action === "backtest" || d.action === "backtestAll") &&
    (typeof d.days !== "number" ||
      !Number.isInteger(d.days) ||
      d.days < 1 ||
      d.days > MAX_BACKTEST_DAYS)
  )
    throw new Error(`days: 1–${MAX_BACKTEST_DAYS}`);
  if (
    d.action !== "save" &&
    d.action !== "backtestAll" &&
    (typeof d.id !== "string" || d.id.length > 120)
  )
    throw new Error("preset id required");
  if (d.label !== undefined && (typeof d.label !== "string" || d.label.length > 80))
    throw new Error("label: up to 80 characters");
  if (d.info !== undefined && (typeof d.info !== "string" || d.info.length > 400))
    throw new Error("info: up to 400 characters");
  return d;
};

export async function presetActionData(data: ReturnType<typeof presetActionInput>) {
  const r = await rt(data.conn);
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
  if (data.action === "backtestAll") {
    // every preset without diagrams over this range yet, one after another (cached per preset)
    const queued = r.queuePresetBacktests(data.days!, true);
    return ser({ ok: true, queued, job: r.backtestJob });
  }
  r.deletePreset(data.id!);
  return ser({ ok: true });
}

/** Input of coreControl. */
export const coreControlInput = (d: {
  action: "start" | "stop" | "recompute" | "resync" | "connOn" | "connOff";
  conn?: string;
}) => {
  if (!["start", "stop", "recompute", "resync", "connOn", "connOff"].includes(d?.action))
    throw new Error("bad action");
  return d;
};

export async function coreControlData(data: ReturnType<typeof coreControlInput>) {
  if (data.action === "connOn" || data.action === "connOff") {
    const { isConnId, setConnEnabled } = await import("./server/runtime.server.ts");
    if (!isConnId(data.conn)) throw new Error("unknown connection");
    return ser({ ok: true, enabled: setConnEnabled(data.conn, data.action === "connOn") });
  }
  const r = await rt(data.conn);
  if (data.action === "stop") r.stop();
  else if (data.action === "start") r.start();
  else if (data.action === "resync") r.requestResync();
  else r.kick();
  return ser({ ok: true, state: r.status.state });
}

/** Every exchange connection with its own runtime: state, progress, Live, keys (the top connection selector). */
export async function coreConnsData() {
  const m = await import("./server/runtime.server.ts");
  const { keysFor } = await import("./exchange/bingx.server.ts");
  const primary = m.primaryConn();
  const enabled = m.enabledConns();
  const armed = process.env.CTS_CORE_LIVE === "1";
  return ser({
    primary,
    conns: m.CONN_IDS.map((conn) => {
      const r = m.existingRuntime(conn);
      const keys = keysFor(conn);
      return {
        conn,
        label: CONN_LABEL[conn] ?? conn,
        network: conn === "bingx-x01" ? "mainnet" : "testnet",
        primary: conn === primary,
        enabled: enabled.includes(conn),
        keys: keys.source,
        armed,
        state: r?.status.state ?? "off",
        stage: r?.status.stage ?? "",
        progress: r?.status.progress ?? 0,
        overall: r?.status.overall ?? 0,
        label2: r?.status.label ?? "",
        computes: r?.status.computes ?? 0,
        lastComputeAt: r?.status.lastComputeAt ?? 0,
        heartbeat: r?.status.heartbeat ?? 0,
        error: r?.status.error ?? null,
        symbols: r?.status.symbols.length ?? 0,
        live: r ? { enabled: r.settings.live.enabled, mode: r.settings.live.mode } : null,
        sim: r?.sim ? { pf: r.sim.stats.pf, n: r.sim.stats.n, net: r.sim.stats.net } : null,
        paper: r ? { equity: r.paper.equity, balance: r.paper.balance ?? null } : null,
      };
    }),
  });
}

const CONN_LABEL: Record<string, string> = {
  "bingx-x01": "BingX X01 · mainnet",
  "bingx-vst-01": "BingX VST-01 · demo",
  "bingx-vst-02": "BingX X02 · VST demo",
};

/** Complete statistics of the selected connection: simulated run (full detail) or paper book. */
/** Input of coreStatistics. */
/**
 * The live closes of the connection's own ledger (live_orders by own client id with their fills), in USD: the one
 * source of every live P&L the pages show (Overview session net, Trading, Statistics). `pnl` = r × notional, after
 * fees. Closes booked "hand" (an order not ours ended the position) are money but never a desk result (relation.ts).
 */
async function liveLedgerTrades(r: Awaited<ReturnType<typeof rt>>) {
  const { liveLedger } = await import("./statistics.ts");
  const { liveTag } = await import("./server/live.ts");
  const rows = r.db.all<{
    coid: string;
    sym: string;
    side: number;
    kind: string;
    qty: number;
    px: number;
    status: string;
    msg: string | null;
    at: number;
    fill_px: number | null;
    fee: number | null;
  }>(
    "SELECT o.coid, o.sym, o.side, o.kind, o.qty, o.px, o.status, o.msg, o.at, f.fill_px, f.fee FROM live_orders o LEFT JOIN live_fills f ON f.coid = o.coid ORDER BY o.at",
  );
  const tag = liveTag(r.settings.live.connId);
  // a flat marker without its own price (px 0) is booked at a price that can be checked, never dropped: the exit the
  // desk attributed to a lane of that symbol × side within 15 minutes before it (live_lane_trades), else the 1m close
  // at the marker's time; its cause stays unproven, so it is booked "flat" (in the balance, out of every PF)
  const laneExit = (sym: string, side: number, from: number, to: number, at: number) =>
    r.db.get<{ exit: number }>(
      // relation: all rows — only the attributed exit PRICE of a flat marker is read (any close class); the result is
      // booked "flat", out of every PF, so the own-close predicate does not apply
      "SELECT exit FROM live_lane_trades WHERE sym = ? AND side = ? AND exit_t BETWEEN ? AND ? AND exit > 0 ORDER BY ABS(exit_t - ?) LIMIT 1",
      sym,
      side,
      from,
      to,
      at,
    );
  const barClose = (sym: string, t: number) => {
    const cs = r.candles.get(sym);
    if (!cs?.n) return null;
    const t0 = Math.floor(t / 60_000) * 60_000;
    for (let i = cs.n - 1; i >= 0; i--) if (cs.t[i] <= t0) return t0 - cs.t[i] <= 5 * 60_000 ? cs.c[i] : null;
    return null;
  };
  const led = liveLedger(rows.map((x) => ({ ...x, fillPx: x.fill_px })), tag.length, r.settings.cost, {
    flatPx: (sym, side, at) => {
      const lx = laneExit(sym, side, at - 900_000, at + 60_000, at);
      if (lx && lx.exit > 0) return { px: lx.exit, from: "lane exit" };
      const c = barClose(sym, at);
      return c !== null && c > 0 ? { px: c, from: "1m close" } : null;
    },
  });
  const trades = led.closed.map((x) => ({ ...x, pnl: x.r * x.notional }));
  // every fill reported no commission (or none was measured): the fees in these results are the model's
  const fills = r.db.get<{ n: number; measured: number }>(
    "SELECT COUNT(*) AS n, COALESCE(SUM(CASE WHEN fee > 0 THEN 1 ELSE 0 END), 0) AS measured FROM live_fills",
  );
  return {
    trades,
    open: led.open,
    unpriced: led.unpriced,
    tag,
    feesModelled: !((fills?.measured ?? 0) > 0),
    fills: fills?.n ?? 0,
  };
}

/**
 * The live orders table: the own orders (not the flat markers) with their fill price, fee (measured, or null when the
 * fill reported none) and the realized P&L of the close they made (USD, from the one ledger reader); the flat markers
 * (F: the exchange ended a position — stop, target, an order not ours) apart, with the price they were booked at.
 */
async function liveOrdersView(r: Awaited<ReturnType<typeof rt>>) {
  const { trades } = await liveLedgerTrades(r);
  const byCoid = new Map<string, { pnl: number; reason?: string; pxFrom?: string; exit?: number }>();
  for (const x of trades) if (x.coid) byCoid.set(x.coid, { pnl: x.pnl, reason: x.reason, pxFrom: x.pxFrom });
  const q = (where: string, limit: number) =>
    r.db
      .all<Row>(
        `SELECT o.*, f.fill_px AS fillPx, f.fee AS fee FROM live_orders o LEFT JOIN live_fills f ON f.coid = o.coid WHERE ${where} ORDER BY o.at DESC LIMIT ${limit}`,
      )
      .map((o) => {
        const c = byCoid.get(String(o.coid));
        return { ...o, pnl: c ? c.pnl : null, closeReason: c?.reason ?? null, pxFrom: c?.pxFrom ?? null };
      });
  return { liveOrders: q("o.kind != 'F'", 100), liveFlats: q("o.kind = 'F'", 50) };
}

/**
 * The own session of the live desk since liveSince (the desk's first live step on this database; never written by a
 * reader): own realized closes in USD (hand-ended positions apart), the own open uPnL of the last account read (own
 * quantity only), and their sum. Every page shows this one object.
 */
async function liveSession(r: Awaited<ReturnType<typeof rt>>) {
  const since = r.db.kvGet<number>("liveSince") ?? null;
  const st = await liveState<{ account?: { own?: { upnl: number; n: number }; readAt?: number | null } }>(
    r.db,
    "liveStatus",
  );
  const { trades, feesModelled } = await liveLedgerTrades(r);
  let realized = 0;
  let n = 0;
  const hand = { n: 0, usd: 0 };
  // own quantity the exchange ended at a verified price, cause unproven: in the realized money, counted apart
  const flat = { n: 0, usd: 0 };
  for (const x of trades) {
    if (since !== null && x.exitT < since) continue;
    const usd = Number.isFinite(x.pnl) ? x.pnl : 0;
    if (x.reason === "hand") {
      hand.n++;
      hand.usd += usd;
      continue;
    }
    if (x.reason === "flat") {
      flat.n++;
      flat.usd += usd;
    }
    n++;
    realized += usd;
  }
  const own = st?.account?.own ?? null;
  return {
    since,
    closes: n,
    realized,
    hand,
    flat,
    openUpnl: own ? own.upnl : null,
    openPositions: own ? own.n : null,
    net: realized + (own?.upnl ?? 0),
    accountAt: st?.account?.readAt ?? null,
    feesModelled,
  };
}

export const coreStatisticsInput = (d?: {
  conn?: string;
  source?: "sim" | "paper" | "live";
  hours?: number;
}) => {
  const src = d?.source ?? "sim";
  if (src !== "sim" && src !== "paper" && src !== "live")
    throw new Error("source: sim, paper or live");
  const hours = d?.hours ?? 0;
  if (!Number.isFinite(hours) || hours < 0 || hours > 24 * 90) throw new Error("hours: 0–2160");
  return { ...connInput(d), source: src, hours };
};

export async function coreStatisticsData(data: ReturnType<typeof coreStatisticsInput>) {
  const r = await rt(data.conn);
  const { buildStatistics } = await import("./statistics.ts");
  const { sizeBook, orderKey } = await import("./sizing.ts");
  // the execution presets are simulated on the run's tapes: they compare with the simulated source only
  const presets =
    data.source === "sim"
      ? (r.db.kvGet<{ presets?: Record<string, unknown> }>("presetSims")?.presets ?? null)
      : null;
  const sim = r.sim;
  let balance = r.settings.paperBalance ?? 1000;
  let balanceFrom:
    | "paper start balance"
    | "account equity"
    | "account wallet"
    | "paper start balance + live P&L" = "paper start balance";
  let accountAt: number | null = null;
  // live: the own positions still open (timeline only), flat markers left unpriced, whether the fees are modelled
  let liveExtra: {
    open: Array<Record<string, unknown> & { cfg: string; sym: string; side: number; entryT: number; exitT: number; entry: number; r: number; notional: number }>;
    unpriced: { n: number; notional: number };
    feesModelled: boolean;
  } | null = null;
  let leverage = 10;
  let leverageFrom = "assumed 10× (virtual)";
  let trades: Array<
    Record<string, unknown> & {
      cfg: string;
      sym: string;
      side: number;
      entryT: number;
      exitT: number;
      entry: number;
      r: number;
    }
  >;
  let startT: number;
  let endT: number;
  if (data.source === "sim") {
    if (!sim) return ser({ report: null, why: "no simulated run yet" });
    trades = sim.trades as never;
    startT = sim.startT;
    endT = sim.endT;
  } else if (data.source === "live") {
    // the connection's own orders by client id, with their fills and fees (one source: liveLedgerTrades)
    const L = await liveLedgerTrades(r);
    trades = L.trades;
    liveExtra = {
      open: L.open.map((x) => ({ ...x, exitT: Infinity, r: 0, vol: 1 })),
      unpriced: { n: L.unpriced.length, notional: L.unpriced.reduce((a, x) => a + x.notional, 0) },
      feesModelled: L.feesModelled,
    };
    endT = Date.now();
    startT = trades.length
      ? trades.reduce((m, x) => Math.min(m, x.entryT), Infinity)
      : endT - 3_600_000;
    // the account's balance before the first ledger close: the last wallet read (no exchange call; the wallet holds
    // no open P&L) minus every realized close of the ledger; without a wallet, the equity minus the open mark to
    // market; without any read, the paper start balance (labelled)
    const { liveUnitPeek } = await import("./server/live.server.ts");
    const peek = liveUnitPeek(r);
    const acct = (
      await liveState<{ account?: { openNet?: number; wallet?: number | null; equity?: number | null; readAt?: number | null } }>(
        r.db,
        "liveStatus",
      )
    )?.account;
    const wallet = acct?.wallet ?? peek.wallet;
    const eq = acct?.equity ?? peek.equity;
    let realized = 0;
    for (const x of trades) realized += Number(x.pnl) || 0;
    if (wallet !== null && wallet !== undefined && wallet > 0) {
      balance = wallet - realized;
      balanceFrom = "account wallet";
    } else if (eq !== null && eq !== undefined && eq > 0) {
      balance = eq - realized - (acct?.openNet ?? 0);
      balanceFrom = "account equity";
    } else balanceFrom = "paper start balance + live P&L";
    accountAt = acct?.readAt ?? peek.at;
    // the margin line at the desk's actual leverage: fixed in the settings, or ("max") what the own positions hold now
    // (own notional / own margin of the last account read); unknown → 1× (margin = notional, labelled)
    const lev = r.settings.live.leverage;
    const own = (
      await liveState<{ account?: { own?: { notional: number; margin: number } } }>(r.db, "liveStatus")
    )?.account?.own;
    if (typeof lev === "number" && lev > 0) {
      leverage = lev;
      leverageFrom = `${lev}× (settings)`;
    } else if (own && own.margin > 0 && own.notional > 0) {
      leverage = own.notional / own.margin;
      leverageFrom = `${leverage.toFixed(1)}× (own positions now)`;
    } else {
      leverage = 1;
      leverageFrom = "1× (leverage unknown: margin shown as notional)";
    }
  } else {
    const rows = r.db.all<{
      cfg: string;
      sym: string;
      side: number;
      entry_t: number;
      exit_t: number;
      entry: number;
      r: number;
      reason: string;
      pnl: number;
    }>(
      // the paper book's own forward record (paper_book_trades: written once at each close, never back-filled or
      // re-priced; paper_trades is rewritten every step) — sized by the paper sizing below
      "SELECT cfg, sym, side, entry_t, exit_t, entry, r, reason, NULL AS pnl FROM paper_book_trades WHERE exit_t IS NOT NULL AND r IS NOT NULL AND reason != 'dropped' ORDER BY exit_t",
    );
    trades = rows.map((x) => ({
      cfg: x.cfg,
      sym: x.sym,
      side: x.side,
      entryT: x.entry_t,
      exitT: x.exit_t,
      entry: x.entry,
      r: x.r,
      reason: x.reason,
      pnl: x.pnl,
    }));
    endT = Date.now();
    // rows are in exit order: the window starts at the earliest entry
    startT = trades.length
      ? trades.reduce((m, x) => Math.min(m, x.entryT), Infinity)
      : endT - 3_600_000;
  }
  if (data.hours > 0) startT = Math.max(startT, endT - data.hours * 3_600_000);
  const sized = sizeBook(trades, [], {
    balance,
    sizing: r.settings.sizing,
    fixedNotional: r.settings.paperNotional,
  });
  // paper closes carry their own P&L: their unit is P&L ÷ r
  // a live close (and an open live position) carries its own notional in USD; paper closes carry their P&L
  const unit = (x: { cfg: string; sym: string; side: number; entryT: number; r: number; pnl?: unknown; notional?: unknown }) =>
    typeof x.notional === "number" && x.notional > 0
      ? x.notional
      : typeof x.pnl === "number" && Math.abs(x.r) > 1e-12
        ? Math.abs(x.pnl / x.r)
        : (sized.units.get(orderKey(x)) ?? r.settings.paperNotional);
  const closes = new Map<string, Map<number, number>>();
  for (const [sym, cs] of r.candles) {
    const m = new Map<number, number>();
    for (let i = 0; i < cs.n; i++) if (cs.t[i] >= startT - 600_000) m.set(cs.t[i], cs.c[i]);
    closes.set(sym, m);
  }
  const price = (sym: string, t: number) => {
    const m = closes.get(sym);
    if (!m) return null;
    const t0 = Math.floor(t / 60_000) * 60_000;
    for (let k = 0; k < 5; k++) {
      const v = m.get(t0 - k * 60_000);
      if (v !== undefined) return v;
    }
    return null;
  };
  const report = buildStatistics({
    source: data.source,
    trades: trades as never,
    startT,
    endT,
    balance,
    unit: unit as never,
    price,
    cost: r.settings.cost,
    leverage,
    minActiveLevel: r.settings.block?.minActiveLevel ?? 1,
    presets: presets as never,
    ...(liveExtra ? { open: liveExtra.open as never } : {}),
  });
  return ser({
    report,
    // where the start balance comes from (live: the account equity when read, else the paper start balance)
    balanceFrom,
    // when the account behind the balance was read (live)
    accountAt,
    leverageFrom,
    // live: flat markers no price could be found for (counted, never booked), whether the fees are the model's
    unpriced: liveExtra?.unpriced ?? null,
    feesModelled: liveExtra?.feesModelled ?? null,
    // where the trades come from, as the page labels it
    sourceLabel:
      data.source === "live"
        ? "live: own orders by client id (exchange fills)"
        : data.source === "paper"
          ? "paper book forward record (virtual)"
          : "simulated run (virtual)",
    conn: r.conn ?? null,
    settings: {
      toggles: r.settings.toggles,
      block: r.settings.block,
      dca: r.settings.dca,
      sizing: r.settings.sizing,
      cost: r.settings.cost,
      tfs: r.settings.tfs,
      symbols: r.settings.symbols,
    },
  });
}
