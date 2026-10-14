// The desk's ownership check (scripts/core-live-test.mjs) and the HALT file the supervisor reads
// (docs/live-coordination/x01-supervise.sh): a desk whose own-tagged fills take more out of a (symbol, side) than it held
// there — its quantity at the session start (the restored own-quantity ledger) plus its own fills in since — closed or
// reduced a position that is not its own (a closePosition stop on a position someone else added to, an adopted
// position). It then writes HALT: the supervisor does not relaunch it until a person has looked and removed the file.
import { existsSync, writeFileSync } from "node:fs";

const num = (x) => {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
};

/**
 * @param {Array<{ symbol: string, positionSide: string, side: string, executedQty: unknown, clientOrderId?: string, time?: unknown, updateTime?: unknown }>} orders the account's order history (every system's)
 * @param {string} tag the desk's client-id prefix
 * @param {{ since?: number, startOwn?: Map<string, number> }} o fills from `since` on; `startOwn`: "SYM|LONG" → the own quantity held then
 * @returns {Array<{ key: string, coid: string, at: number, over: number }>} each own fill that took out more than the desk held
 */
export function ownershipBreaches(orders, tag, { since = 0, startOwn = new Map() } = {}) {
  const T = tag.toUpperCase();
  const fills = orders
    .filter((o) => String(o.clientOrderId ?? "").toUpperCase().startsWith(T) && num(o.executedQty) > 0)
    .filter((o) => num(o.updateTime || o.time) >= since)
    .filter((o) => o.positionSide === "LONG" || o.positionSide === "SHORT")
    .sort((a, b) => num(a.updateTime || a.time) - num(b.updateTime || b.time));
  const own = new Map(startOwn);
  const out = [];
  for (const o of fills) {
    const k = `${o.symbol}|${o.positionSide}`;
    const q = num(o.executedQty);
    const into = (o.positionSide === "LONG" && o.side === "BUY") || (o.positionSide === "SHORT" && o.side === "SELL");
    const have = own.get(k) ?? 0;
    if (into) {
      own.set(k, have + q);
      continue;
    }
    // quantity steps round both ways: a hair over what was held is the same quantity
    const over = q - have;
    if (over > 1e-9 + 1e-6 * q) out.push({ key: k, coid: String(o.clientOrderId).toUpperCase(), at: num(o.updateTime || o.time), over });
    own.set(k, Math.max(0, have - q));
  }
  return out;
}

/** The own-quantity ledger's keys ("SYM|1" / "SYM|-1") as the order history's ("SYM|LONG" / "SYM|SHORT"). */
export function ledgerToHistoryKeys(ledger) {
  const out = new Map();
  for (const [k, q] of ledger) {
    const i = k.lastIndexOf("|");
    const sd = k.slice(i + 1);
    if (sd !== "1" && sd !== "-1") continue;
    if (q > 0) out.set(`${k.slice(0, i)}|${sd === "1" ? "LONG" : "SHORT"}`, q);
  }
  return out;
}

/** Writes the HALT file once (an existing one — a person's or an earlier breach's — is kept as it is). */
export function writeHalt(file, reason) {
  if (existsSync(file)) return false;
  writeFileSync(file, `${new Date().toISOString()} ${reason}\n`);
  return true;
}
