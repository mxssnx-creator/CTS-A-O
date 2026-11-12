// Pure comparison of a desk's ledger with the exchange's own record (scripts/audit-live-desk.mjs reads both).
// Nothing here decides ownership for trading: it only reports where the two records differ.

const num = (x) => {
  const n = typeof x === "number" ? x : Number(x);
  return Number.isFinite(n) ? n : 0;
};
const up = (x) => String(x ?? "").trim().toUpperCase();
/** Relative tolerance of a quantity or price read back from the venue (contract steps, float text). */
const near = (a, b, rel = 1e-6) => Math.abs(a - b) <= rel * Math.max(Math.abs(a), Math.abs(b), 1e-12);

/** BUY/LONG and SELL/SHORT open; the other two reduce (hedge mode). */
export function opensPosition(o) {
  const side = up(o.side), pos = up(o.positionSide);
  return (side === "BUY" && pos === "LONG") || (side === "SELL" && pos === "SHORT");
}

/**
 * @param {object} a
 * @param {string} a.tag the desk's tracking tag ("CTSAO_")
 * @param {{positions: object[], orders: object[]}} a.book the exchange's positions and open orders (fetchBook)
 * @param {object[]} a.history the account's order history over the desk's run (allOrders rows)
 * @param {{orders: object[], fills: object[]}} a.ledger the desk's live_orders / live_fills rows
 * @param {number} a.modelCost the modeled round-trip cost as a fraction of notional
 */
export function auditDesk({ tag, book, history, ledger, modelCost, from = null, to = null }) {
  const T = up(tag);
  if (!/^[A-Z0-9]{2,12}_$/.test(T)) throw new Error("audit needs the desk's tracking tag");
  const own = (coid) => up(coid).startsWith(T);
  const kindOf = (coid) => up(coid).charAt(T.length);
  const posKey = (sym, side) => `${up(sym)}|${up(side)}`;

  const positions = (book.positions ?? []).filter((p) => num(p.qty) > 0);
  const heldKeys = new Set(positions.map((p) => posKey(p.venueSymbol ?? p.symbol, p.side)));
  const ownOrders = (book.orders ?? []).filter((o) => own(o.clientOrderId));

  // executed own orders of the exchange, one row per client id (the latest cumulative snapshot)
  const executed = new Map();
  for (const o of history ?? []) {
    if (!own(o.clientOrderId) || !(num(o.executedQty) > 0)) continue;
    const id = up(o.clientOrderId);
    const prev = executed.get(id);
    if (!prev || num(o.executedQty) >= num(prev.executedQty)) executed.set(id, o);
  }
  // own net quantity per symbol × side from the exchange's own executed orders
  const ownQty = new Map();
  for (const o of executed.values()) {
    const k = posKey(o.symbol, o.positionSide);
    ownQty.set(k, (ownQty.get(k) ?? 0) + (opensPosition(o) ? 1 : -1) * num(o.executedQty));
  }

  const strandedOrders = ownOrders
    .filter((o) => !heldKeys.has(posKey(o.venueSymbol ?? o.symbol, o.positionSide)))
    .map((o) => ({ coid: o.clientOrderId, symbol: o.venueSymbol ?? o.symbol, positionSide: o.positionSide, type: o.type, stopPrice: o.stopPrice ?? null }));

  const stopOn = new Set(
    ownOrders
      .filter((o) => kindOf(o.clientOrderId) === "S" || (/^STOP/.test(up(o.type)) && kindOf(o.clientOrderId) !== "T"))
      .map((o) => posKey(o.venueSymbol ?? o.symbol, o.positionSide)),
  );
  const unprotected = positions
    .filter((p) => {
      const k = posKey(p.venueSymbol ?? p.symbol, p.side);
      return (ownQty.get(k) ?? 0) > 1e-12 && !stopOn.has(k);
    })
    .map((p) => ({ symbol: p.venueSymbol ?? p.symbol, side: p.side, qty: num(p.qty), ownQty: ownQty.get(posKey(p.venueSymbol ?? p.symbol, p.side)) }));

  const ledgerOrders = new Map((ledger.orders ?? []).map((o) => [up(o.coid), o]));
  const ledgerFills = new Map((ledger.fills ?? []).map((f) => [up(f.coid), f]));
  const exchangeOnly = [];
  const fillMismatch = [];
  for (const [id, o] of executed) {
    const lo = ledgerOrders.get(id), lf = ledgerFills.get(id);
    if (!lo && !lf) {
      exchangeOnly.push({ coid: id, symbol: o.symbol, positionSide: o.positionSide, type: o.type, qty: num(o.executedQty), avgPrice: num(o.avgPrice) });
      continue;
    }
    if (!lf) continue; // a triggered stop / target is booked through its lane close, not as a fill row
    const q = num(o.executedQty), px = num(o.avgPrice);
    if (!near(num(lf.qty), q) || (px > 0 && !near(num(lf.fill_px), px, 1e-5)))
      fillMismatch.push({ coid: id, symbol: o.symbol, ledgerQty: num(lf.qty), exchangeQty: q, ledgerPx: num(lf.fill_px), exchangePx: px });
  }
  // a ledger fill is checked only inside the history window that was read
  const inWindow = (at) => (from === null || num(at) >= from) && (to === null || num(at) <= to);
  const ledgerOnly = [...ledgerFills.entries()]
    .filter(([id, f]) => num(f.qty) > 0 && inWindow(f.at) && !executed.has(id))
    .map(([id, f]) => ({ coid: id, sym: f.sym, kind: f.kind, qty: num(f.qty), at: num(f.at) }));

  const foreign = [
    ...positions
      .filter((p) => !((ownQty.get(posKey(p.venueSymbol ?? p.symbol, p.side)) ?? 0) > 1e-12))
      .map((p) => ({ what: "position", symbol: p.venueSymbol ?? p.symbol, side: p.side, qty: num(p.qty) })),
    ...(book.orders ?? []).filter((o) => !own(o.clientOrderId)).map((o) => ({ what: "order", symbol: o.venueSymbol ?? o.symbol, coid: o.clientOrderId ?? null, type: o.type })),
  ];

  // measured cost: the exchange's commission per notional of each own execution, and the ledger's slippage against
  // its reference price. An execution without a reported commission is unknown, never zero.
  let feeNotional = 0, fee = 0, feeFills = 0, feeUnknown = 0;
  for (const o of executed.values()) {
    const notional = num(o.executedQty) * num(o.avgPrice);
    const c = o.commission;
    if (!(notional > 0)) continue;
    if (c === undefined || c === null || c === "" || !Number.isFinite(Number(c))) { feeUnknown++; continue; }
    feeFills++; feeNotional += notional; fee += Math.abs(Number(c));
  }
  const slip = { E: { n: 0, sum: 0 }, C: { n: 0, sum: 0 } };
  for (const f of ledgerFills.values()) {
    const ref = num(f.ref_px), px = num(f.fill_px), side = num(f.side);
    const kind = up(f.kind) === "C" ? "C" : up(f.kind) === "E" || /^[UMNHGLQZ]$/.test(up(f.kind)) ? "E" : null;
    if (!kind || !(ref > 0) || !(px > 0) || !(side === 1 || side === -1)) continue;
    // adverse is positive: an entry pays more (long) / receives less (short); an exit the reverse
    const adverse = (kind === "E" ? side : -side) * (px - ref) / ref;
    slip[kind].n++; slip[kind].sum += adverse;
  }
  const feePerSide = feeNotional > 0 ? fee / feeNotional : null;
  const entrySlip = slip.E.n ? slip.E.sum / slip.E.n : null;
  const exitSlip = slip.C.n ? slip.C.sum / slip.C.n : null;
  const roundTrip = feePerSide === null || entrySlip === null || exitSlip === null ? null : 2 * feePerSide + entrySlip + exitSlip;

  const checks = { strandedOrders, unprotected, exchangeOnly, ledgerOnly, fillMismatch, foreign };
  return {
    at: to ?? Date.now(),
    tag: T,
    window: { from, to },
    ok: !strandedOrders.length && !unprotected.length && !exchangeOnly.length && !ledgerOnly.length && !fillMismatch.length,
    book: { positions: positions.length, ownPositions: positions.filter((p) => (ownQty.get(posKey(p.venueSymbol ?? p.symbol, p.side)) ?? 0) > 1e-12).length,
      orders: (book.orders ?? []).length, ownOrders: ownOrders.length },
    exchange: { executed: executed.size, opens: [...executed.values()].filter(opensPosition).length },
    ledger: { orders: ledgerOrders.size, fills: ledgerFills.size },
    cost: { feePerSide, feeFills, feeUnknown, entrySlip, entrySlipFills: slip.E.n, exitSlip, exitSlipFills: slip.C.n, roundTrip, model: modelCost,
      basis: "exchange commission / executed notional; ledger fill price against its reference price, adverse positive" },
    checks,
  };
}
