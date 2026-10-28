/**
 * A durable own-first outside-reduction decision may conservatively exhaust the quantity owned on one side.
 * This says nothing about who actually caused the venue fill: it only authorizes protecting the remaining
 * physical foreign side from old, exactly journaled own exits. Rows must be in control-ledger order.
 */
export interface ForeignCleanupRow {
  k: string;
  kind: string;
  status: string;
  qty: number;
  at: number;
  msg?: string | null;
}

export function foreignExhaustionProof(rows: Iterable<ForeignCleanupRow>): Map<string, number> {
  const states = new Map<string, { qty: number; valid: boolean; pending: boolean; latest: number; lastEntry: number; proof?: number }>();
  for (const row of rows) {
    if (!["O", "I", "R", "X", "H", "F"].includes(row.kind)) continue;
    let state = states.get(row.k);
    if (!state) states.set(row.k, (state = { qty: 0, valid: true, pending: false, latest: -Infinity, lastEntry: -Infinity }));
    if (!Number.isFinite(row.at) || row.at < state.latest) { state.valid = false; state.proof = undefined; continue; }
    state.latest = row.at;
    if (row.kind === "F") {
      state.qty = 0; state.valid = true; state.lastEntry = -Infinity; state.proof = undefined; continue;
    }
    // Any later open/increase intent supersedes old evidence, including an unresolved zero-quantity intent.
    if (row.kind === "O" || row.kind === "I") {
      state.proof = undefined;
      state.lastEntry = row.at;
      if (row.status === "pending") state.pending = true;
      if (row.status !== "ok" && row.status !== "pending") {
        if (row.status !== "error" && row.status !== "not-sent") state.valid = false;
        continue;
      }
      if (!Number.isFinite(row.qty) || row.qty < 0) { state.valid = false; continue; }
      state.qty += row.qty;
      continue;
    }
    if (row.status === "pending") { state.pending = true; state.proof = undefined; continue; }
    if (row.status !== "ok") continue;
    if (!Number.isFinite(row.qty) || row.qty < 0) { state.valid = false; state.proof = undefined; continue; }
    const before = state.qty;
    state.qty = Math.max(0, before - row.qty);
    if (row.kind === "H") {
      state.proof = state.valid && !state.pending && row.at > state.lastEntry && before > 0 && row.qty > 0 && state.qty === 0 &&
        row.msg?.startsWith("outside reduction:") ? row.at : undefined;
    } else if (row.qty > 0) state.proof = undefined;
  }
  return new Map([...states].flatMap(([key, state]) => state.valid && state.qty === 0 && state.proof !== undefined
    ? [[key, state.proof] as const] : []));
}
