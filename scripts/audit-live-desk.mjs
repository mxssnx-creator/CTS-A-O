#!/usr/bin/env node
// CTS-A-O — independent, read-only audit of a live desk against the exchange. It reads the account's book (positions,
// open orders) and the order history itself and compares them with the desk's own ledger (live_orders / live_fills in
// the desk's database snapshot). It sends nothing: no order, no cancel, no setting.
//
//   CTS_CORE_LIVE_TAG=CTSAO_ node --experimental-strip-types scripts/audit-live-desk.mjs \
//     --db runs/x02-ao/core.sqlite [--conn bingx-vst-02] [--from ISO] [--model-cost 0.00176] [--json] [--out file.json]
//
// Checks (each one is a list; an empty list is the pass):
//   strandedOrders      own resting orders on a symbol × side where the account holds no position
//   unprotected         positions carrying own quantity without an own resting stop
//   exchangeOnly        own client ids the exchange executed that the desk's ledger does not know
//   ledgerOnly          ledger fills the exchange's history does not show as executed
//   fillMismatch        the ledger's quantity or price of a fill differs from the exchange's
//   foreign             orders / positions on the account that do not carry the tag (reported, never judged own)
// and the measured cost: commission per notional and entry / exit slippage against the ledger's reference price,
// beside the modeled round trip. Fees the exchange did not report stay "unknown"; they are never taken as zero.
import { writeFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { auditDesk } from "./lib/live-desk-audit.mjs";

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const conn = arg("conn", "bingx-vst-02");
if (conn === "bingx-x01" && arg("mainnet", "") !== "yes") throw new Error("bingx-x01 is mainnet: pass --mainnet yes (the audit only reads)");
const dbFile = arg("db");
if (!dbFile) throw new Error("usage: audit-live-desk.mjs --db <core.sqlite> [--conn C] [--from ISO] [--model-cost X] [--json] [--out F]");
const bx = await import("../src/core/exchange/bingx.server.ts");
const { liveTag } = await import("../src/core/server/live.ts");
const { history } = await import("./core-live-report.mjs");
const { RT_COST } = await import("../src/core/model-cost.ts");
const network = conn === "bingx-x01" ? "mainnet" : "testnet";
const tag = liveTag(conn);
const modelCost = Number(arg("model-cost", RT_COST));

const db = new DatabaseSync(dbFile, { readOnly: true });
let ledger;
try {
  // relation: all rows — an audit of the writer needs every ledger row, whatever closed its lane
  const orders = db.prepare("SELECT coid, cfg, sym, side, kind, qty, px, status, msg, at FROM live_orders").all();
  // relation: all rows — the same: every recorded fill is compared with the exchange's own record
  const fills = db.prepare("SELECT coid, sym, side, kind, qty, ref_px, fill_px, fee, fee_known, at FROM live_fills").all();
  ledger = { orders, fills };
} finally {
  db.close();
}
const firstAt = Math.min(...ledger.orders.map((o) => Number(o.at)).filter(Number.isFinite), Date.now());
const from = arg("from") ? Date.parse(arg("from")) : firstAt - 600_000;
if (!Number.isFinite(from)) throw new Error("--from: not a time");
const to = Date.now();
const [book, all, account] = [
  await bx.fetchBook(network, conn),
  await history(network, conn, from, to),
  await bx.fetchAccount(network, conn),
];
const report = auditDesk({ tag, book, history: all, ledger, modelCost, from, to });
report.account = account;
report.conn = conn;
const out = arg("out", "");
if (out) writeFileSync(out, `${JSON.stringify(report, null, 1)}\n`);
if (argv.includes("--json")) process.stdout.write(`${JSON.stringify(report, null, 1)}\n`);
else {
  const c = report.checks;
  const line = (k) => `${k} ${c[k].length}`;
  process.stdout.write(
    `${new Date(to).toISOString()} ${conn} tag ${tag}: positions ${report.book.positions} (own ${report.book.ownPositions}) · ` +
      `open orders ${report.book.orders} (own ${report.book.ownOrders}) · own executed orders ${report.exchange.executed} · ledger fills ${report.ledger.fills}\n` +
      `  ${["strandedOrders", "unprotected", "exchangeOnly", "ledgerOnly", "fillMismatch", "foreign"].map(line).join(" · ")} → ${report.ok ? "OK" : "FAIL"}\n` +
      `  cost: fee ${fmt(report.cost.feePerSide)} per side over ${report.cost.feeFills} fills (${report.cost.feeUnknown} unknown) · ` +
      `slippage entry ${fmt(report.cost.entrySlip)} exit ${fmt(report.cost.exitSlip)} · measured round trip ${fmt(report.cost.roundTrip)} vs model ${fmt(modelCost)}\n`,
  );
  for (const k of ["strandedOrders", "unprotected", "exchangeOnly", "ledgerOnly", "fillMismatch"])
    for (const x of c[k].slice(0, 20)) process.stdout.write(`  ${k}: ${JSON.stringify(x)}\n`);
}
function fmt(x) {
  return x === null || x === undefined || !Number.isFinite(x) ? "unavailable" : `${(x * 100).toFixed(4)} %`;
}
process.exit(report.ok ? 0 : 2);
