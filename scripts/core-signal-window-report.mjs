#!/usr/bin/env node
// Local-only exports of one frozen Signals replay. Does not acquire data or run strategies.
// node --experimental-strip-types scripts/core-signal-window-report.mjs \
//   --raw runs/.../raw.json --book runs/.../session/data.json \
//   --protocol runs/.../protocol.json --out /absolute/deliverables
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  signalWindowReport,
  signalWindowMarkdown,
  signalRowsCsv,
  SIGNAL_REPORT_TYPES,
  SIGNAL_REPORT_LABELS,
} from "./lib/signal-window-report.mjs";
import {
  addReturnEvidence,
  finishReturnEvidence,
  returnBucket,
  mergeReturnEvidence,
  returnEvidenceText,
} from "./lib/return-evidence.mjs";
import { profitFactor } from "../src/core/metrics/stats.ts";
import { readSessionDump } from "./lib/session-dump.mjs";

const H = 3_600_000;
const primitive = (value) =>
  value === null || ["string", "number", "boolean"].includes(typeof value);
export function flatRow(row) {
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === undefined) out[key] = null;
    else if (primitive(value)) out[key] = value;
    else out[key] = JSON.stringify(value);
  }
  return out;
}
export function hourlyTypeRows(report) {
  return report.hours.flatMap((hour) =>
    SIGNAL_REPORT_TYPES.map((kind) => {
      const cells = report.hourlyCells.filter((cell) => cell.t === hour.t && cell.kind === kind);
      const total = mergeReturnEvidence(cells);
      const cashAvailable = !total.unknownSizedPnl;
      const cashGp = cashAvailable ? cells.reduce((n, row) => n + (row.cashGp ?? 0), 0) : null;
      const cashGl = cashAvailable ? cells.reduce((n, row) => n + (row.cashGl ?? 0), 0) : null;
      return {
        t: hour.t,
        endT: hour.t + H,
        utcStart: new Date(hour.t).toISOString(),
        viennaStart: new Date(hour.t + 2 * H).toISOString().replace("Z", "+02:00"),
        kind,
        label: SIGNAL_REPORT_LABELS[kind],
        ...total,
        returnPfLabel: returnEvidenceText(total),
        ownedCloses: cells.reduce((n, row) => n + (row.ownedCloses ?? 0), 0),
        unknownAllocations: cells.reduce((n, row) => n + (row.unknownAllocations ?? 0), 0),
        zeroAllocations: cells.reduce((n, row) => n + (row.zeroAllocations ?? 0), 0),
        ...((report.flows ?? report.funded?.flows ?? []).find(
          (flow) => flow.t === hour.t && flow.kind === kind,
        ) ?? {}),
        cashGp,
        cashGl,
        cashPfDiagnostic: total.n && cashAvailable ? profitFactor(cashGp, cashGl) : null,
        cashNoLoss: total.n > 0 && cashAvailable && cashGp > 0 && cashGl === 0,
        long: cells.filter((cell) => cell.side === "long").reduce((n, cell) => n + cell.n, 0),
        short: cells.filter((cell) => cell.side === "short").reduce((n, cell) => n + cell.n, 0),
      };
    }),
  );
}
export function sourceDetailRows(report) {
  const groups = new Map();
  const key = (x) => `${x.source}|${x.kind}|${x.range}|${x.lane}|${x.side}`;
  for (const source of report.protocol.enabledSources)
    for (const kind of SIGNAL_REPORT_TYPES)
      for (const range of ["short", "medium"])
        for (const lane of report.protocol.settings.signals.lanes)
          for (const side of ["long", "short"]) {
            const row = { source, kind, range, lane, side, ...returnBucket() };
            groups.set(key(row), row);
          }
  for (const trade of report.trades) {
    const row = groups.get(key(trade));
    if (!row) throw new Error("Primary trade source is outside the frozen configured catalog");
    addReturnEvidence(row, trade.unitR, trade.sizedPnl);
    row.ownedCloses = (row.ownedCloses ?? 0) + Number(trade.allocationStatus === "positive");
    row.unknownAllocations =
      (row.unknownAllocations ?? 0) + Number(trade.allocationStatus === "unknown");
  }
  return [...groups.values()].map((row) => ({ ...row, ...finishReturnEvidence(row) }));
}
function csv(rows, preferredKeys = []) {
  const flat = rows.map(flatRow);
  const keys = [...new Set([...preferredKeys, ...flat.flatMap((row) => Object.keys(row))])];
  return signalRowsCsv(flat, keys);
}
function parameters(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, "");
    if (
      !["raw", "book", "protocol", "out"].includes(key) ||
      !argv[i + 1] ||
      argv[i + 1].startsWith("--")
    )
      throw new Error("Expected --raw FILE --book FILE --protocol FILE --out DIRECTORY");
    if (result[key]) throw new Error(`Duplicate --${key}`);
    result[key] = resolve(argv[i + 1]);
  }
  if (["raw", "book", "protocol", "out"].some((key) => !result[key]))
    throw new Error("Required: --raw FILE --book FILE --protocol FILE --out DIRECTORY");
  return result;
}
export async function main(argv = process.argv.slice(2)) {
  const args = parameters(argv);
  const input = {};
  for (const key of ["raw", "book", "protocol"]) {
    const physicalHash = createHash("sha256");
    let physicalBytes = 0;
    for await (const chunk of createReadStream(args[key])) { physicalHash.update(chunk); physicalBytes += chunk.length; }
    input[key] = {
      data: key === "protocol" ? JSON.parse(await readFile(args[key], "utf8")) : await readSessionDump(args[key],
        key === "raw" ? { loadTapeTrades: false, loadValidation: false, verifyUnloaded: true } : {}),
      sha256: physicalHash.digest("hex"),
      bytes: physicalBytes,
    };
  }
  const report = signalWindowReport(input.raw.data, input.book.data, input.protocol.data);
  if (report.primarySample !== "funded-positive-notional")
    throw new Error("Primary funded allocation evidence is required");
  report.hourlyTypes = hourlyTypeRows(report);
  report.plannedHourlyTypes = hourlyTypeRows(report.planned ?? report);
  report.sourceDetails = sourceDetailRows(report);
  report.wholeSystemSizedOrders = input.book.data.sizedOrders ?? [];
  if (report.requestedConfigurations?.length) {
    const effective = new Set(report.configurations.map((row) => row.cfg));
    for (const requested of report.requestedConfigurations)
      if (!effective.has(requested.effectiveId))
        throw new Error("Requested protection cell is missing its effective identity");
    const aliases = report.configurations
      .filter((row) => row.side === "long" && row.origin === "configured")
      .reduce((n, row) => n + row.requestedCellCount, 0);
    if (aliases !== report.requestedConfigurations.length)
      throw new Error("Requested-to-effective cell aliases do not reconcile");
  }
  report.provenance = Object.fromEntries(
    Object.entries(input).map(([key, source]) => [
      key,
      { sha256: source.sha256, bytes: source.bytes },
    ]),
  );
  report.generatedAt = new Date().toISOString();
  const configTotal = report.configurations.reduce((n, row) => n + row.executedCloses, 0);
  if (
    configTotal !== (report.planned ?? report).total.n ||
    report.hourlyTypes.reduce((n, row) => n + row.n, 0) !== report.total.n
  )
    throw new Error("Configuration-side or hourly-type settled totals do not reconcile");
  const files = {
    "signals-six-hour-summary.json": JSON.stringify(report, null, 2) + "\n",
    "signals-six-hour-report.md": signalWindowMarkdown(report),
    "signals-hourly-types.csv": csv(report.hourlyTypes),
    "signals-planned-hourly-types-diagnostic.csv": csv(report.plannedHourlyTypes),
    "signals-hourly-account-book.csv": csv(report.hours),
    "signals-planned-hourly-flows-diagnostic.csv": csv(report.planned?.flows ?? []),
    "signals-funded-open-endpoint-marks.csv": csv(report.funded?.endpointTrades ?? [], [
      "kind",
      "source",
      "range",
      "lane",
      "side",
      "sym",
      "entryT",
      "unitR",
      "allocationStatus",
      "unitNotional",
      "sizedPnl",
      "cfg",
    ]),
    "signals-planned-open-endpoint-marks-diagnostic.csv": csv(
      report.planned?.endpointTrades ?? [],
      [
        "kind",
        "source",
        "range",
        "lane",
        "side",
        "sym",
        "entryT",
        "unitR",
        "allocationStatus",
        "unitNotional",
        "sizedPnl",
        "cfg",
      ],
    ),
    "signals-type-range-lane-side.csv": csv(report.cells),
    "signals-source-range-lane-side.csv": csv(report.sourceDetails),
    "signals-planned-type-range-lane-side-diagnostic.csv": csv((report.planned ?? report).cells),
    "signals-planned-trades-diagnostic.csv": csv((report.planned ?? report).trades),
    "signals-hourly-type-range-lane-side.csv": csv(report.hourlyCells),
    "signals-all-configurations.csv": csv(report.configurations),
    "signals-requested-to-effective-configurations.csv": csv(report.requestedConfigurations ?? [], [
      "requestedId",
      "effectiveId",
      "kind",
      "source",
      "range",
      "lane",
      "requestedProtect",
      "effectiveProtect",
    ]),
    "signals-settled-trades.csv": csv(report.trades, [
      "kind",
      "source",
      "range",
      "lane",
      "side",
      "cfg",
      "sym",
      "entryT",
      "exitT",
      "unitR",
      "sizedReturn",
      "externalMult",
      "reason",
      "entry",
      "exit",
      "tp",
      "sl",
      "trail",
      "trailStep",
      "holdBars",
    ]),
    "signals-stage-progress.csv": csv(report.progress),
    "whole-system-book-allocations.csv": csv(report.wholeSystemSizedOrders, [
      "key",
      "cfg",
      "sym",
      "side",
      "entryT",
      "exitT",
      "unitR",
      "sizedReturn",
      "volume",
      "unitNotional",
      "sizedPnl",
    ]),
    "signals-base-pair-diagnostics.csv": csv(report.basePairs ?? []),
    "signals-source-catalog.csv": csv([
      ...report.protocol.enabledSources.map((source) => ({ source, enabled: true })),
      ...report.protocol.disabledSources.map((source) => ({ source, enabled: false })),
    ]),
    "signals-frozen-protocol.json": JSON.stringify(input.protocol.data, null, 2) + "\n",
  };
  await mkdir(args.out, { recursive: true });
  for (const [filename, content] of Object.entries(files))
    await writeFile(join(args.out, filename), content);
  const summary = {
    out: args.out,
    files: Object.keys(files),
    closes: report.total.n,
    returnPf: returnEvidenceText(report.total),
    long: report.coverage.longCloses,
    short: report.coverage.shortCloses,
    configsSides: report.configurations.length,
    hourlyTypeRows: report.hourlyTypes.length,
    hourlyDetailRows: report.hourlyCells.length,
    inputHashes: report.provenance,
  };
  console.log(JSON.stringify(summary, null, 2));
  return report;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
