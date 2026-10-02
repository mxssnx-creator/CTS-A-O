#!/usr/bin/env node
// CTS-A-O — one monitoring round over every live test desk (scripts/core-live-test.mjs) on one demo connection.
// Per desk (tag): the process, its last compute, its live step, memory; from the exchange, by the tag's own client
// ids: orders, open / closed positions, net, fees; and the invariants:
//   - every own open position has an own stop on the exchange
//   - every own exchange order's client id is in the desk's ledger (tracking ids are complete)
//   - no own position larger than the desk's max notional (minimum volume holds)
//   - nothing outside the tag is touched (only own client ids are ever sent)
// Appends a table to --out (markdown) and prints it; exit code 1 when an invariant fails.
//
//   node --experimental-strip-types scripts/core-live-monitor.mjs --dir runs/full --out runs/full/monitor.md
import { appendFileSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { history, ownResults } from "./core-live-report.mjs";

const bx = await import("../src/core/exchange/bingx.server.ts");
const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const dir = arg("dir", "runs/full");
const out = arg("out", join(dir, "monitor.md"));
const conn = arg("conn", "bingx-vst-02");
const network = conn === "bingx-x01" ? "mainnet" : "testnet";
const maxNotional = Number(arg("max-notional", 12));

const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const desks = readdirSync(dir)
  .filter((d) => d.startsWith("live-") && existsSync(join(dir, d, "status.json")))
  .map((d) => JSON.parse(readFileSync(join(dir, d, "status.json"), "utf8")));
// the desks' shared book when recent (CTS_BINGX_BOOK_FILE); during an open-orders ban the last one any desk read
let book;
let bookAt = Date.now();
let bookNote = "";
try {
  book = await bx.fetchBook(network, conn, { notBefore: 0, maxAgeMs: 120_000 });
  // a shared book is up to 2 min old; open orders from an earlier read (rate limited) carry their time
  bookAt = book.ordersAt ?? Date.now() - 120_000;
  if (book.ordersAt) bookNote = `open orders read ${((Date.now() - bookAt) / 60_000).toFixed(0)} min ago (rate limited)`;
} catch (err) {
  const f = process.env.CTS_BINGX_BOOK_FILE ? `${process.env.CTS_BINGX_BOOK_FILE}.${conn}` : "";
  const c = f && existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null;
  if (c) {
    book = c.book;
    bookAt = c.startedAt;
    bookNote = `book read ${((Date.now() - bookAt) / 60_000).toFixed(0)} min ago (${String(err instanceof Error ? err.message : err).slice(0, 50)}…)`;
  } else {
    // no book at all (rate limited, nothing cached): every other check still runs; the stop check waits
    book = null;
    bookNote = `book unavailable (${String(err instanceof Error ? err.message : err).slice(0, 60)}…) — stop check skipped`;
  }
}
// one read of the account's order history serves every desk (each desk reading it on its own set off rate limits)
const fromOf = (s) => Date.parse(s.at) - s.hours * 3_600_000 - 60_000;
let all = null;
let allErr = null;
try {
  all = desks.length ? await history(network, conn, Math.min(...desks.map(fromOf)), Date.now()) : [];
} catch (err) {
  allErr = err instanceof Error ? err.message : String(err);
}
const rows = [];
const problems = [];
for (const s of desks) {
  const T = String(s.tag).toUpperCase();
  const mine = (coid) => String(coid ?? "").toUpperCase().startsWith(T);
  let ex = null;
  try {
    if (allErr) throw new Error(allErr);
    ex = await ownResults({ conn, tag: T, from: fromOf(s), all: all.filter((o) => Number(o.time) >= fromOf(s)) });
  } catch (err) {
    problems.push(`${T}: exchange history unavailable (${err instanceof Error ? err.message : err})`);
  }
  const p = [];
  const isAlive = s.pid ? alive(s.pid) : null;
  if (isAlive === false && !s.final) p.push("desk process not running");
  const ageMin = (Date.now() - Date.parse(s.at)) / 60_000;
  if (ageMin > 15 && !s.final) p.push(`status ${ageMin.toFixed(0)} min old`);
  const computeAge = s.lastComputeAt ? (Date.now() - s.lastComputeAt) / 60_000 : null;
  if (computeAge !== null && computeAge > 15) p.push(`last compute ${computeAge.toFixed(0)} min ago`);
  if (s.engine?.state === "error") p.push(`engine error`);
  if (s.live?.error) p.push(`live error: ${String(s.live.error).slice(0, 80)}`);
  // tracking ids: every own exchange order is in the ledger
  const ledger = new Set((s.ledger ?? []).map((x) => x.coid));
  // an order newer than the desk's status file (written every 10 min) cannot be in that file's ledger yet
  // and an id created before this desk process started belongs to an earlier run of the tag (its creation time is
  // in the id: tag, kind letter, then milliseconds in base 36)
  const started = Date.parse(s.at) - s.hours * 3_600_000 - 5_000;
  const createdOf = (c) => parseInt(c.slice(T.length + 1, T.length + 9), 36);
  // the desk keeps a flat key's ledger rows for a day (older ones are trimmed): ids of the last day are checked
  const since = Math.max(started, Date.now() - 24 * 3_600_000);
  const unknown = (ex?.orderIds ?? []).filter(
    (c) => !ledger.has(c) && (ex.orderTimes?.[c] ?? 0) < Date.parse(s.at) && !(createdOf(c) < since),
  );
  if (ex && unknown.length) p.push(`${unknown.length} own client id(s) not in the ledger (${unknown.slice(0, 2).join(", ")})`);
  // every own open position has an own stop; exposure stays at minimum volume
  const openPos = (ex?.positions ?? []).filter((x) => x.open);
  for (const x of openPos) {
    // a position that changed after the book was read cannot show its stop in it yet
    if (x.last > bookAt || !book) continue;
    const stop = book.orders.some(
      (o) => mine(o.clientOrderId) && o.venueSymbol === x.sym && /STOP/i.test(String(o.type ?? "STOP")),
    );
    if (!stop) p.push(`${x.sym} ${x.side} open without own stop`);
    // the quantity rebuilt from own orders alone overcounts when a foreign order on the shared (hedge-mode) account
    // closed it: cap it at what the exchange holds on that side, as the engine's own-quantity ledger does
    const held = (book.positions ?? [])
      .filter((b) => b.venueSymbol === x.sym && String(b.side).toUpperCase() === x.side)
      .reduce((a, b) => a + Math.abs(Number(b.qty) || 0), 0);
    const own = x.qty > 1e-12 ? Math.min(x.qty, held) : 0;
    const notional = x.qty > 1e-12 ? (x.notional * own) / x.qty : x.notional;
    if (notional > maxNotional * 1.6) p.push(`${x.sym} ${x.side} notional ${notional.toFixed(2)} above min volume`);
  }
  const k = ex?.byKind ?? {};
  const sum = (f) => Object.values(k).reduce((a, v) => a + f(v), 0);
  const pfOf = (gp, gl) => (gl > 1e-12 ? gp / gl : gp > 0 ? Infinity : 0);
  const pp = Object.values(s.paper ?? {}).reduce((a, v) => ({ n: a.n + v.n, gp: a.gp + v.gp, gl: a.gl + v.gl }), { n: 0, gp: 0, gl: 0 });
  rows.push({
    tag: T,
    name: s.name,
    alive: isAlive,
    hours: s.hours,
    rss: s.mem?.rssMb ?? null,
    computes: s.engine?.computes ?? 0,
    simPf: s.engine?.sim?.pf ?? null,
    real: s.engine?.real ?? 0,
    live: (s.live?.reason ?? "").slice(0, 40),
    orders: ex?.orders ?? 0,
    positions: ex?.positions?.length ?? 0,
    open: openPos.length,
    net: sum((v) => v.net),
    paperPf: pp.n ? pfOf(pp.gp, pp.gl) : null,
    paperN: pp.n,
    livePf: sum((v) => v.positions) ? pfOf(sum((v) => v.gp), sum((v) => v.gl)) : null,
    fee: sum((v) => -v.fee),
    paper: Object.entries(s.paper ?? {})
      .map(([r, a]) => `${r} ${a.n}·${(a.pf ?? 0).toFixed(2)}`)
      .join(", "),
    kinds: Object.entries(k)
      .map(([r, v]) => `${r} ${v.positions}·${v.net.toFixed(2)}`)
      .join(", "),
    problems: p,
  });
  for (const x of p) problems.push(`${T}: ${x}`);
}
const f2 = (x) => (typeof x === "number" && Number.isFinite(x) ? x.toFixed(2) : "–");
const md = [
  `## ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC — ${rows.length} desks, ${problems.length} problem(s)`,
  ``,
  ...(bookNote ? [`Open orders: ${bookNote}.`, ``] : []),
  `| desk | alive | h | RSS MB | computes | sim PF | seats | paper PF · closes | live PF | live step | own orders | positions (open) | live net USDT | fees | paper per range (n·PF) | live per range |`,
  `|---|---|---:|---:|---:|---:|---:|---|---:|---|---:|---:|---:|---:|---|---|`,
  ...rows.map(
    (r) =>
      `| ${r.tag} ${r.name} | ${r.alive === null ? "?" : r.alive ? "yes" : "no"} | ${f2(r.hours)} | ${r.rss ?? "–"} | ${r.computes} | ${f2(r.simPf)} | ${r.real} | ${r.paperPf === null ? "–" : `${Number.isFinite(r.paperPf) ? f2(r.paperPf) : "∞"} · ${r.paperN}`} | ${r.livePf === null ? "–" : Number.isFinite(r.livePf) ? f2(r.livePf) : "∞"} | ${r.live || "–"} | ${r.orders} | ${r.positions} (${r.open}) | ${f2(r.net)} | ${f2(r.fee)} | ${r.paper || "–"} | ${r.kinds || "–"} |`,
  ),
  ``,
  problems.length ? problems.map((x) => `- ${x}`).join("\n") : `No problem found.`,
  ``,
].join("\n");
appendFileSync(out, md + "\n");
console.log(md);
process.exit(problems.length ? 1 : 0);
