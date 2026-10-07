// The paper step's database rows: only what changed since the last step is written. Every paper position and every
// trade of the simulated window on every step were ~20k rows — the step's longest slices on the desks.
import { orderKey } from "../sizing.ts";

type PosKey = { cfg: string; sym: string; side: number; entryT: number };
export type WrittenPos = Map<string, PosKey & { sig: string }>;

/** A position's row identity: config, symbol, direction and entry (a long and a short of one config are two rows). */
const posKey = (p: PosKey) => `${p.cfg}|${p.sym}|${p.side > 0 ? 1 : -1}|${p.entryT}`;

/**
 * Positions to write (new, or entry / stop / target changed) and rows to delete (no longer in the book). `prev` null:
 * the first step after a start — `full`: the table is rewritten.
 */
export function diffPositions<P extends PosKey & { entry: number; stop: number; target: number }>(
  prev: WrittenPos | null,
  positions: readonly P[],
): { next: WrittenPos; write: P[]; gone: PosKey[]; full: boolean } {
  const next: WrittenPos = new Map();
  const write: P[] = [];
  for (const p of positions) {
    const k = posKey(p);
    const sig = `${p.entry}|${p.stop}|${p.target}`;
    next.set(k, { cfg: p.cfg, sym: p.sym, side: p.side, entryT: p.entryT, sig });
    if (!prev || prev.get(k)?.sig !== sig) write.push(p);
  }
  const gone: PosKey[] = [];
  if (prev) for (const [k, v] of prev) if (!next.has(k)) gone.push(v);
  return { next, write, gone, full: !prev };
}

/** Trades to write: new ones, and those whose P&L (r × unit) changed. */
export function diffTrades<T extends { cfg: string; sym: string; side: number; entryT: number; r: number }>(
  prev: Map<string, number> | null,
  trades: readonly T[],
  unitOf: (t: T) => number,
): { next: Map<string, number>; write: Array<{ t: T; pnl: number }> } {
  const next = new Map<string, number>();
  const write: Array<{ t: T; pnl: number }> = [];
  for (const t of trades) {
    const k = orderKey(t);
    const pnl = t.r * unitOf(t);
    next.set(k, pnl);
    if (prev?.get(k) !== pnl) write.push({ t, pnl });
  }
  return { next, write };
}
