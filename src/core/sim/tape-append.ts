import { tapeBytes, tapeViews, type ConfigTape } from "./walkforward.ts";

const raw = [
  "exitT",
  "entryT",
  "r",
  "entry",
  "exit",
  "symI",
  "side",
  "reason",
  "bars",
  "vol",
  "level",
] as const;
const prefix = ["gp", "gl", "rs", "r2"] as const;
type Storage = { capacity: number; used: number; columns: ReturnType<typeof tapeViews> };
const stores = new WeakMap<ConfigTape, Storage>();

/** Append worker deltas without re-materialising historical Trades. Old published prefixes are immutable. */
export function appendTape(previous: ConfigTape, delta: ConfigTape): ConfigTape {
  if (
    previous.id !== delta.id ||
    previous.syms.length !== delta.syms.length ||
    previous.syms.some((s, i) => s !== delta.syms[i])
  )
    throw new Error("realtime tape identity changed");
  if (delta.n && previous.n && delta.exitT[0] <= previous.exitT[previous.n - 1])
    throw new Error("realtime tape delta overlaps previously settled closes");
  if (!delta.n) {
    const next = { ...previous, open: delta.open, pending: delta.pending };
    const store = stores.get(previous);
    if (store) stores.set(next, store);
    return next;
  }
  const n = previous.n + delta.n;
  let store = stores.get(previous);
  // A fork must not overwrite an append another published tape already owns.
  if (!store || store.used !== previous.n || store.capacity < n) {
    const capacity = Math.max(n, Math.ceil(n * 1.25) + 16);
    const columns = tapeViews(new ArrayBuffer(tapeBytes(capacity)), 0, capacity);
    for (const k of raw) columns[k].set(previous[k]);
    for (const k of prefix) columns[k].set(previous[k]);
    store = { capacity, used: previous.n, columns };
  }
  const cols = store.columns;
  for (const k of raw) cols[k].set(delta[k], previous.n);
  for (let i = previous.n; i < n; i++) {
    const r = cols.r[i];
    cols.gp[i + 1] = cols.gp[i] + (r > 0 ? r : 0);
    cols.gl[i + 1] = cols.gl[i] + (r < 0 ? -r : 0);
    cols.rs[i + 1] = cols.rs[i] + r;
    cols.r2[i + 1] = cols.r2[i] + r * r;
  }
  const next: ConfigTape = { ...previous, n, open: delta.open, pending: delta.pending };
  for (const k of raw) Object.assign(next, { [k]: cols[k].subarray(0, n) });
  for (const k of prefix) next[k] = cols[k].subarray(0, n + 1);
  store.used = n;
  stores.set(next, store);
  return next;
}
