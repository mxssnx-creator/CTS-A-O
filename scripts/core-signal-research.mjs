// Offline fixed-protocol research. No exchange/account client, settings write, promotion or network operation.
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { barsFromCandles, resample } from "../src/core/market/bars.ts";
import { SeriesCache } from "../src/core/indications/cache.ts";
import { INDICATION_BY_ID, laneInd } from "../src/core/indications/registry.ts";
import { DEFAULT_SIGNALS, SIGNAL_SOURCES, signalId } from "../src/core/signal-config.ts";
import { signalProtects } from "../src/core/signals.ts";
import { configId, laneProtect, protectKind } from "../src/core/pipeline/pipeline.ts";
import { adjustProtect } from "../src/core/adjust.ts";
import { filterEntries } from "../src/core/sim/walkforward.ts";
import { entrySignal } from "../src/core/bots/bots.ts";
import { tacticCooldown } from "../src/core/indications/filters.ts";
import { sideSignal, simulate } from "../src/core/sim/backtest.ts";
import { profitFactor } from "../src/core/metrics/stats.ts";
import { DEFAULT_TACTICS, PF_NO_LOSS } from "../src/core/config.ts";
import { validateMarket, maskEntries } from "./core-tactic-research.mjs";

export const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const stable = (x) => JSON.stringify(x, Object.keys(x).sort());
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Enforce runtime-grid parity and the predeclared formulas before any market outcomes are calculated. */
export function researchCells(protocol) {
  if (protocol.schema !== "cts-signal-new-sources-research-v1")
    throw new Error("Unknown Signal protocol schema");
  const protects = signalProtects({ ...DEFAULT_SIGNALS, exits: "pct" });
  if (JSON.stringify(protects) !== JSON.stringify(protocol.protects))
    throw new Error("Frozen protects differ from runtime signalProtects");
  if (protocol.model.roundTripCost !== 0.002) throw new Error("Frozen cost must remain 0.002");
  const floors = { minSl: DEFAULT_SIGNALS.minSl, minTrail: DEFAULT_SIGNALS.minTrail };
  if (stable(protocol.preOutcomeModelClarification?.signalFloors ?? {}) !== stable(floors))
    throw new Error("Frozen Signal floors differ from runtime defaults");
  if (
    stable(protocol.preOutcomeModelClarification?.signalFilter ?? {}) !==
    stable(DEFAULT_SIGNALS.filter)
  )
    throw new Error("Frozen Signal entry filter differs from runtime defaults");
  const effective = new Map();
  for (const candidate of protocol.candidates) {
    const catalog = SIGNAL_SOURCES.find((s) => s.name === candidate.name);
    if (!catalog) throw new Error(`Unknown source ${candidate.name}`);
    for (const range of protocol.ranges) {
      const source = INDICATION_BY_ID.get(catalog[range]);
      if (!source || stable(source.params) !== stable(candidate[range]))
        throw new Error(`Frozen source parameters changed: ${candidate.name}/${range}`);
      for (const tf of protocol.lanes) {
        const ind = laneInd(signalId(candidate.name, range), tf);
        for (let i = 0; i < protects.length; i++) {
          const requestedProtect = laneProtect(protects[i], ind);
          const protect = adjustProtect(requestedProtect, floors);
          const cfg = configId("follow", ind, protect);
          for (const side of [1, -1]) {
            const id = `${cfg}|side${side}`;
            const alias = {
              referenceIndex: i,
              referenceProtect: protects[i],
              requestedProtect,
              requestedCfg: configId("follow", ind, requestedProtect),
            };
            const cell = effective.get(id);
            if (cell) cell.requestedAliases.push(alias);
            else
              effective.set(id, {
                id,
                cfg,
                ind,
                source: candidate.name,
                range,
                tf,
                kind: protectKind(protect),
                protect,
                requestedAliases: [alias],
                side,
              });
          }
        }
      }
    }
  }
  return [...effective.values()];
}

export function validateProtocolMarket(market, protocol) {
  const data = validateMarket(market);
  if (
    JSON.stringify(data.symbols) !== JSON.stringify([...protocol.data.symbols].sort()) ||
    data.startT !== protocol.data.startT ||
    data.endT !== protocol.data.endT
  )
    throw new Error("Market symbols/window differ from frozen protocol");
  const { startT, isStartT, splitT, endT } = protocol.data;
  if (
    !(startT < isStartT && isStartT < splitT && splitT < endT) ||
    [startT, isStartT, splitT, endT].some((t) => t % 60_000)
  )
    throw new Error("Invalid chronological protocol boundary");
  return data;
}

/** Plain sums are unit net-return fractions. There is no sizing multiplier or account/capital model. */
function accumulator() {
  return {
    n: 0,
    wins: 0,
    losses: 0,
    zero: 0,
    gp: 0,
    gl: 0,
    firstEntryT: null,
    lastEntryT: null,
    firstExitT: null,
    lastExitT: null,
  };
}
function add(a, r, entryT, exitT) {
  if (![r, entryT, exitT].every(Number.isFinite) || exitT < entryT)
    throw new Error("Invalid simulated unit-return sample");
  a.n++;
  if (r > 0) {
    a.wins++;
    a.gp += r;
  } else if (r < 0) {
    a.losses++;
    a.gl -= r;
  } else a.zero++;
  a.firstEntryT = a.firstEntryT === null ? entryT : Math.min(a.firstEntryT, entryT);
  a.lastEntryT = a.lastEntryT === null ? entryT : Math.max(a.lastEntryT, entryT);
  a.firstExitT = a.firstExitT === null ? exitT : Math.min(a.firstExitT, exitT);
  a.lastExitT = a.lastExitT === null ? exitT : Math.max(a.lastExitT, exitT);
}
function merge(a, b) {
  for (const k of ["n", "wins", "losses", "zero", "gp", "gl"]) a[k] += b[k];
  for (const k of ["firstEntryT", "firstExitT"])
    if (b[k] !== null) a[k] = a[k] === null ? b[k] : Math.min(a[k], b[k]);
  for (const k of ["lastEntryT", "lastExitT"])
    if (b[k] !== null) a[k] = a[k] === null ? b[k] : Math.max(a[k], b[k]);
  return a;
}
export function summary(a) {
  return {
    ...a,
    pf: profitFactor(a.gp, a.gl),
    pfBasis: "unit-net-returns",
    unknownReturns: 0,
    netReturnSum: a.gp - a.gl,
    netReturnPoints: (a.gp - a.gl) * 100,
    noLoss: a.gp > 0 && a.gl === 0,
    exactRatio: a.gl > 0 ? a.gp / a.gl : null,
    pfConvention:
      a.gp > 0 && a.gl === 0
        ? `no-loss-score-${PF_NO_LOSS}`
        : a.n
          ? "gross-positive/absolute-gross-negative"
          : "empty-score-0",
  };
}
function pair() {
  return { closed: accumulator(), marks: accumulator() };
}
function pairSummary(p) {
  return {
    closed: summary(p.closed),
    endpointMarks: summary(p.marks),
    openAtEnd: p.marks.n,
    withEndpointMarks: summary(merge(merge(accumulator(), p.closed), p.marks)),
  };
}
export function qualifiesIS(row, selection) {
  return (
    row.closed.n >= selection.minSettled &&
    row.closed.pf >= selection.minPf &&
    row.closed.netReturnSum > 0 &&
    row.withEndpointMarks.pf >= selection.endpointMarkedMinPf &&
    row.withEndpointMarks.netReturnSum > 0
  );
}
function freezeDeep(x) {
  if (x && typeof x === "object" && !Object.isFrozen(x)) {
    Object.freeze(x);
    for (const value of Object.values(x)) freezeDeep(value);
  }
  return x;
}

export function freezeIS(rows, protocol) {
  const qualifiedIds = rows
    .filter((r) => qualifiesIS(r, protocol.selection))
    .map((r) => r.id)
    .sort();
  return freezeDeep({
    schema: "cts-signal-is-selection-v1",
    splitT: protocol.data.splitT,
    criteria: { ...protocol.selection },
    qualifiedIds,
    allConfigSideRows: rows.length,
    selectionSha256: sha256(JSON.stringify(qualifiedIds)),
    isRowsSha256: sha256(JSON.stringify(rows)),
  });
}

function cohort() {
  return {
    total: pair(),
    bySource: new Map(),
    byRange: new Map(),
    byLane: new Map(),
    byKind: new Map(),
    bySide: new Map(),
    bySymbol: new Map(),
    hourly: new Map(),
    daily: new Map(),
  };
}
function bucket(map, key) {
  let p = map.get(key);
  if (!p) map.set(key, (p = pair()));
  return p;
}
function addCohort(c, cell, sym, isMark, r, entryT, exitT) {
  const which = isMark ? "marks" : "closed";
  add(c.total[which], r, entryT, exitT);
  for (const [dim, key] of [
    ["bySource", cell.source],
    ["byRange", cell.range],
    ["byLane", String(cell.tf)],
    ["byKind", cell.kind],
    ["bySide", cell.side > 0 ? "long" : "short"],
    ["bySymbol", sym],
    ["hourly", String(Math.floor(exitT / HOUR) * HOUR)],
    ["daily", String(Math.floor(exitT / DAY) * DAY)],
  ])
    add(bucket(c[dim], key)[which], r, entryT, exitT);
}
function finishCohort(c) {
  const out = pairSummary(c.total);
  for (const dim of [
    "bySource",
    "byRange",
    "byLane",
    "byKind",
    "bySide",
    "bySymbol",
    "hourly",
    "daily",
  ])
    out[dim] = Object.fromEntries(
      [...c[dim]].sort(([a], [b]) => a.localeCompare(b)).map(([key, p]) => [key, pairSummary(p)]),
    );
  return out;
}

function cache(sym, candles, tf) {
  const cs = tf === 1 ? candles : resample(candles, 1, tf);
  return new SeriesCache(barsFromCandles(sym, tf, cs));
}

/** One group at a time: all reference protects share the same immutable indication and direction entry arrays. */
function evaluate(
  market,
  protocol,
  cells,
  { phase, qualifiedIds = new Set(), onProgress = () => {} },
) {
  const endT = phase === "IS" ? protocol.data.splitT : protocol.data.endT;
  const fromT = phase === "IS" ? protocol.data.isStartT : protocol.data.splitT;
  const symbols = [...protocol.data.symbols].sort();
  if (phase === "IS" && symbols.some((sym) => market[sym].some((c) => c.t + 60_000 > endT)))
    throw new Error(
      "IS calculation received future candles instead of a physically truncated prefix",
    );
  const groups = new Map();
  for (const cell of cells) {
    let group = groups.get(cell.ind);
    if (!group) groups.set(cell.ind, (group = []));
    group.push(cell);
  }
  const rows = [];
  const cohorts =
    phase === "OOS"
      ? {
          allConfigsDiagnostic: cohort(),
          isQualifiedPool: cohort(),
          isUnqualifiedDiagnostic: cohort(),
        }
      : null;
  let done = 0;
  for (const [ind, group] of groups) {
    const samples = new Map(
      group.map((cell) => [cell.id, { stats: pair(), hash: createHash("sha256") }]),
    );
    for (const sym of symbols) {
      const k = cache(sym, market[sym], group[0].tf);
      let raw = entrySignal("follow", ind, k, DEFAULT_TACTICS);
      if (!raw) throw new Error(`Missing entrySignal ${ind}`);
      raw = filterEntries(raw, k.b, k, protocol.preOutcomeModelClarification?.signalFilter);
      const masked = maskEntries(raw, k.b, fromT);
      const directions = new Map([1, -1].map((side) => [side, sideSignal(masked, side)]));
      for (const cell of group) {
        const sample = samples.get(cell.id);
        const collect = (isMark, r, entryT, exitT) => {
          if (entryT < fromT || exitT > endT || exitT < entryT)
            throw new Error(`${phase} chronological boundary violation`);
          add(sample.stats[isMark ? "marks" : "closed"], r, entryT, exitT);
          sample.hash.update(`${JSON.stringify([sym, cell.side, entryT, exitT, r, isMark])}\n`);
          if (cohorts) {
            addCohort(cohorts.allConfigsDiagnostic, cell, sym, isMark, r, entryT, exitT);
            addCohort(
              qualifiedIds.has(cell.id) ? cohorts.isQualifiedPool : cohorts.isUnqualifiedDiagnostic,
              cell,
              sym,
              isMark,
              r,
              entryT,
              exitT,
            );
          }
        };
        const sim = simulate(cell.cfg, k.b, directions.get(cell.side), cell.protect, {
          cost: protocol.model.roundTripCost,
          cooldown: tacticCooldown(DEFAULT_TACTICS),
          sink: (r, entryT, exitT) => collect(false, r, entryT, exitT),
        });
        if (sim.open)
          collect(true, sim.open.mtm, sim.open.entryT, k.b.t[k.b.n - 1] + k.b.tfMin * 60_000);
      }
      k.clear();
    }
    for (const cell of group) {
      const sample = samples.get(cell.id);
      rows.push({
        ...cell,
        ...pairSummary(sample.stats),
        sampleSha256: sample.hash.digest("hex"),
        ...(phase === "OOS" ? { isQualified: qualifiedIds.has(cell.id) } : {}),
      });
    }
    onProgress(`${phase} ${++done}/${groups.size}: ${ind}`);
  }
  return {
    rows,
    ...(cohorts
      ? {
          cohorts: Object.fromEntries(
            Object.entries(cohorts).map(([key, c]) => [key, finishCohort(c)]),
          ),
        }
      : {}),
  };
}

export function runIS(
  prefix,
  protocol,
  { cells = researchCells(protocol), onProgress = () => {} } = {},
) {
  return evaluate(prefix, protocol, cells, { phase: "IS", onProgress });
}

/** The only selection phase receives new arrays containing only the IS prefix; OOS starts from fresh flat slots. */
export function runResearch(
  market,
  protocol,
  { cells = researchCells(protocol), onProgress = () => {}, onFreeze = () => {} } = {},
) {
  const data = validateProtocolMarket(market, protocol);
  const prefix = Object.fromEntries(
    data.symbols.map((sym) => [
      sym,
      market[sym].filter((c) => c.t + 60_000 <= protocol.data.splitT),
    ]),
  );
  const is = runIS(prefix, protocol, { cells, onProgress });
  const selection = freezeIS(is.rows, protocol);
  onFreeze(selection); // CLI persists this artifact before any full-data OOS indication is calculated.
  const oos = evaluate(market, protocol, cells, {
    phase: "OOS",
    qualifiedIds: new Set(selection.qualifiedIds),
    onProgress,
  });
  return {
    schema: "cts-signal-research-v1",
    protocol,
    data,
    method: {
      source: "entrySignal(follow, fullind, DEFAULT_TACTICS)",
      tactics: DEFAULT_TACTICS,
      cooldownBars: tacticCooldown(DEFAULT_TACTICS),
      grid: "signalProtects(DEFAULT_SIGNALS pct) +laneProtect +adjustProtect(default Signal floors); dedup effective IDs",
      requestedConfigSideCells: cells.reduce((n, c) => n + c.requestedAliases.length, 0),
      effectiveConfigSideCells: cells.length,
      signalEntryFilter: protocol.preOutcomeModelClarification?.signalFilter,
      isSourceCandles: Object.values(prefix).reduce((n, cs) => n + cs.length, 0),
      freshOosPositions: true,
      entryBoundary: "next-open>=phase boundary; warmup excluded from trade samples",
      endpointMarks: "separate final-completed-close marks, with full modeled roundtrip cost",
      hashOrder:
        "group, lexicographically sorted symbols, simulator close order, then each symbol's endpoint mark",
      scope:
        "Retrospective chronological holdout; overlapping independent config copies, no account coordination, no live execution claim",
    },
    selection,
    is: is.rows,
    oos: oos.rows,
    cohorts: oos.cohorts,
  };
}

async function sourceEvidence(protocolPath) {
  const files = [];
  async function walk(dir) {
    for (const item of (await readdir(dir, { withFileTypes: true })).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const path = resolve(dir, item.name);
      if (item.isDirectory()) await walk(path);
      else if (item.name.endsWith(".ts") && !item.name.endsWith(".test.ts")) files.push(path);
    }
  }
  await walk(resolve(root, "src/core"));
  files.push(
    fileURLToPath(import.meta.url),
    resolve(root, "scripts/core-tactic-research.mjs"),
    protocolPath,
  );
  const sourceFiles = [];
  for (const path of files.sort())
    sourceFiles.push([relative(root, path), sha256(await readFile(path))]);
  return { sourceSha256: sha256(JSON.stringify(sourceFiles)), sourceFiles };
}

export function renderMarkdown(report, reportHash) {
  const row = (name, x) =>
    `| ${name} | ${x.closed.n} | ${x.closed.pf.toFixed(4)}${x.closed.noLoss ? "*" : ""} | ${x.closed.netReturnPoints.toFixed(3)} | ${x.openAtEnd} | ${x.withEndpointMarks.pf.toFixed(4)}${x.withEndpointMarks.noLoss ? "*" : ""} |`;
  return `# Four-source Signal chronological research\n\nRetrospective offline simulation on a cache previously used for Tactic research. This is not untouched global evidence, account ROI or live execution PF. Sources remain default-disabled; no promotion or retuning.\n\n${report.protocol.data.symbols.join(", ")}; ${new Date(report.data.startT).toISOString()} to ${new Date(report.data.endT).toISOString()} exclusive. Seven warmup days, 53 IS days, 30 OOS days; split ${new Date(report.selection.splitT).toISOString()}. The 39 requested protection cells per source/range/lane produce ${report.method.requestedConfigSideCells} config-side requests and ${report.method.effectiveConfigSideCells} distinct effective rows under the frozen protocol's lane-scaling and stop-floor policy. Requested-to-effective aliases are retained and duplicates simulated once. Actual reference, lane-scaled and effective protects are retained per row.\n\n**Runtime update (17 October 2026):** the current tape builder disables a trail if lane scaling puts it below the 0.5% Signal minimum; it no longer widens such a trail. That later rule excludes 64 configs (128 direction rows) from this frozen protocol grid, so these retrospective results describe the pinned study policy, not the current active Signal grid.\n\nIS data is physically truncated before calculation and performance entries begin after warmup. Every qualifying config-side freezes before any OOS calculation. ${report.selection.qualifiedIds.length} qualified using at least 30 settled closes, PF >= 1.1 and positive net, with endpoint-marked PF >= 1.1 and positive net. OOS uses fresh positions and pre-context; no selection uses OOS results. All unqualified configurations remain in separate diagnostics.\n\nDefault entry filters and cooldown, including the Signal ATR/price floor of 0.003, are used. Every return deducts 0.2% roundtrip modeled cost; funding, additional slippage, account budgets and actual fills are not modeled. Runtime activation, acceptance and feedback adjustment are outside this independent research scope. All PF/gross sums use independent unit net returns. No-loss PF uses score ${PF_NO_LOSS}, marked *; exactRatio is null. Endpoint open marks use the final completed lane close and its actual timestamp, separately from settled closes. Pools contain overlapping independent configuration copies and cannot be interpreted as a capital-constrained portfolio.\n\n| OOS cohort | Settled closes | Return PF | Net return points | Endpoint opens | PF including marks |\n|---|---:|---:|---:|---:|---:|\n${row("All configs (diagnostic)", report.cohorts.allConfigsDiagnostic)}\n${row("Entire IS-qualified pool", report.cohorts.isQualifiedPool)}\n${row("IS-unqualified configs (diagnostic)", report.cohorts.isUnqualifiedDiagnostic)}\n\nJSON retains every IS/OOS config-side row, actual protects, gross return sums, no-loss convention, sample bounds/hashes and cohort source/range/lane/type/side/symbol/hour/day breakdowns. Empty and losing rows are preserved. Return points are sums of trade percentages, not account profit.\n\nProtocol SHA256: ${report.evidence.protocolSha256}. Cache SHA256: ${report.evidence.cacheSha256}. Source SHA256: ${report.evidence.sourceSha256}. Frozen selection SHA256: ${report.selection.selectionSha256}. Report SHA256: ${reportHash}.\n`;
}

async function main() {
  const start = performance.now();
  const options = {};
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 2) {
    if (!["--protocol", "--out", "--selection-out", "--markdown"].includes(args[i]) || !args[i + 1])
      throw new Error(
        "Usage: --out path [--protocol path] [--selection-out path] [--markdown path]",
      );
    options[args[i].slice(2)] = args[i + 1];
  }
  if (!options.out) throw new Error("--out is required");
  const protocolPath = resolve(options.protocol ?? "docs/signal-research-protocol-20261015.json");
  const protocolBytes = await readFile(protocolPath);
  const protocol = JSON.parse(protocolBytes);
  const cells = researchCells(protocol);
  const sources = await sourceEvidence(protocolPath);
  let raw = await readFile(resolve(protocol.data.cache));
  const cacheSha256 = sha256(raw);
  if (cacheSha256 !== protocol.data.sha256)
    throw new Error("Market cache SHA256 differs from frozen protocol");
  const cacheBytes = raw.length;
  const market = JSON.parse(raw);
  raw = null;
  const selectionPath = resolve(options["selection-out"] ?? `${options.out}.selection.json`);
  const report = runResearch(market, protocol, {
    cells,
    onProgress: (message) => process.stderr.write(`${message}\n`),
    onFreeze: (selection) => {
      mkdirSync(dirname(selectionPath), { recursive: true });
      writeFileSync(
        selectionPath,
        `${JSON.stringify({ protocolSha256: sha256(protocolBytes), ...sources, ...selection }, null, 2)}\n`,
      );
    },
  });
  if ((await sourceEvidence(protocolPath)).sourceSha256 !== sources.sourceSha256)
    throw new Error("Source/protocol changed during research");
  report.evidence = { protocolSha256: sha256(protocolBytes), cacheSha256, cacheBytes, ...sources };
  const json = `${JSON.stringify(report, null, 2)}\n`;
  const reportHash = sha256(json);
  await mkdir(dirname(resolve(options.out)), { recursive: true });
  await writeFile(resolve(options.out), json);
  if (options.markdown) {
    await mkdir(dirname(resolve(options.markdown)), { recursive: true });
    await writeFile(resolve(options.markdown), renderMarkdown(report, reportHash));
  }
  process.stdout.write(
    `${JSON.stringify({
      reportSha256: reportHash,
      selectionSha256: report.selection.selectionSha256,
      rows: report.is.length,
      qualified: report.selection.qualifiedIds.length,
      isQualifiedOos: report.cohorts.isQualifiedPool.closed,
      allDiagnosticOos: report.cohorts.allConfigsDiagnostic.closed,
    })}\n`,
  );
  process.stderr.write(
    `${JSON.stringify({ wallSeconds: (performance.now() - start) / 1000, maxRssKiB: process.resourceUsage().maxRSS })}\n`,
  );
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch((error) => {
    process.stderr.write(`${error.stack}\n`);
    process.exitCode = 1;
  });
