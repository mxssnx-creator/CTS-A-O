#!/usr/bin/env node
// Artifact-tool workbook export. Copy this builder into a private OS tmp directory,
// link its node_modules to CODEX_PRIMARY_RUNTIME_NODE_MODULES, and execute with
// CODEX_PRIMARY_RUNTIME_NODE. Input is the JSON from core-signal-window-report.mjs.
// Usage: node builder.mjs /absolute/signals-six-hour-summary.json /absolute/output
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { Workbook, SpreadsheetFile } from "@oai/artifact-tool";

const [inputPath, outputPath] = process.argv.slice(2);
const verifyOnly = process.argv.includes("--verify-only");
const researchPath = process.argv[4] && !process.argv[4].startsWith("--") ? process.argv[4] : null;
const research = researchPath ? JSON.parse(await fs.readFile(researchPath, "utf8")) : null;
if (!inputPath || !outputPath) throw new Error("Expected SUMMARY_JSON OUTPUT_DIRECTORY");
const report = JSON.parse(await fs.readFile(inputPath, "utf8"));
assert.equal(report.schema, "cts-signal-six-hour-report-v2");
assert.equal(report.primarySample, "funded-positive-notional");
const planned = report.planned;
const out = path.resolve(outputPath);
await fs.mkdir(out, { recursive: true });
const wb = Workbook.create();
const sheets = Object.fromEntries(
  [
    "Summary",
    "Hourly types",
    "Ranges",
    "Hourly detail",
    "Configurations",
    "Trades",
    "Open marks",
    "Progress",
    "Source detail",
    "Sources",
    "Audit",
  ].map((name) => [name, wb.worksheets.add(name)]),
);
if (research) sheets.Research = wb.worksheets.add("Research");
const navy = "#243B53",
  red = "#A61B1B",
  border = "#B9C6D2";
const H = 3_600_000;
// Keep timestamps literal: the artifact Date-cell conversion loses 05:00 in
// some batches. Explicit ISO text preserves the frozen study's exact hours.
const hourText = (t) => new Date(t).toISOString().slice(0, 16).replace("T", " ");
const timestampText = (t) => new Date(t).toISOString();
const fmtN = "#,##0",
  fmtPf = '0.00;[Red](0.00);"0.00"';
const fmtPct = '0.00%;[Red](0.00%);"0.00%"';
const fmtCash = '#,##0.00;[Red](#,##0.00);"0.00"';
const label = (row) =>
  row.unknownReturns
    ? "Unit basis unavailable"
    : !row.n
      ? "No settled closes"
      : row.noLoss
        ? "No losses"
        : row.pf;
const cashLabel = (row) =>
  !row.n
    ? "No settled closes"
    : row.unknownSizedPnl
      ? "Allocation unavailable"
      : row.cashNoLoss
        ? "No losses"
        : row.cashPfDiagnostic;
function col(index) {
  let s = "";
  for (let i = index + 1; i; i = Math.floor((i - 1) / 26))
    s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
  return s;
}
function rect(sheet, row, values) {
  if (!values.length) return;
  sheet.getRange(`A${row}:${col(values[0].length - 1)}${row + values.length - 1}`).values = values;
}
function base(sheet, title, lastCol, lastRow) {
  sheet.showGridLines = false;
  const range = sheet.getRange(`A1:${lastCol}${Math.max(8, lastRow)}`);
  range.format.font = { name: "Arial", size: 10, color: "#1F2933" };
  range.format.verticalAlignment = "center";
  range.format.rowHeight = 19;
  range.format.columnWidth = 15;
  sheet.getRange("A2").values = [[title]];
  sheet.getRange(`A2:${lastCol}2`).format.font = {
    name: "Arial",
    size: 14,
    bold: true,
    color: navy,
  };
  sheet.getRange(`A3:${lastCol}3`).format.borders = { bottom: { style: "thin", color: border } };
  sheet.getRange("A:A").format.columnWidth = 24;
}
function header(sheet, row, headers) {
  rect(sheet, row, [headers]);
  sheet.getRange(`A${row}:${col(headers.length - 1)}${row}`).format = {
    fill: navy,
    font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    rowHeight: 30,
    wrapText: true,
    borders: { insideVertical: { style: "thin", color: "#FFFFFF" } },
  };
}
function tableSheet(name, title, headers, rows, options = {}) {
  const sheet = sheets[name];
  base(sheet, title, col(headers.length - 1), rows.length + 5 + (options.tailRows ?? 0));
  header(sheet, 4, headers);
  if (rows.length) rect(sheet, 5, rows);
  else sheet.getRange("A5").values = [["No settled executions in the frozen window"]];
  if (rows.length) {
    sheet.tables.add(
      `A4:${col(headers.length - 1)}${rows.length + 4}`,
      true,
      name.replace(/[^A-Za-z]/g, "") + "Table",
    );
  }
  sheet.freezePanes.freezeRows(4);
  if (options.freeze) sheet.freezePanes.freezeColumns(options.freeze);
  for (const [i, width] of Object.entries(options.widths ?? {}))
    sheet.getRange(`${col(+i)}:${col(+i)}`).format.columnWidth = width;
  for (const [i, format] of Object.entries(options.formats ?? {}))
    if (rows.length)
      sheet.getRange(`${col(+i)}5:${col(+i)}${rows.length + 4}`).setNumberFormat(format);
  return sheet;
}
function pfFormula(row, n, unknown, gp, gl) {
  return `=IF(${n}${row}=0,"No settled closes",IF(${unknown}${row}>0,"Unit basis unavailable",IF(${gl}${row}=0,IF(${gp}${row}>0,"No losses",0),${gp}${row}/${gl}${row})))`;
}
function applyPfFormula(sheet, start, count, pfColumn, n, unknown, gp, gl) {
  if (!count) return;
  const formulas = Array.from({ length: count }, (_, i) => [
    pfFormula(start + i, n, unknown, gp, gl),
  ]);
  sheet.getRange(`${pfColumn}${start}:${pfColumn}${start + count - 1}`).formulas = formulas;
  sheet.getRange(`${pfColumn}${start}:${pfColumn}${start + count - 1}`).setNumberFormat(fmtPf);
  sheet.getRange(`${pfColumn}${start}:${pfColumn}${start + count - 1}`).format.horizontalAlignment =
    "right";
}
function hasNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function phasePf(row, key) {
  const phase = row[key];
  if (phase && typeof phase === "object") return label(phase);
  const prefix = {
    pre: "pre",
    executed: "executed",
    runCandidates: "candidate",
    unitActiveCandidates: "active",
  }[key];
  if (prefix && row[`${prefix}N`] !== undefined)
    return label({
      n: row[`${prefix}N`],
      pf: row[`${prefix}Pf`],
      noLoss: row[`${prefix}NoLoss`],
      unknownReturns: row[`${prefix}UnknownReturns`],
    });
  if (key === "pre")
    return row.preUnknownReturns
      ? "Unit basis unavailable"
      : !row.preCloses
        ? "No settled closes"
        : row.preNoLoss
          ? "No losses"
          : row.prePf;
  if (key === "executed")
    return row.unknownReturns
      ? "Unit basis unavailable"
      : !row.executedCloses
        ? "No settled closes"
        : row.noLoss
          ? "No losses"
          : row.returnPf;
  return "Evidence not exported";
}

// Output: primary return evidence and a separate, explicitly modeled cash book.
const summary = sheets.Summary;
summary.tabColor = navy;
base(summary, "CTS-A-O Signals: six-hour trading simulation", "O", 46);
summary.getRange("A4").values = [["Trade window UTC"]];
summary.getRange("C4").values = [[report.protocol.windows.utc.trade.join(" to ")]];
summary.getRange("A5").values = [["Prehistory UTC"]];
summary.getRange("C5").values = [[report.protocol.windows.utc.pre.join(" to ")]];
summary.getRange("A6").values = [["Evidence"]];
summary.getRange("C6").values = [["Offline real-market simulation; no live exchange fills"]];
header(summary, 8, [
  "Strategy",
  "Funded sample closes",
  "Long",
  "Short",
  "Wins",
  "Non-wins",
  "Positive unit returns",
  "Negative unit returns",
  "Unknown unit returns",
  "Return PF",
  "Signal net USD",
  "Signal cash PF diagnostic",
]);
const typeRows = report.types.map((x) => [
  x.label,
  x.n,
  x.long,
  x.short,
  x.w,
  x.n - x.w - x.unknownReturns,
  x.gp,
  x.gl,
  x.unknownReturns,
  null,
  x.usd,
  cashLabel(x),
]);
rect(summary, 9, typeRows);
applyPfFormula(summary, 9, typeRows.length, "J", "B", "I", "G", "H");
summary.getRange("A12").values = [["All funded Signal close slices"]];
summary.getRange("B12:I12").formulas = [
  [...Array.from({ length: 8 }, (_, i) => `=SUM(${col(i + 1)}9:${col(i + 1)}11)`)],
];
summary.getRange("G12:H12").formulas = [
  ['=IF(I12>0,"Unavailable",SUM(G9:G11))', '=IF(I12>0,"Unavailable",SUM(H9:H11))'],
];
applyPfFormula(summary, 12, 1, "J", "B", "I", "G", "H");
summary.getRange("K12").values = [[report.total.usd]];
summary.getRange("L12").values = [[cashLabel(report.total)]];
summary.getRange("A12:J12").format.font = { bold: true };
summary.getRange("A12:J12").format.borders = { top: { style: "thin", color: border } };
summary.getRange("G9:H12").setNumberFormat(fmtPct);
summary.getRange("B9:F12").setNumberFormat(fmtN);
summary.getRange("I9:I12").setNumberFormat(fmtN);
summary.getRange("K9:K12").setNumberFormat(fmtCash);
summary.getRange("L9:L12").setNumberFormat(fmtPf);
header(summary, 15, [
  "Hour starts UTC",
  "Hour starts Vienna",
  "Funded sample closes",
  "Long",
  "Short",
  "Return PF",
  "Whole-system net USD",
  "Whole-system balance USD",
  "Whole-system equity USD",
  "Whole-system max DD",
  "Signal net USD",
  "Signal cash PF diagnostic",
  "Funded entry orders",
  "Funded orders open at end",
  "Funded positions open at end",
]);
const hourRows = report.hours.map((x) => {
  const detail = report.hourlyTypes.filter((t) => t.t === x.t);
  return [
    hourText(x.t),
    hourText(x.t + 2 * H),
    x.n,
    detail.reduce((n, r) => n + r.long, 0),
    detail.reduce((n, r) => n + r.short, 0),
    label(x),
    hasNumber(x.bookNet),
    hasNumber(x.bookBalance),
    hasNumber(x.bookEquity),
    hasNumber(x.bookDrawdownPct),
    x.usd,
    cashLabel(x),
    x.entryOrders ?? null,
    x.openOrdersEnd ?? null,
    x.openPositionsEnd ?? null,
  ];
});
rect(summary, 16, hourRows);
assert.deepEqual(
  summary.getRange("A16:B21").values,
  hourRows.map((row) => row.slice(0, 2)),
  "All UTC and Vienna hourly labels must survive workbook assignment exactly",
);
summary.getRange("A16:B21").setNumberFormat("dd-mmm hh:mm");
summary.getRange("C16:E21").setNumberFormat(fmtN);
summary.getRange("F16:F21").setNumberFormat(fmtPf);
summary.getRange("G16:I21").setNumberFormat(fmtCash);
summary.getRange("J16:J21").setNumberFormat(fmtPct);
summary.getRange("K16:K21").setNumberFormat(fmtCash);
summary.getRange("L16:L21").setNumberFormat(fmtPf);
summary.getRange("A23").values = [["Quantity precision"]];
summary.getRange("C23").values = [
  [
    `Total allocated notional <= ${report.ownershipPrecision?.epsilonUsd ?? "unknown"} USD is numerical zero before cash/book updates; raw allocations are retained.`,
  ],
];
summary.getRange("A24").values = [["PF basis"]];
summary.getRange("C24").values = [
  [
    "Positive-notional modeled owned close slices; unit net returns after costs, external sizing removed; unknown allocations retain rows and invalidate PF",
  ],
];
summary.getRange("A25").values = [["Empty/no-loss convention"]];
summary.getRange("C25").values = [
  ["No closes = unavailable; no losses = labeled, never shown as an exact finite PF"],
];
summary.getRange("A26").values = [["Endpoint marks"]];
summary.getRange("C26").values = [
  [
    `${report.endpointMarks.n} funded/unknown open marks; ${planned.endpointMarks.n} planned open marks; all excluded from settled PF`,
  ],
];
summary.getRange("A27").values = [["Direction coverage"]];
summary.getRange("C27").values = [
  [
    `${report.coverage.longCloses} long / ${report.coverage.shortCloses} short settled closes; ${report.coverage.inactiveCells}/${report.coverage.cells} aggregate cells had zero closes`,
  ],
];
summary.getRange("A28").values = [["Configured sources"]];
summary.getRange("C28").values = [
  [
    `${report.protocol.enabledSources.length} enabled; ${report.protocol.disabledSources.length} disabled; independent 1/5/15/30-minute lanes`,
  ],
];
summary.getRange("A29").values = [["Qualification"]];
summary.getRange("C29").values = [
  [
    "Existing gates retained, including PF 1.3 and sample minimums; six hours do not create 24/48-hour history",
  ],
];
summary.getRange("A30").values = [["Base stage"]];
summary.getRange("C30").values = [
  [
    "Signal baseGate=false retained; built/calculated/candidate cells are not proof of full Base or execution qualification",
  ],
];
summary.getRange("A31").values = [["Combined lanes"]];
summary.getRange("C31").values = [[report.protocol.combinedLanes]];
summary.getRange("A32").values = [["Session checks"]];
summary.getRange("C32").values = [
  [
    report.sessionChecksOk === true
      ? "Passed all captured session checks"
      : `${(report.failedSessionChecks ?? []).length} captured checks not met; full details on Progress`,
  ],
];
if (report.sessionChecksOk !== true)
  summary.getRange("C32").format.font = { bold: true, color: red };
summary.getRange("A33").values = [["Cash/equity sample"]];
summary.getRange("C33").values = [
  [
    "Whole-system modeled book may include engine trades; the unit-return PF and counts shown here include Signals only",
  ],
];
summary.getRange("A34:F35").values = [
  [
    "Engine support closes",
    report.engineExecutions?.n ?? 0,
    "Engine return PF",
    report.engineExecutions ? label(report.engineExecutions) : "Unavailable",
    "Engine cash PF diagnostic",
    report.engineExecutions ? cashLabel(report.engineExecutions) : "Unavailable",
  ],
  [
    "Engine modeled P&L USD",
    report.engineExecutions?.usd ?? null,
    "Book scope",
    report.bookScope ?? "Unavailable",
    null,
    null,
  ],
];
summary.getRange("B34").setNumberFormat(fmtN);
summary.getRange("D34").setNumberFormat(fmtPf);
summary.getRange("F34").setNumberFormat(fmtPf);
summary.getRange("B35").setNumberFormat(fmtCash);
summary.getRange("A36").values = [["Open Signal evidence"]];
summary.getRange("C36").values = [
  [
    "Open marks are a separate unsettled sample. Planned marks and observed allocation status are listed on Open marks.",
  ],
];
header(summary, 38, [
  "Planned virtual diagnostic",
  "Planned closes",
  "Planned return PF",
  "Known positive allocations",
  "Zero allocations",
  "Unknown allocations",
]);
rect(
  summary,
  39,
  planned.types.map((x) => [
    x.label,
    x.n,
    label(x),
    x.ownedCloses,
    x.zeroAllocations,
    x.unknownAllocations,
  ]),
);
summary.getRange("C39:C41").setNumberFormat(fmtPf);
summary.getRange("A43").values = [["Planned engine diagnostic"]];
summary.getRange("B43:F43").values = [
  [
    planned.engineExecutions.n,
    label(planned.engineExecutions),
    planned.engineExecutions.ownedCloses,
    planned.engineExecutions.zeroAllocations,
    planned.engineExecutions.unknownAllocations,
  ],
];
summary.getRange("C43").setNumberFormat(fmtPf);
summary.getRange("A:A").format.columnWidth = 54;
summary.getRange("B:B").format.columnWidth = 23;
summary.getRange("C:E").format.columnWidth = 16;
summary.getRange("F:F").format.columnWidth = 24;
summary.getRange("G:J").format.columnWidth = 20;
summary.getRange("K:L").format.columnWidth = 24;
summary.getRange("M:O").format.columnWidth = 24;
summary.getRange("C24:L33").format.wrapText = false;

const metricsHeaders = [
  "UTC hour starts",
  "Vienna hour starts",
  "Strategy",
  "Funded sample closes",
  "Long",
  "Short",
  "Wins",
  "Unknown returns",
  "Positive unit returns",
  "Negative unit returns",
  "Return PF",
  "Signal net USD",
  "Signal cash PF diagnostic",
  "Planned virtual closes",
  "Planned return PF diagnostic",
  "Zero allocations",
  "Funded entries",
  "Long entries",
  "Short entries",
  "Orders open at end",
  "Positions open at end",
  "Unknown open quantities",
];
const hourlyTypes = tableSheet(
  "Hourly types",
  "Hourly settled executions by trade type",
  metricsHeaders,
  report.hourlyTypes.map((x) => [
    hourText(x.t),
    hourText(x.t + 2 * H),
    x.label,
    x.n,
    x.long,
    x.short,
    x.w,
    x.unknownReturns,
    x.gp,
    x.gl,
    null,
    x.usd,
    cashLabel(x),
    report.plannedHourlyTypes.find((p) => p.t === x.t && p.kind === x.kind)?.n ?? null,
    label(report.plannedHourlyTypes.find((p) => p.t === x.t && p.kind === x.kind)),
    report.plannedHourlyTypes.find((p) => p.t === x.t && p.kind === x.kind)?.zeroAllocations ??
      null,
    x.entryOrders ?? null,
    x.longEntryOrders ?? null,
    x.shortEntryOrders ?? null,
    x.openOrdersEnd ?? null,
    x.openPositionsEnd ?? null,
    x.unknownOpenOrdersEnd ?? null,
  ]),
  {
    widths: { 0: 23, 1: 23, 2: 54, 10: 24, 11: 22, 12: 26, 13: 24, 14: 26, 15: 22 },
    formats: {
      0: "dd-mmm hh:mm",
      1: "dd-mmm hh:mm",
      3: fmtN,
      4: fmtN,
      5: fmtN,
      6: fmtN,
      7: fmtN,
      8: fmtPct,
      9: fmtPct,
      11: fmtCash,
      12: fmtPf,
      14: fmtPf,
    },
  },
);
applyPfFormula(hourlyTypes, 5, report.hourlyTypes.length, "K", "D", "H", "I", "J");
const rangeHeaders = [
  "Strategy",
  "Source range",
  "Lane min",
  "Direction",
  "Closes",
  "Wins",
  "Unknown returns",
  "Positive unit returns",
  "Negative unit returns",
  "Return PF",
];
const ranges = tableSheet(
  "Ranges",
  "Settled executions by strategy, range, lane and direction",
  rangeHeaders,
  report.cells.map((x) => [
    x.kind,
    x.range,
    x.lane,
    x.side,
    x.n,
    x.w,
    x.unknownReturns,
    x.gp,
    x.gl,
    null,
  ]),
  {
    widths: { 0: 20, 1: 18, 6: 18, 7: 22, 8: 22, 9: 24 },
    formats: { 4: fmtN, 5: fmtN, 6: fmtN, 7: fmtPct, 8: fmtPct },
  },
);
applyPfFormula(ranges, 5, report.cells.length, "J", "E", "G", "H", "I");
const hourlyDetail = tableSheet(
  "Hourly detail",
  "Hourly settled executions: full range and direction coverage",
  ["UTC hour starts", ...rangeHeaders],
  report.hourlyCells.map((x) => [
    hourText(x.t),
    x.kind,
    x.range,
    x.lane,
    x.side,
    x.n,
    x.w,
    x.unknownReturns,
    x.gp,
    x.gl,
    null,
  ]),
  {
    freeze: 1,
    widths: { 0: 23, 1: 20, 2: 18, 7: 18, 8: 22, 9: 22, 10: 24 },
    formats: { 0: "dd-mmm hh:mm", 5: fmtN, 6: fmtN, 7: fmtN, 8: fmtPct, 9: fmtPct },
  },
);
applyPfFormula(hourlyDetail, 5, report.hourlyCells.length, "K", "F", "H", "I", "J");

// A fixed identity index keeps XLSX serialization bounded. Full protection rows stay in CSV/JSON.
// The first lexicographic config identity in each group is shown without inspecting returns.
const configurationIndex = [];
const indexedGroups = new Set();
for (const row of [...report.configurations].sort((a, b) => a.cfg.localeCompare(b.cfg))) {
  const key = `${row.source}|${row.kind}|${row.range}|${row.lane}|${row.side}`;
  if (!indexedGroups.has(key)) {
    indexedGroups.add(key);
    configurationIndex.push(row);
  }
}
const configurations = tableSheet(
  "Configurations",
  "Configuration index: every source, type, range, lane and direction",
  [
    "Strategy",
    "Source",
    "Source range",
    "Lane min",
    "Direction",
    "TP",
    "SL",
    "Trail",
    "Prehistory closes",
    "Prehistory PF",
    "Planned pipeline closes",
    "Funded sample closes",
    "Funded return PF",
    "Full config identity",
  ],
  configurationIndex.map((x) => [
    x.kind,
    x.source,
    x.range,
    x.lane,
    x.side,
    x.tp,
    x.sl,
    x.trail,
    x.preCloses,
    phasePf(x, "pre"),
    x.executedCloses,
    x.fundedCloses ?? null,
    x.fundedCloses === undefined
      ? "Unavailable"
      : x.fundedUnknownReturns
        ? "Unit basis unavailable"
        : !x.fundedCloses
          ? "No settled closes"
          : x.fundedNoLoss
            ? "No losses"
            : (x.fundedPf ?? "Unit basis unavailable"),
    x.cfg,
  ]),
  {
    freeze: 2,
    widths: {
      0: 20,
      1: 24,
      2: 18,
      8: 20,
      9: 25,
      10: 24,
      11: 24,
      12: 26,
      13: 100,
    },
    formats: {
      5: fmtPct,
      6: fmtPct,
      7: fmtPct,
      8: fmtN,
      9: fmtPf,
      10: fmtN,
      11: fmtN,
      12: fmtPf,
    },
  },
);
configurations.getRange("A1").values = [
  [
    `${configurationIndex.length} first-cell identity examples from ${report.configurations.length} complete config-side rows; no return-based filtering. All protections, phase PF/gp/gl, hold, step and aliases are in the evidence CSV/JSON. TP=0 means no fixed target.`,
  ],
];

tableSheet(
  "Trades",
  "Every funded simulated Signal close slice",
  [
    "Strategy",
    "Source",
    "Source range",
    "Lane min",
    "Direction",
    "Symbol",
    "Entry UTC",
    "Exit UTC",
    "Unit net return",
    "Sized return diagnostic",
    "External multiplier",
    "Reason",
    "Entry price",
    "Exit price",
    "TP",
    "SL",
    "Trail",
    "Trail step",
    "Hold bars",
    "Full config identity",
    "Unit notional USD",
    "Sized P&L USD",
  ],
  report.trades.map((x) => [
    x.kind,
    x.source,
    x.range,
    x.lane,
    x.side,
    x.sym,
    timestampText(x.entryT),
    timestampText(x.exitT),
    x.unitR,
    x.sizedReturn,
    x.externalMult,
    x.reason,
    x.entry,
    x.exit,
    x.tp,
    x.sl,
    x.trail,
    x.trailStep,
    x.holdBars,
    x.cfg,
    x.unitNotional ?? null,
    x.sizedPnl ?? null,
  ]),
  {
    freeze: 2,
    widths: { 0: 20, 1: 24, 5: 18, 6: 24, 7: 24, 9: 24, 10: 20, 19: 95, 20: 24, 21: 24 },
    formats: {
      6: "dd-mmm hh:mm:ss",
      7: "dd-mmm hh:mm:ss",
      8: fmtPct,
      9: fmtPct,
      10: "0.0000",
      12: "0.000000",
      13: "0.000000",
      14: fmtPct,
      15: fmtPct,
      16: fmtPct,
      20: fmtCash,
      21: fmtCash,
    },
  },
);

const progress = tableSheet(
  "Progress",
  "Configuration calculation and execution stages",
  [
    "Strategy",
    "Requested raw cells",
    "Effective configured cells",
    "Historic/retained cells",
    "Built cells",
    "Cells with prehistory closes",
    "Cells with run candidates",
    "Cells with active-unit candidates",
    "Cells with executed closes",
  ],
  report.progress.map((x) => [
    x.kind,
    x.requestedConfigured ?? null,
    x.effectiveConfigured ?? x.configured,
    x.historicOrRetained,
    x.built,
    x.preWithCloses,
    x.candidateConfigs,
    x.unitActiveCandidateConfigs,
    x.executedConfigs,
  ]),
  { tailRows: 100, widths: { 0: 80, 1: 20, 2: 24, 3: 20, 4: 25, 5: 25, 6: 28, 7: 25, 8: 25 } },
);
progress.getRange("A10").values = [["Preserved Base policy"]];
progress.getRange("B10").values = [
  ["Signal baseGate=false. Built counts are calculation coverage, not Base min-PF qualification."],
];
progress.getRange("A12").values = [["Entry gate"]];
progress.getRange("B12").values = [["Configured requirement"]];
const settings = report.protocol.settings.signals;
rect(progress, 13, [
  ["Source accept min PF", settings.accept.minPf],
  ["Source accept minimum trades", settings.accept.minTrades],
  ["Source accept history h", settings.accept.hours],
  ["Direction accept min PF", settings.sideAccept.minPf],
  ["Direction accept minimum trades", settings.sideAccept.minTrades],
  ["Direction accept history h", settings.sideAccept.hours],
  ["Available prehistory h", report.protocol.preH],
  ["Signal validation history h", settings.validateH],
]);
header(progress, 23, [
  "Prehistory diagnostic",
  "Evaluated config-sides",
  "Finite PF >=1.1",
  "Positive no-loss",
  "Passing config-sides",
  "Minimum closes",
  "Minimum PF",
  "Unknown config-sides",
]);
rect(
  progress,
  24,
  report.progress.map((x) => [
    x.kind,
    x.preDiagnostic?.evaluatedConfigSides ?? null,
    x.preDiagnostic?.finiteRatioPass ?? null,
    x.preDiagnostic?.positiveNoLossPass ?? null,
    x.preDiagnostic?.passingConfigSides ?? null,
    x.preDiagnostic?.minTrades ?? null,
    x.preDiagnostic?.minPf ?? null,
    x.preDiagnostic?.unknownConfigSides ?? null,
  ]),
);
progress.getRange("A28").values = [["Diagnostic sample"]];
progress.getRange("B28").values = [
  [
    "Per protection config and direction, pooled across symbols, six-hour prehistory only; descriptive PF diagnostic, not runtime unit activation or full Base admission",
  ],
];
let noteRow = 70;
for (const [key, value] of Object.entries(report.definitions ?? {})) {
  progress.getRange(`A${noteRow}`).values = [[key]];
  progress.getRange(`B${noteRow}`).values = [[value]];
  noteRow++;
}
progress.getRange("B10:H40").format.wrapText = false;
progress.getRange("A40:D40").values = [["Captured check not met", "Expected", "Actual", "Met"]];
progress.getRange("A40:D40").format = { fill: navy, font: { bold: true, color: "#FFFFFF" } };
const failedChecks = report.failedSessionChecks ?? [];
if (failedChecks.length)
  rect(
    progress,
    41,
    failedChecks.map((x) => [
      x.name ?? x.label ?? x.check ?? "Unnamed check",
      x.expected ?? null,
      x.actual ?? null,
      x.ok === true,
    ]),
  );
if (failedChecks.length) {
  progress.getRange(`A41:A${40 + failedChecks.length}`).format.wrapText = true;
  progress.getRange(`A41:D${40 + failedChecks.length}`).format.rowHeight = 34;
} else
  progress.getRange("A41").values = [
    [
      report.sessionChecksOk === true
        ? "All captured checks met"
        : "Session check status unavailable",
    ],
  ];

const sourceRows = [
  ...report.protocol.enabledSources.map((x) => [x, true]),
  ...report.protocol.disabledSources.map((x) => [x, false]),
];
tableSheet(
  "Open marks",
  "Unsettled endpoint marks, excluded from settled return PF",
  [
    "Sample",
    "Strategy",
    "Source",
    "Source range",
    "Lane min",
    "Direction",
    "Symbol",
    "Entry UTC",
    "Unit mark return",
    "Allocation",
    "Unit notional USD",
    "Cash mark USD",
    "Full config identity",
  ],
  [
    ...(report.funded.endpointTrades ?? []).map((x) => ({
      ...x,
      sample: "Primary funded/unknown",
    })),
    ...(planned.endpointTrades ?? []).map((x) => ({ ...x, sample: "Planned diagnostic" })),
  ].map((x) => [
    x.sample,
    x.kind,
    x.source,
    x.range,
    x.lane,
    x.side,
    x.sym,
    timestampText(x.entryT),
    x.unitR,
    x.allocationStatus,
    x.unitNotional,
    x.sizedPnl,
    x.cfg,
  ]),
  {
    widths: { 0: 28, 1: 22, 2: 26, 7: 24, 8: 24, 9: 20, 10: 24, 11: 24, 12: 100 },
    formats: { 7: "dd-mmm hh:mm:ss", 8: fmtPct, 10: fmtCash, 11: fmtCash },
  },
);
const detailRows = report.sourceDetails ?? [];
const sourceDetail = tableSheet(
  "Source detail",
  "Funded Signal returns by source, strategy, range, lane and direction",
  [
    "Source",
    "Strategy",
    "Source range",
    "Lane min",
    "Direction",
    "Funded sample closes",
    "Wins",
    "Unknown returns",
    "Positive unit returns",
    "Negative unit returns",
    "Return PF",
    "Signal net USD",
  ],
  detailRows.map((x) => [
    x.source,
    x.kind,
    x.range,
    x.lane,
    x.side,
    x.n,
    x.w,
    x.unknownReturns,
    x.gp,
    x.gl,
    null,
    x.usd,
  ]),
  {
    freeze: 1,
    widths: { 0: 26, 1: 20, 5: 24, 7: 20, 8: 24, 9: 24, 10: 26, 11: 22 },
    formats: { 5: fmtN, 6: fmtN, 7: fmtN, 8: fmtPct, 9: fmtPct, 11: fmtCash },
  },
);
applyPfFormula(sourceDetail, 5, detailRows.length, "K", "F", "H", "I", "J");
const sources = tableSheet(
  "Sources",
  "Frozen source catalog, protocol and provenance",
  ["Signal source", "Enabled"],
  sourceRows,
  { widths: { 0: 28, 1: 16 } },
);
sources.getRange("D4:E4").values = [["Protocol input", "Frozen value"]];
sources.getRange("D4:E4").format = { fill: navy, font: { bold: true, color: "#FFFFFF" } };
const protocolRows = [
  ["Frozen at UTC", timestampText(report.protocol.frozenAt)],
  ["Market data", report.protocol.source],
  ["Public endpoint", report.protocol.endpoint],
  ["Symbols", report.protocol.symbols.join(", ")],
  ["Prehistory UTC", report.protocol.windows.utc.pre.join(" to ")],
  ["Trading UTC", report.protocol.windows.utc.trade.join(" to ")],
  ["Model round-trip cost", Number.isFinite(report.protocol.settings?.cost) ? `${(report.protocol.settings.cost * 100).toFixed(2)}%` : "Not recorded"],
  ["Combined lanes", report.protocol.combinedLanes],
  ["Indicator warmup UTC", report.protocol.indicatorWarmupStart ?? "No additional warmup"],
  ["Warmup policy", report.protocol.indicatorWarmupPolicy ?? "Strict 12-hour input only"],
  ["Normal base TP fractions", JSON.stringify(settings.normal.tp)],
  ["Normal SL / TP factors", JSON.stringify(settings.normal.slOfTp)],
  ["Trailing base TP fractions", JSON.stringify(settings.trailing.tp)],
  ["Trail / TP factors", JSON.stringify(settings.trailing.trailOfTp)],
  ["Trailing-only SL fractions", JSON.stringify(settings.trailingOnly.sl)],
  ["Trailing-only trail fractions", JSON.stringify(settings.trailingOnly.trail)],
  ["Signal hold horizon h", settings.holdH],
  ["Trailing-only trail step", settings.trailingOnly.trailStep],
  ["Modeled start balance USD", report.protocol.book.balance],
  ["Modeled allocation", report.protocol.book.pct],
  ["Modeled leverage", report.protocol.book.leverage],
  ...Object.entries(report.provenance).map(([key, value]) => [`${key} SHA-256`, value.sha256]),
  ["Qualification policy", report.protocol.stagePolicy],
  ["PF definition", report.protocol.pf],
  ["Numerical zero USD", report.ownershipPrecision?.epsilonUsd ?? null],
  ["Quantity precision policy", report.ownershipPrecision?.definition ?? "Unavailable"],
  ["Roundoff-zeroed allocations", report.ownershipPrecision?.capped?.roundoffZeroed ?? null],
  ["Raw roundoff amount USD", report.ownershipPrecision?.capped?.rawNotionalUsd ?? null],
  [
    "Full config evidence",
    "signals-all-configurations.csv (all phase gp/gl, acceptance diagnostics and effective aliases)",
  ],
  [
    "Requested-to-effective mapping",
    "signals-requested-to-effective-configurations.csv (every original protection cell)",
  ],
  [
    "Whole-system allocations",
    `whole-system-book-allocations.csv (${(report.wholeSystemSizedOrders ?? []).length} observed planned book records)`,
  ],
];
sources.getRange(`D5:E${protocolRows.length + 4}`).values = protocolRows;
sources.getRange(`D4:E${protocolRows.length + 4}`).format.font = { name: "Arial", size: 10 };
sources.getRange("D4:E4").format.font = { bold: true, color: "#FFFFFF" };
sources.getRange("E5").setNumberFormat("yyyy-mm-dd hh:mm:ss");
sources.getRange("D:D").format.columnWidth = 30;
sources.getRange("E:E").format.columnWidth = 135;

if (research) {
  assert.equal(research.schema, "cts-new-signal-research-summary-v1");
  const sheet = sheets.Research;
  base(sheet, "Separate retrospective research: four additional Signal sources", "I", 45);
  sheet.getRange("A4").values = [
    [
      "Independent configuration copies on a different, previously used public cache; no account capital or live execution evidence.",
    ],
  ];
  sheet.getRange("A5").values = [
    [
      "All 688 IS-qualified config-side rows were long; no short row qualified. The losing selected 1-minute slice and negative all-config pool remain included.",
    ],
  ];
  sheet.getRange("A6").values = [
    [
      "The frozen 63-source six-hour simulation is a separate cohort. Complete IS/OOS CSVs, selection IDs and market inputs are in research/ within the evidence ZIP.",
    ],
  ];
  sheet.getRange("A7").values = [
    [
      `IS: ${new Date(research.protocol.data.isStartT).toISOString()} to ${new Date(research.protocol.data.splitT).toISOString()}; OOS: ${new Date(research.protocol.data.splitT).toISOString()} to ${new Date(research.protocol.data.endT).toISOString()}; modeled round-trip cost ${(research.protocol.model.roundTripCost * 100).toFixed(1)}%.`,
    ],
  ];
  header(sheet, 8, [
    "Period / cohort",
    "Breakdown",
    "Value",
    "Observation count",
    "Unit-return PF",
    "PF including end marks",
    "Positive unit returns",
    "Negative unit returns",
    "Notes",
  ]);
  rect(
    sheet,
    9,
    research.rows.map((x) => [
      x.scope,
      x.dimension,
      x.value,
      x.n,
      x.scope === "IS selection" ? "Not applicable" : label(x),
      x.pfIncludingMarks ?? "Not applicable",
      x.gp ?? null,
      x.gl ?? null,
      x.notes,
    ]),
  );
  sheet.getRange(`D9:D${8 + research.rows.length}`).setNumberFormat(fmtN);
  sheet.getRange(`E9:F${8 + research.rows.length}`).setNumberFormat(fmtPf);
  sheet.getRange(`G9:H${8 + research.rows.length}`).setNumberFormat(fmtPct);
  header(sheet, 31, [
    "Selected source",
    "Direction",
    "Selected config-side rows",
    "OOS settled closes",
    "Unit-return PF",
  ]);
  rect(
    sheet,
    32,
    research.sourceDirections.map((x) => [
      x.source,
      x.direction,
      x.selectedConfigSideRows,
      x.n,
      label(x),
    ]),
  );
  sheet.getRange("E32:E39").setNumberFormat(fmtPf);
  sheet.getRange("A:B").format.columnWidth = 25;
  sheet.getRange("C:C").format.columnWidth = 31;
  sheet.getRange("D:H").format.columnWidth = 22;
  sheet.getRange("I:I").format.columnWidth = 100;
  sheet.getRange(`E9:E${8 + research.rows.length}`).conditionalFormats.add("cellIs", {
    operator: "lessThan",
    formula: 1,
    format: { fill: "#FDE8E7", font: { color: red } },
  });
}

const audit = sheets.Audit;
base(audit, "Independent output reconciliations", "F", 20);
header(audit, 4, [
  "Check",
  "Observed",
  "Independent expected",
  "Difference",
  "Tolerance",
  "Result",
]);
const hr = report.hourlyCells.length + 4,
  rr = report.cells.length + 4;
const checks = [
  ["Type closes", "=SUM('Summary'!B9:B11)", report.total.n, 0],
  ["Hour closes", "=SUM('Summary'!C16:C21)", report.total.n, 0],
  ["Detailed hour closes", `=SUM('Hourly detail'!F5:F${hr})`, report.total.n, 0],
  ["Range closes", `=SUM('Ranges'!E5:E${rr})`, report.total.n, 0],
  [
    "Planned configuration closes",
    report.configurations.reduce((n, x) => n + x.pipelineCloses, 0),
    (report.planned ?? report).total.n,
    0,
  ],
  [
    "Funded configuration closes",
    report.configurations.reduce((n, x) => n + x.fundedCloses, 0),
    report.total.n,
    0,
  ],
  ["Source-detail closes", `=SUM('Source detail'!F5:F${detailRows.length + 4})`, report.total.n, 0],
  ["Long closes", "=SUM('Summary'!C9:C11)", report.coverage.longCloses, 0],
  ["Short closes", "=SUM('Summary'!D9:D11)", report.coverage.shortCloses, 0],
  ["Trade row count", report.trades.length, report.total.n, 0],
  ["Positive unit returns", "=SUM('Summary'!G9:G11)", report.total.gp, 1e-10],
  ["Negative unit returns", "=SUM('Summary'!H9:H11)", report.total.gl, 1e-10],
  [
    "Signal sized P&L",
    `=SUM('Trades'!V5:V${Math.max(5, report.trades.length + 4)})`,
    report.total.usd,
    1e-6,
  ],
  [
    "Whole-system sized P&L",
    (report.wholeSystemSizedOrders ?? []).reduce((n, x) => n + (x.sizedPnl ?? 0), 0),
    (report.wholeSystemSizedOrders ?? []).some((x) => x.sizedPnl === null) ? null : report.book.net,
    1e-6,
  ],
];
for (let i = 0; i < checks.length; i++) {
  const row = i + 5,
    [name, observed, expected, tolerance] = checks[i];
  audit.getRange(`A${row}`).values = [[name]];
  if (typeof observed === "string") audit.getRange(`B${row}`).formulas = [[observed]];
  else audit.getRange(`B${row}`).values = [[observed]];
  audit.getRange(`C${row}`).values = [[expected ?? "Unavailable"]];
  if (expected === null) audit.getRange(`D${row}`).values = [["Not computable"]];
  else audit.getRange(`D${row}`).formulas = [[`=B${row}-C${row}`]];
  audit.getRange(`E${row}`).values = [[tolerance]];
  if (expected === null) audit.getRange(`F${row}`).values = [["Not computable"]];
  else audit.getRange(`F${row}`).formulas = [[`=IF(ABS(D${row})<=E${row},"Matches","Mismatch")`]];
}
audit.getRange("A:A").format.columnWidth = 34;
audit.getRange("B:E").setNumberFormat("0.0000000000");
audit.getRange(`F5:F${checks.length + 4}`).conditionalFormats.add("containsText", {
  text: "Mismatch",
  format: { fill: "#FDE8E7", font: { bold: true, color: red } },
});

wb.recalculate();
const inspected = await wb.inspect({
  kind: "table",
  range: "Summary!A8:J12",
  include: "values,formulas",
  tableMaxRows: 5,
  tableMaxCols: 10,
  maxChars: 5000,
});
const errors = await wb.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!",
  options: { useRegex: true, maxResults: 30 },
  summary: "formula error scan",
  maxChars: 3000,
});
const auditValues = audit.getRange(`F5:F${checks.length + 4}`).values;
assert.ok(
  auditValues.every((row) => ["Matches", "Not computable"].includes(row[0])),
  JSON.stringify(auditValues),
);
assert.match(errors.ndjson, /matched 0 entries/i);
await fs.writeFile(
  path.join(out, "workbook-verification.json"),
  JSON.stringify(
    { keyRange: inspected.ndjson, errors: errors.ndjson, audit: auditValues },
    null,
    2,
  ),
);
for (const [name, sheet] of Object.entries(sheets)) {
  const range =
    name === "Summary"
      ? "A8:J21"
      : name === "Sources"
        ? "A2:E12"
        : name === "Progress"
          ? "A2:H8"
          : name === "Audit"
            ? "A2:F16"
            : `A2:${name === "Configurations" ? "J" : name === "Trades" ? "I" : name === "Hourly types" || name === "Hourly detail" ? "K" : "J"}12`;
  const preview = await wb.render({ sheetName: sheet.name, range, scale: 1, format: "png" });
  await fs.writeFile(
    path.join(out, `preview-${name.toLowerCase().replaceAll(" ", "-")}.png`),
    new Uint8Array(await preview.arrayBuffer()),
  );
}
for (const [name, range, filename] of [
  ["Summary", "A23:L43", "summary-notes"],
  ["Hourly types", "L4:V22", "hourly-entries"],
  ["Research", "A14:I39", "research-details"],
  ["Progress", "A23:H28", "progress-diagnostics"],
  ["Configurations", "A1:N12", "configuration-index-scope"],
]) {
  if (!sheets[name]) continue;
  const preview = await wb.render({ sheetName: name, range, scale: 1, format: "png" });
  await fs.writeFile(
    path.join(out, `preview-${filename}.png`),
    new Uint8Array(await preview.arrayBuffer()),
  );
}
const target = path.join(out, "cts-ao-signals-six-hour.xlsx");
if (!verifyOnly) {
  const file = await SpreadsheetFile.exportXlsx(wb);
  await file.save(target);
}
console.log(
  JSON.stringify({
    workbook: verifyOnly ? null : target,
    verifyOnly,
    configurationSides: report.configurations.length,
    settledTrades: report.trades.length,
    checks: checks.length,
    sheets: Object.keys(sheets),
  }),
);
