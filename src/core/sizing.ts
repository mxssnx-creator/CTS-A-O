// Order sizing. equityPct (default): every order's unit notional is a fixed share of the equity at its entry —
// realized equity, compounding from the starting balance, so a drawdown shrinks the next orders and a profit grows
// them. fixed: every order's unit notional is the same amount. The Block volume multiplies the unit (the 8× stack
// cap applies upstream); a trade's P&L = r × unit, where r already carries its volume.
// minQty: every live order unit is the exchange minimum of its symbol (minimum notional / price, rounded up to the
// lot); the Block volume multiplies it. Paper and simulation size it like equityPct (pct of the realized equity).
export interface SizingSettings {
  mode: "equityPct" | "fixed" | "minQty";
  /** equityPct: share of equity per order unit (0.02 = 2 %) */
  pct: number;
}

/** Default: always the exchange minimum quantity per live order unit (with the maximum leverage, see live.leverage). */
export const DEFAULT_SIZING: SizingSettings = { mode: "minQty", pct: 0.02 };

export function sizingSettings(s?: Partial<SizingSettings> | null): SizingSettings {
  const mode =
    s?.mode === "fixed" || s?.mode === "minQty" || s?.mode === "equityPct" ? s.mode : DEFAULT_SIZING.mode;
  const pct = Number(s?.pct);
  return {
    mode,
    pct: Number.isFinite(pct) ? Math.min(0.25, Math.max(0.001, pct)) : DEFAULT_SIZING.pct,
  };
}

/** Unit notional of an order entered at `equity` (fixed mode: `fixedNotional`). */
export const unitNotional = (s: SizingSettings, equity: number, fixedNotional: number) =>
  s.mode === "fixed" ? fixedNotional : Math.max(0, s.pct * equity);

export interface SizedBook {
  /** unit notional per order key (`cfg|sym|entryT`), closed and open orders */
  units: Map<string, number>;
  /** starting balance + realized P&L of the closed orders */
  realized: number;
  /** realized P&L only */
  pnl: number;
}

export const orderKey = (x: { cfg: string; sym: string; entryT: number }) =>
  `${x.cfg}|${x.sym}|${x.entryT}`;

/**
 * Size a book causally: in time order, each entry takes its unit from the realized equity at that moment (orders
 * that exited at or before it count), each exit adds r × unit. Open orders get their unit the same way.
 */
export function sizeBook(
  trades: ReadonlyArray<{ cfg: string; sym: string; entryT: number; exitT: number; r: number }>,
  open: ReadonlyArray<{ cfg: string; sym: string; entryT: number }>,
  opt: { balance: number; sizing: SizingSettings; fixedNotional: number },
): SizedBook {
  const g = sizeBookGen(trades, open, opt);
  for (;;) {
    const r = g.next();
    if (r.done) return r.value;
  }
}

/** sizeBook in slices: yields every 20,000 events (a desk's book is 100k+ orders: 0.3 s in one piece). */
export function* sizeBookGen(
  trades: ReadonlyArray<{ cfg: string; sym: string; entryT: number; exitT: number; r: number }>,
  open: ReadonlyArray<{ cfg: string; sym: string; entryT: number }>,
  opt: { balance: number; sizing: SizingSettings; fixedNotional: number },
): Generator<number, SizedBook> {
  // events: exits before entries at the same instant (a close frees its result before the next entry), closed
  // orders before open ones, then by index
  const units = new Map<string, number>();
  const unitOf = new Float64Array(trades.length);
  let pnl = 0;
  const step = (kind: number, isOpen: boolean, i: number) => {
    if (kind === 1) {
      const u = unitNotional(opt.sizing, opt.balance + pnl, opt.fixedNotional);
      if (isOpen) units.set(orderKey(open[i]), u);
      else {
        unitOf[i] = u;
        units.set(orderKey(trades[i]), u);
      }
    } else pnl += trades[i].r * unitOf[i];
  };
  const keys = packedEvents(trades, open);
  if (keys) {
    // one exact integer per event, sorted natively (100k+ event objects sorted with a comparator took 0.3–0.4 s
    // in one slice, twice per compute)
    keys.k.sort();
    yield 0;
    let c = 0;
    for (const key of keys.k) {
      const i = key % keys.sh;
      const mid = Math.floor(key / keys.sh) % 4;
      step(mid >> 1, (mid & 1) === 1, i);
      if (++c % 20_000 === 0) yield c;
    }
  } else {
    type Ev = { t: number; kind: 0 | 1; i: number; open: boolean };
    const ev: Ev[] = [];
    trades.forEach((x, i) => {
      ev.push({ t: x.entryT, kind: 1, i, open: false });
      ev.push({ t: x.exitT, kind: 0, i, open: false });
    });
    open.forEach((x, i) => ev.push({ t: x.entryT, kind: 1, i, open: true }));
    ev.sort((a, b) => a.t - b.t || a.kind - b.kind || Number(a.open) - Number(b.open) || a.i - b.i);
    yield 0;
    let c = 0;
    for (const e of ev) {
      step(e.kind, e.open, e.i);
      if (++c % 20_000 === 0) yield c;
    }
  }
  return { units, realized: opt.balance + pnl, pnl };
}

/**
 * The sizing events as exact integers ((time − first) · 4 + 2 · entry + open) · 2^bits + index, whose numeric order
 * is (time, exit before entry, closed before open, index); null when they do not fit in 53 bits (a span of
 * months at 100k orders) or a time is not a whole millisecond — then the events are sorted as objects.
 */
function packedEvents(
  trades: ReadonlyArray<{ entryT: number; exitT: number }>,
  open: ReadonlyArray<{ entryT: number }>,
): { k: Float64Array; sh: number } | null {
  const n = trades.length;
  const m = open.length;
  const bits = Math.max(1, Math.ceil(Math.log2(Math.max(n, m) + 1)));
  let lo = Infinity;
  let hi = -Infinity;
  for (const x of trades) {
    if (!Number.isInteger(x.entryT) || !Number.isInteger(x.exitT)) return null;
    lo = Math.min(lo, x.entryT, x.exitT);
    hi = Math.max(hi, x.entryT, x.exitT);
  }
  for (const x of open) {
    if (!Number.isInteger(x.entryT)) return null;
    lo = Math.min(lo, x.entryT);
    hi = Math.max(hi, x.entryT);
  }
  if (n + m === 0) return { k: new Float64Array(0), sh: 1 };
  if (!(hi - lo < 2 ** (51 - bits))) return null;
  const sh = 2 ** bits;
  const k = new Float64Array(2 * n + m);
  let j = 0;
  for (let i = 0; i < n; i++) {
    k[j++] = ((trades[i].entryT - lo) * 4 + 2) * sh + i;
    k[j++] = (trades[i].exitT - lo) * 4 * sh + i;
  }
  for (let i = 0; i < m; i++) k[j++] = ((open[i].entryT - lo) * 4 + 3) * sh + i;
  return { k, sh };
}
