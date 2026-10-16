// The server functions' contract with the Core v2 pages: every field a page reads (src/components/v2/shell.tsx,
// preset-settings.tsx, prehistoric.tsx and pages/*.tsx, including what they pass down to child components) is
// returned by the matching `<name>Data` function of api-data.ts for a runtime that has computed once.
//
// Static part: FIELDS lists, per server function, the dotted paths the pages read (`[]` = every element of an array,
// `{}` = every value of a record). OPTIONAL lists what is legitimately null / absent after one compute of a
// synthetic runtime without Live, with the reason; an optional `x[]` / `x{}` also lets that array / record be empty.
// Runtime part: a small synthetic runtime computes once and is registered as the primary connection's runtime, then
// every read is called and each listed path must resolve to a defined value (arrays non-empty unless optional).
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";

// before the modules that read them are loaded (they are imported dynamically below)
process.env.CTS_CORE_STATE = "off";
process.env.CTS_CORE_SYNTHETIC_END = String(Math.floor(Date.now() / 3_600_000) * 3_600_000);
delete process.env.CTS_CORE_SNAPSHOT;
delete process.env.CTS_CORE_LIVE;

const { CoreDb } = await import("./server/db.server.ts");
const { CoreRuntime } = await import("./server/runtime.server.ts");
const { compareOn } = await import("./test-support.ts");
const { DEFAULT_SETTINGS } = await import("./config.ts");
const { SIGNAL_SOURCES, signalSettings } = await import("./signal-config.ts");
const api = await import("./api-data.ts");

type Fn =
  | "coreStatus"
  | "coreConns"
  | "coreOverview"
  | "coreResults"
  | "coreMatrix"
  | "coreConfig"
  | "coreSim"
  | "coreTrading"
  | "coreMarket"
  | "coreEngine"
  | "coreSettings"
  | "saveCoreSettings"
  | "corePresets"
  | "corePresetSeries"
  | "presetAction"
  | "coreControl"
  | "coreStatistics"
  | "coreListing";

const under = (prefix: string, fields: string[]) => fields.map((f) => `${prefix}.${f}`);
const RETURN_PROVENANCE = ["pfBasis", "unknownReturns", "gp", "gl", "noLoss", "pfConvention"];

/** what GroupTable (statistics.tsx) reads of every row */
const STAT_ROW = [
  "key",
  "n",
  "positions",
  "wins",
  "losses",
  "wr",
  "pf",
  "pfBasis",
  "unknownReturns",
  "returnGp",
  "returnGl",
  "noLoss",
  "pfConvention",
  "cashPf",
  "cashNoLoss",
  "net",
  "usd",
  "ddt",
  "gh",
  "avgHoldMin",
];
/** what PrehistoricPanel (prehistoric.tsx) reads of the runtime status (Overview and Engine pass it down) */
const PREHISTORIC = [
  "state",
  "stage",
  "label",
  "progress",
  "overall",
  "baseEvaluated",
  "basePassed",
  "baseBuilt",
  ...under("baseHistory[]", ["at", "compute", "passed", "built", "byRange"]),
  ...under("baseByRange[]", [
    "tag",
    "range",
    "enabled",
    "evaluated",
    "passed",
    "minPf",
    "pfMedian",
    "pfPassedMedian",
  ]),
  ...under("prehistoric", [
    "hours",
    "simH",
    "complete",
    "ready",
    "total",
    "loaded",
    "readyAt",
    "symbols{}.state",
  ]),
  ...under("prehistoric.stats", [
    "pf",
    "ddtH",
    "avgPositions",
    "avgOpen",
    "maxPositions",
    "maxOpen",
    "positions",
    "n",
    "wr",
    "greenHours",
    "net",
    "perSymbol",
    ...RETURN_PROVENANCE,
  ]),
  ...under("prehistoric.counts", ["base", "main", "sets", "real", "evals", "armed"]),
];
/** what SignalsSettings (settings.tsx) reads of status.signals */
const SIGNAL_STATUS = ["enabled", "combos", "active", "configs"];

/** Every field each page reads, per server function. */
const FIELDS: Record<Fn, string[]> = {
  coreListing: [
    // pages/stages.tsx SetListings (the last paper step's validated sets, per range)
    "ready",
    "total",
    "proofOn",
    ...under("byRange[]", ["range", "validated", "pf"]),
    ...under("rows[]", ["id", "range", "pf", "n", "net", "ddt", "score"]),
  ],
  coreStatus: [
    // shell.tsx (header: state pill, progressText, liveState, bar time, symbols)
    "state",
    "stage",
    "progress",
    "overall",
    "pending",
    "source",
    "live",
    "lastBarT",
    "symbols",
    // pages/settings.tsx (applied-in-compute line after a save)
    "settingsAt",
    "appliedSettingsAt",
    "lastComputeAt",
    "computes",
    "baseWhy",
    "baseGates",
    "livePromotion",
    // pages/settings.tsx → SignalsSettings status
    ...under("signals", SIGNAL_STATUS),
  ],
  coreConns: [
    // shell.tsx ConnSelect, pages/engine.tsx Connections
    "primary",
    ...under("conns[]", [
      "conn",
      "label",
      "network",
      "primary",
      "enabled",
      "keys",
      "armed",
      "state",
      "stage",
      "progress",
      "overall",
      "computes",
      "error",
      "live",
      "sim",
      "paper",
    ]),
  ],
  coreOverview: [
    // pages/overview.tsx
    ...under("settings.gates", ["minPf", "maxDdtH", "baseSetsMinPf"]),
    ...under("settings.live", [
      "enabled",
      "connId",
      "mode",
      "marginMode",
      "positionMode",
      "notionalUsd",
      "ratio",
      "maxNotionalUsd",
      "maxPositions",
    ]),
    ...under("status", PREHISTORIC),
    ...under("status.signals", ["enabled", "configs"]),
    ...under("sim", ["startT", "endT", "stable", "positions", "skips", "byKind{}.n"]),
    ...under("sim.stats", [
      "pf",
      "net",
      "n",
      "greenHours",
      "hours",
      "gh",
      "ddt",
      "mdd",
      "worstHour",
      "wr",
      ...RETURN_PROVENANCE,
    ]),
    ...under("sim.hourly[]", ["t", "net", "n", "pf", ...RETURN_PROVENANCE]),
    ...under("sim.byConfig[]", ["id", "n", "pf", "net", ...RETURN_PROVENANCE]),
    ...under("wf", ["simH", "preH", "tapes"]),
    ...under("counts", ["base", "main", "evaluated"]),
    ...under("paper", [
      "selected",
      "eligible",
      "positions",
      "equity",
      "accountEquity",
      "balance",
      "book.positions",
      "book.orders",
    ]),
    // pages/stages.tsx
    ...under("settings.gates", ["minDdtH", "minTrades"]),
    "settings.toggles",
    ...under("settings.block", ["ratio", "maxLevel", "maxMult"]),
    ...under("settings.dca", ["levels", "step"]),
    ...under("wf", ["protects", "validLastN", "signalValidLastN", "lastN"]),
    ...under("lanes[]", [
      "lane",
      "base",
      "passed",
      "tapes",
      "positions",
      "n",
      "pf",
      "net",
      "wr",
      "open.positions",
      "open.orders",
      ...RETURN_PROVENANCE,
    ]),
    ...under("pipeline", [
      "at",
      "universe.symbols",
      "universe.bars",
      "universe.splitT",
      "s1",
      "s2",
      "ranked",
      "timings.S1",
      "timings.S2",
      "timings.S3",
    ]),
    ...under("pipeline.portfolio", [
      "members",
      "guardPct",
      "is.pf",
      "is.net",
      "oos.pf",
      "oos.net",
      "oos.greenHours",
      "oos.hours",
    ]),
  ],
  coreResults: [
    // pages/results.tsx
    "total",
    ...under("rows[]", [
      "id",
      "n",
      "wr",
      "pf",
      "net",
      "mdd",
      "ddt",
      "gh",
      "tph",
      "is_pf",
      "score",
      "oos_pf",
      "armed",
    ]),
    // pages/stages.tsx (stage 3 by rank)
    ...under("rows[]", ["rank", "best_n", "oos_n", "oos_net", "lastn_ok", "eval_pass"]),
    // pages/matrix.tsx opens rows[0].id of a cell
  ],
  coreMatrix: [
    // pages/matrix.tsx
    ...under("rows[]", ["bot", "ind", "n", "score", "pf", "net", "is_pf", "gh"]),
  ],
  coreConfig: [
    // pages/config.tsx
    ...under("row", [
      "n",
      "wr",
      "pf",
      "is_pf",
      "net",
      "is_net",
      "ddt",
      "mdd",
      "best_n",
      "lastn_ok",
      "oos_pf",
      "oos_n",
      "oos_net",
    ]),
    ...under("lastn[]", ["part", "n", "pf"]),
    ...under("evals[]", ["at", "win", "n", "pf", "net", "ddt", "wr", "pass"]),
    ...under("trades[]", [
      "sym",
      "side",
      "entry_t",
      "exit_t",
      "entry",
      "exit",
      "r",
      "reason",
      "bars",
    ]),
  ],
  coreSim: [
    // pages/hourly.tsx (current settings)
    ...under("sim", ["startT", "endT", "opts.preH", "stable", "positions", "skips"]),
    ...under("sim.hourly[]", ["t", "net", "n", "pf"]),
    ...under("sim.steps[]", ["t", "main", "real", "taken", "skipped"]),
    ...under("sim.stats", [
      "pf",
      "net",
      "n",
      "tph",
      "greenHours",
      "hours",
      "gh",
      "worstHour",
      "ddt",
      "mdd",
    ]),
    ...under("sim.byKind{}", ["n", "pf", "net"]),
    ...under("sim.blocks[]", ["t", "n", "pf", "net"]),
    // pages/compare.tsx (and hourly.tsx's preset views)
    ...under("presets", ["startT", "endT"]),
    ...under("presets.presets{}", ["label", "toggles", "stable", "hourly"]),
    ...under("presets.presets{}.stats", [
      "n",
      "wr",
      "pf",
      "net",
      "greenHours",
      "hours",
      "worstHour",
      "mdd",
      "ddt",
      "tph",
      "gh",
    ]),
    ...under("presets.presets{}.hourly[]", ["t", "net", "n", "pf"]),
    ...under("presets.presets{}.byKind{}", ["n", "pf", "net"]),
  ],
  coreTrading: [
    // pages/trading.tsx TradingPage
    "realized",
    "carried",
    "selected",
    "equity",
    "accountEquity",
    "balance",
    "startBalance",
    "sizing.mode",
    "sizing.pct",
    ...under("book", ["positions", "orders", "long", "short"]),
    ...under("closed", ["positions", "orders"]),
    ...under("positions[]", [
      "cfg",
      "sym",
      "side",
      "entry_t",
      "entry",
      "stop",
      "target",
      "mtm",
      "vol",
      "level",
      "unit",
    ]),
    ...under("pending[]", ["sym", "side", "cfg", "protect.tp", "protect.sl"]),
    "live",
    "tradesShown",
    ...under("trades[]", [
      "cfg",
      "sym",
      "side",
      "entry_t",
      "exit_t",
      "entry",
      "exit",
      "r",
      "unit_r",
      "pnl",
      "reason",
    ]),
    ...under("cost", ["model", "fees.taker", "fees.slippage"]),
    "liveCost",
    "adjustWindow",
    ...under("adjust[]", ["set", "pf", "n", "level", "minSl", "minTrail", "pausedUntil", "note"]),
    ...under("liveSettings", [
      "enabled",
      "connId",
      "mode",
      "notionalUsd",
      "ratio",
      "maxNotionalUsd",
      "rebalancePct",
    ]),
    "liveKeys",
    "control",
    ...under("controlPreview", ["unit", "unitFrom", "top", "symbolCapDropped"]),
    ...under("controlPreview.targets[]", [
      "key",
      "sym",
      "side",
      "lanes",
      "vol",
      "notional",
      "qty",
      "stopDist",
    ]),
    ...under("liveOrders[]", ["coid", "at", "sym", "kind", "qty", "px", "status"]),
  ],
  coreMarket: [
    // pages/trading.tsx MarketPage
    "tfMin",
    "source",
    ...under("symbols[]", ["sym", "last", "change_pct", "quote_vol", "bars", "first_t", "last_t"]),
    "spark{}",
  ],
  coreEngine: [
    // pages/engine.tsx (and PrehistoricPanel, progressText, computeEta)
    "at",
    ...under("status", PREHISTORIC),
    ...under("status", [
      "lastCycleMs",
      "cycles",
      "computes",
      "lastComputeMs",
      "computeStartedAt",
      "heartbeat",
      "nextCycleAt",
      "startedAt",
      "source",
      "symbols",
      "lastBarT",
      "mainPairs",
      "pending",
      "loop.p50",
      "loop.p99",
      "loop.max",
    ]),
    ...under("status.phases{}", ["ms", "maxSliceMs"]),
    ...under("settings.gates", ["minPf", "maxDdtH", "baseSetsMinPf"]),
    ...under("process", ["heap", "rss", "node", "uptime"]),
    "bytes",
    ...under("audit", ["ok", "ms", "at"]),
    ...under("audit.checks[]", ["name", "ok", "detail"]),
    ...under("tables[]", ["table", "rows"]),
    ...under("runs[]", ["id", "ended", "items", "ms", "note"]),
    ...under("events[]", ["id", "at", "level", "msg"]),
  ],
  coreSettings: [
    // pages/config.tsx (round-trip cost)
    "settings.cost",
    // pages/settings.tsx SettingsPage, preset-settings.tsx (the effective settings), and the children they pass
    // settings to (Timeframes, SignalsSettings, BlockSources, ProtectRanges, FocusText, ForcedSymbols)
    ...under("settings", [
      "symbols",
      "symbolRank",
      "focus",
      "pinned",
      "disabledKinds",
      "tfs",
      "tfDays",
      "signals",
      "toggles",
      "tactics",
      "tactics.cooldownBars",
      "mainTop",
      "refineTop",
      "evalTop",
      "armTop",
      "cycleMs",
      "tickMs",
      "paperBalance",
      "paperNotional",
      "sizing.mode",
      "sizing.pct",
      "fees.maker",
      "fees.taker",
      "fees.slippage",
      "protectFloor.minSl",
      "protectFloor.minTrail",
    ]),
    ...under("settings.gates", [
      "minPf",
      "maxDdtH",
      "minDdtH",
      "minTrades",
      "maxDdr",
      "quorum",
      "lastNFloor",
      "rangeMinPf",
      "baseSetsMinPf",
      "warmup",
    ]),
    ...under("settings.grid", [
      "tp",
      "slOfTp",
      "trailOfTp",
      "holdH",
      "minTrail",
      "minSl",
      "trailFree",
      "trailStep",
      "baseTrailCells",
      "allSets",
      "baseRanges",
    ]),
    ...under("settings.block", [
      "ratio",
      "maxLevel",
      "minActiveLevel",
      "maxMult",
      "increase",
      "pause",
      "ranges",
      "steps",
    ]),
    ...under("settings.dca", ["levels", "step", "slOfTp", "stopGap"]),
    ...under("settings.axis", [
      "levels",
      "spacing",
      "mode",
      "center",
      "centerMin",
      "exits",
      "expiry",
      "hybrid",
      "levelsSet",
      "maxDisp",
      "minDisp",
      "ranges",
      "ratio",
      "slAtr",
      "tpRatio",
      "trailPct",
    ]),
    ...under("settings.adjust", [
      "enabled",
      "window",
      "autoCost",
      "pauseH",
      "recoverPf",
      "slMax",
      "slStep",
      "trailMax",
      "trailStep",
      "triggerPf",
    ]),
    ...under("settings.live", [
      "enabled",
      "connId",
      "mode",
      "leverage",
      "marginMode",
      "positionMode",
      "notionalUsd",
      "ratio",
      "maxNotionalUsd",
      "maxPositions",
      "rebalancePct",
      "liveLastN",
    ]),
    ...under("wf", [
      "mode",
      "preH",
      "simH",
      "stepH",
      "longH",
      "lastN",
      "lastNMinPf",
      "validLastN",
      "signalValidLastN",
      "portfolio",
      "maxPositions",
      "maxPerSymbol",
      "maxPerSide",
      "maxOpen",
      "rank",
      "bots",
      "coord",
      "guardPct",
      "robustFrac",
      "durableFrac",
      "durableSplits",
      "preGate",
      "symGate",
      "symMinN",
      "familySeats",
      "familyNeedsBase",
      "laneSeats",
    ]),
  ],
  saveCoreSettings: [
    // pages/settings.tsx awaits it and reloads; nothing of the reply is read beyond success
    "ok",
  ],
  corePresets: [
    // pages/presets.tsx PresetsPage, PresetCard, Backtests; overview.tsx PresetBar
    ...under("current", ["pf", "n", "gh", "wr", "stable", "pfBasis", "unknownReturns", "gp", "gl", "noLoss", "pfConvention", "sample", "endpointMarks", "settledStats"]),
    ...under("current.settledStats", ["pf", "n", "pfBasis", "unknownReturns", "gp", "gl", "noLoss", "pfConvention", "sample"]),
    "queued",
    "maxDays",
    "saved",
    ...under("saved[].metrics", ["pf", "n", "pfBasis", "unknownReturns", "gp", "gl", "noLoss", "pfConvention"]),
    "backtests",
    ...under("gates", ["minPf", "maxDdtH"]),
    ...under("research[]", ["id", "label", "kind", "settings", "wf"]),
    ...under("research[].metrics", [
      "pf",
      "greenHours",
      "wr",
      "n",
      "perDay",
      "net",
      "period",
      "source",
    ]),
  ],
  corePresetSeries: [
    // pages/presets.tsx PresetDiagrams (null until a backtest; its fields are in OPTIONAL)
    "series",
  ],
  presetAction: [
    // preset-settings.tsx (update → apply r.preset.id, messages with r.preset.label); presets.tsx save
    // (delete returns only ok: checked apart)
    "ok",
    "preset.id",
    "preset.label",
  ],
  coreControl: [
    // pages/engine.tsx awaits it and refreshes
    "ok",
  ],
  coreStatistics: [
    // pages/statistics.tsx
    "balanceFrom",
    "paperEvidence",
    ...under("report", ["source", "startT", "endT", "balance0", "detail.blockDetail"]),
    ...under("report.total", [
      "usdEnd",
      "usd",
      "pf",
      "returnGp",
      "returnGl",
      "pfBasis",
      "unknownReturns",
      "noLoss",
      "pfConvention",
      "cashPf",
      "cashNoLoss",
      "wr",
      "sqn",
      "n",
      "positions",
      "wins",
      "losses",
      "tph",
      "ddt",
      "gh",
    ]),
    ...under("report.timeline", [
      "maxDdPct",
      "maxDd",
      "maxDdH",
      "positionsMax",
      "ordersMax",
      "setsMax",
      "marginMax",
    ]),
    ...under("report.timeline.points[]", [
      "t",
      "balance",
      "equity",
      "ddPct",
      "margin",
      "sets",
      "positions",
      "orders",
    ]),
    ...[
      "types",
      "subTypes",
      "ranges",
      "lanes",
      "indKinds",
      "bots",
      "sides",
      "reasons",
      "symbols",
    ].flatMap((g) => under(`report.${g}[]`, STAT_ROW)),
    ...under("report.symbols[]", ["firstT", "lastT"]),
    ...under("report.hourOfDay[]", ["key", "usd", "n", "pf"]),
    ...under("report.daily[]", ["key", "usd", "n", "pf"]),
    ...under("report.heat[]", ["d", "h", "net", "n"]),
    ...under("report.withWithout[]", [
      "label",
      "with.label",
      "with.n",
      "with.pf",
      "with.pfBasis",
      "with.unknownReturns",
      "with.gp",
      "with.gl",
      "with.noLoss",
      "with.pfConvention",
      "with.net",
      "with.ddt",
      "without.label",
      "without.n",
      "without.pf",
      "without.pfBasis",
      "without.unknownReturns",
      "without.gp",
      "without.gl",
      "without.noLoss",
      "without.pfConvention",
      "without.net",
      "without.ddt",
      "dPf",
      "dNet",
      "dDdt",
    ]),
    ...under("report.presets[]", ["label", "n", "wr", "pf", "pfBasis", "unknownReturns", "gp", "gl", "noLoss", "pfConvention", "net", "ddt", "gh"]),
    ...under("report.configs[]", [
      "key",
      "bot",
      "ind",
      "type",
      "range",
      "lane",
      "indKind",
      "tp",
      "sl",
      "trail",
      "holdBars",
      "n",
      "wr",
      "pf",
      "usd",
      "ddt",
      "gh",
      "syms",
      "positions",
      "wins",
      "losses",
      "avg",
      "avgHoldMin",
      "firstT",
      "lastT",
    ]),
  ],
};

/** Optional settings left unset mean their default; the page reads them with that fallback (`?? x`, `!== false`). */
const unset = (
  prefix: string,
  keys: string[],
  why = "unset = its default (the page reads it with that fallback)",
) => Object.fromEntries(keys.map((k) => [`${prefix}.${k}`, why]));

/** Read by a page but legitimately null / absent (or an empty list) after one compute without Live: path → why. */
const OPTIONAL: Partial<Record<Fn, Record<string, string>>> = {
  coreStatus: {
    liveStatus: "null until the live step's first run (no live step in this test)",
    "liveStatus.enabled": "as liveStatus",
    "liveStatus.reason": "as liveStatus",
    ...unset(
      "signals",
      [
        "positions",
        "orders",
        "peakPositions",
        "peakOrders",
        "trades",
        "openPositions",
        "openOrders",
        "disabled",
        "discoveryPairs",
        "representativePassed",
        "representativeBaseGate",
      ],
      "counted only when the signal book / paper book / guard has them (SignalsSettings checks !== undefined)",
    ),
    "baseWhy[]": "no rejected representative ranges until Base has evaluated them",
    "livePromotion.lanes[]": "strict live-entry proof is absent until its first evaluation; API null is explicit",
  },
  coreConns: {
    "conns[].live.enabled": "live is null for a connection without a runtime (the page shows off)",
    "conns[].sim.pf": "sim is null for a connection without a runtime or before its first compute",
    "conns[].paper.equity": "paper is null for a connection without a runtime",
    ...unset("conns[].sim", RETURN_PROVENANCE, "sim is null without a completed runtime; known summaries carry explicit unit/gross evidence"),
  },
  coreOverview: {
    live: "the live step's status: null until its first run",
    "live.reason": "as live",
    "live.placed": "as live",
    "live.closed": "as live",
    "live.control.held": "as live (control only in overall mode)",
    "live.control.connHash": "as live",
    "live.account.openNet": "as live (account only after an exchange read)",
    "live.account.margin": "as live.account",
    "live.account.overall": "as live.account",
    "live.account.positions": "as live.account",
    "live.account.orders": "as live.account",
    "status.prehistoric.symbols{}.n": "only a symbol that traded in the run",
    "status.prehistoric.symbols{}.pf": "only a symbol that traded in the run",
    "status.prehistoric.symbols{}.bars": "only a loaded symbol",
    "status.baseByRange[].ownCells":
      "only a range judged at its own Base cells (the page checks typeof)",
    "sim.byKind{}": "empty when the run closed nothing",
    ...unset(
      "settings.live",
      ["requireReady"],
      "unset = on (ConnStrip: requireReady === false ? off : on)",
    ),
  },
  coreResults: {
    "rows[]":
      "Evaluated (stage 3) can be empty on a small synthetic universe; Base (stage 1) is checked non-empty",
  },
  coreConfig: {
    "evals[]": "continuous window evals are written for evaluated (stage 3) configs only",
  },
  coreSim: {
    "presets.presets{}.positions": "the preset sims carry orders only (the page shows Orders)",
    "presets.presets{}.skips": "a worker-run preset sim may omit it (the page falls back to {})",
    "presets.presets{}.blocks": "a worker-run preset sim may omit it (the page falls back to [])",
    "presets.presets{}.startT":
      "the page falls back to the preset sims' own window (presets.startT)",
    "presets.presets{}.endT": "the page falls back to the preset sims' own window (presets.endT)",
    "presets.presets{}.hourly[]": "a preset that closed nothing has no hours",
    "presets.presets{}.byKind{}": "a preset that closed nothing has no kinds",
    "sim.byKind{}": "empty when the run closed nothing",
  },
  coreTrading: {
    "live.reason": "the live step's status: null until its first run",
    "live.placed": "as live.reason",
    "live.skipped": "as live.reason",
    "live.error": "as live.reason",
    "control.reconnected": "the control status: null until the live step runs in overall mode",
    "control.unchanged": "as control.reconnected",
    "control.connHash": "as control.reconnected",
    "control.targetsHash": "as control.reconnected",
    "control.bookHash": "as control.reconnected",
    "control.planHash": "as control.reconnected",
    "control.steps": "as control.reconnected",
    "control.changes": "as control.reconnected",
    "control.at": "as control.reconnected",
    "control.held": "as control.reconnected",
    "control.actions": "as control.reconnected",
    "liveCost.rt": "null until 40 live fills, and until 20 of them carry a measured fee (a fill with no commission is unmeasured)",
    "liveCost.fills": "as liveCost.rt",
    "liveCost.fee": "as liveCost.rt",
    "liveCost.slip": "as liveCost.rt",
    "liveSettings.maxPositionX": "unset = no equity cap (the page omits the clause)",
    "liveSettings.maxSymbols": "only shown when positions were dropped over the symbol cap",
    "positions[]": "the paper book may hold nothing open at the moment of the read",
    "pending[]": "nothing due on the latest bar",
    "trades[]": "no paper close yet after one compute",
    "adjust[]": "no set has adjust.window closes yet",
    "liveOrders[]": "no live order without Live",
    "controlPreview.targets[]": "no lane holds a paper position at the moment of the read",
  },
  coreEngine: {
    "status.workers": "set once Base ran on worker cores or fell back (the page shows –)",
    "status.tick": "the fast tick's status (the page shows –)",
    ...unset(
      "status.tick",
      [
        "ms",
        "count",
        "open",
        "error",
        "stream.connected",
        "stream.symbols",
        "stream.rate",
        "stream.ageMs",
      ],
      "as status.tick (stream: null on the synthetic market)",
    ),
    "status.error": "null without an error",
    "status.signals": "only with signals processing",
    "status.phases{}.slowest": "only a phase that recorded its slowest step",
    "status.prehistoric.symbols{}.n": "only a symbol that traded in the run",
    "status.prehistoric.symbols{}.pf": "only a symbol that traded in the run",
    "status.prehistoric.symbols{}.bars": "only a loaded symbol",
    "status.baseByRange[].ownCells":
      "only a range judged at its own Base cells (the page checks typeof)",
  },
  coreSettings: {
    ...unset("settings", ["symbolOffset", "forceSymbols"]),
    ...unset("settings.grid", ["minSlEval", "wideMinTf"]),
    ...unset("settings.dca", ["tp", "stepOfTp"]),
    ...unset("settings.axis", ["perRange"]),
    ...unset("settings.live", [
      "source",
      "kinds",
      "excludeRanges",
      "plainOnly",
      "maxSymbols",
      "maxExposureX",
      "exposureScaler",
      "maxRiskPct",
      "maxBackstopLossPct",
      "minStopPct",
      "minFreeMargin",
      "requireReady",
      "openPaused",
      "syncMs",
    ]),
    ...unset("wf", ["bestFirst", "symH", "sideGateN", "microSeats"]),
    ...unset(
      "wf",
      [
        "engineSideAccept.enabled",
        "engineSideAccept.minPf",
        "engineSideAccept.hours",
        "engineSideAccept.minTrades",
      ],
      "unset = off (operator, 6 Oct; the page shows off with its default minimums)",
    ),
  },
  corePresets: {
    active: "null until a preset is applied",
    "active.id": "as active",
    "active.label": "as active",
    job: "null until a preset backtest started",
    "job.state": "as job",
    "job.id": "as job",
    "job.stage": "as job",
    "job.progress": "as job",
    "job.error": "as job",
    "saved[]": "no preset saved yet (fields as research[])",
    "saved[].metrics.endpointMarks": "absent on legacy saved records; new writes disclose mark count",
    "research[].info": "a preset without a note",
    "research[].metrics.greenDays": "only research measured over days",
    "research[].metrics.runs": "only research with repeated runs",
    "research[].metrics.positiveRuns": "as runs",
    "research[].metrics.ddtH": "only research that measured the drawdown time",
    "research[].metrics.checks[]": "only research with period checks",
    "research[].metrics.oot": "only research with an out-of-time check",
    "backtests{}": "no backtest run yet",
    ...unset(
      "backtests{}[]",
      [
        "at",
        "tfMin",
        "from",
        "to",
        "days",
        "pf",
        "minPf",
        "successHours",
        "greenHours",
        "hours",
        "ddtH",
        "maxDdtH",
        "n",
        "wr",
        "pass",
        "posPerHour",
        "pfBasis",
        "unknownReturns",
        "gp",
        "gl",
        "noLoss",
        "pfConvention",
        "sample",
        "endpointMarks",
        "settledStats",
      ],
      "a preset's backtest results: none before a backtest ran",
    ),
    ...unset(
      "research[].metrics.checks[]",
      ["label", "period", "pf", "perDay", "greenHours", "wr", "runs", "positiveRuns"],
      "only research with period checks",
    ),
    ...unset(
      "research[].metrics.oot",
      ["period", "pf", "greenHours", "wr", "n", "perDay"],
      "only research with an out-of-time check",
    ),
    ...unset(
      "research[].settings",
      ["tfMin", "symbols", "symbolRank", "focus", "tactics", "toggles", "signals", "grid", "gates"],
      "a preset carries only what it changes (summary and the coordination warnings fall back to the defaults)",
    ),
    ...unset(
      "research[].wf",
      ["mode", "validLastN", "lastN", "coord", "seatPer"],
      "a preset carries only what it changes",
    ),
  },
  corePresetSeries: {
    "series.t": "null until the preset's backtest ran (none in this test)",
    "series.kinds": "as series.t",
    "series.balance": "as series.t",
    "series.equity": "as series.t",
    "series.ddPct": "as series.t",
    "series.positions": "as series.t",
    "series.orders": "as series.t",
    "series.days": "as series.t",
    "series.from": "as series.t",
    "series.to": "as series.t",
    "series.info.posPerHour": "as series.t",
    "series.info.positions": "as series.t",
    "series.info.pfLast12": "as series.t",
    "series.info.pfLast25": "as series.t",
    "series.info.pfLast75": "as series.t",
    "series.info.ddtH": "as series.t",
    "series.info.maxDdPct": "as series.t",
    "series.info.ddr": "as series.t",
    "series.info.pf": "as series.t",
    "series.info.netPct": "as series.t",
    ...unset("series.info", ["n", "pfBasis", "unknownReturns", "gp", "gl", "noLoss", "pfConvention", "sample", "cash", "cashPositionLast"], "new verified unit-return metadata; legacy archives remain unavailable"),
  },
  coreStatistics: {
    ...unset("paperEvidence", ["requested", "verifiedOwnership", "unknownOwnership", "cashBasis", ...under("recordedReturns", ["n", "pf", ...RETURN_PROVENANCE])], "only paper statistics has owned-versus-recorded evidence; sim/live return explicit null"),
    conn: "null for a runtime built without a connection (tests); runtimeFor always passes one",
    why: "only when report is null",
    "report.balanceStart": "only with a window (hours > 0); the page falls back to balance0",
    "report.configCount": "the page falls back to configs.length",
    "report.configs[].tpNet": "only a config whose target is shown net of the cost",
    "report.subTypes[]": "no Block / DCA / Axis sub-config closed in the run",
  },
};

/** One resolved value of a path (`at` names the element, e.g. rows[3].id). */
type Hit = { at: string; v: unknown };

/** Resolve a dotted path with `[]` / `{}` fan-out; returns the leaf values and every problem on the way. */
function resolve(root: unknown, path: string, emptyOk: (prefix: string) => boolean) {
  let cur: Hit[] = [{ at: "", v: root }];
  const problems: string[] = [];
  let prefix = "";
  for (const seg of path.split(".")) {
    const m = /^([^[{]*)((?:\[\]|\{\})*)$/.exec(seg);
    if (!m) throw new Error(`bad path ${path}`);
    const [, name, fan] = m;
    prefix = prefix ? `${prefix}.${seg}` : seg;
    const next: Hit[] = [];
    for (const h of cur) {
      if (h.v === null || typeof h.v !== "object") {
        problems.push(
          `${h.at || "(root)"} is ${h.v === null ? "null" : typeof h.v}, cannot read ${name}`,
        );
        continue;
      }
      const at = h.at ? `${h.at}.${name}` : name;
      next.push({ at, v: name ? (h.v as Record<string, unknown>)[name] : h.v });
    }
    cur = next;
    for (let k = 0; k < fan.length; k += 2) {
      const kind = fan.slice(k, k + 2);
      const out: Hit[] = [];
      for (const h of cur) {
        if (kind === "[]") {
          if (!Array.isArray(h.v)) {
            problems.push(`${h.at} is not an array (${h.v === null ? "null" : typeof h.v})`);
            continue;
          }
          if (!h.v.length && !emptyOk(prefix)) problems.push(`${h.at} is empty`);
          h.v.forEach((v, i) => out.push({ at: `${h.at}[${i}]`, v }));
        } else {
          if (h.v === null || typeof h.v !== "object" || Array.isArray(h.v)) {
            problems.push(`${h.at} is not a record`);
            continue;
          }
          const e = Object.entries(h.v);
          if (!e.length && !emptyOk(prefix)) problems.push(`${h.at} is empty`);
          for (const [key, v] of e) out.push({ at: `${h.at}.${key}`, v });
        }
      }
      cur = out;
    }
  }
  for (const h of cur) if (h.v === undefined) problems.push(`${h.at} is undefined`);
  return { hits: cur, problems };
}

/** Every listed path of `fn` on `result`; `allEmpty`: every array / record may be empty (e.g. a paper book). */
function checkContract(fn: Fn, result: unknown, opts: { allEmpty?: boolean; label?: string } = {}) {
  const optional = OPTIONAL[fn] ?? {};
  const emptyOk = (prefix: string) => !!opts.allEmpty || prefix in optional;
  const missing: string[] = [];
  for (const path of FIELDS[fn]) {
    const { problems } = resolve(result, path, emptyOk);
    if (problems.length)
      missing.push(
        `${path}: ${problems.slice(0, 3).join("; ")}${problems.length > 3 ? ` (+${problems.length - 3})` : ""}`,
      );
  }
  // an optional path must at least be readable without throwing (its parents may be null / absent)
  for (const path of Object.keys(optional)) resolve(result, path, () => true);
  assert.deepEqual(missing, [], `${opts.label ?? fn}: fields the pages read are missing`);
}

function assertJson(label: string, x: unknown) {
  const s = JSON.stringify(x);
  assert.equal(typeof s, "string", `${label}: serializable`);
  assert.deepEqual(JSON.parse(s), x, `${label}: survives a JSON round trip unchanged`);
}

it("with/without statistics contract preserves PF provenance and nullable deltas", async () => {
  const { buildStatistics } = await import("./statistics.ts");
  const { unitStatsOf } = await import("./metrics/stats.ts");
  const stats = (returns: number[]) => unitStatsOf(returns.map((r, i) => ({ entryT: i + 1, exitT: i + 2, r })));
  const measuredFive = stats([0.05, -0.01]);
  for (const [withStats, expectedDelta] of [[stats([0.01]), null], [stats([0.04, -0.01]), -1], [stats([]), null], [{ n: 3, pf: 4 }, null]] as const) {
    const report = buildStatistics({ source: "sim", trades: [], startT: 0, endT: 4, balance: 100, unit: () => 100, price: () => null, cost: 0.002, leverage: 1, minActiveLevel: 2,
      presets: { normal: { stats: measuredFive }, "normal-trailing": { stats: withStats } } });
    const response = { balanceFrom: "paper start balance", paperEvidence: null, report };
    checkContract("coreStatistics", response, { allEmpty: true });
    assertJson("nullable comparison PF", response);
    assert.equal(report.withWithout[0].dPf, expectedDelta);
    assert.equal(report.withWithout[0].with.pfConvention, "gp" in withStats ? withStats.gp > 0 && withStats.gl === 0 ? "no-loss-sentinel" : "gross-return-ratio" : "unavailable");
    assert.equal(report.withWithout[0].with.gp, "gp" in withStats ? withStats.gp : null);
    assert.equal(report.withWithout[0].with.gl, "gl" in withStats ? withStats.gl : null);
    assert.equal(report.presets[1].pfConvention, report.withWithout[0].with.pfConvention);
  }
});

const small = {
  symbols: 3,
  historyDays: 18,
  tfDays: { "1": 3, "5": 6, "15": 18, "30": 18 },
  mainTop: 12,
  refineTop: 4,
  evalTop: 8,
  cycleMs: 60_000,
  grid: { short: false as const },
  tactics: {
    session: false,
    volRegime: false,
    trendStrength: false,
    cooldown: false,
    cooldownBars: 4,
  },
  gates: { minPf: 1.05, minTrades: 3, maxDdr: 0 },
  signals: signalSettings({
    exits: "pct",
    sources: Object.fromEntries(
      SIGNAL_SOURCES.filter((x) => x.name.startsWith("s2-")).map((x) => [x.name, false]),
    ),
  }),
};

const until = async (cond: () => boolean, ms = 300_000) => {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error("timeout");
    await new Promise((r) => setTimeout(r, 25));
  }
};

const G = globalThis as unknown as { __ctsCoreRuntime?: unknown };

describe(
  "server function contract: every field a page reads is returned",
  { timeout: 900_000 },
  () => {
    let rt: InstanceType<typeof CoreRuntime>;
    let prices: Array<{ sym: string; last: number; quoteVol: number; changePct: number }> = [];

    let restoreCompare = () => {};
    before(async () => {
      // (the preset comparison feeds coreSim's presets: on for this suite)
      restoreCompare = compareOn();
      rt = new CoreRuntime(new CoreDb(":memory:"), small, {
        market: "synthetic",
        feed: { tickers: async () => prices },
      });
      rt.updateSettings({}, { validLastN: 0, lastN: 0 });
      rt.start();
      await until(() => rt.status.computes >= 1 && rt.status.state === "running");
      // the preset comparison (coreSim's presets) follows the paper step
      await until(() => rt.status.compare?.running === false && (rt.status.compare?.done ?? 0) > 0);
      prices = [...rt.candles].map(([sym, xs]) => ({
        sym,
        last: xs.lastC()!,
        quoteVol: 1e6,
        changePct: 0,
      }));
      // the compute's paper step (the audit and the paper book come from it)
      await until(() => (rt.status.paperCompute ?? 0) >= 1, 120_000).catch(() => undefined);
      rt.stop();
      process.env.CTS_CORE_PRIMARY_CONN = DEFAULT_SETTINGS.live.connId;
      G.__ctsCoreRuntime = rt;
    });
    after(() => {
      rt?.stop();
      delete G.__ctsCoreRuntime;
      restoreCompare();
    });

    /** call, check JSON, check the contract */
    const read = async (
      fn: Fn,
      call: () => Promise<unknown>,
      opts: { allEmpty?: boolean; label?: string } = {},
    ) => {
      const x = await call();
      assertJson(opts.label ?? fn, x);
      checkContract(fn, x, opts);
      return x as Record<string, unknown>;
    };

    it("the runtime computed once and is the primary connection's", async () => {
      assert.ok(rt.status.computes >= 1);
      assert.ok(rt.sim, "a simulated run");
      const { runtimeFor } = await import("./server/runtime.server.ts");
      assert.equal(runtimeFor(), rt);
      // reads never restart a stopped runtime
      assert.equal(rt.status.state, "stopped");
    });

    it("coreStatus", async () => {
      await read("coreStatus", () => api.coreStatusData(api.connInput({})));
    });

    it("coreStatus / any read of the primary connection by its id", async () => {
      const x = await api.coreStatusData(api.connInput({ conn: DEFAULT_SETTINGS.live.connId }));
      checkContract("coreStatus", x);
    });

    it("coreConns", async () => {
      const x = await read("coreConns", () => api.coreConnsData());
      const conns = x.conns as Array<{ conn: string; primary: boolean; computes: number }>;
      const p = conns.find((c) => c.primary);
      assert.equal(p?.conn, DEFAULT_SETTINGS.live.connId);
      assert.ok(p!.computes >= 1, "the primary row is this runtime");
    });

    it("coreOverview", async () => {
      const d = await read("coreOverview", () => api.coreOverviewData(api.connInput({})));
      const p = d.paper as { balance: number; accountEquity: number; equity: number; trades: { pnl: number } };
      assert.equal(p.balance, rt.settings.paperBalance + p.trades.pnl, "balance includes realized closes only");
      assert.equal(p.accountEquity, rt.settings.paperBalance + p.equity, "equity includes open mark to market");
    });

    it("coreResults (Base, Evaluated by rank, a matrix cell) and coreMatrix", async () => {
      await read("coreResults", () =>
        api.coreResultsData(api.coreResultsInput({ stage: 1, sort: "score", limit: 400 })),
      );
      // Evaluated may be empty here; the Base call above holds rows to the full list
      await read(
        "coreResults",
        () => api.coreResultsData(api.coreResultsInput({ stage: 3, sort: "rank", limit: 40 })),
        {
          label: "coreResults stage 3",
        },
      );
      const m = await read("coreMatrix", () => api.coreMatrixData(api.connInput({})));
      const cell = (m.rows as Array<{ bot: string; ind: string }>)[0];
      const r = await read(
        "coreResults",
        () =>
          api.coreResultsData(
            api.coreResultsInput({ bot: cell.bot, ind: cell.ind, sort: "score", limit: 1 }),
          ),
        { label: "coreResults matrix cell" },
      );
      assert.equal((r.rows as unknown[]).length, 1);
    });

    it("coreConfig of a Main config (its tape) and of a Base config (recomputed trades)", async () => {
      const main = (await api.coreResultsData(
        api.coreResultsInput({ stage: 2, sort: "score", limit: 1 }),
      )) as {
        rows: Array<{ id: string }>;
      };
      assert.ok(main.rows.length, "a Main config");
      await read(
        "coreConfig",
        () => api.coreConfigData(api.coreConfigInput({ id: main.rows[0].id })),
        {
          label: `coreConfig ${main.rows[0].id}`,
        },
      );
      // a Base config keeps only its stats (no last-N / evals); its trades are recomputed from the candles
      const base = (await api.coreResultsData(
        api.coreResultsInput({ stage: 1, sort: "score", limit: 1 }),
      )) as {
        rows: Array<{ id: string }>;
      };
      assert.ok(base.rows.length, "a Base config");
      await read(
        "coreConfig",
        () => api.coreConfigData(api.coreConfigInput({ id: base.rows[0].id })),
        {
          allEmpty: true,
          label: `coreConfig ${base.rows[0].id}`,
        },
      );
      const unknown = (await api.coreConfigData(api.coreConfigInput({ id: "no|such|config" }))) as {
        row: unknown;
      };
      assert.equal(unknown.row, null, "an unknown config: row null (the page says so)");
    });

    it("coreSim", async () => {
      await read("coreSim", () => api.coreSimData(api.connInput({})));
    });

    it("coreTrading", async () => {
      const d = await read("coreTrading", () => api.coreTradingData(api.connInput({})));
      assert.equal(d.balance, rt.settings.paperBalance + Number(d.realized), "paper balance excludes open MTM");
      assert.equal(d.accountEquity, rt.settings.paperBalance + Number(d.equity), "paper account equity includes open MTM");
      const preview = d.controlPreview as { blocked?: string; targets: unknown[] };
      if (preview.blocked) assert.deepEqual(preview.targets, [], "unknown account equity produces no fictitious live sizes");
    });

    it("coreListing: the paper step's validated sets, a range's own rows, paged; active units; bad input refused", async () => {
      const all = (await read("coreListing", () => api.coreListingData(api.coreListingInput({ kind: "validated", limit: 5 })))) as {
        total: number;
        rows: Array<{ id: string; range: string; score: number }>;
        byRange: Array<{ range: string; validated: number }>;
      };
      assert.ok(all.total > 0 && all.rows.length <= 5, `${all.total} validated`);
      // the listing is the paper step's seats, best score first
      assert.equal(all.total, rt.listings!.validated.length);
      for (let i = 1; i < all.rows.length; i++) assert.ok(all.rows[i - 1].score >= all.rows[i].score);
      // a range reads its own rows: every row of the range, none of another
      const r0 = all.byRange[0];
      const one = (await api.coreListingData(api.coreListingInput({ kind: "validated", range: r0.range, limit: 500 }))) as typeof all;
      assert.equal(one.total, r0.validated);
      assert.ok(one.rows.every((x) => x.range === r0.range));
      assert.equal(all.byRange.reduce((a, x) => a + x.validated, 0), all.total);
      // paging: page 2 continues page 1
      const p2 = (await api.coreListingData(api.coreListingInput({ kind: "validated", offset: 5, limit: 5 }))) as typeof all;
      if (all.total > 5) assert.notEqual(p2.rows[0]?.id, all.rows[0].id);
      const act = (await api.coreListingData(api.coreListingInput({ kind: "active" }))) as { total: number };
      assert.equal(act.total, rt.listings!.active.length);
      const savedActive = rt.listings!.active;
      try {
        const unit = { bot: "follow", ind: "sig-ema-cross-s@m5", sym: "AAA-USDT", side: 1 as const };
        rt.listings!.active = [{ ...unit, kind: "normal" }, { ...unit, kind: "trailing" }];
        const typed = (await api.coreListingData(api.coreListingInput({ kind: "active", q: "trailing" }))) as {
          total: number;
          rows: Array<{ ind: string; kind: string }>;
        };
        assert.equal(typed.total, 1, "type filtering never returns another independent Signal type");
        assert.equal(typed.rows[0].kind, "trailing");
        assert.equal(typed.rows[0].ind, unit.ind, "full range and lane identity survives the API");
      } finally {
        rt.listings!.active = savedActive;
      }
      assert.throws(() => api.coreListingInput({ kind: "everything" }), /kind/);
    });

    it("coreMarket", async () => {
      await read("coreMarket", () => api.coreMarketData(api.connInput({})));
    });

    it("exact Base configuration listings preserve independent counts, provenance and unknown status", async () => {
      const { BaseConfigCounter } = await import("./base-config-counts.ts");
      const saved = rt.baseConfigs;
      try {
        const counter = new BaseConfigCounter({
          gates: { minPf: 1.1, minTrades: 2, maxDdr: 0 }, cost: 0.002, fromT: 0, cutT: 100,
        });
        const sample = [{ entryT: 10, exitT: 20, r: 0.022 }, { entryT: 30, exitT: 40, r: -0.02 }];
        const protect = { tp: 0.02, sl: 0.02, trail: 0, hold: 32 };
        counter.record("follow", "tactic-trend-s@m5", protect, "normal", sample);
        counter.record("follow", "tactic-trend-s@m5", { ...protect, tp: 0.03 }, "normal", sample);
        counter.record("follow", "tactic-trend-s@m5", { ...protect, trail: 0.01, tag: "sh" }, "trailing", sample);
        counter.record("follow", "tactic-trend-m@m15", { ...protect, tag: "gn" }, "normal", sample);
        const rows = counter.rows();
        const sum = (key: "configured" | "evaluated" | "pfPassed" | "passed") => rows.reduce((n, row) => n + row[key], 0);
        rt.baseConfigs = {
          summary: {
            state: "partial", key: "contract-fixture", settingsAt: 1, cutT: 100, fromT: 0,
            cost: 0.002, floorPf: 1.1, population: "focusedTacticCandidates",
            totalPairs: 2, admittedPairs: 1, admittedPairKeys: ["follow|tactic-trend-s@m5"],
            donePairs: 1, totalChunks: 4, doneChunks: 2, updatedAt: 50, plannedConfigured: 4,
            configured: sum("configured"), evaluated: sum("evaluated"), pfPassed: sum("pfPassed"), passed: sum("passed"),
          }, rows,
        };
        const snapshot = rt.baseConfigs;
        assert.ok(snapshot);
        const result = await api.coreListingData(api.coreListingInput({ kind: "baseConfigs", limit: 1 })) as unknown as {
          ready: boolean; total: number; rows: typeof rows; summary: typeof snapshot.summary;
        };
        assert.equal(result.ready, true);
        assert.equal(result.total, 3, "rows count exact indication/range/type groups, not representative pairs");
        assert.equal(result.rows.length, 1);
        assert.deepEqual(result.summary, snapshot.summary, "partial status and the frozen measurement basis survive paging");
        assert.strictEqual(rt.baseConfigs, snapshot, "reading a listing does not replace the cached measurement");
        for (const field of ["bot", "ind", "tag", "kind", "configured", "evaluated", "pfPassed", "passed", "minPf", "floorPf", "closes", "notEvaluated", "cost", "fromT", "cutT"])
          assert.notEqual(result.rows[0][field as keyof typeof rows[number]], undefined, field);
        const filtered = await api.coreListingData(api.coreListingInput({ kind: "baseConfigs", q: "TRAILING", range: "Short" })) as unknown as typeof result;
        assert.equal(filtered.total, 1);
        assert.equal(filtered.rows[0].ind, "tactic-trend-s@m5");
        assert.equal(filtered.rows[0].kind, "trailing");
        const wide = await api.coreListingData(api.coreListingInput({ kind: "baseConfigs", range: "Wide" })) as unknown as typeof result;
        assert.equal(wide.total, 1);
        assert.equal(wide.rows[0].configured, 2, "every configured protection cell remains counted");
        rt.baseConfigs = null;
        const unknown = await api.coreListingData(api.coreListingInput({ kind: "baseConfigs" })) as { ready: boolean; summary: unknown; rows: unknown[] };
        assert.equal(unknown.ready, false);
        assert.equal(unknown.summary, null, "uncomputed results never become a completed zero-pass claim");
        assert.deepEqual(unknown.rows, []);
      } finally {
        rt.baseConfigs = saved;
      }
    });

    it("coreEngine", async () => {
      await read("coreEngine", () => api.coreEngineData(api.connInput({})));
    });

    it("coreSettings, and saveCoreSettings with the settings unchanged", async () => {
      const before = (await read("coreSettings", () =>
        api.coreSettingsData(api.connInput({})),
      )) as {
        settings: Record<string, unknown>;
        wf: Record<string, unknown>;
      };
      // what the Settings page sends with nothing changed, and the whole loaded settings sent back
      await read("saveCoreSettings", () =>
        api.saveCoreSettingsData(api.saveCoreSettingsInput({ settings: {}, wf: {} })),
      );
      await read("saveCoreSettings", () =>
        api.saveCoreSettingsData(
          api.saveCoreSettingsInput({ settings: before.settings as never, wf: before.wf }),
        ),
      );
      const afterSave = (await api.coreSettingsData(api.connInput({}))) as typeof before;
      assert.deepEqual(
        afterSave.settings,
        before.settings,
        "saving the loaded settings unchanged changes nothing",
      );
      // the walk-forward patch keeps every value; a saved partial (wf.coord) is completed with its defaults
      const within = (a: unknown, b: unknown, at: string): void => {
        if (a && typeof a === "object" && !Array.isArray(a) && b && typeof b === "object")
          for (const [k, v] of Object.entries(a))
            within(v, (b as Record<string, unknown>)[k], `${at}.${k}`);
        else assert.deepEqual(b, a, at);
      };
      within(before.wf, afterSave.wf, "wf");
      // and a second save of what was read back is a fixed point
      await api.saveCoreSettingsData(
        api.saveCoreSettingsInput({ settings: afterSave.settings as never, wf: afterSave.wf }),
      );
      assert.deepEqual(await api.coreSettingsData(api.connInput({})), afterSave);
      assert.equal(rt.status.state, "stopped", "a save does not restart a stopped runtime");
    });

    it("corePresets and corePresetSeries", async () => {
      const x = await read("corePresets", () => api.corePresetsData(api.connInput({})));
      const id = (x.research as Array<{ id: string }>)[0].id;
      await read("corePresetSeries", () =>
        api.corePresetSeriesData(api.corePresetSeriesInput({ id })),
      );
    });

    it("presetAction: save, update as the preset dialog sends it, delete", async () => {
      const saved = (await read("presetAction", () =>
        api.presetActionData(
          api.presetActionInput({ action: "save", label: "contract test", info: "" }),
        ),
      )) as { preset: { id: string; label: string } };
      assert.ok(
        saved.preset.id && saved.preset.label === "contract test",
        "save returns the preset",
      );
      const s = (await api.coreSettingsData(api.connInput({}))) as {
        settings: Record<string, unknown>;
        wf: Record<string, unknown>;
      };
      const pick = (o: Record<string, unknown>, ks: string[]) =>
        Object.fromEntries(ks.map((k) => [k, o[k]]));
      const updated = (await read("presetAction", () =>
        api.presetActionData(
          api.presetActionInput({
            action: "update",
            id: saved.preset.id,
            label: "contract test",
            settings: {
              ...pick(s.settings, [
                "tfs",
                "tfDays",
                "gates",
                "toggles",
                "tactics",
                "grid",
                "block",
                "dca",
                "axis",
                "signals",
              ]),
              disabledKinds: (s.settings.disabledKinds as string[] | undefined) ?? [],
              focus: (s.settings.focus as string[] | undefined) ?? [],
            } as never,
            wf: pick(s.wf, [
              "mode",
              "lastN",
              "lastNMinPf",
              "validLastN",
              "portfolio",
              "maxPerSymbol",
              "maxPerSide",
              "maxPositions",
              "maxOpen",
              "preH",
              "longH",
            ]),
          }),
        ),
      )) as { preset: { id: string; label: string } };
      // the dialog applies r.preset.id and names r.preset.label
      assert.ok(updated.preset.id, "update returns preset.id");
      assert.equal(updated.preset.label, "contract test");
      const presets = (await api.corePresetsData(api.connInput({}))) as {
        saved: Array<{ id: string }>;
      };
      checkContract(
        "corePresets",
        { ...presets, research: presets.saved },
        { label: "corePresets saved[] as research[]" },
      );
      for (const id of new Set([saved.preset.id, updated.preset.id])) {
        const del = await api.presetActionData(api.presetActionInput({ action: "delete", id }));
        assertJson("presetAction delete", del);
        assert.deepEqual(del, { ok: true });
      }
      const left = (await api.corePresetsData(api.connInput({}))) as {
        saved: Array<{ id: string }>;
      };
      assert.ok(
        !left.saved.some((p) => p.id === saved.preset.id || p.id === updated.preset.id),
        "deleted",
      );
    });

    it("coreStatistics: simulated run (full), paper book and live (may be empty)", async () => {
      await read("coreStatistics", () =>
        api.coreStatisticsData(api.coreStatisticsInput({ source: "sim" })),
      );
      const win = (await read(
        "coreStatistics",
        () => api.coreStatisticsData(api.coreStatisticsInput({ source: "sim", hours: 6 })),
        { label: "coreStatistics sim 6h" },
      )) as { report: { balanceStart?: unknown } };
      assert.notEqual(win.report.balanceStart, undefined, "a window carries its start balance");
      for (const source of ["paper", "live"] as const)
        await read(
          "coreStatistics",
          () => api.coreStatisticsData(api.coreStatisticsInput({ source })),
          {
            allEmpty: true,
            label: `coreStatistics ${source}`,
          },
        );
    });

    it("coreStatistics: live with no verified exchange equity has a zero ledger basis, never the paper balance", async () => {
      assert.notEqual(rt.settings.paperBalance, 0, "the fixture has a funded paper account");
      const live = await api.coreStatisticsData(api.coreStatisticsInput({ source: "live" })) as {
        balanceFrom: string;
        report: { balance0: number };
      };
      assert.equal(live.balanceFrom, "unavailable");
      assert.equal(live.report.balance0, 0);
      assert.notEqual(live.report.balance0, rt.settings.paperBalance);
    });

    it("coreControl: recompute on the stopped runtime (start / stop are not called)", async () => {
      await read("coreControl", () =>
        api.coreControlData(api.coreControlInput({ action: "recompute" })),
      );
      assert.equal(
        rt.status.state,
        "stopped",
        "a recompute request does not restart a stopped runtime",
      );
      // the primary connection cannot be switched off
      await assert.rejects(
        api.coreControlData(
          api.coreControlInput({ action: "connOff", conn: DEFAULT_SETTINGS.live.connId }),
        ),
        /primary/,
      );
    });

    it("the validators reject bad input", async () => {
      // connection
      assert.throws(() => api.connInput({ conn: 5 as never }), /bad connection/);
      assert.throws(() => api.connInput({ conn: "x".repeat(41) }), /bad connection/);
      await assert.rejects(
        api.coreStatusData(api.connInput({ conn: "bingx-nope" })),
        /unknown connection/,
      );
      await assert.rejects(
        api.coreOverviewData(api.connInput({ conn: "bingx-nope" })),
        /unknown connection/,
      );
      await assert.rejects(
        api.coreControlData(api.coreControlInput({ action: "connOn", conn: "bingx-nope" })),
        /unknown connection/,
      );
      // ids
      assert.throws(() => api.coreConfigInput({} as never), /id required/);
      assert.throws(() => api.coreConfigInput({ id: "" }), /id required/);
      assert.throws(() => api.corePresetSeriesInput({} as never), /preset id required/);
      assert.throws(() => api.corePresetSeriesInput({ id: "x".repeat(121) }), /preset id required/);
      assert.throws(() => api.presetActionInput({ action: "apply" }), /preset id required/);
      assert.throws(() => api.presetActionInput({ action: "delete" }), /preset id required/);
      // actions and ranges
      assert.throws(() => api.presetActionInput({ action: "bogus" as never }), /bad action/);
      assert.throws(() => api.presetActionInput({ action: "backtest", id: "x", days: 0 }), /days/);
      assert.throws(
        () => api.presetActionInput({ action: "update", id: "x" }),
        /settings required/,
      );
      assert.throws(
        () => api.presetActionInput({ action: "update", id: "x", settings: { live: {} } as never }),
        /Live/,
      );
      assert.throws(
        () => api.presetActionInput({ action: "save", label: "x".repeat(81) }),
        /label/,
      );
      assert.throws(() => api.coreControlInput({ action: "bogus" as never }), /bad action/);
      assert.throws(() => api.coreResultsInput({ lane: "7" }), /lane/);
      assert.throws(() => api.saveCoreSettingsInput(null as never), /invalid/);
      // statistics source and window
      assert.throws(() => api.coreStatisticsInput({ source: "bogus" as never }), /source/);
      assert.throws(() => api.coreStatisticsInput({ hours: -1 }), /hours/);
      assert.throws(() => api.coreStatisticsInput({ hours: 24 * 91 }), /hours/);
      assert.throws(() => api.coreStatisticsInput({ hours: Number.NaN }), /hours/);
      assert.throws(
        () => api.coreStatisticsInput({ source: "sim", conn: 7 as never }),
        /bad connection/,
      );
    });

    it("the path checker reports a missing field, a null parent, an empty list and a bad element", () => {
      const x = {
        a: { b: 1 },
        n: null,
        xs: [{ k: 1 }, { k: 2 }, {}],
        e: [],
        r: { p: { v: 1 }, q: {} },
      };
      const p = (path: string, emptyOk = false) => resolve(x, path, () => emptyOk).problems;
      assert.deepEqual(p("a.b"), []);
      assert.deepEqual(p("a.c"), ["a.c is undefined"]);
      assert.deepEqual(p("n.c"), ["n is null, cannot read c"]);
      assert.deepEqual(p("xs[].k"), ["xs[2].k is undefined"]);
      assert.deepEqual(p("e[].k"), ["e is empty"]);
      assert.deepEqual(p("e[].k", true), []);
      assert.deepEqual(p("a[]"), ["a is not an array (object)"]);
      assert.deepEqual(p("r{}.v"), ["r.q.v is undefined"]);
    });

    it("the table is consistent: every optional path is a page read, not a duplicate of a required one", (t) => {
      const req = Object.values(FIELDS).reduce((n, xs) => n + xs.length, 0);
      const opt = Object.values(OPTIONAL).reduce((n, o) => n + Object.keys(o ?? {}).length, 0);
      t.diagnostic(
        `${Object.keys(FIELDS).length} server functions · ${req} required paths · ${opt} optional`,
      );
      for (const [fn, opt] of Object.entries(OPTIONAL) as Array<[Fn, Record<string, string>]>)
        for (const [path, why] of Object.entries(opt)) {
          assert.ok(why.length > 3, `${fn} ${path}: a reason`);
          assert.ok(!FIELDS[fn].includes(path), `${fn} ${path}: listed as required and optional`);
        }
    });
  },
);
